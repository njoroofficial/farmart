"""


The Application Factory — the single function responsible for assembling
the entire Flask application.

WHY A FACTORY FUNCTION?

  The factory pattern gives you: create_app("testing") for tests,
  create_app("production") for deployment, create_app("development") locally.
  Each call produces a fully independent, correctly configured app instance.

ORDER OF INITIALISATION (do not reorder without understanding why):
  1. Create the Flask app object
  2. Load configuration (everything depends on this)
  3. Initialise extensions (db needs config, blueprints need db)
  4. Import and register models (needed before migrate can see them)
  5. Configure Cloudinary (uses its own global config API)
  6. Register blueprints (routes need everything above to be ready)
  7. Register error handlers (must come after blueprints)

"""
import os
import cloudinary as cloudinary_lib

from flask import Flask, jsonify

from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors


def create_app(config_name: str = None) -> Flask:
    """
    Create and configure a Flask application instance.

    Args:
        config_name: One of "development", "testing", "production".
                     Falls back to the FLASK_ENV environment variable,
                     then to "development" if neither is provided.

    Returns:
        A fully configured Flask application instance.
    """
    # 1. Resolve which config to use
    # Priority: argument passed to create_app > FLASK_ENV env var > "development"
    # This means tests can pass "testing" explicitly, and production servers
    # set FLASK_ENV=production in their environment.
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    # 2. Create the Flask app object
    # __name__ tells Flask where to look for templates and static files.
    # Since we don't serve HTML (pure API), this is mostly a convention.
    app = Flask(__name__)

    # 3. Load configuration
    # from_object() reads all uppercase attributes from the config class
    # and sets them as Flask config values. That's why all config keys
    # are UPPERCASE in config.py — Flask only reads uppercase keys.
    config_class = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(config_class)

    # In production, validate that all required secrets are present.
    # This causes a hard failure at startup rather than a mysterious runtime error.
    if config_name == "production":
        config_class.validate()

    # 4. Initialise extensions
    # init_app() binds each extension to this specific app instance.
    # After this point, db.session, jwt decorators, etc. all work correctly.
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=app.config["CORS_SUPPORTS_CREDENTIALS"],
    )

    # 5. Import models
    # Flask-Migrate needs to "see" all models to generate migration scripts.
    # We import them here inside the factory to ensure they register with db
    # in the context of this app. The imports themselves trigger the class
    # definitions, which register the tables with SQLAlchemy's metadata.
    #
    # If you add a new model file, add its import here.
    with app.app_context():
        from app.models import user, animal, cart, payment  # noqa: F401

    # 6. Configure Cloudinary
    # Cloudinary uses a global configuration pattern rather than Flask's
    # init_app pattern. We call it inside create_app so it reads from
    # whichever app.config is active (dev keys vs production keys).
    cloudinary_lib.config(
        cloud_name=app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=app.config["CLOUDINARY_API_KEY"],
        api_secret=app.config["CLOUDINARY_API_SECRET"],
        secure=True,  # Always use HTTPS URLs for images
    )

    # 7. Register custom CLI commands
    # Our custom `flask db-upgrade`, `flask db-migrate`, and `flask check-db`
    # commands live in cli.py. They wrap Flask-Migrate's standard commands
    # but force the use of MIGRATION_DATABASE_URL (the direct Supabase
    # connection) instead of the pooler URL. See app/cli.py for full details.
    from app.cli import register_cli_commands
    register_cli_commands(app)

    # 8. Register blueprints
    # Blueprints are Flask's way of grouping related routes into modules.
    # Each domain (auth, animals, orders…) is its own Blueprint.
    # We pass url_prefix so every auth route starts with /api/v1/auth, etc.
    #
    # WHY VERSIONING (/api/v1/)?
    #   If you ever need to change how an endpoint works in a breaking way,
    #   you can add /api/v2/ routes without removing v1. Existing clients
    #   (mobile apps that haven't updated) keep working on v1.
    _register_blueprints(app)

    # ── 8. Register error handlers
    # Centralised error handling means we never return raw Flask HTML error
    # pages from a JSON API. Every error — 404, 422, 500 — returns a
    # consistent JSON envelope that the frontend can reliably parse.
    _register_error_handlers(app)

    # ── 9. Register the health check endpoint
    # A health check is a simple endpoint that returns 200 OK when the app
    # is running. Render uses this to know your deployment succeeded.
    # GitHub Actions can ping it after deployment to confirm the service is up.
    @app.route("/health")
    def health():
        return jsonify({
            "status": "healthy",
            "service": "farmart-api",
            "environment": config_name,
        }), 200

    return app


