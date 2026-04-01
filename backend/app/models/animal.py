"""
app/models/animal.py

Animal-related models: AnimalType, Breed, Animal, AnimalImage.

MODEL RELATIONSHIPS:
  AnimalType  ──< Breed          (one type has many breeds)
  AnimalType  ──< Animal         (one type has many animals)
  Breed       ──< Animal         (one breed has many animals)
  Animal      ──< AnimalImage    (one animal has many images)
  User(farmer) ──< Animal        (one farmer has many listings)

STATUS LIFECYCLE:
  available → reserved → sold
                ↓
           available   (if order rejected or cart abandoned)

  The status field is the concurrency control mechanism for the marketplace.
  When a buyer checks out, we atomically flip animals from 'available' to
  'reserved'. This prevents two buyers from purchasing the same animal.

WHY age_months NOT date_of_birth:
  Farm animals' ages are approximations — a farmer knows "about 8 months"
  not an exact birth date. Storing age_months as an integer reflects the
  domain reality and makes range filtering trivially simple:
    WHERE age_months BETWEEN 6 AND 18
  A birthdate would require:
    WHERE EXTRACT(MONTH FROM AGE(NOW(), date_of_birth)) BETWEEN 6 AND 18
  — more complex SQL with no benefit for this domain.

"""
from sqlalchemy import Enum as SAEnum
from app.extensions import db
from app.models.base import BaseModel


# ─── Status constants ─────────────────────────────────────────────────────────

class AnimalStatus:
    AVAILABLE = "available"
    RESERVED  = "reserved"
    SOLD      = "sold"
    ALL       = ["available", "reserved", "sold"]


# ─── Animal Type ──────────────────────────────────────────────────────────────

class AnimalType(BaseModel):
    """
    Reference table for animal categories — Cattle, Goat, Sheep, Pig, etc.

    Storing these as rows rather than an ENUM gives us two advantages:
      1. New types can be added via the admin API without a schema migration
      2. The frontend can fetch the list dynamically for filter dropdowns

    A Postgres ENUM would require a migration every time a new animal type
    is needed — unacceptable for a platform that might add Camels or Rabbits
    based on farmer demand.
    """
    __tablename__ = "animal_types"

    name        = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    breeds  = db.relationship("Breed",  back_populates="animal_type",
                               cascade="all, delete-orphan", lazy="select")
    animals = db.relationship("Animal", back_populates="animal_type", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id":          self.id,
            "name":        self.name,
            "description": self.description,
        }

    @classmethod
    def find_by_name(cls, name: str):
        return cls.query.filter(
            db.func.lower(cls.name) == name.lower().strip()
        ).first()


# ─── Breed ────────────────────────────────────────────────────────────────────

class Breed(BaseModel):
    """
    Breed within an AnimalType — Friesian belongs to Cattle, Boer to Goat.

    The composite unique constraint (animal_type_id, name) allows the same
    breed name to exist across different animal types (e.g. a "Dorper" sheep
    and a hypothetical "Dorper" goat) while preventing duplicate breeds
    within the same type.
    """
    __tablename__ = "breeds"
    __table_args__ = (
        db.UniqueConstraint("animal_type_id", "name", name="uq_breed_type_name"),
    )

    animal_type_id = db.Column(
        db.String(36),
        db.ForeignKey("animal_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name        = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)

    animal_type = db.relationship("AnimalType", back_populates="breeds")
    animals     = db.relationship("Animal", back_populates="breed", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id":             self.id,
            "animal_type_id": self.animal_type_id,
            "name":           self.name,
            "description":    self.description,
        }


# ─── Animal ───────────────────────────────────────────────────────────────────

class Animal(BaseModel):
    """
    The core product entity — represents a single animal for sale.

    An Animal belongs to a Farmer (User with role=farmer), has a type
    and breed, and may have 1–5 images. Its status drives the purchase flow.
    """
    __tablename__ = "animals"

    farmer_id      = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    animal_type_id = db.Column(
        db.String(36),
        db.ForeignKey("animal_types.id"),
        nullable=False,
        index=True,
    )
    breed_id       = db.Column(
        db.String(36),
        db.ForeignKey("breeds.id"),
        nullable=False,
        index=True,
    )
    name           = db.Column(db.String(200), nullable=False)
    age_months     = db.Column(db.Integer, nullable=False)
    weight_kg      = db.Column(db.Numeric(8, 2), nullable=True)
    price          = db.Column(db.Numeric(10, 2), nullable=False)
    description    = db.Column(db.Text, nullable=True)
    status         = db.Column(
        SAEnum(*AnimalStatus.ALL, name="animal_status_enum"),
        default=AnimalStatus.AVAILABLE,
        nullable=False,
        index=True,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    farmer      = db.relationship("User",       foreign_keys=[farmer_id], lazy="select")
    animal_type = db.relationship("AnimalType", back_populates="animals", lazy="select")
    breed       = db.relationship("Breed",      back_populates="animals", lazy="select")
    images      = db.relationship(
        "AnimalImage",
        back_populates="animal",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="AnimalImage.is_primary.desc()",  # Primary image always first
    )

    # ── Computed properties ────────────────────────────────────────────────────

    @property
    def primary_image_url(self) -> str | None:
        """Return the URL of the primary image, or None if no images exist."""
        primary = next((img for img in self.images if img.is_primary), None)
        if primary:
            return primary.cloudinary_url
        # Fall back to first image if no primary is explicitly set
        return self.images[0].cloudinary_url if self.images else None

    @property
    def is_available(self) -> bool:
        return self.status == AnimalStatus.AVAILABLE

    # ── Serialisation ──────────────────────────────────────────────────────────

    def to_dict(self, include_farmer: bool = False) -> dict:
        """
        Serialise the animal for API responses.

        include_farmer=True attaches farmer profile data — used on the
        detail endpoint where a buyer needs to see who is selling the animal.
        The list endpoint uses include_farmer=False for performance — loading
        the farmer relationship for 20 animals in a list adds 20 extra queries.
        """
        data = {
            "id":          self.id,
            "name":        self.name,
            "age_months":  self.age_months,
            "weight_kg":   float(self.weight_kg) if self.weight_kg else None,
            "price":       float(self.price),
            "description": self.description,
            "status":      self.status,
            "animal_type": self.animal_type.to_dict() if self.animal_type else None,
            "breed":       self.breed.to_dict() if self.breed else None,
            "primary_image": self.primary_image_url,
            "images":      [img.to_dict() for img in self.images],
            "created_at":  self.created_at.strftime("%d %b %Y") if self.created_at else None,
            "updated_at":  self.updated_at.strftime("%d %b %Y") if self.updated_at else None,
        }

        if include_farmer and self.farmer:
            farmer = self.farmer
            profile = farmer.farmer_profile
            data["farmer"] = {
                "id":           farmer.id,
                "full_name":    farmer.full_name,
                "phone_number": farmer.phone_number,
                "farm_name":    profile.farm_name if profile else None,
                "farm_location": profile.farm_location if profile else None,
            }

        return data

    # ── Query helpers ──────────────────────────────────────────────────────────

    @classmethod
    def build_list_query(cls, filters: dict):
        """
        Build a SQLAlchemy query applying all optional filters from request args.

        Centralising filter logic here means the route stays clean — it just
        calls Animal.build_list_query(filters) rather than building the query
        inline. It also makes the filtering logic testable in isolation.

        Filters accepted:
          animal_type_id — filter by type UUID
          breed_id       — filter by breed UUID
          age_min        — minimum age in months (inclusive)
          age_max        — maximum age in months (inclusive)
          price_min      — minimum price (inclusive)
          price_max      — maximum price (inclusive)
          search         — fuzzy match on name and description
          status         — defaults to 'available'; farmers can pass others
          farmer_id      — show only this farmer's listings (for dashboard)
        """
        query = cls.query

        status = filters.get("status", AnimalStatus.AVAILABLE)
        if status in AnimalStatus.ALL:
            query = query.filter(cls.status == status)
        else:
            query = query.filter(cls.status == AnimalStatus.AVAILABLE)

        if filters.get("animal_type_id"):
            query = query.filter(cls.animal_type_id == filters["animal_type_id"])

        if filters.get("breed_id"):
            query = query.filter(cls.breed_id == filters["breed_id"])

        if filters.get("farmer_id"):
            query = query.filter(cls.farmer_id == filters["farmer_id"])

        if filters.get("age_min") is not None:
            query = query.filter(cls.age_months >= filters["age_min"])

        if filters.get("age_max") is not None:
            query = query.filter(cls.age_months <= filters["age_max"])

        if filters.get("price_min") is not None:
            query = query.filter(cls.price >= filters["price_min"])

        if filters.get("price_max") is not None:
            query = query.filter(cls.price <= filters["price_max"])

        if filters.get("search"):
            search_term = f"%{filters['search'].strip()}%"
            query = query.filter(
                db.or_(
                    cls.name.ilike(search_term),
                    cls.description.ilike(search_term),
                )
            )

        # Default sort: newest listings first
        query = query.order_by(cls.created_at.desc())
        return query


# ─── Animal Image ─────────────────────────────────────────────────────────────

class AnimalImage(BaseModel):
    """
    Stores Cloudinary image metadata for an animal listing.

    We store both the URL and the public_id. The URL is what we serve to
    clients. The public_id is what we pass to Cloudinary's delete API when
    an image needs to be removed. Without the public_id, you cannot delete
    images from Cloudinary — you would be left with orphans forever.

    WHY NOT STORE IMAGES IN THE DATABASE?
      Storing binary image data (BLOBs) in Postgres is a well-known
      antipattern. It balloons the database size, makes backups slow, and
      Postgres is not optimised for serving binary large objects. Cloudinary
      is purpose-built for image storage and delivery — it handles CDN
      caching, format negotiation (WebP for supporting browsers), and
      on-the-fly transformations via URL parameters.
    """
    __tablename__ = "animal_images"

    animal_id             = db.Column(
        db.String(36),
        db.ForeignKey("animals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cloudinary_public_id  = db.Column(db.String(500), nullable=False)
    cloudinary_url        = db.Column(db.String(1000), nullable=False)
    is_primary            = db.Column(db.Boolean, default=False, nullable=False)

    animal = db.relationship("Animal", back_populates="images")

    def to_dict(self) -> dict:
        return {
            "id":                    self.id,
            "cloudinary_url":        self.cloudinary_url,
            "cloudinary_public_id":  self.cloudinary_public_id,
            "is_primary":            self.is_primary,
        }