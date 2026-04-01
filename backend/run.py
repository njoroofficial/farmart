"""

Application entry point.

DEVELOPMENT:  python run.py
PRODUCTION:   gunicorn "run:app" --workers 4 --bind 0.0.0.0:5000

"""
import os
from app import create_app

# Create the app instance. 
app = create_app(os.getenv("FLASK_ENV", "development"))


if __name__ == "__main__":
    # This block only runs when you execute `python run.py` directly.
    # It does NOT run when Gunicorn imports this file.
    #
    # host="0.0.0.0" makes the server accessible from any network interface,
    # not just localhost. 
    #
    # debug=app.config["DEBUG"] reads from your config class so you never
    # accidentally run debug mode in production.
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=app.config["DEBUG"],
    )