def _register_blueprints(app: Flask) -> None:
    """
    Register all route blueprints with the application.

    Each import is inside this function to avoid circular imports —
    routes import from extensions (db, jwt), which are already initialised
    by the time this function is called.

    """
    from app.routes.auth import auth_bp
    from app.routes.reference import reference_bp
    from app.routes.animals import animals_bp
    from app.routes.cart import cart_bp
    from app.routes.orders import orders_bp
    from app.routes.payments import payments_bp

    API_PREFIX = "/api/v1"

    app.register_blueprint(auth_bp,      url_prefix=f"{API_PREFIX}/auth")
    app.register_blueprint(reference_bp, url_prefix=f"{API_PREFIX}")
    app.register_blueprint(animals_bp,   url_prefix=f"{API_PREFIX}/animals")
    app.register_blueprint(cart_bp,      url_prefix=f"{API_PREFIX}/cart")
    app.register_blueprint(orders_bp,    url_prefix=f"{API_PREFIX}")
    app.register_blueprint(payments_bp,  url_prefix=f"{API_PREFIX}/payments")


def _register_error_handlers(app: Flask) -> None:
    """
    Register centralised JSON error handlers for all HTTP error codes.

    Without these, Flask returns HTML error pages. Our React frontend
    expects JSON — an HTML response would crash JSON.parse() on the client.

    WHAT EACH CODE MEANS IN THIS API:
      400 Bad Request   — client sent malformed data (e.g. invalid JSON body)
      401 Unauthorised  — no token provided
      403 Forbidden     — token valid, but role doesn't have permission
      404 Not Found     — resource doesn't exist
      405 Method Not Allowed — wrong HTTP verb for this endpoint
      422 Unprocessable — validation failed (e.g. missing required field)
      429 Too Many Requests — rate limit exceeded
      500 Internal Server Error — our bug, not the client's fault
    """
    from app.utils.response import error_response

    @app.errorhandler(400)
    def bad_request(e):
        return error_response("Bad request. Check your request body.", 400)

    @app.errorhandler(401)
    def unauthorised(e):
        return error_response("Authentication required. Please log in.", 401)

    @app.errorhandler(403)
    def forbidden(e):
        return error_response(
            "You do not have permission to perform this action.", 403
        )

    @app.errorhandler(404)
    def not_found(e):
        return error_response("The requested resource was not found.", 404)

    @app.errorhandler(405)
    def method_not_allowed(e):
        return error_response(
            "HTTP method not allowed for this endpoint.", 405
        )

    @app.errorhandler(422)
    def unprocessable(e):
        return error_response(
            "Validation failed. Check your input data.", 422
        )

    @app.errorhandler(429)
    def rate_limited(e):
        return error_response(
            "Too many requests. Please slow down.", 429
        )

    @app.errorhandler(500)
    def server_error(e):
        # Log the actual exception in production (do not expose it to clients)
        app.logger.error(f"Internal server error: {e}")
        return error_response(
            "An unexpected error occurred. Our team has been notified.", 500
        )

    # ── JWT-specific error handlers ──────────────────────────────────────────
    # Flask-JWT-Extended raises its own exceptions when tokens are missing
    # or invalid. We intercept them to return consistent JSON responses.

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response("Your session has expired. Please log in again.", 401)

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response("Invalid token. Please log in again.", 401)

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return error_response(
            "No authentication token provided. Please log in.", 401
        )

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response("Your token has been revoked. Please log in again.", 401)
