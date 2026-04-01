"""


Cloudinary image upload service with compensation logic.

RESPONSIBILITY:
  This service owns everything related to image lifecycle — uploading,
  resizing, and deleting. Routes call high-level functions like
  upload_animal_images(files) and delete_images(public_ids). The Cloudinary
  SDK mechanics stay here.

COMPENSATION PATTERN:
  All upload functions return a structured result that includes every
  public_id that was successfully uploaded. If the caller (the route handler)
  encounters a failure after calling this service, it uses those public_ids
  to call delete_images_by_public_ids() — cleaning up Cloudinary before
  returning an error to the client.

  This keeps the compensation logic close to where it is needed (the route)
  while keeping the Cloudinary mechanics centralised here.

IMAGE PROCESSING PIPELINE:
  Every image goes through this sequence before reaching Cloudinary:
    1. Extension check — only jpg, jpeg, png, webp accepted
    2. Size check — reject files over MAX_CONTENT_LENGTH
    3. Pillow resize — shrink to max 1200px wide, preserving aspect ratio
    4. Cloudinary upload — with eager transformation for thumbnail generation

  Resizing before upload serves two purposes: it reduces storage costs on
  Cloudinary and ensures consistent image dimensions across all listings.
  A farmer uploading a 12-megapixel DSLR photo and a buyer browsing on
  mobile data both benefit from the resize happening server-side.

"""
import io
import logging
from dataclasses import dataclass, field
from typing import List, Optional

import cloudinary
import cloudinary.uploader
from flask import current_app
from PIL import Image

logger = logging.getLogger(__name__)

# ─── Result types ─────────────────────────────────────────────────────────────

@dataclass
class UploadedImage:
    """
    Represents a successfully uploaded image.

    We use a dataclass rather than a plain dict so the rest of the codebase
    gets type hints and attribute access — upload_result.cloudinary_url is
    clearer than upload_result["cloudinary_url"].
    """
    cloudinary_public_id: str    # needed for transforms and deletion
    cloudinary_url:       str    # the secure HTTPS URL to store in the DB
    is_primary:           bool   # True for the first image uploaded


@dataclass
class UploadResult:
    """
    The complete result of an upload_animal_images() call.

    success=True means ALL images uploaded without error and images is
    a full list. success=False means at least one upload failed and images
    contains only those that succeeded before the failure (so the caller
    knows which ones to clean up via the compensation action).
    """
    success:  bool
    images:   List[UploadedImage] = field(default_factory=list)
    error:    Optional[str] = None


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _allowed_extension(filename: str) -> bool:
    """Check that the file extension is in our allowed set."""
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config.get("ALLOWED_IMAGE_EXTENSIONS", {"jpg","jpeg","png","webp"})


def _resize_image(file_bytes: bytes, max_width: int = 1200) -> bytes:
    """
    Resize an image so its width does not exceed max_width pixels,
    preserving the original aspect ratio. If the image is already
    narrower than max_width, it is returned unchanged.

    WHY RESIZE BEFORE CLOUDINARY?
      Cloudinary can resize on the fly via URL transformations, but that
      only helps at serve time. Uploading a 6000×4000 pixel RAW export
      wastes upload time, Cloudinary storage quota, and processing time
      for every subsequent transformation. We resize once at upload time
      so the stored original is already a reasonable size.

    WHY PILLOW INSTEAD OF CLOUDINARY'S INCOMING TRANSFORMATIONS?
      Cloudinary does offer incoming transformations (resize on ingest),
      but they require a paid plan feature. Pillow is free, runs on our
      server, and gives us control over the exact resize behaviour.

    Returns the resized image as JPEG bytes.
    Converting to JPEG on resize normalises the format — we store one
    format type in Cloudinary rather than a mix of png/jpg/webp/heic.
    """
    img = Image.open(io.BytesIO(file_bytes))

    # Convert palette-mode (P) or RGBA images to RGB before JPEG encoding.
    # JPEG does not support transparency (alpha channel). A PNG with
    # transparency would raise an error without this conversion.
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    original_width, original_height = img.size

    if original_width > max_width:
        # Calculate the proportional height for the new width
        ratio  = max_width / original_width
        new_height = int(original_height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)
        logger.debug(
            f"Resized image from {original_width}×{original_height} "
            f"to {max_width}×{new_height}"
        )

    # Save to a bytes buffer as JPEG with quality 85.
    # Quality 85 is the standard trade-off between file size and visual
    # quality — indistinguishable from 100 at normal viewing sizes.
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def _upload_single(
    image_bytes: bytes,
    folder: str,
    is_primary: bool,
) -> UploadedImage:
    """
    Upload a single image to Cloudinary and return an UploadedImage.

    Raises an exception if the upload fails — the caller handles cleanup.

    CLOUDINARY FOLDER STRUCTURE:
      We use a folder per resource type: "farmart/animals/".
      This keeps the Cloudinary media library organised and makes it easy
      to see all animal images at a glance in the dashboard.

    EAGER TRANSFORMATIONS:
      We generate a 400×300 thumbnail at upload time. Without eager
      transformations, the first request for the thumbnail URL would cause
      Cloudinary to generate it on the fly — slow for the first user who
      loads that listing. Eager generation means the thumbnail is ready
      immediately after upload.
    """
    max_width = current_app.config.get("CLOUDINARY_MAX_WIDTH", 1200)
    resized   = _resize_image(image_bytes, max_width=max_width)

    result = cloudinary.uploader.upload(
        resized,
        folder=folder,
        # resource_type="image" is explicit — avoids Cloudinary auto-detecting
        # the wrong type for unusual file contents.
        resource_type="image",
        # Generate a 400×300 thumbnail at upload time so it is cached and
        # ready immediately rather than generated on first request.
        eager=[{"width": 400, "height": 300, "crop": "fill", "gravity": "auto"}],
        eager_async=False,
    )

    return UploadedImage(
        cloudinary_public_id=result["public_id"],
        cloudinary_url=result["secure_url"],
        is_primary=is_primary,
    )


