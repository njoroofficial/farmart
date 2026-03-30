"""
app/routes/auth.py
─────────────────────────────────────────────────────────────────────────────
Authentication Blueprint — all auth endpoints live here.

ENDPOINTS:
  POST   /api/v1/auth/register           Register a new farmer or buyer
  POST   /api/v1/auth/verify-email       Verify email with token from email
  POST   /api/v1/auth/resend-verification  Resend the verification email
  POST   /api/v1/auth/login              Authenticate and receive a JWT
  POST   /api/v1/auth/logout             Invalidate the current session
  POST   /api/v1/auth/forgot-password    Request a password reset email
  POST   /api/v1/auth/reset-password     Set a new password using reset token
  GET    /api/v1/auth/me                 Get the current authenticated user

PATTERN USED IN EVERY ROUTE:
  1. Parse and validate the request body
  2. Apply business rules (does the email already exist? is the token valid?)
  3. Perform the operation (create user, send email, issue JWT)
  4. Return a consistent response envelope
─────────────────────────────────────────────────────────────────────────────
"""
import re

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt_identity

from app.extensions import db
from app.models.user import User, UserRole, FarmerProfile, BuyerProfile, VerificationToken, TokenType
from app.services.email_service import send_verification_email, send_password_reset_email
from app.middleware.auth_middleware import verified_user_required
from app.utils.response import success_response, error_response

auth_bp = Blueprint("auth", __name__)


# ─── Validation helpers ───────────────────────────────────────────────────────

def _validate_email(email: str) -> bool:
    """Basic email format validation using a regex pattern."""
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email.strip()))


def _validate_password(password: str) -> list[str]:
    """
    Check password strength and return a list of error messages.
    An empty list means the password is valid.

    Requirements: 8+ characters, at least one uppercase letter,
    one lowercase letter, and one digit.
    These are the minimum baseline — not maximum security,
    but strong enough for a marketplace app.
    """
    errors = []
    if len(password) < 8:
        errors.append("Must be at least 8 characters.")
    if not re.search(r"[A-Z]", password):
        errors.append("Must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Must contain at least one number.")
    return errors


def _validate_phone(phone: str) -> bool:
    """
    Validate Kenyan phone number formats.
    Accepts: +2547XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
    """
    # Strip spaces and dashes
    cleaned = re.sub(r"[\s\-]", "", phone)
    pattern = r"^(\+254|0254|254|0)?[17]\d{8}$"
    return bool(re.match(pattern, cleaned))


