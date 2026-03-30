"""

Application entry point. This is the file you run to start the Flask server.

DEVELOPMENT:  python run.py
PRODUCTION:   gunicorn "run:app" --workers 4 --bind 0.0.0.0:5000
              (Gunicorn is a production WSGI server — never use Flask's
               built-in server in production, it's single-threaded and
               not designed for real traffic)

HOW THIS FILE WORKS:
  `app` at module level is what Gunicorn imports. When you run this file
  directly (python run.py), the if __name__ == "__main__" block fires and
  starts Flask's development server.

  The FLASK_ENV environment variable controls which config class is used.
  If it's not set, create_app() defaults to "development".

"""
import os
from app import create_app

# Create the app instance. Gunicorn imports this module and uses `app`
# directly, so it must exist at module level (outside the if block below).
app = create_app(os.getenv("FLASK_ENV", "development"))


if __name__ == "__main__":
    # This block only runs when you execute `python run.py` directly.
    # It does NOT run when Gunicorn imports this file.
    #
    # host="0.0.0.0" makes the server accessible from any network interface,
    # not just localhost. This is required when running inside Docker or WSL2
    # so that your host machine can reach the Flask server.
    #
    # debug=app.config["DEBUG"] reads from your config class so you never
    # accidentally run debug mode in production.
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=app.config["DEBUG"],
    )