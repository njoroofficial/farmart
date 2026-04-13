"""

Standardised response helpers that enforce the API envelope pattern.

THE ENVELOPE PATTERN:
  Every response from this API — success or failure — wraps its payload
  in the same outer structure:

    {
      "status":  "success" | "error",
      "message": "Human-readable description",
      "data":    { ... } | [ ... ] | null,
      "meta":    { "page": 1, "per_page": 20, "total": 142, ... }  # paginated only
    }

  WHY THIS MATTERS FOR THE FRONTEND:
    The React frontend can write one piece of response-handling code
    that works for every endpoint. It always checks response.data.status,
    always reads from response.data.data, always reads pagination from
    response.data.meta. Without this consistency, every component would
    need bespoke parsing logic and the codebase becomes fragile.

  WHY "message" IS ALWAYS PRESENT:
    Errors need human-readable explanations. But successes benefit from
    them too — "Animal listed successfully" is more reassuring than just
    returning data silently. The message field serves both purposes.

"""
from flask import jsonify


def success_response(data=None, message="Request successful", status_code=200, meta=None):
    """
    Build a standardised success response envelope.

    Args:
        data:        The payload — a dict, list, or None.
        message:     Human-readable success message.
        status_code: HTTP status code (200 for fetches, 201 for creates).
        meta:        Pagination metadata dict, included only on list endpoints.

    Returns:
        A Flask Response object with JSON body and the given status code.

    Usage examples:
        # Simple object response
        return success_response(data=user.to_dict(), message="Profile loaded.")

        # Creation response
        return success_response(
            data=animal.to_dict(),
            message="Animal listed successfully.",
            status_code=201
        )

        # Paginated list response
        return success_response(
            data=[a.to_dict() for a in animals],
            message="Animals retrieved.",
            meta=build_pagination_meta(page, per_page, total)
        )
    """
    payload = {
        "status": "success",
        "message": message,
        "data": data,
    }

    # Only include "meta" key when pagination data is provided.
    # Non-paginated endpoints should not have a null "meta" key cluttering
    # the response — absence is cleaner than null.
    if meta is not None:
        payload["meta"] = meta

    return jsonify(payload), status_code


def error_response(message="An error occurred", status_code=400, errors=None):
    """
    Build a standardised error response envelope.

    Args:
        message:     High-level error description (user-facing).
        status_code: HTTP status code (400, 401, 403, 404, 422, 500…).
        errors:      Optional dict of field-level validation errors.
                     Used when multiple specific fields failed validation.

    Returns:
        A Flask Response object with JSON body and the given status code.

    Usage examples:
        # Simple error
        return error_response("Email already registered.", 409)

        # With field-level validation errors
        return error_response(
            message="Validation failed.",
            status_code=422,
            errors={
                "email": ["Not a valid email address."],
                "password": ["Must be at least 8 characters."]
            }
        )
    """
    payload = {
        "status": "error",
        "message": message,
        "data": None,
    }

    # Field-level errors are only included when present.
    # A simple 404 doesn't need an "errors" field — that would be noise.
    if errors is not None:
        payload["errors"] = errors

    return jsonify(payload), status_code


def build_pagination_meta(page: int, per_page: int, total: int) -> dict:
    """
    Build the standardised pagination metadata object.

    This is always used alongside success_response() on list endpoints.
    The frontend uses these values to render page controls and know
    when there's more data to fetch.

    Args:
        page:     The current page number (1-indexed).
        per_page: The number of items per page.
        total:    The total number of matching records in the database.

    Returns:
        A dict with page, per_page, total, and total_pages.

    Example output:
        {
            "page": 2,
            "per_page": 20,
            "total": 142,
            "total_pages": 8,
            "has_next": true,
            "has_prev": true
        }
    """
    import math

    # math.ceil ensures we always round up — 141 items at 20 per page
    # is 8 pages (the last page has only 1 item, not 20).
    total_pages = math.ceil(total / per_page) if per_page > 0 else 0

    return {
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }
