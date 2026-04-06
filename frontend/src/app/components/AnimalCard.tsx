import { Link } from "react-router";
import { MapPin, Scale, Clock, Star, ShoppingCart, Check } from "lucide-react";
import {
  type Animal,
  formatPrice,
  formatAge,
  getPrimaryImage,
} from "../data/mockData";
import { useApp } from "../context/AppContext";
import { useState, type MouseEvent } from "react";

interface AnimalCardProps {
  animal: Animal;
  showFarmerActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Cattle: "bg-amber-100 text-amber-700",
  Sheep: "bg-blue-100 text-blue-700",
  Goat: "bg-purple-100 text-purple-700",
  Poultry: "bg-orange-100 text-orange-700",
  Pig: "bg-pink-100 text-pink-700",
  Rabbit: "bg-teal-100 text-teal-700",
  Turkey: "bg-red-100 text-red-700",
};

export function AnimalCard({
  animal,
  showFarmerActions,
  onEdit,
  onDelete,
}: AnimalCardProps) {
  const { addToCart, isInCart, currentUser } = useApp();
  const [added, setAdded] = useState(false);
  const inCart = isInCart(animal.id);
  const isFarmer = currentUser?.role === "farmer";

  const handleAddToCart = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(animal);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);

    // --- BACKEND API INTEGRATION (uncomment when integrating) ---
    // await fetch(`${API_BASE_URL}/cart/items`, {
    //   method: 'POST',
    //   headers: getAuthHeaders(),
    //   body: JSON.stringify({ animal_id: animal.id }),
    // });
    // -----------------------------------------------------------
  };

  const primaryImg = getPrimaryImage(animal);
  const badgeColor =
    TYPE_COLORS[animal.animal_type.name] || "bg-gray-100 text-gray-700";

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group flex flex-col">
      {/* Image */}
      <Link
        to={`/animals/${animal.id}`}
        className="block relative overflow-hidden aspect-4/3"
      >
        <img
          src={primaryImg}
          alt={animal.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Type + breed badges */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}
            style={{ fontWeight: 600 }}
          >
            {animal.animal_type.name}
          </span>
        </div>
        {/* Availability overlay */}
        {!animal.is_available && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span
              className="bg-white text-gray-800 px-3 py-1 rounded-full text-sm"
              style={{ fontWeight: 600 }}
            >
              Sold
            </span>
          </div>
        )}
        {/* Available badge */}
        {animal.is_available && (
          <div className="absolute top-3 right-3">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700"
              style={{ fontWeight: 600 }}
            >
              Available
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <Link to={`/animals/${animal.id}`}>
            <h3
              className="text-[#1B2D1B] hover:text-[#2D6A4F] transition-colors line-clamp-1"
              style={{ fontWeight: 600 }}
            >
              {animal.name}
            </h3>
          </Link>
          {animal.reviews != null && animal.reviews > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span
                className="text-xs text-gray-600"
                style={{ fontWeight: 500 }}
              >
                {animal.rating}
              </span>
            </div>
          )}
        </div>

        {/* Type + Breed as tags */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${badgeColor}`}
            style={{ fontWeight: 600 }}
          >
            {animal.breed.name}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatAge(animal.age_months)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Scale className="w-3.5 h-3.5 text-gray-400" />
            <span>{animal.weight_kg} kg</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 col-span-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate">{animal.location}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div>
            <p
              className="text-[#2D6A4F]"
              style={{ fontWeight: 700, fontSize: "1rem" }}
            >
              {formatPrice(animal.price)}
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              {animal.farmer.first_name} · {animal.farmer.county}
            </p>
          </div>

          {showFarmerActions ? (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(animal.id)}
                className="text-xs px-3 py-1.5 border border-[#2D6A4F] text-[#2D6A4F] rounded-lg hover:bg-[#2D6A4F] hover:text-white transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete?.(animal.id)}
                className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          ) : !isFarmer && animal.is_available ? (
            <button
              onClick={handleAddToCart}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                added || inCart
                  ? "bg-[#D8EAD1] text-[#2D6A4F]"
                  : "bg-[#2D6A4F] text-white hover:bg-[#235A41]"
              }`}
            >
              {added || inCart ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" /> Add
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
