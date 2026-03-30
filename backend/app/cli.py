"""

Custom Flask CLI commands.

WHY THIS FILE EXISTS — THE MIGRATION URL PROBLEM:
  Flask-Migrate's `flask db upgrade` command uses whatever URL is in
  SQLALCHEMY_DATABASE_URI at the time it runs. In production, that's our
  pooler URL (port 6543, Transaction mode). But migrations require a direct
  persistent connection (port 5432) because they use session-level Postgres
  features that the Transaction mode pooler resets between transactions.

  The naive fix — changing SQLALCHEMY_DATABASE_URI to the direct URL — breaks
  the running application because now every API request uses the direct
  connection and risks hitting Supabase's connection limit.

  Our fix: custom `db-upgrade` and `db-migrate` commands that temporarily
  override the database URL for the duration of the command, then restore it.
  The running application's URL is never touched.

USAGE:
  # Generate a new migration after changing a model
  flask db-migrate -m "add farm_name to farmer_profiles"

  # Apply pending migrations to Supabase
  flask db-upgrade

  # Roll back the most recent migration
  flask db-downgrade

"""
import os
import click
from flask import current_app
from flask.cli import with_appcontext
from app.extensions import db


def register_cli_commands(app):
    """
    Register all custom CLI commands with the Flask app.
    Called from create_app() after extensions are initialised.
    """

    @app.cli.command("db-migrate")
    @click.option("-m", "--message", default=None, help="Migration message")
    @with_appcontext
    def db_migrate(message):
        """
        Generate a new migration using the direct database connection.

        This is a wrapper around `flask db migrate` that temporarily
        switches to MIGRATION_DATABASE_URL before generating the script,
        ensuring the comparison happens against the real schema state.

        Usage: flask db-migrate -m "add status column to animals"
        """
        _run_migration_with_direct_url("migrate", message=message)

    @app.cli.command("db-upgrade")
    @with_appcontext
    def db_upgrade():
        """
        Apply pending migrations using the direct database connection.

        Upgrades the Supabase database to the latest migration version.
        Always uses MIGRATION_DATABASE_URL (direct, port 5432) to avoid
        the Transaction mode pooler breaking mid-migration.

        Usage: flask db-upgrade
        """
        _run_migration_with_direct_url("upgrade")

    @app.cli.command("db-downgrade")
    @with_appcontext
    def db_downgrade():
        """
        Roll back the most recent migration using the direct connection.

        Usage: flask db-downgrade
        """
        _run_migration_with_direct_url("downgrade")

    @app.cli.command("db-current")
    @with_appcontext
    def db_current():
        """Show the current migration revision on the database."""
        _run_migration_with_direct_url("current")

    @app.cli.command("create-tables")
    @with_appcontext
    def create_tables():
        """
        Create all tables directly from models (bypasses migrations).

        USE ONLY IN DEVELOPMENT OR FIRST-TIME SETUP.
        This is equivalent to `flask db upgrade` but without needing a
        migrations history. Useful for spinning up a brand-new Supabase
        project quickly. In production, always use db-upgrade instead
        so your schema changes are tracked and reversible.
        """
        migration_url = current_app.config.get(
            "MIGRATION_DATABASE_URL",
            current_app.config["SQLALCHEMY_DATABASE_URI"]
        )

        # Temporarily override the URI for this operation
        original_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
        current_app.config["SQLALCHEMY_DATABASE_URI"] = migration_url

        try:
            db.create_all()
            click.echo(
                click.style("✓ All tables created successfully.", fg="green")
            )
            click.echo(
                f"  Connected via: {_mask_password(migration_url)}"
            )
        except Exception as e:
            click.echo(click.style(f"✗ Failed to create tables: {e}", fg="red"))
            raise
        finally:
            # Always restore the original URI even if creation failed
            current_app.config["SQLALCHEMY_DATABASE_URI"] = original_uri

    @app.cli.command("check-db")
    @with_appcontext
    def check_db():
        """
        Verify the database connection is working.
        Tests both the pooler URL and the direct migration URL.
        Useful for diagnosing connection issues without starting the full server.

        Usage: flask check-db
        """
        from sqlalchemy import text

        def test_connection(label, url):
            from sqlalchemy import create_engine
            engine = create_engine(url)
            try:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT version()"))
                    version = result.scalar()
                    click.echo(click.style(f"  ✓ {label}", fg="green"))
                    click.echo(f"    {version[:60]}...")
            except Exception as e:
                click.echo(click.style(f"  ✗ {label}: {e}", fg="red"))
            finally:
                engine.dispose()

        click.echo("\nTesting database connections...\n")

        pooler_url = current_app.config["SQLALCHEMY_DATABASE_URI"]
        direct_url = current_app.config.get(
            "MIGRATION_DATABASE_URL", pooler_url
        )

        test_connection("Pooler URL (app connection)", pooler_url)
        test_connection("Direct URL (migration connection)", direct_url)
        click.echo()


def _run_migration_with_direct_url(command: str, **kwargs):
    """
    Internal helper: temporarily swap to MIGRATION_DATABASE_URL,
    run a Flask-Migrate command, then restore the original URL.

    This works because Flask-Migrate reads SQLALCHEMY_DATABASE_URI
    from the app config at the time it runs, not at startup.
    We exploit this to point it at the direct connection just for
    the duration of the migration command.
    """
    from flask_migrate import upgrade, downgrade, migrate, current

    migration_url = current_app.config.get(
        "MIGRATION_DATABASE_URL",
        current_app.config["SQLALCHEMY_DATABASE_URI"]
    )
    original_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]

    # Swap to direct connection
    current_app.config["SQLALCHEMY_DATABASE_URI"] = migration_url

    click.echo(f"\nUsing direct connection: {_mask_password(migration_url)}\n")

    try:
        if command == "migrate":
            migrate(message=kwargs.get("message"))
        elif command == "upgrade":
            upgrade()
        elif command == "downgrade":
            downgrade()
        elif command == "current":
            current()
    finally:
        # Restore pooler URL — always, even if migration failed
        current_app.config["SQLALCHEMY_DATABASE_URI"] = original_uri


def _mask_password(url: str) -> str:
    """
    Replace the password in a database URL with asterisks for safe logging.
    postgresql://user:PASSWORD@host/db → postgresql://user:***@host/db
    """
    import re
    return re.sub(r"(://[^:]+:)[^@]+(@)", r"\1***\2", url)