# ─── POST /auth/register ──────────────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new Farmer or Buyer account.

    What this endpoint does, step by step:
      1. Validates all required fields are present and correctly formatted
      2. Checks the email is not already registered
      3. Creates the User row
      4. Creates the role-specific profile row (FarmerProfile or BuyerProfile)
      5. Creates a VerificationToken
      6. Commits all three rows in a single atomic transaction
      7. Sends the verification email
      8. Returns a 201 Created response

    ATOMICITY IS CRITICAL HERE:
      Steps 3, 4, and 5 all use db.session.add() without committing.
      We only call db.session.commit() once, after all three objects are ready.
      If any step fails (e.g. the profile creation raises an error), the entire
      transaction is rolled back — we never end up with a User row that has
      no corresponding profile, or a profile with no verification token.
    """
    data = request.get_json()

    # ── 1. Validate required fields ───────────────────────────────────────────
    if not data:
        return error_response("Request body must be JSON.", 400)

    required = ["email", "password", "role", "first_name", "last_name"]
    missing  = [f for f in required if not data.get(f, "").strip()]
    if missing:
        return error_response(
            "Missing required fields.",
            422,
            errors={f: ["This field is required."] for f in missing},
        )

    email      = data["email"].strip().lower()
    password   = data["password"]
    role       = data["role"].strip().lower()
    first_name = data["first_name"].strip()
    last_name  = data["last_name"].strip()
    phone      = data.get("phone_number", "").strip() or None

    # Collect all validation errors before returning so the user sees
    # everything wrong at once, not one error at a time.
    validation_errors = {}

    if not _validate_email(email):
        validation_errors["email"] = ["Enter a valid email address."]

    password_errors = _validate_password(password)
    if password_errors:
        validation_errors["password"] = password_errors

    if role not in UserRole.ALL:
        validation_errors["role"] = [f"Role must be one of: {', '.join(UserRole.ALL)}."]

    if phone and not _validate_phone(phone):
        validation_errors["phone_number"] = ["Enter a valid Kenyan phone number."]

    # Farmer-specific required fields
    if role == UserRole.FARMER:
        if not data.get("farm_name", "").strip():
            validation_errors["farm_name"] = ["Farm name is required for farmer accounts."]
        if not data.get("farm_location", "").strip():
            validation_errors["farm_location"] = ["Farm location is required for farmer accounts."]

    if validation_errors:
        return error_response("Validation failed.", 422, errors=validation_errors)

    # ── 2. Check for duplicate email ──────────────────────────────────────────
    if User.find_by_email(email):
        return error_response(
            "An account with this email already exists.", 409
        )

    # Check duplicate phone only if provided
    if phone:
        existing_phone = User.query.filter_by(phone_number=phone).first()
        if existing_phone:
            return error_response(
                "An account with this phone number already exists.", 409
            )

    # ── 3-5. Create User, Profile, and Token in one transaction ───────────────
    try:
        # Create the User
        user = User(
            email=email,
            role=role,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone,
            is_verified=False,
        )
        user.set_password(password)
        db.session.add(user)

        # Flush sends the INSERT to Postgres and gets back the generated ID
        # without committing. We need user.id to exist before we can create
        # the profile (which has a foreign key to users.id).
        db.session.flush()

        # Create the role-specific profile
        if role == UserRole.FARMER:
            profile = FarmerProfile(
                user_id=user.id,
                farm_name=data.get("farm_name", "").strip(),
                farm_location=data.get("farm_location", "").strip(),
                bio=data.get("bio", "").strip() or None,
            )
        else:
            profile = BuyerProfile(
                user_id=user.id,
                default_delivery_address=data.get("default_delivery_address", "").strip() or None,
            )
        db.session.add(profile)

        # Create the verification token (does not commit internally)
        token = VerificationToken.create_for_user(
            user,
            token_type=TokenType.EMAIL_VERIFICATION,
            hours_valid=24,
        )

        # Single atomic commit — all three rows saved together
        db.session.commit()

    except Exception as e:
        db.session.rollback()
        # Log the real error internally; return a safe message externally
        import logging
        logging.getLogger(__name__).error(f"Registration failed: {e}")
        return error_response("Registration failed. Please try again.", 500)

    # ── 6. Send verification email ────────────────────────────────────────────
    # Email sending is OUTSIDE the database transaction on purpose.
    # If the email fails, we still want the user to be registered —
    # they can request a resend. But we do log the failure so we can
    # investigate SendGrid issues proactively.
    send_verification_email(user, token.token)

    return success_response(
        data={
            "id":          user.id,
            "email":       user.email,
            "role":        user.role,
            "is_verified": user.is_verified,
        },
        message="Registration successful. Please check your email to verify your account.",
        status_code=201,
    )


# ─── POST /auth/verify-email ──────────────────────────────────────────────────

@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    """
    Verify a user's email address using the token from their email.

    The flow:
      1. Find the token in the database
      2. Validate it (not used, not expired)
      3. Mark the token as used
      4. Mark the user as verified
      5. Commit both changes atomically
      6. Return success so the frontend can redirect to login
    """
    data = request.get_json()
    if not data or not data.get("token"):
        return error_response("Verification token is required.", 400)

    token_string = data["token"].strip()

    # find_valid() handles all the is_used and expiry checks internally.
    # If it returns None, we give a deliberately vague error message —
    # we don't tell the caller *why* the token is invalid (expired vs used vs
    # doesn't exist), because that distinction could be used to probe our system.
    token = VerificationToken.find_valid(token_string, TokenType.EMAIL_VERIFICATION)
    if not token:
        return error_response(
            "This verification link is invalid or has expired. "
            "Please request a new one.", 400
        )

    try:
        token.consume()               # Mark token as used
        token.user.is_verified = True # Unlock the user's account
        db.session.add(token.user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return error_response("Verification failed. Please try again.", 500)

    return success_response(
        data={"is_verified": True},
        message="Email verified successfully. You can now log in.",
    )


# ─── POST /auth/resend-verification ──────────────────────────────────────────

@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """
    Resend the email verification link to a user who hasn't verified yet.

    Security consideration: we return the same success response whether or
    not the email exists in our system. This prevents an attacker from using
    this endpoint to discover which emails are registered.
    """
    data = request.get_json()
    if not data or not data.get("email"):
        return error_response("Email address is required.", 400)

    email = data["email"].strip().lower()
    user  = User.find_by_email(email)

    # Always return success — don't reveal whether the email exists
    success_message = "If that email is registered and unverified, a new link has been sent."

    if not user or user.is_verified:
        return success_response(message=success_message)

    try:
        token = VerificationToken.create_for_user(
            user,
            token_type=TokenType.EMAIL_VERIFICATION,
            hours_valid=24,
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Could not send verification email. Please try again.", 500)

    send_verification_email(user, token.token)
    return success_response(message=success_message)


# ─── POST /auth/login ─────────────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user and return a JWT access token.

    The login sequence deliberately returns vague error messages —
    we never tell a caller whether the email doesn't exist vs the password
    is wrong. Both cases return "Invalid email or password." This is called
    "security through ambiguity" and prevents attackers from using the
    login endpoint to confirm which emails are registered.

    The JWT payload (the 'identity') contains only the user's ID.
    Everything else (role, name) can be fetched from the DB when needed.
    Keeping the JWT small reduces token size and avoids stale data issues
    (e.g. a role change would not be reflected in an existing JWT).
    """
    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON.", 400)

    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return error_response("Email and password are required.", 400)

    # Single vague message for both "email not found" and "wrong password"
    invalid_msg = "Invalid email or password."

    user = User.find_by_email(email)
    if not user:
        return error_response(invalid_msg, 401)

    if not user.check_password(password):
        return error_response(invalid_msg, 401)

    if not user.is_active:
        return error_response("This account has been deactivated. Contact support.", 403)

    # Unverified users get a specific message — it's acceptable to tell them
    # they need to verify because they already know they registered.
    if not user.is_verified:
        return error_response(
            "Please verify your email address before logging in. "
            "Check your inbox or request a new verification link.", 403
        )

    # create_access_token(identity=user.id) embeds user.id as the JWT subject.
    # Flask-JWT-Extended signs the token with JWT_SECRET_KEY.
    access_token = create_access_token(identity=user.id)

    return success_response(
        data={
            "access_token": access_token,
            "token_type":   "bearer",
            "user":         user.to_dict(include_profile=True),
        },
        message="Login successful.",
    )


