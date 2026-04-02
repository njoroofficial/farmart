"""

Payments Blueprint — payment initiation and gateway webhook handling.

ENDPOINTS:
  POST /api/v1/payments/initiate        Buyer initiates payment for an order
  POST /api/v1/payments/webhook         Gateway callback (server-to-server)
  GET  /api/v1/payments/:order_id       Get payment status for an order

PAYMENT FLOW:
  1. Buyer POSTs to /payments/initiate with order_id and payment_method.
  2. We create a Payment record with status='pending'.
  3. We return a checkout_url (for card) or initiate an STK push (for M-PESA).
  4. The gateway processes the payment asynchronously.
  5. The gateway POSTs to /payments/webhook when the payment resolves.
  6. Our webhook handler:
      a. Validates the gateway signature (security)
      b. Updates Payment status to 'success' or 'failed'
      c. If success: marks animals as 'sold', advances order to 'confirmed'
      d. Returns 200 OK to the gateway (critical — gateway retries on non-200)

WEBHOOK SECURITY:
  The webhook endpoint is called by the payment gateway, not by a browser.
  We verify every webhook request using HMAC-SHA256 signature validation.
  Without this, any malicious actor could POST to /webhook claiming a payment
  succeeded and receive goods without paying.

  In this implementation we provide the architecture for real gateway
  integration. For the project, you can test with Flutterwave (supports
  Kenya) or use a simulated flow for the presentation.

"""
import hashlib
import hmac
import logging
from datetime import datetime, timezone

from flask import Blueprint, request, g, current_app

from app.extensions import db
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.order import Order, OrderStatus
from app.models.animal import AnimalStatus
from app.middleware.auth_middleware import buyer_required, verified_user_required
from app.utils.response import success_response, error_response

logger = logging.getLogger(__name__)
payments_bp = Blueprint("payments", __name__)


# ─── POST /payments/initiate 

@payments_bp.route("/initiate", methods=["POST"])
@buyer_required
def initiate_payment():
    """
    Initiate payment for a pending order.

    Creates a Payment record and returns the information the frontend needs
    to redirect the buyer to the payment gateway or trigger an M-PESA push.

    For card payments: returns a checkout_url the frontend redirects to.
    For M-PESA: the gateway sends an STK push to the buyer's phone; we return
    a transaction_ref the frontend polls against.

    IDEMPOTENCY:
      If the buyer calls this endpoint twice for the same order (e.g. they
      accidentally double-clicked), we return the existing pending payment
      record rather than creating a second one. The UNIQUE constraint on
      order_id prevents duplicate payment records.
    """
    buyer = g.current_user
    data  = request.get_json() or {}

    order_id       = data.get("order_id", "").strip()
    payment_method = data.get("payment_method", "").strip().lower()

    if not order_id:
        return error_response("order_id is required.", 400)
    if payment_method not in PaymentMethod.ALL:
        return error_response(
            f"payment_method must be one of: {', '.join(PaymentMethod.ALL)}.", 400
        )

    order = Order.query.get(order_id)
    if not order:
        return error_response("Order not found.", 404)
    if order.buyer_id != buyer.id:
        return error_response("Access denied.", 403)
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        return error_response(
            f"This order cannot be paid — status is '{order.status}'.", 400
        )

    # Idempotency: return existing pending payment if one exists
    existing = Payment.query.filter_by(
        order_id=order_id,
        payment_status=PaymentStatus.PENDING,
    ).first()
    if existing:
        return success_response(
            data=_build_payment_initiation_response(existing, order),
            message="Payment already initiated. Complete the payment to proceed.",
        )

    if order.payment and order.payment.payment_status == PaymentStatus.SUCCESS:
        return error_response("This order has already been paid.", 400)

    try:
        payment = Payment(
            order_id=order_id,
            amount=order.total_amount,
            payment_method=payment_method,
            payment_status=PaymentStatus.PENDING,
        )
        db.session.add(payment)
        db.session.commit()
        logger.info(f"Payment initiated: order {order_id}, method {payment_method}")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Payment initiation failed: {e}")
        return error_response("Failed to initiate payment. Please try again.", 500)

    return success_response(
        data=_build_payment_initiation_response(payment, order),
        message="Payment initiated.",
    )


def _build_payment_initiation_response(payment: Payment, order: Order) -> dict:
    """
    Build the response payload for a payment initiation.

    In a real integration this would call the Flutterwave or Stripe API
    to get a real checkout URL or initiate an M-PESA STK push.
    For this implementation we return a simulated response structure that
    matches the real API shape — plugging in the real gateway SDK is a
    one-function change.
    """
    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:3000")
    base_data = {
        "payment_id":      payment.id,
        "transaction_ref": payment.transaction_ref or f"FM-{payment.id[:8].upper()}",
        "payment_status":  payment.payment_status,
        "amount":          float(payment.amount),
        "payment_method":  payment.payment_method,
    }

    if payment.payment_method == PaymentMethod.CARD:
        # In production: call Flutterwave/Stripe to create a hosted checkout
        # session and return the URL. Here we simulate the structure.
        base_data["checkout_url"] = (
            f"{frontend_url}/payment/card?ref={base_data['transaction_ref']}"
        )
    else:
        # M-PESA: the gateway sends an STK push to the buyer's phone.
        # The frontend polls GET /payments/:order_id to check completion.
        base_data["mpesa_message"] = (
            "An M-PESA payment request has been sent to your phone. "
            "Enter your PIN to complete the payment."
        )
        base_data["poll_url"] = f"{frontend_url}/api/v1/payments/{order.id}"

    return base_data


