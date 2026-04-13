"""
tests/conftest.py
─────────────────────────────────────────────────────────────────────────────
Shared pytest fixtures available to every test file.

WHAT IS A FIXTURE?
  A fixture is a function that sets up a piece of infrastructure that a test
  needs, and optionally tears it down afterwards. Instead of every test
  file creating its own Flask app and database, they all share the fixtures
  defined here. pytest injects them automatically by matching parameter names.

  Example: a test function with parameter `client` automatically receives
  the return value of the `client` fixture below — no import needed.

HOW THE TEST DATABASE WORKS:
  We create all tables before the test session starts and drop all tables
  after it ends. Between each individual test, we roll back any changes
  made during that test. This means:
    - Tests are completely isolated from each other
    - No test can affect another test's data
    - The database is clean at the start of every test
    - The test run is fast (rollback is much faster than recreating tables)
─────────────────────────────────────────────────────────────────────────────
"""
import pytest

from app import create_app
from app.extensions import db as _db
from app.models.user import User, UserRole, FarmerProfile, BuyerProfile


# ── App and DB fixtures ───────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    """
    Create a Flask app configured for testing — once per test session.

    scope="session" means this fixture is created once and shared across
    all tests in the session. Creating the app is relatively expensive;
    we only want to do it once.
    """
    app = create_app("testing")

    with app.app_context():
        # Create all tables from model definitions
        _db.create_all()
        yield app
        # Drop all tables after all tests have run
        _db.drop_all()


@pytest.fixture(scope="session")
def db(app):
    """
    Provide the database object — once per test session.
    Tests should not use this directly; use the `session` fixture instead.
    """
    return _db


@pytest.fixture(scope="function")
def session(db, app):
    """
    Provide a clean database session for each individual test.

    scope="function" means this runs before and after EVERY test function.
    We begin a transaction at the start of each test and roll it back at
    the end. Because rollback reverts all changes, each test starts with
    a clean slate without the overhead of recreating tables.

    WHY ROLLBACK INSTEAD OF TRUNCATE?
      db.session.rollback() is O(1) — it just discards the transaction log.
      TRUNCATE TABLE would have to touch every table. For a test suite with
      hundreds of tests, rollback keeps the suite fast.
    """
    with app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()

        # Bind the session to this connection so our test operations
        # participate in the same transaction we will roll back
        db.session.bind = connection

        yield db.session

        # After the test: roll back every change made during the test
        db.session.remove()
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(app):
    """
    Provide a Flask test client for making HTTP requests in tests.

    The test client simulates a real HTTP client — it can send GET, POST,
    PATCH, DELETE requests and read the response, all without a real network.
    """
    return app.test_client()


# ── User factory fixtures ─────────────────────────────────────────────────────
# These fixtures create real database records that tests can use.
# They are functions (scope="function") so each test gets fresh records
# with no state leaking from previous tests.

@pytest.fixture(scope="function")
def verified_farmer(session, app):
    """
    A fully set-up, verified farmer account ready for testing.

    Use this fixture in any test that needs an authenticated farmer —
    listing animals, managing orders, etc.
    """
    with app.app_context():
        user = User(
            email="farmer@test.com",
            role=UserRole.FARMER,
            first_name="Moses",
            last_name="Kamau",
            phone_number="+254712345001",
            is_verified=True,
        )
        user.set_password("Farmer@123")
        session.add(user)
        session.flush()

        profile = FarmerProfile(
            user_id=user.id,
            farm_name="Kamau Test Farms",
            farm_location="Murang'a, Kenya",
        )
        session.add(profile)
        session.commit()
        return user


@pytest.fixture(scope="function")
def verified_buyer(session, app):
    """A fully set-up, verified buyer account ready for testing."""
    with app.app_context():
        user = User(
            email="buyer@test.com",
            role=UserRole.BUYER,
            first_name="Jane",
            last_name="Wanjiku",
            phone_number="+254712345002",
            is_verified=True,
        )
        user.set_password("Buyer@123")
        session.add(user)
        session.flush()

        profile = BuyerProfile(
            user_id=user.id,
            default_delivery_address="Ngong Road, Nairobi",
        )
        session.add(profile)
        session.commit()
        return user


@pytest.fixture(scope="function")
def unverified_user(session, app):
    """
    A registered but unverified user.
    Use this to test that unverified users are blocked from protected routes.
    """
    with app.app_context():
        user = User(
            email="unverified@test.com",
            role=UserRole.BUYER,
            first_name="Unverified",
            last_name="User",
            is_verified=False,
        )
        user.set_password("Test@1234")
        session.add(user)
        session.commit()
        return user


@pytest.fixture(scope="function")
def farmer_auth_headers(client, verified_farmer, app):
    """
    JWT Authorization headers for the verified farmer.

    Tests that need to make authenticated requests as a farmer use this
    fixture instead of manually logging in and extracting the token.

    Usage in a test:
        def test_create_animal(client, farmer_auth_headers):
            response = client.post("/api/v1/animals",
                                   headers=farmer_auth_headers, json={...})
    """
    with app.app_context():
        response = client.post("/api/v1/auth/login", json={
            "email": "farmer@test.com",
            "password": "Farmer@123",
        })
        token = response.get_json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def buyer_auth_headers(client, verified_buyer, app):
    """JWT Authorization headers for the verified buyer."""
    with app.app_context():
        response = client.post("/api/v1/auth/login", json={
            "email": "buyer@test.com",
            "password": "Buyer@123",
        })
        token = response.get_json()["data"]["access_token"]
        return {"Authorization": f"Bearer {token}"}