"""
app/models/order.py

Order and OrderItem models.

THE ORDER LIFECYCLE:
  pending     → The buyer has checked out and payment is initiated.
                The farmer has been notified and must act.
  confirmed   → The farmer accepted the order. Delivery is being arranged.
  rejected    → The farmer declined. Animals return to 'available'.
  completed   → Delivery confirmed. Final state for successful transactions.
  cancelled   → Buyer or admin cancelled before confirmation. Animals return
                to 'available'.

PRICE SNAPSHOT PATTERN (critical design decision):
  OrderItem stores price_at_purchase, animal_name_snapshot, and
  animal_type_snapshot — copies of the animal's data at the moment of
  purchase. This is non-negotiable for financial integrity.

  If we only stored animal_id and looked up the price when displaying order
  history, a farmer changing their price after a sale would silently alter
  the buyer's order history. After three months, the buyer's receipt would
  show a different amount than what they actually paid. The snapshot makes
  the record immutable — it captures the financial moment permanently.

  The animal_id FK is set to SET NULL (not CASCADE) on delete for the same
  reason — deleting a listing should not delete the buyer's order history.

"""
from sqlalchemy import Enum as SAEnum
from app.extensions import db
from app.models.base import BaseModel


class OrderStatus:
    PENDING   = "pending"
    CONFIRMED = "confirmed"
    REJECTED  = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ALL = ["pending", "confirmed", "rejected", "completed", "cancelled"]

    # Statuses that count as "active" — animals should stay reserved
    ACTIVE = ["pending", "confirmed"]
    # Statuses that release animals back to available
    TERMINAL_RELEASE = ["rejected", "cancelled"]


class Order(BaseModel):
    """Represents a buyer's purchase intent — created at checkout."""
    __tablename__ = "orders"

    buyer_id         = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    total_amount     = db.Column(db.Numeric(10, 2), nullable=False)
    status           = db.Column(
        SAEnum(*OrderStatus.ALL, name="order_status_enum"),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True,
    )
    delivery_address = db.Column(db.String(300), nullable=False)
    notes            = db.Column(db.Text, nullable=True)

    buyer = db.relationship("User", foreign_keys=[buyer_id], lazy="select")
    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="select",
    )
    payment = db.relationship(
        "Payment",
        back_populates="order",
        uselist=False,
        lazy="select",
    )

    def to_dict(self, include_buyer: bool = False) -> dict:
        data = {
            "id":               self.id,
            "status":           self.status,
            "total_amount":     float(self.total_amount),
            "delivery_address": self.delivery_address,
            "notes":            self.notes,
            "item_count":       len(self.items),
            "items":            [item.to_dict() for item in self.items],
            "payment":          self.payment.to_dict() if self.payment else None,
            "created_at":       self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None,
            "updated_at":       self.updated_at.strftime("%d %b %Y, %I:%M %p") if self.updated_at else None,
        }
        if include_buyer and self.buyer:
            data["buyer"] = {
                "id":           self.buyer.id,
                "full_name":    self.buyer.full_name,
                "phone_number": self.buyer.phone_number,
                "email":        self.buyer.email,
            }
        return data


class OrderItem(BaseModel):
    """
    A snapshot of one animal at the time of purchase.

    The price_at_purchase and name snapshots are immutable records of what
    the buyer agreed to pay. They must never be updated after creation.
    """
    __tablename__ = "order_items"

    order_id              = db.Column(
        db.String(36),
        db.ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # SET NULL on delete: if the listing is deleted later, the order history
    # survives intact using the snapshot fields below.
    animal_id             = db.Column(
        db.String(36),
        db.ForeignKey("animals.id", ondelete="SET NULL"),
        nullable=True,
    )
    # These three snapshot fields are the financial record — immutable.
    price_at_purchase     = db.Column(db.Numeric(10, 2), nullable=False)
    animal_name_snapshot  = db.Column(db.String(200), nullable=False)
    animal_type_snapshot  = db.Column(db.String(100), nullable=False)

    order  = db.relationship("Order", back_populates="items")
    animal = db.relationship("Animal", lazy="select")

    def to_dict(self) -> dict:
        return {
            "id":                   self.id,
            "animal_id":            self.animal_id,
            "price_at_purchase":    float(self.price_at_purchase),
            "animal_name_snapshot": self.animal_name_snapshot,
            "animal_type_snapshot": self.animal_type_snapshot,
            # Include current image if the animal still exists
            "primary_image":        self.animal.primary_image_url if self.animal else None,
        }