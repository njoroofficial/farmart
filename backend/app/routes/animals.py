"""
app/routes/animals.py

Animals Blueprint 

ENDPOINTS:
  GET    /api/v1/animals              List animals (public, with filters + pagination)
  POST   /api/v1/animals              Create a listing (farmer only, multipart)
  GET    /api/v1/animals/:id          Get a single animal detail (public)
  PATCH  /api/v1/animals/:id          Update a listing (farmer, owner only)
  DELETE /api/v1/animals/:id          Delete a listing (farmer, owner only)
  POST   /api/v1/animals/:id/images   Add more images to a listing (farmer, owner)
  DELETE /api/v1/animals/:id/images/:image_id  Delete a specific image

THE UPLOAD + DATABASE WRITE SEQUENCE:
  1. Validate all request fields and files — zero side effects on failure
  2. Upload all images to Cloudinary — compensate (delete uploads) on failure
  3. Write Animal + AnimalImages to database — compensate (delete uploads) on failure
  4. Return 201 Created

This sequence ensures that at any point of failure, both Cloudinary and
Postgres are returned to a consistent state before the error is returned.

"""
import logging

from flask import Blueprint, request, g

from app.extensions import db
from app.models.animal import Animal, AnimalType, Breed, AnimalImage, AnimalStatus
from app.middleware.auth_middleware import farmer_required, jwt_auth_required
from app.services.image_service import (
    upload_animal_images,
    delete_images_by_public_ids,
    delete_animal_images,
)
from app.utils.response import success_response, error_response, build_pagination_meta
from app.utils.pagination import get_pagination_params, paginate_query

logger = logging.getLogger(__name__)
animals_bp = Blueprint("animals", __name__)


# ─── Validation helpers ───────────────────────────────────────────────────────

def _parse_positive_number(value, label: str) -> tuple:
    """
    Parse a request field that should be a positive number.
    Returns (parsed_value, None) on success or (None, error_message) on failure.
    """
    try:
        parsed = float(value)
        if parsed <= 0:
            return None, f"{label} must be a positive number."
        return parsed, None
    except (TypeError, ValueError):
        return None, f"{label} must be a valid number."


def _parse_positive_int(value, label: str) -> tuple:
    """Parse a request field that should be a positive integer."""
    try:
        parsed = int(value)
        if parsed <= 0:
            return None, f"{label} must be a positive whole number."
        return parsed, None
    except (TypeError, ValueError):
        return None, f"{label} must be a valid whole number."


# ─── GET /animals ─────────────────────────────────────────────────────────────

@animals_bp.route("", methods=["GET"])
def list_animals():
    """
    List available animal listings with optional filtering and pagination.

    This is a public endpoint — no authentication required. Unauthenticated
    buyers can browse listings before deciding to register. The default
    status filter is 'available', meaning reserved and sold animals are
    hidden from public listings unless explicitly requested.

    QUERY PARAMETERS:
      page           integer  Page number (default: 1)
      per_page       integer  Items per page (default: 20, max: 100)
      animal_type_id uuid     Filter by animal type
      breed_id       uuid     Filter by breed
      age_min        integer  Minimum age in months
      age_max        integer  Maximum age in months
      price_min      decimal  Minimum price in KSh
      price_max      decimal  Maximum price in KSh
      search         string   Search in name and description
      status         string   'available' (default), 'reserved', 'sold'

    PERFORMANCE NOTE:
      We use lazy="select" on the animal relationships, which means each
      animal's type, breed, and images are loaded in separate queries.
      For a list of 20 animals this produces ~60 queries. At this project
      scale that is acceptable. A production optimisation would use
      db.joinedload() to eager-load related data in fewer queries.
    """
    page, per_page = get_pagination_params()

    # Collect all filter parameters from the query string.
    # We let build_list_query handle unknown or invalid filter values gracefully.
    filters = {
        "animal_type_id": request.args.get("animal_type_id"),
        "breed_id":        request.args.get("breed_id"),
        "search":          request.args.get("search"),
        "status":          request.args.get("status", AnimalStatus.AVAILABLE),
        "farmer_id":       request.args.get("farmer_id"),
    }

    # Parse numeric filters — invalid values are ignored rather than erroring,
    # because a buyer typing into a price range slider should not crash their
    # browsing experience if they type a letter accidentally.
    for key, label in [("age_min","age_min"),("age_max","age_max"),
                       ("price_min","price_min"),("price_max","price_max")]:
        raw = request.args.get(key)
        if raw is not None:
            try:
                filters[key] = float(raw)
            except ValueError:
                pass  # Invalid numeric filter is silently ignored

    query          = Animal.build_list_query(filters)
    animals, total = paginate_query(query, page, per_page)

    return success_response(
        data=[animal.to_dict(include_farmer=True) for animal in animals],
        message="Animals retrieved successfully.",
        meta=build_pagination_meta(page, per_page, total),
    )


