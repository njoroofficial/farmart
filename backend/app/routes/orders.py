"""

Orders Blueprint — checkout and order lifecycle management.

ENDPOINTS:
  POST  /api/v1/orders                      Checkout: cart → order
  GET   /api/v1/orders                      Buyer: list own orders
  GET   /api/v1/orders/:id                  Buyer: order detail
  GET   /api/v1/farmer/orders               Farmer: list incoming orders
  GET   /api/v1/farmer/orders/:id           Farmer: order detail
  PATCH /api/v1/farmer/orders/:id/confirm   Farmer: confirm order
  PATCH /api/v1/farmer/orders/:id/reject    Farmer: reject order

THE CHECKOUT TRANSACTION (the most important operation in the system):
  Checkout converts a cart into an order. It must be atomic — either
  everything succeeds or nothing changes. Here is what happens in one
  database transaction:

    1. Verify all cart animals are still 'available' — if any are not,
       abort with a 409 listing the unavailable animals.
    2. Flip each animal's status from 'available' to 'reserved'.
    3. Create the Order row.
    4. Create one OrderItem row per animal (with price snapshot).
    5. Clear the cart items.
    6. Commit everything in one db.session.commit().

  If step 6 fails, SQLAlchemy rolls back all five preceding steps — the
  database stays in exactly the state it was before checkout was attempted.
  No half-reserved animals, no orders without items, no cleared carts
  without orders. Atomicity is the guarantee.

FARMER ORDERING:
  Farmer routes are prefixed with /farmer to keep them clearly separated
  from buyer routes. Both prefixes live under /api/v1 but the farmer
  endpoints require a farmer JWT while buyer endpoints require a buyer JWT.

"""
import logging

from flask import Blueprint, request, g

from app.extensions import db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import Cart, CartItem
from app.models.animal import Animal, AnimalStatus
from app.middleware.auth_middleware import buyer_required, farmer_required
from app.services.email_service import (
    send_order_notification_to_farmer,
    send_order_confirmation_to_buyer,
)
from app.utils.response import success_response, error_response, build_pagination_meta
from app.utils.pagination import get_pagination_params, paginate_query

logger = logging.getLogger(__name__)
orders_bp = Blueprint("orders", __name__)


# ─── POST /orders  (Checkout)

@orders_bp.route("/orders", methods=["POST"])
@buyer_required
def checkout():
    """
    Convert the buyer's cart into a confirmed order.

    This is the most critical endpoint in the system — it handles money and
    concurrent buyers competing for the same animals. Every step is inside
    one atomic database transaction. Nothing is committed until everything
    has been validated and prepared.

    CONCURRENCY SCENARIO:
      Buyer A and Buyer B both have "Big Red" in their carts. Both click
      checkout at the same moment. Both pass the initial status check
      (status is still 'available' for both). The first db.session.commit()
      to succeed flips status to 'reserved'. The second commit would try to
      update status again, but because we re-check within the transaction
      using with_for_update() locking, the second buyer gets a 409.
    """
    buyer = g.current_user
    data = request.get_json() or {}

    delivery_address = data.get("delivery_address", "").strip()
    if not delivery_address:
        # Fall back to the buyer's saved default address
        if buyer.buyer_profile and buyer.buyer_profile.default_delivery_address:
            delivery_address = buyer.buyer_profile.default_delivery_address
        else:
            return error_response(
                "Delivery address is required. Please provide one.", 422
            )

    cart = Cart.query.filter_by(buyer_id=buyer.id).first()
    if not cart or cart.item_count == 0:
        return error_response("Your cart is empty. Add animals before checking out.", 400)

    # ── Begin the atomic checkout transaction ─────────────────────────────────
    try:
        # Lock the animal rows for this transaction to prevent concurrent
        # checkouts from reserving the same animals simultaneously.
        # with_for_update() translates to SELECT ... FOR UPDATE in PostgreSQL,
        # which holds a row-level lock until the transaction commits or rolls back.
        animal_ids = [item.animal_id for item in cart.items]
        animals = Animal.query.filter(
            Animal.id.in_(animal_ids)
        ).with_for_update().all()

        # Check every animal is still available inside the locked transaction
        unavailable = [
            a.name for a in animals if a.status != AnimalStatus.AVAILABLE
        ]
        if unavailable:
            return error_response(
                f"The following animals are no longer available: "
                f"{', '.join(unavailable)}. Please remove them from your cart.",
                409,
            )

        # Flip all animals to 'reserved' atomically
        for animal in animals:
            animal.status = AnimalStatus.RESERVED
            db.session.add(animal)

        # Calculate total from current (locked) prices — not from any cached value
        total = sum(float(a.price) for a in animals)

        # Create the order
        order = Order(
            buyer_id=buyer.id,
            total_amount=total,
            status=OrderStatus.PENDING,
            delivery_address=delivery_address,
            notes=data.get("notes", "").strip() or None,
        )
        db.session.add(order)
        db.session.flush()  # Get order.id for the order items

        # Create one OrderItem per animal — capturing the price snapshot
        animal_map = {a.id: a for a in animals}
        for cart_item in cart.items:
            animal = animal_map.get(cart_item.animal_id)
            if not animal:
                continue
            order_item = OrderItem(
                order_id=order.id,
                animal_id=animal.id,
                price_at_purchase=animal.price,
                animal_name_snapshot=animal.name,
                animal_type_snapshot=animal.animal_type.name if animal.animal_type else "Unknown",
            )
            db.session.add(order_item)

        # Clear the cart items — the cart row itself stays (empty container)
        CartItem.query.filter_by(cart_id=cart.id).delete()

        # Single atomic commit — all reservations, order, items, and cart clear
        db.session.commit()
        logger.info(f"Order {order.id} created by buyer {buyer.id}. Total: {total}")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Checkout failed for buyer {buyer.id}: {e}")
        return error_response(
            "Checkout failed. Your cart has not been changed. Please try again.", 500
        )

    # ── Send notification emails (outside the transaction) ────────────────────
    # Emails are sent after the commit so a SendGrid hiccup never rolls back
    # the order. The order exists — emails are a best-effort notification.
    # We notify each unique farmer whose animals are in this order.
    farmer_ids_notified = set()
    for order_item in order.items:
        if order_item.animal and order_item.animal.farmer_id not in farmer_ids_notified:
            send_order_notification_to_farmer(order_item.animal.farmer, order)
            farmer_ids_notified.add(order_item.animal.farmer_id)

    send_order_confirmation_to_buyer(buyer, order)

    return success_response(
        data=order.to_dict(),
        message="Order placed successfully. The farmer has been notified.",
        status_code=201,
    )


