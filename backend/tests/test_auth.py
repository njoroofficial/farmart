"""
tests/test_auth.py
─────────────────────────────────────────────────────────────────────────────
Test suite for the authentication blueprint.

TEST NAMING CONVENTION:
  test_<endpoint>_<scenario>
  e.g. test_register_success, test_register_duplicate_email

  This makes failing tests immediately self-descriptive in the output.
  When you see "FAILED tests/test_auth.py::test_login_unverified_user",
  you know exactly what broke without reading the test body.

WHAT WE TEST:
  For each endpoint, we test:
    - The happy path (the flow that should succeed)
    - Every meaningful failure case
    - Edge cases and security boundaries

WHAT WE DON'T TEST:
  We don't test Flask internals or SQLAlchemy internals — they have their
  own test suites. We test our application's behaviour: given this HTTP
  request, what HTTP response should come back?
─────────────────────────────────────────────────────────────────────────────
"""
import pytest
from app.models.user import User, VerificationToken, TokenType


class TestRegister:
    """Tests for POST /api/v1/auth/register"""

    def test_register_farmer_success(self, client):
        """A complete, valid farmer registration should return 201."""
        response = client.post("/api/v1/auth/register", json={
            "email":         "mosesn579@gmail.com",
            "password":      "Farmer@123",
            "role":          "farmer",
            "first_name":    "John",
            "last_name":     "Mwangi",
            "phone_number":  "+254712000001",
            "farm_name":     "Mwangi Farms",
            "farm_location": "Kiambu, Kenya",
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data["status"] == "success"
        assert data["data"]["email"] == "newfarmer@test.com"
        assert data["data"]["role"] == "farmer"
        # Newly registered users must not be verified
        assert data["data"]["is_verified"] is False
        # Password must never appear in the response
        assert "password" not in data["data"]
        assert "password_hash" not in data["data"]

    def test_register_buyer_success(self, client):
        """A complete, valid buyer registration should return 201."""
        response = client.post("/api/v1/auth/register", json={
            "email":      "mosesnjorogewairimu@gmail.com",
            "password":   "Buyer@1234",
            "role":       "buyer",
            "first_name": "Ann",
            "last_name":  "Njeri",
        })
        assert response.status_code == 201
        assert response.get_json()["data"]["role"] == "buyer"

    def test_register_duplicate_email(self, client, verified_farmer):
        """Registering with an already-used email should return 409 Conflict."""
        response = client.post("/api/v1/auth/register", json={
            "email":         "mosesn579@gmail.com",  # already used by verified_farmer
            "password":      "Another@123",
            "role":          "buyer",
            "first_name":    "Duplicate",
            "last_name":     "User",
        })
        assert response.status_code == 409
        assert response.get_json()["status"] == "error"

    def test_register_invalid_email_format(self, client):
        """A malformed email should fail with 422."""
        response = client.post("/api/v1/auth/register", json={
            "email":      "not-an-email",
            "password":   "Valid@123",
            "role":       "buyer",
            "first_name": "Test",
            "last_name":  "User",
        })
        assert response.status_code == 422
        errors = response.get_json()["errors"]
        assert "email" in errors

    def test_register_weak_password(self, client):
        """A password that fails strength requirements should return 422 with field errors."""
        response = client.post("/api/v1/auth/register", json={
            "email":      "weakpass@test.com",
            "password":   "weak",          # too short, no uppercase, no digit
            "role":       "buyer",
            "first_name": "Test",
            "last_name":  "User",
        })
        assert response.status_code == 422
        errors = response.get_json()["errors"]
        assert "password" in errors
        # Should report multiple problems at once
        assert len(errors["password"]) > 1

    def test_register_farmer_missing_farm_name(self, client):
        """A farmer registration without farm_name should return 422."""
        response = client.post("/api/v1/auth/register", json={
            "email":         "nofarm@test.com",
            "password":      "Valid@123",
            "role":          "farmer",
            "first_name":    "No",
            "last_name":     "Farm",
            "farm_location": "Nairobi",
            # farm_name intentionally omitted
        })
        assert response.status_code == 422
        assert "farm_name" in response.get_json()["errors"]

    def test_register_missing_required_fields(self, client):
        """An empty request body should return 422 listing all missing fields."""
        response = client.post("/api/v1/auth/register", json={})
        assert response.status_code == 422
        errors = response.get_json()["errors"]
        for field in ["email", "password", "role", "first_name", "last_name"]:
            assert field in errors

    def test_register_invalid_role(self, client):
        """An unrecognised role value should return 422."""
        response = client.post("/api/v1/auth/register", json={
            "email":      "badrole@test.com",
            "password":   "Valid@123",
            "role":       "superuser",      # not a valid role
            "first_name": "Bad",
            "last_name":  "Role",
        })
        assert response.status_code == 422
        assert "role" in response.get_json()["errors"]

    def test_register_non_json_body(self, client):
        """Sending a non-JSON body should return 400."""
        response = client.post(
            "/api/v1/auth/register",
            data="not json",
            content_type="text/plain",
        )
        assert response.status_code == 400


class TestVerifyEmail:
    """Tests for POST /api/v1/auth/verify-email"""

    def test_verify_email_success(self, client, app, session):
        """A valid, unused token should verify the user and return 200."""
        # First register a user to get an unverified account
        client.post("/api/v1/auth/register", json={
            "email":      "toverify@test.com",
            "password":   "Verify@123",
            "role":       "buyer",
            "first_name": "To",
            "last_name":  "Verify",
        })

        # Find the token that was created during registration
        with app.app_context():
            user  = User.find_by_email("toverify@test.com")
            token = VerificationToken.query.filter_by(
                user_id=user.id,
                token_type=TokenType.EMAIL_VERIFICATION,
                is_used=False,
            ).first()

        response = client.post("/api/v1/auth/verify-email", json={
            "token": token.token,
        })
        assert response.status_code == 200
        assert response.get_json()["data"]["is_verified"] is True

    def test_verify_email_invalid_token(self, client):
        """A made-up token string should return 400."""
        response = client.post("/api/v1/auth/verify-email", json={
            "token": "completely-fake-token-that-does-not-exist",
        })
        assert response.status_code == 400

    def test_verify_email_already_used_token(self, client, app):
        """A token that has already been used should be rejected."""
        # Register and verify a user
        client.post("/api/v1/auth/register", json={
            "email":      "usedtoken@test.com",
            "password":   "Used@1234",
            "role":       "buyer",
            "first_name": "Used",
            "last_name":  "Token",
        })
        with app.app_context():
            user  = User.find_by_email("usedtoken@test.com")
            token = VerificationToken.query.filter_by(
                user_id=user.id,
                is_used=False,
            ).first()
            token_string = token.token

        # First use — should succeed
        client.post("/api/v1/auth/verify-email", json={"token": token_string})

        # Second use — should be rejected (token is now is_used=True)
        response = client.post("/api/v1/auth/verify-email", json={"token": token_string})
        assert response.status_code == 400

    def test_verify_email_missing_token(self, client):
        """Calling the endpoint without a token body should return 400."""
        response = client.post("/api/v1/auth/verify-email", json={})
        assert response.status_code == 400


class TestLogin:
    """Tests for POST /api/v1/auth/login"""

    def test_login_success(self, client, verified_farmer):
        """Valid credentials for a verified user should return a JWT."""
        response = client.post("/api/v1/auth/login", json={
            "email":    "farmer@test.com",
            "password": "Farmer@123",
        })
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "farmer@test.com"
        assert data["user"]["role"] == "farmer"
        # Confirm profile is included in login response
        assert "profile" in data["user"]
        assert data["user"]["profile"]["farm_name"] == "Kamau Test Farms"

    def test_login_wrong_password(self, client, verified_farmer):
        """A correct email with wrong password should return 401 with a vague message."""
        response = client.post("/api/v1/auth/login", json={
            "email":    "farmer@test.com",
            "password": "WrongPassword@1",
        })
        assert response.status_code == 401
        # Must not reveal whether it's the email or the password that's wrong
        assert "Invalid email or password" in response.get_json()["message"]

    def test_login_nonexistent_email(self, client):
        """An email that isn't registered should also return 401 — not 404."""
        response = client.post("/api/v1/auth/login", json={
            "email":    "nobody@test.com",
            "password": "Any@1234",
        })
        # Critically, must return 401 — not 404 (which would confirm the email doesn't exist)
        assert response.status_code == 401
        assert "Invalid email or password" in response.get_json()["message"]

    def test_login_unverified_user(self, client, unverified_user):
        """An unverified user should get a 403 with a message about email verification."""
        response = client.post("/api/v1/auth/login", json={
            "email":    "unverified@test.com",
            "password": "Test@1234",
        })
        assert response.status_code == 403
        assert "verify" in response.get_json()["message"].lower()

    def test_login_missing_fields(self, client):
        """Missing email or password should return 400."""
        response = client.post("/api/v1/auth/login", json={"email": "only@email.com"})
        assert response.status_code == 400

    def test_login_case_insensitive_email(self, client, verified_farmer):
        """Login should work regardless of email case — FARMER@TEST.COM == farmer@test.com."""
        response = client.post("/api/v1/auth/login", json={
            "email":    "FARMER@TEST.COM",
            "password": "Farmer@123",
        })
        assert response.status_code == 200


class TestAuthMe:
    """Tests for GET /api/v1/auth/me"""

    def test_me_returns_current_user(self, client, farmer_auth_headers):
        """An authenticated request should return the current user's profile."""
        response = client.get("/api/v1/auth/me", headers=farmer_auth_headers)
        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["email"] == "farmer@test.com"
        assert "profile" in data

    def test_me_without_token(self, client):
        """An unauthenticated request should return 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_me_with_invalid_token(self, client):
        """A malformed token should return 401."""
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": "Bearer this.is.not.a.valid.jwt"
        })
        assert response.status_code == 401


class TestForgotPassword:
    """Tests for POST /api/v1/auth/forgot-password"""

    def test_forgot_password_existing_email(self, client, verified_farmer):
        """A registered email should return 200 — same as a non-existent email."""
        response = client.post("/api/v1/auth/forgot-password", json={
            "email": "farmer@test.com",
        })
        assert response.status_code == 200

    def test_forgot_password_nonexistent_email(self, client):
        """A non-existent email must return 200 — never reveal whether email is registered."""
        response = client.post("/api/v1/auth/forgot-password", json={
            "email": "doesnotexist@test.com",
        })
        # Must be 200, not 404 — 404 would confirm the email isn't registered
        assert response.status_code == 200

    def test_forgot_password_missing_email(self, client):
        """Missing email field should return 400."""
        response = client.post("/api/v1/auth/forgot-password", json={})
        assert response.status_code == 400


class TestResetPassword:
    """Tests for POST /api/v1/auth/reset-password"""

    def test_reset_password_success(self, client, app, verified_farmer):
        """A valid reset token with a strong new password should succeed."""
        # Trigger the forgot-password flow to create a reset token
        client.post("/api/v1/auth/forgot-password", json={"email": "farmer@test.com"})

        with app.app_context():
            user  = User.find_by_email("farmer@test.com")
            token = VerificationToken.query.filter_by(
                user_id=user.id,
                token_type=TokenType.PASSWORD_RESET,
                is_used=False,
            ).first()

        response = client.post("/api/v1/auth/reset-password", json={
            "token":        token.token,
            "new_password": "NewSecure@456",
        })
        assert response.status_code == 200

        # Confirm the old password no longer works
        login_old = client.post("/api/v1/auth/login", json={
            "email":    "farmer@test.com",
            "password": "Farmer@123",
        })
        assert login_old.status_code == 401

        # Confirm the new password works
        login_new = client.post("/api/v1/auth/login", json={
            "email":    "farmer@test.com",
            "password": "NewSecure@456",
        })
        assert login_new.status_code == 200

    def test_reset_password_invalid_token(self, client):
        """A fake reset token should return 400."""
        response = client.post("/api/v1/auth/reset-password", json={
            "token":        "fake-reset-token",
            "new_password": "NewSecure@456",
        })
        assert response.status_code == 400

    def test_reset_password_weak_new_password(self, client, app, verified_farmer):
        """A weak new password should be rejected with validation errors."""
        client.post("/api/v1/auth/forgot-password", json={"email": "farmer@test.com"})
        with app.app_context():
            user  = User.find_by_email("farmer@test.com")
            token = VerificationToken.query.filter_by(
                user_id=user.id, token_type=TokenType.PASSWORD_RESET, is_used=False,
            ).first()

        response = client.post("/api/v1/auth/reset-password", json={
            "token":        token.token,
            "new_password": "weak",
        })
        assert response.status_code == 422
        assert "new_password" in response.get_json()["errors"]


class TestMiddleware:
    """Tests that verify the role-based access control decorators work correctly."""

    def test_farmer_cannot_access_buyer_route(self, client, farmer_auth_headers):
        """A farmer JWT should be rejected on buyer-only endpoints."""
        response = client.get("/api/v1/cart", headers=farmer_auth_headers)
        assert response.status_code == 403

    def test_buyer_cannot_access_farmer_route(self, client, buyer_auth_headers):
        """A buyer JWT should be rejected on farmer-only endpoints."""
        response = client.post("/api/v1/animals", headers=buyer_auth_headers, json={})
        assert response.status_code == 403

    def test_unauthenticated_request_to_protected_route(self, client):
        """Any protected route without a token should return 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401