# ─── POST /animals ────────────────────────────────────────────────────────────

@animals_bp.route("", methods=["POST"])
@farmer_required
def create_animal():
    """
    Create a new animal listing with images.

    This endpoint accepts multipart/form-data — not JSON — because it must
    receive both structured field data and binary image files in the same
    request. request.form contains the text fields, request.files contains
    the uploaded files.

    THE FOUR-PHASE UPLOAD SEQUENCE:
      Phase 1: Validate all fields and files (zero side effects on failure)
      Phase 2: Upload images to Cloudinary (internal compensation on failure)
      Phase 3: Write to database (compensate by deleting Cloudinary images on failure)
      Phase 4: Return 201 Created

    MULTIPART FORM FIELDS:
      name           string   required
      animal_type_id uuid     required
      breed_id       uuid     required
      age_months     integer  required, must be positive
      price          decimal  required, must be positive
      weight_kg      decimal  optional
      description    string   optional
      images         files    required, 1–5 files, JPG/PNG/WebP
    """
    farmer = g.current_user

    # ── Phase 1: Validate fields ───────────────────────────────────────────────
    form = request.form
    validation_errors = {}

    name = form.get("name", "").strip()
    if not name:
        validation_errors["name"] = ["Animal name is required."]

    animal_type_id = form.get("animal_type_id", "").strip()
    if not animal_type_id:
        validation_errors["animal_type_id"] = ["Animal type is required."]
    else:
        animal_type = AnimalType.query.get(animal_type_id)
        if not animal_type:
            validation_errors["animal_type_id"] = ["Animal type not found."]

    breed_id = form.get("breed_id", "").strip()
    if not breed_id:
        validation_errors["breed_id"] = ["Breed is required."]
    else:
        breed = Breed.query.get(breed_id)
        if not breed:
            validation_errors["breed_id"] = ["Breed not found."]
        elif "animal_type_id" not in validation_errors and breed.animal_type_id != animal_type_id:
            validation_errors["breed_id"] = ["This breed does not belong to the selected animal type."]

    age_months, age_err = _parse_positive_int(form.get("age_months"), "Age (months)")
    if age_err:
        validation_errors["age_months"] = [age_err]

    price, price_err = _parse_positive_number(form.get("price"), "Price")
    if price_err:
        validation_errors["price"] = [price_err]

    weight_kg = None
    if form.get("weight_kg"):
        weight_kg, w_err = _parse_positive_number(form.get("weight_kg"), "Weight")
        if w_err:
            validation_errors["weight_kg"] = [w_err]

    # Validate image files
    files = request.files.getlist("images")
    if not files or all(f.filename == "" for f in files):
        validation_errors["images"] = ["At least one image is required."]

    if validation_errors:
        return error_response("Validation failed.", 422, errors=validation_errors)

    # ── Phase 2: Upload images to Cloudinary ──────────────────────────────────
    # Filter out empty file entries (browsers sometimes include blank entries)
    valid_files = [f for f in files if f.filename != ""]
    upload_result = upload_animal_images(valid_files)

    if not upload_result.success:
        # image_service already cleaned up any partial uploads internally.
        # We just report the failure to the client.
        return error_response(
            upload_result.error or "Image upload failed. Please try again.",
            400,
        )

    # Collect public_ids so we can delete them if the DB write fails
    uploaded_public_ids = [img.cloudinary_public_id for img in upload_result.images]

    # ── Phase 3: Write to database ────────────────────────────────────────────
    # Both the Animal and all AnimalImage rows are added to the session before
    # a single commit. If the commit fails, nothing persists — clean database
    # state is maintained automatically by SQLAlchemy's session rollback.
    try:
        animal = Animal(
            farmer_id=farmer.id,
            animal_type_id=animal_type_id,
            breed_id=breed_id,
            name=name,
            age_months=age_months,
            price=price,
            weight_kg=weight_kg,
            description=form.get("description", "").strip() or None,
            status=AnimalStatus.AVAILABLE,
        )
        db.session.add(animal)
        # Flush to get animal.id before creating AnimalImage rows that reference it
        db.session.flush()

        for uploaded_img in upload_result.images:
            image_record = AnimalImage(
                animal_id=animal.id,
                cloudinary_public_id=uploaded_img.cloudinary_public_id,
                cloudinary_url=uploaded_img.cloudinary_url,
                is_primary=uploaded_img.is_primary,
            )
            db.session.add(image_record)

        db.session.commit()
        logger.info(f"Animal listing created: {animal.id} by farmer {farmer.id}")

    except Exception as e:
        db.session.rollback()
        logger.error(f"Database write failed after Cloudinary uploads: {e}")

        # ── Compensating action: delete the already-uploaded images ────────────
        # The database is now in a clean state (rolled back). But those images
        # are sitting on Cloudinary. We must delete them before returning,
        # otherwise they become permanent orphans.
        logger.info(f"Compensating: deleting {len(uploaded_public_ids)} Cloudinary images...")
        delete_images_by_public_ids(uploaded_public_ids)

        return error_response(
            "Failed to save your listing. Your images have been cleaned up. "
            "Please try again.",
            500,
        )

    # ── Phase 4: Return success ────────────────────────────────────────────────
    return success_response(
        data=animal.to_dict(include_farmer=True),
        message="Animal listing created successfully.",
        status_code=201,
    )


