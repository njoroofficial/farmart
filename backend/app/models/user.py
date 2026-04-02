"""


User model and the proxy profile models (FarmerProfile, BuyerProfile).

THE PROXY PATTERN IN PRACTICE:
  Three classes, three tables, one clean design.

  User              → users table             — identity & authentication
  FarmerProfile     → farmer_profiles table   — role-specific farmer data
  BuyerProfile      → buyer_profiles table    — role-specific buyer data
  VerificationToken → verification_tokens     — 2-step email auth tokens

  The relationship is always: User has one FarmerProfile OR one BuyerProfile,
  never both. This is enforced by the UNIQUE constraint on user_id in each
  profile table.

"""
import secrets
from datetime import datetime, timezone, timedelta

import bcrypt
from sqlalchemy import Enum as SAEnum

from app.extensions import db
from app.models.base import BaseModel


# ─── Role and Token Type Constants
# We use plain class attributes rather than Python's enum.Enum because
# SQLAlchemy's SAEnum maps these strings directly to a Postgres ENUM type,
# which means the database itself enforces valid values — you cannot insert
# "superadmin" into the role column even if you bypass the application layer.

class UserRole:
    FARMER = "farmer"
    BUYER = "buyer"
    ADMIN = "admin"
    ALL = ["farmer", "buyer", "admin"]


class TokenType:
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    ALL = ["email_verification", "password_reset"]


# ─── User Model

class User(BaseModel):
    """
    Represents any person using the platform.

    Every user has exactly one role. The role determines which profile table
    has a matching row, and which routes the user is authorised to access.

    PASSWORD HASHING:
      We never store passwords — we store a bcrypt hash of the password.
      bcrypt is a one-way function: given "Secure@123" it produces a hash
      that cannot be reversed.

    """
    __tablename__ = "users"

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    # We store the hash, never the plain password.
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(
        SAEnum(*UserRole.ALL, name="user_role_enum"),
        nullable=False,
    )
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    # phone_number is unique but nullable — not all users provide it on signup.
    phone_number = db.Column(db.String(20), unique=True, nullable=True, index=True)
    # is_verified is the gate enforcing 2-step auth. A freshly registered
    # user has is_verified=False and cannot log in until they click the
    # verification link we email them.
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True,  nullable=False)

    # ── Relationships
    # uselist=False tells SQLAlchemy this is a one-to-one relationship,
    # not one-to-many.
    # cascade="all, delete-orphan" means if a User is deleted, their profile
    # row is automatically deleted too.
    # lazy="select" means the profile is loaded in a separate query only
    # when you actually access user.farmer_profile, not on every user query.
    farmer_profile = db.relationship(
        "FarmerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="select",
    )
    buyer_profile = db.relationship(
        "BuyerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="select",
    )
    verification_tokens = db.relationship(
        "VerificationToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",  # "dynamic" returns a query object, not a loaded list.
    )                    # Efficient when you only ever need the latest token.

    # ── Password methods

    def set_password(self, plain_password: str) -> None:
        """
        Hash and store a plain-text password.

        bcrypt.hashpw() takes the password as bytes and a randomly-generated
        salt. The salt is embedded in the resulting hash, so you do not need
        to store it separately — bcrypt.checkpw() extracts it automatically
        when verifying. We encode to bytes and decode back to string because
        bcrypt operates on bytes but we store strings in the database.
        """
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, plain_password: str) -> bool:
        """
        Verify a submitted password against the stored hash.

        bcrypt.checkpw() is constant-time — it takes the same amount of time
        whether the password is right or wrong. This matters because a function
        that returns faster on wrong passwords leaks timing information that
        an attacker could exploit to narrow their guesses.
        """
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            self.password_hash.encode("utf-8"),
        )

    # ── Convenience properties

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_farmer(self) -> bool:
        return self.role == UserRole.FARMER

    @property
    def is_buyer(self) -> bool:
        return self.role == UserRole.BUYER

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def profile(self):
        """Return whichever profile this user has, regardless of role."""
        return self.farmer_profile or self.buyer_profile

    # ── Serialisation

    def to_dict(self, include_profile: bool = False) -> dict:
        """
        Convert the user to a dictionary safe for JSON responses.

        password_hash is explicitly excluded. include_profile=True attaches the role-specific
        profile data.
        """
        data = {
            "id":           self.id,
            "email":        self.email,
            "role":         self.role,
            "first_name":   self.first_name,
            "last_name":    self.last_name,
            "full_name":    self.full_name,
            "phone_number": self.phone_number,
            "is_verified":  self.is_verified,
            "is_active":    self.is_active,
            "created_at":   self.created_at.strftime("%d %b %Y") if self.created_at else None,
        }
        if include_profile and self.profile:
            data["profile"] = self.profile.to_dict()
        return data

    # ── Class-level query helpers

    @classmethod
    def find_by_email(cls, email: str):
        """Case-insensitive email lookup — emails should never be case-sensitive."""
        return cls.query.filter(
            db.func.lower(cls.email) == email.lower().strip()
        ).first()

    @classmethod
    def find_by_id(cls, user_id: str):
        """Fetch an active user by primary key."""
        return cls.query.filter_by(id=user_id, is_active=True).first()


