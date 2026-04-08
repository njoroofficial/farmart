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
    
    def test_list_animals_filter_by_type(self, client, session, app):
        """Filtering by animal type should work."""
        with app.app_context():
            from app.models.user import User, UserRole, FarmerProfile
            
            # Create two animal types
            cattle = AnimalType(name="Cattle")
            goat = AnimalType(name="Goat")
            session.add_all([cattle, goat])
            session.flush()

            # Create breeds
            friesian = Breed(animal_type_id=cattle.id, name="Friesian")
            boer = Breed(animal_type_id=goat.id, name="Boer")
            session.add_all([friesian, boer])
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

            # Create one of each type
            animal1 = Animal(
                farmer_id=farmer.id,
                animal_type_id=cattle.id,
                breed_id=friesian.id,
                name="Bessie",
                description="Diary cow",
                age_months=24,
                price=150000.00,
                status=AnimalStatus.AVAILABLE,
            )
            animal2 = Animal(
                farmer_id=farmer.id,
                animal_type_id=goat.id,
                breed_id=boer.id,
                name="Billy",
                description="Meat goat",
                age_months=18,
                price=50000.00,
                status=AnimalStatus.AVAILABLE,
            )
            session.add_all([animal1, animal2])
            session.commit()

        # Filter by cattle type
        response = client.get(f"/api/v1/animals?animal_type_id={cattle.id}")
        assert response.status_code == 200
        data = response.get_json()
        assert len(data["data"]["animals"]) == 1
        assert data["data"]["animals"][0]["name"] == "Bessie"
        
    def test_list_animals_filter_price_range(self, client, session, app):
        """Filtering by price range should work."""
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

            # Create animals at different price points
            prices = [50000, 100000, 150000, 200000]
            for i, price in enumerate(prices):
                animal = Animal(
                    farmer_id=farmer.id,
                    animal_type_id=animal_type.id,
                    breed_id=breed.id,
                    name=f"Animal {i+1}",
                    description="Test animal",
                    age_months=12,
                    price=float(price),
                    status=AnimalStatus.AVAILABLE,
                )
                session.add(animal)
            session.commit()
            
        # Filter for animals between 100k and 180k
        response = client.get("/api/v1/animals?price_min=100000&price_max=180000")
        assert response.status_code == 200
        data = response.get_json()
        # Should return 100k, 150k animals
        assert len(data["data"]["animals"]) == 2

            

        
        


            
            
            
            
        

            

