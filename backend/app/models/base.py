"""

The BaseModel that all Farmart models inherit from.

WHY INHERITANCE AT THE MODEL LEVEL?
  Every table in our schema shares three concerns:
    1. A UUID primary key
    2. created_at and updated_at timestamps
    3. A way to serialise itself to a dictionary for JSON responses

"""
import uuid
from datetime import datetime, timezone

from app.extensions import db


class BaseModel(db.Model):
    """
    Abstract base model — never creates its own table.

    The __abstract__ = True declaration tells SQLAlchemy "this class defines
    shared columns but don't create a table for it". Only concrete subclasses
    (User, Animal, Order…) get real database tables.
    """
    __abstract__ = True

    # ── Primary Key 
    # default=lambda: str(uuid.uuid4()) generates a new UUID every time a
    # new record is created. The lambda is important — if you wrote
    # default=str(uuid.uuid4()), Python would evaluate it ONCE at class
    # definition time and every record would get the same UUID.
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # ── Timestamps 
    # timezone.utc ensures all timestamps are stored in UTC, not local time.
    # Always store UTC, convert to local time on the frontend.
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # onupdate fires automatically when SQLAlchemy saves changes to a record.
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def save(self):
        """
        Persist this model instance to the database.

        Combines add() and commit() into one call for convenience.

        """
        db.session.add(self)
        db.session.commit()
        return self

    def delete(self):
        """
        Remove this model instance from the database.
        """
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        """
        Convert this model instance to a Python dictionary.

        This is the bridge between the ORM world (Python objects) and
        the API world (JSON). Every model gets a default implementation
        that reflects all column values. Individual models can override
        this to include related data or exclude sensitive fields.
        
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Format datetime objects as ISO 8601 strings.
            # JavaScript's Date constructor parses this format natively.
            if isinstance(value, datetime):
                result[column.name] = value.strftime("%d %b %Y, %I:%M %p")
            else:
                result[column.name] = value
        return result

    def __repr__(self):
        """
        Readable string representation for debugging.
        When you print a model or see it in a Flask shell,
        you get <ClassName id=uuid-here> instead of a useless memory address.
        """
        return f"<{self.__class__.__name__} id={self.id}>"