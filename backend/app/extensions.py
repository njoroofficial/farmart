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


# ─── Database 

db = SQLAlchemy()

# Migrate handles database schema evolution.

migrate = Migrate()


# ─── Authentication 
# JWTManager adds JWT creation and verification to Flask.

jwt = JWTManager()


# ─── CORS 
# CORS enables our React frontend (on a different domain) to call our API.

cors = CORS()


# ─── Cloudinary 

cloudinary = cloudinary