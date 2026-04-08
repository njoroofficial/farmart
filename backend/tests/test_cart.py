"""
tests/test_cart.py
─────────────────────────────────────────────────────────────────────────────
Test suite for the cart blueprint.
─────────────────────────────────────────────────────────────────────────────
"""
import pytest
from app.models.animal import Animal, AnimalType, Breed, AnimalStatus


class TestGetCart:
    """Tests for GET /api/v1/cart"""

    def test_get_cart_empty(self, client, buyer_auth_headers):
        """A buyer's empty cart should return empty items array."""
        response = client.get(
            "/api/v1/cart",
            headers=buyer_auth_headers,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["items"] == []
        assert data["data"]["item_count"] == 0
        assert data["data"]["total"] == 0

    def test_get_cart_with_items(self, client, buyer_auth_headers, session, app):
        """A cart with items should show all items and calculate total."""
        with app.app_context():
            from app.models.user import User, UserRole, FarmerProfile
            
            # Create animal type and breed
            animal_type = AnimalType(name="Cattle")
            session.add(animal_type)
            session.flush()

            breed = Breed(animal_type_id=animal_type.id, name="Friesian")
            session.add(breed)
            session.flush()

            # Create farmer and animal
            farmer = User(
                email="farmer@test.com",
                role=UserRole.FARMER,
                first_name="Test",
                last_name="Farmer",
                is_verified=True,
            )
            farmer.set_password("Test@1234")
            session.add(farmer)
            session.flush()

            profile = FarmerProfile(
                user_id=farmer.id,
                farm_name="Test Farm",
                farm_location="Kiambu",
            )
            session.add(profile)
            session.flush()
            
            animal = Animal(
                farmer_id=farmer.id,
                animal_type_id=animal_type.id,
                breed_id=breed.id,
                name="Bessie",
                description="Dairy cow",
                age_months=24,
                price=150000.00,
                status=AnimalStatus.AVAILABLE,
            )
            session.add(animal)
            session.commit()
            animal_id = animal.id

        # Add to cart first
        response = client.post(
            "/api/v1/cart/items",
            headers=buyer_auth_headers,
            json={"animal_id": animal_id},
        )
        assert response.status_code == 201

        # Now get the cart
        response = client.get(
            "/api/v1/cart",
            headers=buyer_auth_headers,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["item_count"] == 1
        assert data["data"]["total"] == 150000.00
        assert len(data["data"]["items"]) == 1
        
    def test_get_cart_unauthenticated(self, client):
        """Unauthenticated request should return 401."""
        response = client.get("/api/v1/cart")
        assert response.status_code == 401

    def test_get_cart_unavailable_items_flagged(self, client, buyer_auth_headers, session, app):
        """Items that become unavailable should be flagged in cart."""
        with app.app_context():
            from app.models.user import User, UserRole, FarmerProfile
            
            animal_type = AnimalType(name="Cattle")
            session.add(animal_type)
            session.flush()

            breed = Breed(animal_type_id=animal_type.id, name="Friesian")
            session.add(breed)
            session.flush()

            farmer = User(
                email="farmer@test.com",
                role=UserRole.FARMER,
                first_name="Test",
                last_name="Farmer",
                is_verified=True,
            )
            farmer.set_password("Test@1234")
            session.add(farmer)
            session.flush()

            profile = FarmerProfile(
                user_id=farmer.id,
                farm_name="Test Farm",
                farm_location="Kiambu",
            )
            session.add(profile)
            session.flush()

            animal = Animal(
                farmer_id=farmer.id,
                animal_type_id=animal_type.id,
                breed_id=breed.id,
                name="Cow",
                description="Test",
                age_months=12,
                price=100000.00,
                status=AnimalStatus.AVAILABLE,
            )
            session.add(animal)
            session.commit()
            animal_id = animal.id

        # Add to cart
        response = client.post(
            "/api/v1/cart/items",
            headers=buyer_auth_headers,
            json={"animal_id": animal_id},
        )
        assert response.status_code == 201

        # Mark animal as reserved
        with app.app_context():
            animal = Animal.query.get(animal_id)
            animal.status = AnimalStatus.RESERVED
            session.commit()

        # Get cart - should flag unavailable
        response = client.get(
             "/api/v1/cart",
            headers=buyer_auth_headers,
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["data"]["has_unavailable_items"] is True
        assert data["data"]["checkout_ready"] is False
            

