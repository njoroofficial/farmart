import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice } from '../data/mockData';

export function AnimalDetailPage() {
  const { id } = useParams();
  const { getAnimalById, addToCart, cart, currentUser } = useApp();
  const navigate = useNavigate();

  // ✅ Safe check for id
  if (!id) {
    return <div className="p-6 text-center">Invalid animal ID</div>;
  }



const animal = getAnimalById(id) ?? null;

  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  // ✅ Fix type comparison
  const inCart = cart.some(i => i.animal.id === id);

  if (!animal) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🐄</p>
          <h2 className="text-[#1B2D1B] mb-2 font-bold">Animal not found</h2>
          <Link to="/marketplace" className="text-[#2D6A4F] hover:underline text-sm">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(animal);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const isFarmer = currentUser?.role === 'farmer';

  const TYPE_COLORS: Record<string, string> = {
    Cattle: 'bg-amber-100 text-amber-700',
    Sheep: 'bg-blue-100 text-blue-700',
    Goat: 'bg-purple-100 text-purple-700',
    Poultry: 'bg-orange-100 text-orange-700',
    Pig: 'bg-pink-100 text-pink-700',
    Rabbit: 'bg-teal-100 text-teal-700',
    Turkey: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-[#F7F4EF] min-h-screen py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-[#2D6A4F]">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to="/marketplace" className="hover:text-[#2D6A4F]">Marketplace</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1B2D1B] font-medium">{animal.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-sm">
              <img
                src={animal.images[activeImg]?.url || '/placeholder.jpg'}
                alt={animal.name}
                className="w-full h-full object-cover"
              />
            </div>

            {animal.images && animal.images.length > 1 && (
              <div className="flex gap-2">
                {animal.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-20 aspect-square rounded-xl overflow-hidden border-2 ${
                      activeImg === i ? 'border-[#2D6A4F]' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs px-2 py-1 rounded-full ${TYPE_COLORS[animal.animal_type.name] || 'bg-gray-100 text-gray-700'}`}>
                {animal.animal_type.name}
              </span>

              <span className={`text-xs px-2 py-1 rounded-full ${
                animal.is_available
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {animal.is_available ? 'In Stock' : 'Unavailable'}
              </span>
            </div>

            <h1 className="text-[#1B2D1B] text-2xl font-bold mb-1">{animal.name}</h1>
            <p className="text-gray-500 mb-3">{animal.breed.name} · {animal.farmer.farm_name}</p>

            {/* Price */}
            <div className="bg-[#F0F7F4] rounded-2xl p-4 mb-5">
              <p className="text-[#2D6A4F] text-3xl font-bold">
                {formatPrice(animal.price)}
              </p>
              <p className="text-gray-500 text-sm">
                {animal.is_available ? 'Available' : 'Unavailable'}
              </p>
            </div>

            {/* Add to Cart */}
            {!isFarmer && animal.is_available && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)}>+</button>
                </div>

                <button
                  onClick={handleAddToCart}
                  className="w-full bg-[#2D6A4F] text-white py-2 rounded-lg"
                >
                  {added || inCart ? 'Added to Cart' : 'Add to Cart'}
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Description */}
        <div className="mt-8 bg-white rounded-2xl p-6">
          <h2 className="font-bold mb-3">About this Animal</h2>
          <p className="text-gray-600 text-sm">{animal.description}</p>
        </div>

      </div>
    </div>
  );
}