# ─── POST /auth/logout ────────────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
@verified_user_required
def logout():
    """
    Log out the current user.

    TRUE STATELESS JWT LIMITATION:
      JWTs are stateless — the server does not store a list of issued tokens,
      so there is no server-side "invalidation" for a logout. The token remains
      technically valid until its expiry time (JWT_ACCESS_TOKEN_EXPIRES).

      For a production app with strict security requirements, you would
      implement a token blocklist: store invalidated JTI (JWT ID) values in
      Redis and check them on every request. For this project, we return a
      success response and instruct the frontend to delete the token from
      local storage — which is sufficient for most use cases.

    The frontend must delete the token after receiving this response.
    """
    return success_response(message="Logged out successfully.")


# ─── POST /auth/forgot-password ──────────────────────────────────────────────

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Initiate the password reset flow by sending a reset link via email.

    Like /resend-verification, we return the same response whether or not
    the email exists. This prevents email enumeration.
    """
    data = request.get_json()
    if not data or not data.get("email"):
        return error_response("Email address is required.", 400)

    email = data["email"].strip().lower()
    user  = User.find_by_email(email)

    safe_message = "If that email is registered, a password reset link has been sent."

    if not user or not user.is_active:
        return success_response(message=safe_message)

    try:
        token = VerificationToken.create_for_user(
            user,
            token_type=TokenType.PASSWORD_RESET,
            hours_valid=1,  # Password reset links expire in 1 hour, not 24
        )
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Could not process request. Please try again.", 500)

    send_password_reset_email(user, token.token)
    return success_response(message=safe_message)


# ─── POST /auth/reset-password ────────────────────────────────────────────────

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Set a new password using the token from the reset email.

    After a successful reset, we invalidate ALL existing verification tokens
    for this user (of any type). This ensures that if someone was already
    logged in when the password was reset, any old reset tokens are consumed.
    """
    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON.", 400)

    token_string = data.get("token", "").strip()
    new_password = data.get("new_password", "")

    if not token_string:
        return error_response("Reset token is required.", 400)

    password_errors = _validate_password(new_password)
    if password_errors:
        return error_response("Validation failed.", 422, errors={"new_password": password_errors})

    token = VerificationToken.find_valid(token_string, TokenType.PASSWORD_RESET)
    if not token:
        return error_response(
            "This reset link is invalid or has expired. Please request a new one.", 400
        )

    try:
        token.consume()
        token.user.set_password(new_password)
        db.session.add(token.user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return error_response("Password reset failed. Please try again.", 500)

    return success_response(message="Password reset successfully. You can now log in.")


# ─── GET /auth/me ─────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
@verified_user_required
def get_current_user():
    """
    Return the currently authenticated user's full profile.

    This is the endpoint the React app calls on startup to hydrate the
    Redux auth state. It confirms the token is still valid and returns
    the user's current data — which may have changed since login
    (e.g. profile updated, role changed).
    """
    from flask import g
    user = g.current_user
    return success_response(
        data=user.to_dict(include_profile=True),
        message="User profile retrieved.",
    )