# ─── Public API ───────────────────────────────────────────────────────────────

def upload_animal_images(files: list) -> UploadResult:
    """
    Upload a list of image files for an animal listing.

    This is the main function called by the POST /animals route.

    FAILURE BEHAVIOUR:
      If any upload fails, we immediately delete every image that already
      succeeded (the compensation action), then return UploadResult(success=False).
      The caller does NOT need to call delete_images_by_public_ids() —
      this function cleans up internally on partial failure.

      If ALL uploads succeed, we return UploadResult(success=True) with all
      UploadedImage objects. The caller then writes to the database. If the
      database write fails, the caller must call delete_images_by_public_ids()
      using the public_ids from this result.

    WHY INTERNAL CLEANUP ON PARTIAL FAILURE?
      When three of five images have uploaded and the fourth fails, only this
      function knows which three succeeded and has their public_ids in memory.
      Once this function returns an error without the public_ids, the caller
      has no way to clean them up. We clean up here while we still have the
      information.

    Args:
        files: A list of FileStorage objects from Flask's request.files.

    Returns:
        UploadResult with success=True and all images, or
        UploadResult with success=False and an error message.
    """
    if not files:
        return UploadResult(success=False, error="No image files provided.")

    max_images = current_app.config.get("MAX_IMAGES_PER_ANIMAL", 5)
    if len(files) > max_images:
        return UploadResult(
            success=False,
            error=f"Maximum {max_images} images allowed per listing.",
        )

    # Validate all files before starting any uploads.
    # We reject bad files immediately without touching Cloudinary —
    # a validation failure has zero external side effects.
    for file in files:
        if not file.filename:
            return UploadResult(success=False, error="One or more files has no filename.")
        if not _allowed_extension(file.filename):
            return UploadResult(
                success=False,
                error=f"File '{file.filename}' is not an allowed image type. "
                      f"Use JPG, PNG, or WebP.",
            )

    uploaded: List[UploadedImage] = []
    folder = "farmart/animals"

    for index, file in enumerate(files):
        try:
            file_bytes = file.read()

            if len(file_bytes) == 0:
                raise ValueError(f"File '{file.filename}' is empty.")

            image = _upload_single(
                image_bytes=file_bytes,
                folder=folder,
                is_primary=(index == 0),  # First image is always the primary/thumbnail
            )
            uploaded.append(image)
            logger.info(f"Uploaded image {index + 1}/{len(files)}: {image.cloudinary_public_id}")

        except Exception as e:
            # This upload failed. Clean up everything that already succeeded.
            logger.error(f"Image upload failed on file {index + 1}: {e}")

            if uploaded:
                logger.info(f"Cleaning up {len(uploaded)} already-uploaded images...")
                public_ids = [img.cloudinary_public_id for img in uploaded]
                delete_images_by_public_ids(public_ids)

            return UploadResult(
                success=False,
                error=f"Image upload failed. Please check your files and try again.",
            )

    return UploadResult(success=True, images=uploaded)


def delete_images_by_public_ids(public_ids: List[str]) -> bool:
    """
    Delete a list of images from Cloudinary by their public_ids.

    This is the compensating action called when a database write fails
    after images have already been uploaded. It is also called when a
    farmer deletes an animal listing — we must remove the images from
    Cloudinary, not just the database rows.

    Cloudinary's delete_resources() accepts a list of public_ids and
    deletes them in a single API call, which is more efficient than
    one API call per image.

    Returns True if deletion succeeded, False if it failed.
    A failed deletion is logged but does not raise — we never want
    a cleanup failure to cause a second error on top of an existing one.
    """
    if not public_ids:
        return True

    try:
        result = cloudinary.uploader.destroy(public_ids[0]) if len(public_ids) == 1 \
            else cloudinary.api.delete_resources(public_ids)
        logger.info(f"Deleted {len(public_ids)} image(s) from Cloudinary.")
        return True
    except Exception as e:
        # Log but do not raise — a cleanup failure should not mask the
        # original error that triggered the cleanup.
        logger.error(f"Failed to delete images from Cloudinary: {e}. "
                     f"Manual cleanup needed for: {public_ids}")
        return False


def delete_animal_images(animal) -> bool:
    """
    Delete all Cloudinary images for a given animal model instance.

    Convenience wrapper called when a farmer deletes an animal listing.
    Collects all public_ids from the animal's images relationship and
    passes them to delete_images_by_public_ids().
    """
    public_ids = [img.cloudinary_public_id for img in animal.images]
    if not public_ids:
        return True
    return delete_images_by_public_ids(public_ids)