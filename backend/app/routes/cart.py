"""

Cart Blueprint — buyer cart management.

ENDPOINTS:
  GET    /api/v1/cart              Get cart with real-time availability check
  POST   /api/v1/cart/items        Add animal to cart
  DELETE /api/v1/cart/items/:id    Remove animal from cart
  DELETE /api/v1/cart              Clear the entire cart

AVAILABILITY GUARD ON GET:
  When a buyer opens their cart, we check the current status of every animal
  in it. An animal that was available when added may now be reserved by another
  buyer or sold. We flag these in the response — the frontend shows a warning
  and the checkout button is disabled until the buyer removes unavailable items.
  We never silently remove items; that would confuse buyers.

RACE CONDITION PROTECTION:
  The UNIQUE constraint on (cart_id, animal_id) and the availability check
  in POST /cart/items together prevent:
    - The same animal being added twice (409 Conflict)
    - A reserved/sold animal being added (400 Bad Request)

"""
import logging

from flask import Blueprint, request, g

from app.extensions import db
from app.models.cart import Cart, CartItem
from app.models.animal import Animal, AnimalStatus
from app.middleware.auth_middleware import buyer_required
from app.utils.response import success_response, error_response

logger = logging.getLogger(__name__)
cart_bp = Blueprint("cart", __name__)


# ─── GET /cart

@cart_bp.route("", methods=["GET"])
@buyer_required
def get_cart():
    """
    Return the buyer's cart with real-time availability status on every item.

    We call get_or_create here as well so that the first time a buyer visits
    the cart page before adding anything, they get an empty cart response
    rather than a 404. This simplifies the frontend — it always receives
    a cart object, never an error on first visit.
    """
    buyer = g.current_user
    cart = Cart.get_or_create(buyer.id)
    db.session.commit()  # Persist the cart if it was just created

    cart_data = cart.to_dict()

    # Flag items that are no longer available so the frontend can warn the buyer.
    # We annotate each item rather than removing it — the buyer decides what to do.
    has_unavailable = any(
        not item["animal"]["is_available"]
        for item in cart_data["items"]
        if item.get("animal")
    )
    cart_data["has_unavailable_items"] = has_unavailable
    cart_data["checkout_ready"] = not has_unavailable and cart.item_count > 0

    return success_response(
        data=cart_data,
        message="Cart retrieved.",
    )


# ─── POST /cart/items

@cart_bp.route("/items", methods=["POST"])
@buyer_required
def add_to_cart():
    """
    Add an animal to the buyer's cart.

    Three checks before adding:
      1. The animal exists
      2. The animal is currently available (not reserved or sold)
      3. The animal is not already in this buyer's cart

    We check availability here rather than only at checkout because we want
    to give the buyer instant feedback. Nothing is more frustrating than
    filling your cart and discovering at checkout that half the items were
    already sold.
    """
    buyer = g.current_user
    data = request.get_json()
    animal_id = (data or {}).get("animal_id", "").strip()

    if not animal_id:
        return error_response("animal_id is required.", 400)

    animal = Animal.query.get(animal_id)
    if not animal:
        return error_response("Animal listing not found.", 404)

    if animal.status != AnimalStatus.AVAILABLE:
        return error_response(
            "This animal is no longer available for purchase.", 400
        )

    # Prevent a farmer from adding their own animal to a cart.
    # This is a business rule, not just a technical concern.
    if animal.farmer_id == buyer.id:
        return error_response(
            "You cannot add your own listing to your cart.", 400
        )

    cart = Cart.get_or_create(buyer.id)
    existing = CartItem.query.filter_by(
        cart_id=cart.id, animal_id=animal_id
    ).first()
    if existing:
        return error_response("This animal is already in your cart.", 409)

    try:
        item = CartItem(cart_id=cart.id, animal_id=animal_id)
        db.session.add(item)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Add to cart failed: {e}")
        return error_response("Failed to add item to cart.", 500)

    return success_response(
        data={
            "item_count": cart.item_count,
            "total":      cart.total,
        },
        message=f"{animal.name} added to cart.",
        status_code=201,
    )


# ─── DELETE /cart/items/:animal_id

@cart_bp.route("/items/<string:animal_id>", methods=["DELETE"])
@buyer_required
def remove_from_cart(animal_id: str):
    """
    Remove a specific animal from the buyer's cart.

    We use animal_id as the URL parameter (not cart_item_id) because the
    frontend always has the animal_id available from the listing data,
    and it is more semantically meaningful: "remove this animal from my cart"
    rather than "delete cart item #xyz".
    """
    buyer = g.current_user
    cart = Cart.query.filter_by(buyer_id=buyer.id).first()

    if not cart:
        return error_response("Cart not found.", 404)

    item = CartItem.query.filter_by(
        cart_id=cart.id, animal_id=animal_id
    ).first()
    if not item:
        return error_response("Item not found in cart.", 404)

    try:
        db.session.delete(item)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Failed to remove item.", 500)

    return success_response(
        data={
            "item_count": cart.item_count,
            "total":      cart.total,
        },
        message="Item removed from cart.",
    )


# ─── DELETE /cart

@cart_bp.route("", methods=["DELETE"])
@buyer_required
def clear_cart():
    """
    Remove all items from the buyer's cart.

    We delete the CartItem rows but keep the Cart row — the cart itself
    persists as an empty container. This is intentional: the buyer's cart
    ID remains stable, which matters if the frontend has cached a reference
    to it.
    """
    buyer = g.current_user
    cart = Cart.query.filter_by(buyer_id=buyer.id).first()

    if not cart or cart.item_count == 0:
        return success_response(message="Cart is already empty.")

    try:
        CartItem.query.filter_by(cart_id=cart.id).delete()
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Failed to clear cart.", 500)

    return success_response(message="Cart cleared.")
