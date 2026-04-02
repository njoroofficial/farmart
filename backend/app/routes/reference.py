"""

Reference Data Blueprint — animal types and breeds.

These are the lookup tables that power the filter dropdowns and the animal
listing form. All read endpoints are public. Write endpoints are admin-only.

ENDPOINTS:
  GET    /api/v1/animal-types                 List all animal types
  POST   /api/v1/animal-types                 Create animal type (admin)
  GET    /api/v1/animal-types/:id/breeds      List breeds for a type
  POST   /api/v1/breeds                       Create a breed (admin)
  DELETE /api/v1/breeds/:id                   Delete a breed (admin)

WHY THESE ARE SEPARATE FROM ANIMALS:
  AnimalType and Breed are reference/configuration data — they change rarely
  and are shared across all listings. Keeping them in a separate blueprint
  makes it easy to cache them aggressively on the frontend (they rarely
  change) and lets us control write access independently of animal listings.

"""
import logging

from flask import Blueprint, request

from app.extensions import db
from app.models.animal import AnimalType, Breed
from app.middleware.auth_middleware import admin_required
from app.utils.response import success_response, error_response

logger = logging.getLogger(__name__)
reference_bp = Blueprint("reference", __name__)


# ─── GET /animal-types 

@reference_bp.route("/animal-types", methods=["GET"])
def list_animal_types():
    """
    Return all animal types ordered alphabetically.

    Public endpoint — the frontend calls this to populate the type filter
    chips on the browse screen and the type selector on the listing form.
    No pagination needed — there will never be more than a handful of types.
    """
    types = AnimalType.query.order_by(AnimalType.name).all()
    return success_response(
        data=[t.to_dict() for t in types],
        message="Animal types retrieved.",
    )


# ─── POST /animal-types 

@reference_bp.route("/animal-types", methods=["POST"])
@admin_required
def create_animal_type():
    """
    Create a new animal type. Admin only.

    The name is normalised to Title Case before saving so "cattle", "CATTLE",
    and "Cattle" all resolve to the same thing. The unique constraint on the
    name column enforces no duplicates at the database level — we check
    first to return a friendlier 409 than a raw constraint violation.
    """
    data = request.get_json()
    if not data or not data.get("name", "").strip():
        return error_response("Animal type name is required.", 400)

    name = data["name"].strip().title()

    if AnimalType.find_by_name(name):
        return error_response(f"Animal type '{name}' already exists.", 409)

    animal_type = AnimalType(
        name=name,
        description=data.get("description", "").strip() or None,
    )
    try:
        db.session.add(animal_type)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create animal type: {e}")
        return error_response("Failed to create animal type.", 500)

    return success_response(
        data=animal_type.to_dict(),
        message=f"Animal type '{name}' created.",
        status_code=201,
    )


# ─── GET /animal-types/:id/breeds 

@reference_bp.route("/animal-types/<string:type_id>/breeds", methods=["GET"])
def list_breeds_for_type(type_id: str):
    """
    Return all breeds belonging to a specific animal type.

    The frontend calls this dynamically when a farmer selects an animal type
    on the listing form — the breed dropdown cascades from this selection.
    Returning breeds scoped to the selected type prevents nonsense combinations
    like a "Friesian" Goat appearing in the breed selector when Cattle is chosen.
    """
    animal_type = AnimalType.query.get(type_id)
    if not animal_type:
        return error_response("Animal type not found.", 404)

    breeds = Breed.query.filter_by(
        animal_type_id=type_id
    ).order_by(Breed.name).all()

    return success_response(
        data=[b.to_dict() for b in breeds],
        message=f"Breeds for {animal_type.name} retrieved.",
    )


# ─── POST /breeds 

@reference_bp.route("/breeds", methods=["POST"])
@admin_required
def create_breed():
    """
    Create a new breed under an animal type. Admin only.

    The unique constraint is (animal_type_id, name) — the same breed name
    can exist under different types but not twice under the same type.
    """
    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON.", 400)

    animal_type_id = data.get("animal_type_id", "").strip()
    name           = data.get("name", "").strip().title()

    if not animal_type_id:
        return error_response("animal_type_id is required.", 422)
    if not name:
        return error_response("Breed name is required.", 422)

    animal_type = AnimalType.query.get(animal_type_id)
    if not animal_type:
        return error_response("Animal type not found.", 404)

    existing = Breed.query.filter_by(
        animal_type_id=animal_type_id,
        name=name,
    ).first()
    if existing:
        return error_response(
            f"Breed '{name}' already exists under {animal_type.name}.", 409
        )

    breed = Breed(
        animal_type_id=animal_type_id,
        name=name,
        description=data.get("description", "").strip() or None,
    )
    try:
        db.session.add(breed)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create breed: {e}")
        return error_response("Failed to create breed.", 500)

    return success_response(
        data=breed.to_dict(),
        message=f"Breed '{name}' created under {animal_type.name}.",
        status_code=201,
    )


# ─── DELETE /breeds/:id 

@reference_bp.route("/breeds/<string:breed_id>", methods=["DELETE"])
@admin_required
def delete_breed(breed_id: str):
    """
    Delete a breed. Admin only.

    Guard: we prevent deletion if any active (non-sold) animal listings
    reference this breed, because that would leave those listings with a
    broken breed foreign key. Sold animals retain their breed reference
    for historical accuracy.
    """
    breed = Breed.query.get(breed_id)
    if not breed:
        return error_response("Breed not found.", 404)

    from app.models.animal import Animal, AnimalStatus
    active_count = Animal.query.filter(
        Animal.breed_id == breed_id,
        Animal.status != AnimalStatus.SOLD,
    ).count()

    if active_count > 0:
        return error_response(
            f"Cannot delete '{breed.name}' — {active_count} active listing(s) "
            f"use this breed. Remove or relist those animals first.", 409
        )

    try:
        db.session.delete(breed)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Failed to delete breed.", 500)

    return success_response(message=f"Breed '{breed.name}' deleted.")