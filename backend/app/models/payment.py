"""

Payment model — records the financial settlement of an order.

WHY PAYMENT IS SEPARATE FROM ORDER:
  An Order represents the buyer's intent to purchase. A Payment represents
  the financial settlement of that intent. They have different lifecycles:
  an order can exist in 'pending' state while payment is being processed,
  and a payment can fail while the order remains active (buyer retries).

  Keeping them separate means we can record multiple payment attempts for
  the same order (first attempt failed, second succeeded) without corrupting
  the order record. We use the UNIQUE constraint on order_id to ensure
  only one SUCCESSFUL payment record exists per order.

PAYMENT STATUS LIFECYCLE:
  pending → success (payment gateway confirmed)
  pending → failed  (payment gateway declined or timed out)

  Only 'success' triggers order status progression.

GATEWAY ABSTRACTION:
  The payment_method field ("mpesa", "card") tells us which gateway handled
  the payment. The transaction_ref is the gateway's own reference ID — we
  store it for reconciliation purposes (matching our records to the gateway's
  dashboard). The gateway_response JSON field stores the full webhook payload
  from the gateway for audit purposes.

"""
from sqlalchemy import Enum as SAEnum
from app.extensions import db
from app.models.base import BaseModel


class PaymentStatus:
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    ALL = ["pending", "success", "failed"]


class PaymentMethod:
    MPESA = "mpesa"
    CARD = "card"
    ALL = ["mpesa", "card"]


class Payment(BaseModel):
    __tablename__ = "payments"

    order_id = db.Column(
        db.String(36),
        db.ForeignKey("orders.id"),
        unique=True,    # One payment record per order
        nullable=False,
        index=True,
    )
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(
        SAEnum(*PaymentMethod.ALL, name="payment_method_enum"),
        nullable=False,
    )
    payment_status = db.Column(
        SAEnum(*PaymentStatus.ALL, name="payment_status_enum"),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    # The gateway's reference ID — store this for reconciliation and support
    transaction_ref = db.Column(db.String(200), unique=True, nullable=True)
    # The full gateway webhook payload stored as JSON for audit/debugging
    gateway_response = db.Column(db.JSON, nullable=True)
    paid_at = db.Column(db.DateTime(timezone=True), nullable=True)

    order = db.relationship("Order", back_populates="payment")

    def to_dict(self) -> dict:
        return {
            "id":               self.id,
            "order_id":         self.order_id,
            "amount":           float(self.amount),
            "payment_method":   self.payment_method,
            "payment_status":   self.payment_status,
            "transaction_ref":  self.transaction_ref,
            "paid_at": (
                self.paid_at.strftime("%d %b %Y, %I:%M %p") if self.paid_at else None
            ),
            "created_at": (
                self.created_at.strftime("%d %b %Y, %I:%M %p") if self.created_at else None
            ),
        }