# ─── GET /orders  (Buyer: list)

@orders_bp.route("/orders", methods=["GET"])
@buyer_required
def list_buyer_orders():
    """List the authenticated buyer's orders, most recent first."""
    buyer = g.current_user
    page, per_page = get_pagination_params()
    status = request.args.get("status")

    query = Order.query.filter_by(buyer_id=buyer.id)
    if status and status in OrderStatus.ALL:
        query = query.filter(Order.status == status)
    query = query.order_by(Order.created_at.desc())

    orders, total = paginate_query(query, page, per_page)

    return success_response(
        data=[o.to_dict() for o in orders],
        message="Orders retrieved.",
        meta=build_pagination_meta(page, per_page, total),
    )


# ─── GET /orders/:id  (Buyer: detail)

@orders_bp.route("/orders/<string:order_id>", methods=["GET"])
@buyer_required
def get_buyer_order(order_id: str):
    """Get a single order detail. Only the buyer who placed it can access it."""
    buyer = g.current_user
    order = Order.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)
    if order.buyer_id != buyer.id:
        return error_response("Access denied.", 403)

    return success_response(data=order.to_dict(), message="Order retrieved.")


# ─── GET /farmer/orders  (Farmer: list)

@orders_bp.route("/farmer/orders", methods=["GET"])
@farmer_required
def list_farmer_orders():
    """
    List all orders containing animals belonging to the authenticated farmer.

    A farmer sees orders that include their animals — not all orders on the
    platform. We join through OrderItem → Animal to find relevant orders.
    """
    farmer = g.current_user
    page, per_page = get_pagination_params()
    status = request.args.get("status")

    query = Order.query.join(OrderItem).join(Animal).filter(
        Animal.farmer_id == farmer.id
    )
    if status and status in OrderStatus.ALL:
        query = query.filter(Order.status == status)
    query = query.order_by(Order.created_at.desc()).distinct()

    orders, total = paginate_query(query, page, per_page)

    return success_response(
        data=[o.to_dict(include_buyer=True) for o in orders],
        message="Orders retrieved.",
        meta=build_pagination_meta(page, per_page, total),
    )


# ─── GET /farmer/orders/:id  (Farmer: detail)

