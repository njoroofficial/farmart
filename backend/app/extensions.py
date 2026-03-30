"""

All Flask extension objects are created here — without initialisation.

THE CIRCULAR IMPORT PROBLEM (and why this file exists):
  Naive approach:
    app/__init__.py → creates Flask app → creates db = SQLAlchemy(app)
    app/models/user.py → from app import db   ← PROBLEM: app isn't ready yet
                                                 when models first import

  The fix — deferred initialisation:
    extensions.py → db = SQLAlchemy()          (just the object, no app yet)
    models/user.py → from app.extensions import db  ← safe, always available
    app/__init__.py → db.init_app(app)         (bind to app after it's created)

  This pattern is called the "Application Factory" pattern and is the
  Flask community's standard approach for any non-trivial application.

RULE: Nothing in this file should import from anywhere else in the app.
      This file must be importable from anywhere, at any time.

"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
import cloudinary


# ─── Database ────────────────────────────────────────────────────────────────
# SQLAlchemy is our ORM (Object-Relational Mapper).
# It lets us define database tables as Python classes (models) and write
# queries as Python method calls instead of raw SQL.
# db.session is the transaction manager — all DB writes go through it.
db = SQLAlchemy()

# Migrate handles database schema evolution.
# When you add a column to a model, instead of dropping and recreating the
# table (losing all data), Migrate generates a migration script that applies
# only the change. Think of it as git for your database schema.
migrate = Migrate()


# ─── Authentication ──────────────────────────────────────────────────────────
# JWTManager adds JWT creation and verification to Flask.
# It provides decorators like @jwt_required() that we'll use on protected routes.
#
# HOW JWT WORKS (the 30-second explanation):
#   1. User logs in → server creates a signed token containing {user_id, role}
#   2. Client stores this token and sends it in every request header
#   3. Server verifies the signature (not a database lookup — just math)
#   4. Server extracts user_id and role from the verified token
#
# The "signed" part is critical: the token is encoded with our JWT_SECRET_KEY.
# Without the secret, the token can't be forged. This is why that key must
# stay secret and be rotated if ever compromised.
jwt = JWTManager()


# ─── CORS ────────────────────────────────────────────────────────────────────
# CORS enables our React frontend (on a different domain) to call our API.
# Without this, the browser's Same-Origin Policy blocks all cross-domain fetches.
#
# We configure the allowed origins in config.py (CORS_ORIGINS).
# Never use CORS(app, origins="*") in production — it allows ANY website
# to call your API, including malicious ones.
cors = CORS()


# ─── Cloudinary ──────────────────────────────────────────────────────────────
# Note: Cloudinary uses its own global config pattern, not Flask's init_app.
# We initialise it in create_app() directly using cloudinary.config().
# We import the module here so it's available throughout the app.
cloudinary = cloudinary