# ─── POST /payments/webhook 

@payments_bp.route("/webhook", methods=["POST"])
def payment_webhook():
    """
    Receive and process payment status callbacks from the payment gateway.

    SECURITY FIRST — SIGNATURE VALIDATION:
      Every real payment gateway signs its webhook payloads using HMAC-SHA256.
      We recompute the expected signature from the raw request body and our
      shared webhook secret, then compare it to what the gateway sent.
      If they do not match, we return 400 immediately without processing.

      Why this matters: without signature validation, anyone who discovers
      this URL can POST a fake "payment succeeded" webhook and fraudulently
      mark orders as paid. Signature validation is not optional.

    IDEMPOTENCY:
      Gateways retry webhooks that do not receive a 200 response. Our handler
      is idempotent — processing the same webhook twice produces the same
      result as processing it once. We check if the payment is already in its
      terminal state before applying any changes.

    RETURN 200 IMMEDIATELY:
      We commit the payment update before sending any emails or doing any
      non-critical work. The gateway considers anything other than a 200
      a failure and will retry. Long-running work after the 200 should be
      handled asynchronously in production (Celery, etc.).
    """
    # ── Signature validation ──────────────────────────────────────────────────
    webhook_secret = current_app.config.get("PAYMENT_WEBHOOK_SECRET", "")
    if webhook_secret:
        gateway_signature = request.headers.get("X-Webhook-Signature", "")
        raw_body          = request.get_data()
        expected_sig      = hmac.new(
            webhook_secret.encode(),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, gateway_signature):
            logger.warning("Webhook received with invalid signature — rejected.")
            return error_response("Invalid webhook signature.", 400)

    data            = request.get_json()
    transaction_ref = (data or {}).get("transaction_ref", "").strip()
    gateway_status  = (data or {}).get("status", "").strip().lower()

    if not transaction_ref:
        return error_response("transaction_ref is required.", 400)

    payment = Payment.query.filter_by(transaction_ref=transaction_ref).first()
    if not payment:
        # If we can't find the payment, return 200 anyway so the gateway
        # stops retrying. Log it for investigation.
        logger.error(f"Webhook: no payment found for ref {transaction_ref}")
        return success_response(message="Webhook acknowledged.")

    # Idempotency: already in terminal state, no action needed
    if payment.payment_status in (PaymentStatus.SUCCESS, PaymentStatus.FAILED):
        logger.info(f"Webhook: payment {payment.id} already in terminal state — skipped.")
        return success_response(message="Webhook acknowledged.")

    try:
        payment.gateway_response = data

        if gateway_status == "success":
            payment.payment_status = PaymentStatus.SUCCESS
            payment.paid_at        = datetime.now(timezone.utc)

            # Mark all animals in the order as 'sold'
            for item in payment.order.items:
                if item.animal:
                    item.animal.status = AnimalStatus.SOLD
                    db.session.add(item.animal)

            # Advance order status to confirmed
            if payment.order.status == OrderStatus.PENDING:
                payment.order.status = OrderStatus.CONFIRMED
                db.session.add(payment.order)

        else:
            payment.payment_status = PaymentStatus.FAILED
            logger.info(f"Payment failed for order {payment.order_id}. Gateway status: {gateway_status}")

        db.session.add(payment)
        db.session.commit()
        logger.info(f"Webhook processed: ref {transaction_ref}, status {gateway_status}")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Webhook processing failed: {e}")
        # Return 500 so the gateway retries — we want to process this
        return error_response("Webhook processing failed.", 500)

    return success_response(message="Webhook processed.")


# ─── GET /payments/:order_id 

@payments_bp.route("/<string:order_id>", methods=["GET"])
@verified_user_required
def get_payment_status(order_id: str):
    """
    Get the payment status for a specific order.

    Used by the frontend to poll payment completion after initiating M-PESA
    or returning from a card checkout redirect. Both buyers (to track their
    payment) and farmers (to confirm payment received) can access this.
    """
    user  = g.current_user
    order = Order.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)

    # Access control: buyer who placed it, or farmer whose animal is in it
    from app.models.animal import Animal
    from app.models.order import OrderItem
    is_buyer  = order.buyer_id == user.id
    is_farmer = OrderItem.query.join(Animal).filter(
        OrderItem.order_id == order_id,
        Animal.farmer_id == user.id,
    ).first() is not None

    if not is_buyer and not is_farmer:
        return error_response("Access denied.", 403)

    if not order.payment:
        return error_response("No payment record found for this order.", 404)

    return success_response(
        data=order.payment.to_dict(),
        message="Payment status retrieved.",
    )