# ─── Farmer Profile

class FarmerProfile(BaseModel):
    """
    Farmer-specific data — the job card for users with role='farmer'.

    This table exists because farmers have data that buyers do not: farm_name
    and farm_location. Keeping these here rather than in the users table
    preserves Second Normal Form — every non-key attribute depends on the
    whole key, not just part of it.
    """
    __tablename__ = "farmer_profiles"

    # unique=True at the column level enforces one-to-one at the DB level,
    # not just in Python. ondelete="CASCADE" means Postgres itself cleans
    # up this row if the parent User row is deleted — even if our app crashes
    # mid-deletion.
    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    farm_name = db.Column(db.String(200), nullable=False)
    farm_location = db.Column(db.String(200), nullable=False)
    bio = db.Column(db.Text, nullable=True)

    user = db.relationship("User", back_populates="farmer_profile")

    def to_dict(self) -> dict:
        return {
            "id":            self.id,
            "user_id":       self.user_id,
            "farm_name":     self.farm_name,
            "farm_location": self.farm_location,
            "bio":           self.bio,
            "created_at":    self.created_at.strftime("%d %b %Y") if self.created_at else None,
        }


# ─── Buyer Profile

class BuyerProfile(BaseModel):
    """
    Buyer-specific data — the job card for users with role='buyer'.

    Buyers currently have minimal extra data, but this table gives us a
    clean place to add buyer-specific fields later without ever touching
    the users table.
    """
    __tablename__ = "buyer_profiles"

    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    default_delivery_address = db.Column(db.String(300), nullable=True)

    user = db.relationship("User", back_populates="buyer_profile")

    def to_dict(self) -> dict:
        return {
            "id":                       self.id,
            "user_id":                  self.user_id,
            "default_delivery_address": self.default_delivery_address,
            "created_at": (
                self.created_at.strftime("%d %b %Y") if self.created_at else None
            ),
        }


# ─── Verification Token

class VerificationToken(BaseModel):
    """
    Single-use tokens for email verification and password resets.

    WHY NOT USE JWT FOR THIS?
      JWTs are stateless — once issued, you cannot invalidate them before
      expiry. A verification token must be single-use (consumed after one
      click), expirable (24-hour links), and revocable (re-registration
      invalidates old tokens). A database row gives us all three.

    TOKEN SECURITY:
      secrets.token_urlsafe(32) generates 32 bytes (256 bits) of
      cryptographically secure random data, encoded as a URL-safe string.
      256 bits of entropy is effectively impossible to guess by brute force —
      even at a billion guesses per second it would take longer than the
      age of the universe to find the right token.
    """
    __tablename__ = "verification_tokens"

    user_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        default=lambda: secrets.token_urlsafe(32),
    )
    token_type = db.Column(
        SAEnum(*TokenType.ALL, name="token_type_enum"),
        nullable=False,
    )
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    is_used = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship("User", back_populates="verification_tokens")

    @classmethod
    def create_for_user(cls, user: "User", token_type: str, hours_valid: int = 24):
        """
        Factory method — the correct way to create a new token for a user.

        Before creating the new token, we invalidate any existing unused
        tokens of the same type for this user. This prevents confusion when
        a user requests a verification email twice — only the most recent
        link works.

        We do NOT commit inside this method. The caller controls the
        transaction, which allows creating a User and a Token atomically
        in a single db.session.commit() call.
        """
        # Invalidate existing unused tokens of the same type.
        cls.query.filter_by(
            user_id=user.id,
            token_type=token_type,
            is_used=False,
        ).update({"is_used": True})

        token = cls(
            user_id=user.id,
            token_type=token_type,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=hours_valid),
        )
        db.session.add(token)
        return token

    @classmethod
    def find_valid(cls, token_string: str, token_type: str):
        """
        Look up and validate a token in one step.

        Returns the token if it exists, is unused, and has not expired.
        Returns None in all failure cases so the caller only needs
        `if token:` — no repeated validation logic in every route.
        """
        token = cls.query.filter_by(
            token=token_string,
            token_type=token_type,
            is_used=False,
        ).first()

        if not token:
            return None
        if token.expires_at < datetime.now(timezone.utc):
            return None

        return token

    def consume(self) -> None:
        """Mark this token as used so it cannot be replayed."""
        self.is_used = True
        db.session.add(self)
        # No commit — the caller commits after also updating user.is_verified.