# ─── GET /animals/:id ─────────────────────────────────────────────────────────

@animals_bp.route("/<string:animal_id>", methods=["GET"])
def get_animal(animal_id: str):
    """
    Get the full detail of a single animal listing.

    Public endpoint — no auth required. Returns the farmer's contact
    information so a buyer can see who they would be dealing with.
    """
    animal = Animal.query.get(animal_id)
    if not animal:
        return error_response("Animal listing not found.", 404)

    return success_response(
        data=animal.to_dict(include_farmer=True),
        message="Animal retrieved successfully.",
    )


# ─── PATCH /animals/:id ───────────────────────────────────────────────────────

@animals_bp.route("/<string:animal_id>", methods=["PATCH"])
@farmer_required
def update_animal(animal_id: str):
    """
    Update a farmer's own animal listing.

    Accepts JSON — image updates use the separate image endpoints.
    Only the listing's owner can update it. We verify ownership explicitly
    rather than relying on the JWT role alone, because a farmer should never
    be able to edit another farmer's listing.

    UPDATABLE FIELDS:
      name, age_months, price, weight_kg, description

    STATUS TRANSITIONS:
      A farmer cannot directly set status to 'sold' or 'reserved' via this
      endpoint — those transitions happen through the order flow. They can
      set status back to 'available' if they want to remove a reservation
      that was made in error (admin function, handled separately in prod).
    """
    farmer = g.current_user
    animal = Animal.query.get(animal_id)

    if not animal:
        return error_response("Animal listing not found.", 404)

    if animal.farmer_id != farmer.id:
        return error_response(
            "You do not have permission to edit this listing.", 403
        )

    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON.", 400)

    # Update only fields that are explicitly provided in the request body.
    # This is a PATCH — missing fields mean "leave unchanged", not "set to null".
    validation_errors = {}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            validation_errors["name"] = ["Name cannot be empty."]
        else:
            animal.name = name

    if "age_months" in data:
        age, err = _parse_positive_int(data["age_months"], "Age (months)")
        if err:
            validation_errors["age_months"] = [err]
        else:
            animal.age_months = age

    if "price" in data:
        price, err = _parse_positive_number(data["price"], "Price")
        if err:
            validation_errors["price"] = [err]
        else:
            animal.price = price

    if "weight_kg" in data:
        if data["weight_kg"] is None:
            animal.weight_kg = None
        else:
            weight, err = _parse_positive_number(data["weight_kg"], "Weight")
            if err:
                validation_errors["weight_kg"] = [err]
            else:
                animal.weight_kg = weight

    if "description" in data:
        animal.description = data["description"].strip() or None

    if validation_errors:
        return error_response("Validation failed.", 422, errors=validation_errors)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Animal update failed: {e}")
        return error_response("Update failed. Please try again.", 500)

    return success_response(
        data=animal.to_dict(),
        message="Animal listing updated successfully.",
    )


# ─── DELETE /animals/:id ──────────────────────────────────────────────────────

