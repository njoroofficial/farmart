"""

Reusable pagination logic for all list endpoints.

WHY PAGINATION IS NON-NEGOTIABLE:
  Without pagination, GET /animals returns every animal in the database
  in a single response. Day one this is fine — 10 animals. Six months in,
  when a farmer has 500 listings, a single request loads 500 full records
  including all their related data. Your API slows to a crawl, your
  database is hammered, and your React app tries to render 500 cards
  simultaneously.


HOW OUR PAGINATION WORKS:
  Clients send: GET /api/v1/animals?page=2&per_page=20
  We respond with 20 animals and a "meta" block:
    {
      "page": 2,
      "per_page": 20,
      "total": 142,
      "total_pages": 8,
      "has_next": true,
      "has_prev": true
    }

  The client uses "has_next" to know whether to show a "Load more" button.

"""
from flask import request
from app.config import Config


def get_pagination_params():
    """
    Extract and validate pagination parameters from the request query string.

    Reads 'page' and 'per_page' from the current Flask request's query string,
    applies sensible defaults, and enforces the maximum page size to prevent
    clients from requesting thousands of records at once.

    Returns:
        A tuple of (page: int, per_page: int)

    Called at the top of any list endpoint:
        page, per_page = get_pagination_params()
        animals = Animal.query.paginate(page=page, per_page=per_page)
    """

    # request.args is Flask's parsed query string dictionary.
    # get() with a default means we never raise a KeyError for missing params.
    # int() conversion with a try/except handles non-numeric values like
    # ?page=abc — we fall back to the default rather than crashing.
    try:
        page = int(request.args.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        per_page = int(request.args.get("per_page", Config.DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        per_page = Config.DEFAULT_PAGE_SIZE

    # Enforce boundaries. Page must be at least 1 — page 0 or negative
    # makes no sense. per_page is capped at MAX_PAGE_SIZE so clients can't
    # request arbitrarily large result sets.
    page = max(1, page)
    per_page = max(1, min(per_page, Config.MAX_PAGE_SIZE))

    return page, per_page


def paginate_query(query, page: int, per_page: int):
    """
    Apply pagination to a SQLAlchemy query and return items + total count.

    SQLAlchemy's .paginate() method handles the LIMIT and OFFSET SQL
    automatically. We just tell it which page we want.

    SQL equivalent of paginate(page=2, per_page=20):
        SELECT * FROM animals LIMIT 20 OFFSET 20;

    The OFFSET is calculated as: (page - 1) * per_page
    Page 1: OFFSET 0  (start from the beginning)
    Page 2: OFFSET 20 (skip the first 20)
    Page 3: OFFSET 40 (skip the first 40)

    Args:
        query:    A SQLAlchemy query object (e.g. Animal.query.filter(...))
        page:     Current page number (1-indexed)
        per_page: Number of items per page

    Returns:
        A tuple of (items: list, total: int)
        items is the list of model objects for the current page.
        total is the total count across ALL pages (for building meta).

    Example usage in a route:
        query = Animal.query.filter_by(status="available")
        animals, total = paginate_query(query, page, per_page)

        return success_response(
            data=[a.to_dict() for a in animals],
            meta=build_pagination_meta(page, per_page, total)
        )
    """
    # error_out=False means that if a client requests page 99 of a dataset
    # with only 50 items, SQLAlchemy returns an empty list rather than
    # raising a 404. We handle empty results gracefully in our routes.
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
    )
    return pagination.items, pagination.total
