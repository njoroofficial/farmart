"""

Cart and CartItem models.

DESIGN DECISIONS:

  ONE CART PER BUYER:
    The UNIQUE constraint on buyer_id in the Cart table enforces this at
    the database level. We use a get-or-create pattern in the route — if
    a buyer adds their first item, we create their cart. On every subsequent
    add, we find the existing cart. This means a buyer never accumulates
    multiple carts even if they call the API concurrently.

  ANIMAL STATUS CHECK ON CART OPEN:
    Animals can become reserved or sold between the time a buyer adds them
    to the cart and the time they view the cart. The GET /cart endpoint
    checks each item's current status and flags unavailable items rather
    than silently hiding them. The buyer sees "this item is no longer
    available" and can remove it before proceeding to checkout.

  CART ITEMS ARE NOT QUANTITY-BASED:
    Unlike a typical e-commerce cart where you can add 3 of the same product,
    each animal is unique. You either have it in your cart or you do not.
    The UNIQUE constraint on (cart_id, animal_id) enforces this.

"""
from app.extensions import db
from app.models.base import BaseModel


class Cart(BaseModel):
    """
    One persistent cart per buyer. Created on first item add, cleared on checkout.
    """
    __tablename__ = "carts"

    buyer_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,        # Enforces one cart per buyer at the DB level
        nullable=False,
        index=True,
    )

    buyer = db.relationship("User", foreign_keys=[buyer_id], lazy="select")
    items = db.relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
        lazy="select",
    )

    @classmethod
    def get_or_create(cls, buyer_id: str) -> "Cart":
        """
        Fetch the buyer's existing cart or create one if it doesn't exist.

        Using get-or-create rather than always-create prevents duplicate carts
        from being created if the buyer makes concurrent requests. The unique
        constraint on buyer_id is the final safety net — even if two concurrent
        requests both pass the query check, the constraint prevents two rows.
        """
        cart = cls.query.filter_by(buyer_id=buyer_id).first()
        if not cart:
            cart = cls(buyer_id=buyer_id)
            db.session.add(cart)
            db.session.flush()  # Get cart.id without committing
        return cart

    @property
    def total(self) -> float:
        """Sum of all item prices in the cart."""
        return sum(
            float(item.animal.price)
            for item in self.items
            if item.animal and item.animal.price
        )

    @property
    def item_count(self) -> int:
        return len(self.items)

    def to_dict(self) -> dict:
        return {
            "id":         self.id,
            "buyer_id":   self.buyer_id,
            "items":      [item.to_dict() for item in self.items],
            "total":      self.total,
            "item_count": self.item_count,
        }


class CartItem(BaseModel):
    """
    A single animal in a buyer's cart.

    The UNIQUE constraint on (cart_id, animal_id) prevents the same animal
    from being added twice — the 409 Conflict response in the route handler
    catches this at the application level before it hits the constraint.
    """
    __tablename__ = "cart_items"
    __table_args__ = (
        db.UniqueConstraint("cart_id", "animal_id", name="uq_cart_animal"),
    )

    cart_id   = db.Column(
        db.String(36),
        db.ForeignKey("carts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    animal_id = db.Column(
        db.String(36),
        db.ForeignKey("animals.id", ondelete="CASCADE"),
        nullable=False,
    )

    cart   = db.relationship("Cart",   back_populates="items")
    animal = db.relationship("Animal", lazy="select")

    def to_dict(self) -> dict:
        from app.models.animal import AnimalStatus
        animal_data = None
        if self.animal:
            animal_data = {
                "id":            self.animal.id,
                "name":          self.animal.name,
                "price":         float(self.animal.price),
                "status":        self.animal.status,
                "is_available":  self.animal.status == AnimalStatus.AVAILABLE,
                "primary_image": self.animal.primary_image_url,
                "animal_type":   self.animal.animal_type.to_dict() if self.animal.animal_type else None,
                "breed":         self.animal.breed.to_dict() if self.animal.breed else None,
                "farmer": {
                    "farm_name":     self.animal.farmer.farmer_profile.farm_name
                                     if self.animal.farmer and self.animal.farmer.farmer_profile else None,
                    "farm_location": self.animal.farmer.farmer_profile.farm_location
                                     if self.animal.farmer and self.animal.farmer.farmer_profile else None,
                },
            }
        return {
            "id":       self.id,
            "animal":   animal_data,
            "added_at": self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None,
        }