@animals_bp.route("/<string:animal_id>", methods=["DELETE"])
@farmer_required
def delete_animal(animal_id: str):
    """
    Delete an animal listing and its Cloudinary images.

    ORDERING: We delete from the database first, then Cloudinary.
    Reason: if Cloudinary deletion fails, the listing is gone from the
    database so buyers cannot see it. Orphaned Cloudinary images are a
    storage cost problem, not a correctness problem. The reverse — delete
    from Cloudinary first, then fail on DB delete — would leave a listing
    visible to buyers with broken image URLs, which is worse.

    GUARD: Cannot delete an animal with a confirmed or pending order.
    """
    farmer = g.current_user
    animal = Animal.query.get(animal_id)

    if not animal:
        return error_response("Animal listing not found.", 404)

    if animal.farmer_id != farmer.id:
        return error_response("You do not have permission to delete this listing.", 403)

    if animal.status == AnimalStatus.RESERVED:
        return error_response(
            "Cannot delete an animal that is currently reserved in an active order. "
            "Wait for the order to be confirmed or rejected first.", 400
        )

    # Collect public_ids before the animal is deleted (cascades will remove image rows)
    public_ids = [img.cloudinary_public_id for img in animal.images]

    try:
        db.session.delete(animal)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Animal delete failed: {e}")
        return error_response("Delete failed. Please try again.", 500)

    # Database is clean. Now remove images from Cloudinary.
    # A failure here is logged but does not fail the response —
    # the listing is already gone from the buyer's perspective.
    if public_ids:
        delete_images_by_public_ids(public_ids)

    return success_response(message="Animal listing deleted successfully.")


# ─── POST /animals/:id/images ─────────────────────────────────────────────────

@animals_bp.route("/<string:animal_id>/images", methods=["POST"])
@farmer_required
def add_images(animal_id: str):
    """
    Upload additional images to an existing animal listing.

    Enforces the maximum 5-image limit across existing and new images combined.
    The same four-phase pattern applies: validate → upload → save → respond.
    """
    farmer = g.current_user
    animal = Animal.query.get(animal_id)

    if not animal:
        return error_response("Animal listing not found.", 404)
    if animal.farmer_id != farmer.id:
        return error_response("You do not have permission to modify this listing.", 403)

    from flask import current_app
    max_images      = current_app.config.get("MAX_IMAGES_PER_ANIMAL", 5)
    existing_count  = len(animal.images)
    files           = [f for f in request.files.getlist("images") if f.filename != ""]

    if not files:
        return error_response("No image files provided.", 400)

    if existing_count + len(files) > max_images:
        return error_response(
            f"This listing already has {existing_count} image(s). "
            f"You can add at most {max_images - existing_count} more.", 400
        )

    upload_result = upload_animal_images(files)
    if not upload_result.success:
        return error_response(upload_result.error or "Image upload failed.", 400)

    uploaded_public_ids = [img.cloudinary_public_id for img in upload_result.images]

    try:
        for uploaded_img in upload_result.images:
            image_record = AnimalImage(
                animal_id=animal.id,
                cloudinary_public_id=uploaded_img.cloudinary_public_id,
                cloudinary_url=uploaded_img.cloudinary_url,
                is_primary=False,  # Additional images are never primary
            )
            db.session.add(image_record)
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save new images for animal {animal_id}: {e}")
        delete_images_by_public_ids(uploaded_public_ids)
        return error_response("Failed to save images. Please try again.", 500)

    return success_response(
        data=[img.to_dict() for img in animal.images],
        message="Images added successfully.",
        status_code=201,
    )


# ─── DELETE /animals/:id/images/:image_id ────────────────────────────────────

@animals_bp.route("/<string:animal_id>/images/<string:image_id>", methods=["DELETE"])
@farmer_required
def delete_image(animal_id: str, image_id: str):
    """
    Delete a specific image from a listing.

    Prevents deletion of the last image — a listing must always have
    at least one image for buyers to see. If the primary image is deleted,
    the next remaining image is automatically promoted to primary.
    """
    farmer = g.current_user
    animal = Animal.query.get(animal_id)

    if not animal:
        return error_response("Animal listing not found.", 404)
    if animal.farmer_id != farmer.id:
        return error_response("You do not have permission to modify this listing.", 403)

    image = AnimalImage.query.filter_by(id=image_id, animal_id=animal_id).first()
    if not image:
        return error_response("Image not found.", 404)

    if len(animal.images) <= 1:
        return error_response(
            "Cannot delete the only image on a listing. "
            "Upload a replacement image first.", 400
        )

    public_id  = image.cloudinary_public_id
    was_primary = image.is_primary

    try:
        db.session.delete(image)
        db.session.flush()

        # If we just deleted the primary image, promote the next one
        if was_primary and animal.images:
            remaining = AnimalImage.query.filter_by(animal_id=animal_id).first()
            if remaining:
                remaining.is_primary = True
                db.session.add(remaining)

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        logger.error(f"Image delete failed: {e}")
        return error_response("Failed to delete image. Please try again.", 500)

    # Database is clean — now remove from Cloudinary
    delete_images_by_public_ids([public_id])

    return success_response(message="Image deleted successfully.")