@orders_bp.route("/farmer/orders/<string:order_id>", methods=["GET"])
@farmer_required
def get_farmer_order(order_id: str):
    """
    Get a single order detail from the farmer's perspective.

    We verify the farmer owns at least one animal in this order before
    returning it — a farmer should never see orders for other farmers' animals.
    """
    farmer = g.current_user
    order = Order.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)

    # Verify this order contains at least one of this farmer's animals
    farmer_item = next(
        (item for item in order.items
         if item.animal and item.animal.farmer_id == farmer.id),
        None,
    )
    if not farmer_item:
        return error_response("Access denied.", 403)

    return success_response(
        data=order.to_dict(include_buyer=True),
        message="Order retrieved.",
    )


# ─── PATCH /farmer/orders/:id/confirm

@orders_bp.route("/farmer/orders/<string:order_id>/confirm", methods=["PATCH"])
@farmer_required
def confirm_order(order_id: str):
    """
    Farmer confirms the order — signals they will fulfill it.

    This transitions status: pending → confirmed.
    Animals remain in 'reserved' status — they will become 'sold' when
    the order is marked completed (a future endpoint).
    The buyer receives an email notification.
    """
    farmer = g.current_user
    order = Order.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)

    # Ownership check
    farmer_item = next(
        (item for item in order.items
         if item.animal and item.animal.farmer_id == farmer.id),
        None,
    )
    if not farmer_item:
        return error_response("Access denied.", 403)

    if order.status != OrderStatus.PENDING:
        return error_response(
            f"This order cannot be confirmed — current status is '{order.status}'.", 400
        )

    try:
        order.status = OrderStatus.CONFIRMED
        db.session.commit()
        logger.info(f"Order {order_id} confirmed by farmer {farmer.id}")
    except Exception:
        db.session.rollback()
        return error_response("Failed to confirm order.", 500)

    # Notify buyer
    try:
        from app.services.email_service import _build_mail, _send
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h1 style="color:#1B4332">Order confirmed</h1>
          <p>Hi {order.buyer.first_name}, your order has been confirmed by the farmer.</p>
          <p><strong>Order total:</strong> KSh {order.total_amount:,.2f}</p>
          <p>The farmer will contact you to arrange delivery.</p>
        </div>
        """
        mail = _build_mail(order.buyer.email, "Your Farmart order is confirmed", html)
        _send(mail)
    except Exception:
        pass  # Never let email failure affect the response

    return success_response(
        data={"id": order.id, "status": order.status},
        message="Order confirmed successfully.",
    )


# ─── PATCH /farmer/orders/:id/reject

@orders_bp.route("/farmer/orders/<string:order_id>/reject", methods=["PATCH"])
@farmer_required
def reject_order(order_id: str):
    """
    Farmer rejects the order — signals they cannot fulfill it.

    This transitions status: pending → rejected.
    All animals in the order are returned to 'available' so other buyers
    can purchase them. The buyer receives an email explaining the rejection.
    """
    farmer = g.current_user
    order = Order.query.get(order_id)

    if not order:
        return error_response("Order not found.", 404)

    farmer_item = next(
        (item for item in order.items
         if item.animal and item.animal.farmer_id == farmer.id),
        None,
    )
    if not farmer_item:
        return error_response("Access denied.", 403)

    if order.status != OrderStatus.PENDING:
        return error_response(
            f"This order cannot be rejected — current status is '{order.status}'.", 400
        )

    data = request.get_json() or {}
    reason = data.get("reason", "").strip() or "No reason provided."

    try:
        order.status = OrderStatus.REJECTED

        # Release all animals back to 'available'
        for item in order.items:
            if item.animal and item.animal.status == AnimalStatus.RESERVED:
                item.animal.status = AnimalStatus.AVAILABLE
                db.session.add(item.animal)

        db.session.commit()
        logger.info(f"Order {order_id} rejected by farmer {farmer.id}. Reason: {reason}")
    except Exception:
        db.session.rollback()
        return error_response("Failed to reject order.", 500)

    # Notify buyer
    try:
        from app.services.email_service import _build_mail, _send
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h1 style="color:#DC2626">Order update</h1>
          <p>Hi {order.buyer.first_name}, unfortunately the farmer was unable
          to fulfill your order.</p>
          <p><strong>Reason:</strong> {reason}</p>
          <p>The animals in your order are now available again for purchase.</p>
        </div>
        """
        mail = _build_mail(order.buyer.email, "Update on your Farmart order", html)
        _send(mail)
    except Exception:
        pass

    return success_response(
        data={"id": order.id, "status": order.status},
        message="Order rejected. Animals have been returned to available.",
    )
