"""
tests/test_animals.py
─────────────────────────────────────────────────────────────────────────────
Test suite for the animals blueprint (listing management).
─────────────────────────────────────────────────────────────────────────────
"""
import pytest
from app.models.animal import Animal, AnimalType, Breed, AnimalStatus

class TestListAnimals:
    """Tests for GET /api/v1/animals"""

    def test_list_animals_empty(self, client):
        """Listing animals when none exist should return empty array."""
        response = client.get("/api/v1/animals")
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["animals"] == []
