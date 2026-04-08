"""

Role-based access control decorators.

HOW DECORATORS WORK AS MIDDLEWARE:
  When Flask receives a request, it calls the route function. Decorators
  let us intercept that call and run checks before the route executes.

  Without a decorator:
    @animals_bp.route("/animals", methods=["POST"])
    def create_animal():
        # Anyone can call this — including unauthenticated strangers
        ...

  With a decorator:
    @animals_bp.route("/animals", methods=["POST"])
    @farmer_required   ← runs BEFORE create_animal()
    def create_animal():
        # Only reaches here if the caller is an authenticated, verified farmer
        farmer = g.current_user   ← the user is attached to Flask's request context
        ...

DECORATOR STACKING ORDER (important):
  Decorators are applied bottom-up but execute top-down. The correct order is:
    @route(...)       ← 1. Flask registers the route
    @jwt_required()   ← 2. JWT-Extended verifies the token
    @farmer_required  ← 3. Our decorator checks the role

  If you put @farmer_required above @jwt_required(), the role check runs
  before the token is verified, which causes an error because there is no
  current user yet. Always put Flask-JWT-Extended's @jwt_required() closest
  to the function.

FLASK'S g OBJECT:
  `g` is Flask's per-request global storage. Data stored in `g` lives for
  exactly one request and is then discarded. We use it to pass the current
  user from the decorator to the route function, so routes can access
  g.current_user without making a second database query.

"""
from functools import wraps
from typing import Optional

from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.models.user import User, UserRole
from app.utils.response import error_response


def _load_user_from_jwt() -> Optional[User]:
    """
    Internal helper: extract the user ID from the JWT and load the User.

    get_jwt_identity() reads the 'sub' (subject) claim from the JWT — this
    is the user's ID that we set when creating the token in the login route.
    We then fetch the User from the database to get their current state
    (role, is_verified, is_active), because the JWT only carries the ID.

    WHY FETCH FROM THE DATABASE ON EVERY REQUEST?
      The JWT contains a snapshot of the user's ID at login time. But the
      user's account could have been deactivated since then. If we only
      trusted the JWT, a deactivated farmer could keep posting listings until
      their token expires. By fetching from the DB, we always reflect the
      current account state. The performance cost is one indexed lookup per
      request — acceptable for this use case.
    """
    user_id = get_jwt_identity()
    return User.find_by_id(user_id)


def jwt_auth_required(fn):
    """
    Verifies a valid JWT is present. Attaches the user to g.current_user.

    This is our base authentication decorator. Use this on routes that any
    authenticated user (farmer, buyer, or admin) can access.

    Usage:
        @some_bp.route("/profile")
        @jwt_auth_required
        def get_profile():
            user = g.current_user
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # verify_jwt_in_request() raises an exception (handled by our JWT
        # error handlers in __init__.py) if the token is missing, malformed,
        # expired, or revoked. We just call it and trust the error handlers.
        verify_jwt_in_request()

        user = _load_user_from_jwt()
        if not user:
            return error_response("User account not found or has been deactivated.", 401)

        if not user.is_active:
            return error_response("Your account has been deactivated. Contact support.", 403)

        # Attach user to Flask's request context so routes can access it
        # without making another DB query.
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def farmer_required(fn):
    """
    Requires the caller to be an authenticated, verified farmer.

    This decorator handles the full chain:
      1. Verifies the JWT
      2. Loads the user
      3. Checks the user is active
      4. Checks the user is verified (has clicked the email link)
      5. Checks the role is 'farmer'

    If any step fails, an appropriate error is returned before the route runs.

    Usage:
        @animals_bp.route("/animals", methods=["POST"])
        @farmer_required
        def create_animal():
            farmer = g.current_user
            profile = farmer.farmer_profile
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user = _load_user_from_jwt()
        if not user:
            return error_response("User account not found or has been deactivated.", 401)

        if not user.is_active:
            return error_response("Your account has been deactivated.", 403)

        # Unverified users are blocked from all protected actions.
        # This is the enforcement mechanism for the 2-step auth requirement.
        if not user.is_verified:
            return error_response(
                "Please verify your email address before accessing this feature.", 403
            )

        if user.role != UserRole.FARMER:
            return error_response(
                "This action requires a farmer account.", 403
            )

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def buyer_required(fn):
    """
    Requires the caller to be an authenticated, verified buyer.

    Usage:
        @cart_bp.route("/cart", methods=["GET"])
        @buyer_required
        def get_cart():
            buyer = g.current_user
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user = _load_user_from_jwt()
        if not user:
            return error_response("User account not found or has been deactivated.", 401)

        if not user.is_active:
            return error_response("Your account has been deactivated.", 403)

        if not user.is_verified:
            return error_response(
                "Please verify your email address before accessing this feature.", 403
            )

        if user.role != UserRole.BUYER:
            return error_response(
                "This action requires a buyer account.", 403
            )

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    """
    Requires the caller to be an authenticated admin.

    Used for platform management endpoints — creating animal types, breeds,
    managing users. In a production system this would also require
    multi-factor authentication on the admin account.

    Usage:
        @reference_bp.route("/animal-types", methods=["POST"])
        @admin_required
        def create_animal_type():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user = _load_user_from_jwt()
        if not user:
            return error_response("User account not found or has been deactivated.", 401)

        if not user.is_active:
            return error_response("Your account has been deactivated.", 403)

        if user.role != UserRole.ADMIN:
            return error_response(
                "Administrator access required.", 403
            )

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def verified_user_required(fn):
    """
    Requires any authenticated, verified user regardless of role.

    Use this on routes accessible to both farmers and buyers — for example,
    viewing their own profile or changing their password.

    Usage:
        @auth_bp.route("/auth/me")
        @verified_user_required
        def get_current_user():
            user = g.current_user
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()

        user = _load_user_from_jwt()
        if not user:
            return error_response("User account not found or has been deactivated.", 401)

        if not user.is_active:
            return error_response("Your account has been deactivated.", 403)

        if not user.is_verified:
            return error_response(
                "Please verify your email address to access this feature.", 403
            )

        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper
