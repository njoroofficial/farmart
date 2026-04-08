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
        
    def test_list_animals_success(self, client, session, app):
        """Listing should return available animals with pagination."""
        with app.app_context():
            # Create animal type and breed
            animal_type = AnimalType(name="Cattle", description="Farm cattle")
            session.add(animal_type)
            session.flush()
            
            breed = Breed(
                animal_type_id=animal_type.id,
                name="Friesian",
            )
            session.add(breed)
            session.flush()
            
            # Create a farmer and their animal
            from app.models.user import User, UserRole, FarmerProfile
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
            
            # Create animal listing
            animal = Animal(
                farmer_id=farmer.id,
                animal_type_id=animal_type.id,
                breed_id=breed.id,
                name="Bessie the Cow",
                description="Healthy dairy cow",
                age_months=24,
                price=150000.00,
                status=AnimalStatus.AVAILABLE,
            )
            session.add(animal)
            session.commit()
        
        # List animals
        response = client.get("/api/v1/animals")
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["animals"]) == 1
        assert data["data"]["animals"][0]["name"] == "Bessie the Cow"
        assert data["data"]["animals"][0]["status"] == "available"
    
    def test_list_animals_pagination(self, client, session, app):
        """Pagination should work correctly."""
        with app.app_context():
            from app.models.user import User, UserRole, FarmerProfile
            
            # Setup animal type and breed
            animal_type = AnimalType(name="Goat", description="Farm goats")
            session.add(animal_type)
            session.flush()

            breed = Breed(animal_type_id=animal_type.id, name="Boer")
            session.add(breed)
            session.flush()

            # Create farmer
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

            # Create multiple animals
            for i in range(25):
                animal = Animal(
                    farmer_id=farmer.id,
                    animal_type_id=animal_type.id,
                    breed_id=breed.id,
                    name=f"Goat {i+1}",
                    description="Test goat",
                    age_months=12,
                    price=50000.00 + (i * 1000),
                    status=AnimalStatus.AVAILABLE,
                )
                session.add(animal)
            session.commit()
            
        # Get first page
        response = client.get("/api/v1/animals?page=1&per_page=10")
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["animals"]) == 10
        assert data["data"]["pagination"]["page"] == 1
        assert data["data"]["pagination"]["total"] == 25

        # Get second page
        response = client.get("/api/v1/animals?page=2&per_page=10")
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["animals"]) == 10
        assert data["data"]["pagination"]["page"] == 2
        


            
            
            
            
        

            

