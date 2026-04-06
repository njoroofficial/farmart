"""

Configuration system for the Farmart Flask application.

MODEL:
  Think of Config classes like profiles on a phone — Development is your
  personal settings (verbose logging, local DB), Production is locked down
  (no debug mode, real secrets from env vars), Testing is isolated
  (separate DB so tests never touch real data).

  The `config_by_name` dict at the bottom acts as the lookup table that
  create_app() uses to select the right class based on the environment name.

"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file variables into os.environ before anything reads them.

load_dotenv()


class Config:
    """
    Base configuration — settings shared across ALL environments.

    WHY SECRET_KEY MATTERS:
      Flask uses SECRET_KEY to cryptographically sign session cookies.
      If someone knows your secret key, they can forge session cookies and
      impersonate any user. It must be:
        1. A long random string (32+ characters)
        2. Never hardcoded in source code
        3. Different for every deployment environment
    """

    # Core Flask settings
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-change-in-production")
    DEBUG = False
    TESTING = False

    # ─── Database ────────────────────────────────────────────────────────────
    # WHY TWO DATABASE URLs?
    #   Supabase provides two connection modes and each serves a different
    #   purpose in our application. Think of it like a warehouse with two
    #   entrances: the main entrance handles day-to-day traffic efficiently
    #   (the pooler), while the loading dock is used only for large structural
    #   changes (direct connection for migrations).
    #
    #   DATABASE_URL       → The Connection Pooler (port 6543).
    #                        Used by the running Flask app for all API requests.
    #                        PgBouncer multiplexes many app connections into
    #                        fewer actual Postgres connections, preventing the
    #                        free tier's ~60 connection limit from being hit.
    #
    #   MIGRATION_DATABASE_URL → The Direct Connection (port 5432).
    #                        Used ONLY by Flask-Migrate when running
    #                        `flask db migrate` and `flask db upgrade`.
    #                        Migrations require a persistent session — the
    #                        Transaction mode pooler resets the session after
    #                        each transaction, which breaks migration scripts
    #                        that depend on session-level settings.
    #
    # SSL NOTE:
    #   Supabase rejects unencrypted connections. Both URLs must end with
    #   ?sslmode=require. SQLAlchemy passes this to psycopg2 which then
    #   negotiates a TLS connection to Supabase.

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/farmart_dev"
    )

    # The migration URL is read in the CLI context (flask db commands).
    # If not set, it falls back to the main DATABASE_URL
    MIGRATION_DATABASE_URL = os.getenv(
        "MIGRATION_DATABASE_URL",
        SQLALCHEMY_DATABASE_URI  # safe fallback for local dev
    )

    # SQLAlchemy engine options — passed directly to the underlying
    # psycopg2 connection pool. These tune connection behaviour for Supabase.
    SQLALCHEMY_ENGINE_OPTIONS = {
        # pool_pre_ping sends a lightweight SELECT 1 before handing a
        # connection from the pool to a route handler. If Supabase has
        # closed an idle connection on its side, this detects it and
        # fetches a fresh connection instead of crashing mid-request.
        "pool_pre_ping": True,

        # pool_recycle discards connections older than 300 seconds (5 min)
        # and creates fresh ones. Supabase's pooler closes idle connections
        # after a few minutes — recycling prevents "connection already closed"
        # errors on connections that have been sitting idle in the pool.
        "pool_recycle": 300,

        # pool_size is the number of persistent connections SQLAlchemy keeps
        # open. On Supabase free tier with ~60 total connections, and given
        # a typical Flask dev server or Render free instance runs 1-2 workers,
        # 5 is a sensible default that leaves headroom for other tools
        # (Supabase Studio, direct psql connections for debugging).
        "pool_size": 5,

        # max_overflow allows burst capacity above pool_size. If all 5
        # pooled connections are busy and a new request arrives, SQLAlchemy
        # opens up to 10 additional temporary connections to handle the spike,
        # then closes them once the burst subsides.
        "max_overflow": 10,
    }

    # Disable the SQLAlchemy event system that tracks object modifications.
    # We don't use it, and it has significant overhead — disabling it is
    # a standard Flask-SQLAlchemy best practice.
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Print all SQL queries to the console. Useful in dev, off in production.
    SQLALCHEMY_ECHO = False

    # JWT (JSON Web Tokens)
    # WHY JWT_SECRET_KEY IS SEPARATE FROM SECRET_KEY:
    #   If you use the same key for both Flask sessions and JWTs, a compromise
    #   of one compromises both. Separation of concerns is a security principle.
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-dev-fallback-change-this")

    # Access tokens expire after 1 day. The user needs to log in again after
    # this. A shorter expiry (15 min) is more secure but requires refresh tokens
    # — we keep it simple with 1 day for this project.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)

    # Where Flask-JWT-Extended looks for the token in incoming requests.
    # "headers" means: Authorization: Bearer <token>
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # CORS (Cross-Origin Resource Sharing)
    # WHY THIS MATTERS:
    #   Browsers block requests from one domain (React on Vercel) to a different
    #   domain (Flask on Render) by default — this is the Same-Origin Policy.
    #   CORS headers tell the browser "it's okay, I trust this origin."
    #   In production, we restrict this to our actual frontend URL.
    CORS_ORIGINS = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_SUPPORTS_CREDENTIALS = True

    #  Email (SendGrid)
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
    MAIL_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@farmart.co.ke")
    MAIL_FROM_NAME = "Farmart"

    #  Cloudinary
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

    # Resize all uploaded images to this width before storing.
    # This keeps storage costs down and page loads fast.
    CLOUDINARY_MAX_WIDTH = 1200

    #  Pagination defaults
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

    #  File Upload limits
    MAX_CONTENT_LENGTH = 25 * 1024 * 1024  # 25 MB max per request
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MAX_IMAGES_PER_ANIMAL = 5


class DevelopmentConfig(Config):
    """
    Development configuration — verbose, permissive, local.

    We flip DEBUG to True here, which does two things:
      1. Flask auto-reloads when you save a Python file (no restart needed)
      2. Flask shows the full error traceback in the browser — NEVER do this
         in production, as stack traces reveal your file structure and logic.
    """
    DEBUG = True

    # Echo SQL queries to the console so you can see exactly what SQLAlchemy
    # generates from your model queries. Invaluable for debugging N+1 problems.
    SQLALCHEMY_ECHO = True

    # Allow both localhost and 127.0.0.1 variants for Vite's dev server.
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


class TestingConfig(Config):
    """
    Testing configuration — isolated, fast, uses a separate database.

    CRITICAL: Tests use a completely separate database (farmart_test).
    If they used the dev database, running tests would delete your real data.
    The test runner creates this DB, runs tests, and tears it down cleanly.
    """
    TESTING = True
    DEBUG = True

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/farmart_test"
    )

    # Disable CSRF protection in tests — we test API endpoints directly
    WTF_CSRF_ENABLED = False

    # Very short token expiry for testing token expiration flows
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=5)

    # Use synchronous email sending in tests (no real emails sent)
    TESTING_EMAIL = True


class ProductionConfig(Config):
    """
    Production configuration — strict, secure, no debug output.

    In production, every sensitive value MUST come from an environment variable.
    If a required variable is missing, we raise an error immediately — it's
    better to crash at startup than to silently run with wrong config.
    """
    DEBUG = False
    SQLALCHEMY_ECHO = False

    @classmethod
    def validate(cls):
        """
        Called at startup to ensure all required production secrets are present.
        Raises a ValueError with a clear message if anything is missing,
        so the deployment fails fast and visibly rather than silently misbehaving.
        """
        required_vars = [
            "SECRET_KEY",
            "JWT_SECRET_KEY",
            "DATABASE_URL",
            "SENDGRID_API_KEY",
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
            "FRONTEND_URL",
        ]
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            raise ValueError(
                f"Production startup failed. Missing environment variables: "
                f"{', '.join(missing)}"
            )


#  Config lookup table
# create_app() receives a string like "development" and looks up the right
# class here. This is the only place you need to register a new config.
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
