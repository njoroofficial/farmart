import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { AnimalCard } from '../components/AnimalCard';
import { useApp } from '../context/AppContext';
import type { AnimalType } from '../data/mockData';

type Animal = {
  id: number;
  name: string;
  price: number;
  age_months: number;
  location: string;
  created_at: string;
  rating?: number;
  is_available: boolean;
  animal_type: { name: AnimalType };
  breed: { name: string };
  farmer: {
    id: number;
    first_name: string;
    last_name: string;
  };
};

const TYPES: AnimalType[] = ['Cattle', 'Sheep', 'Goat', 'Poultry', 'Pig', 'Rabbit', 'Turkey'];

const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Top Rated', value: 'rating' },
];

const TYPE_EMOJIS: Record<AnimalType, string> = {
  Cattle: '🐄',
  Sheep: '🐑',
  Goat: '🐐',
  Poultry: '🐓',
  Pig: '🐖',
  Turkey: '🦃',
  Rabbit: '🐇',
};

export function MarketplacePage() {
  const { animals } = useApp() as { animals: Animal[] };
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [selectedTypes, setSelectedTypes] = useState<AnimalType[]>(
    searchParams.get('type') ? [searchParams.get('type') as AnimalType] : []
  );

  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [breed, setBreed] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [sort, setSort] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  const breeds = useMemo(
    () => [...new Set(animals.map((a: Animal) => a.breed.name))],
    [animals]
  );

  const locations = useMemo(
    () => [...new Set(animals.map((a: Animal) => a.location))],
    [animals]
  );

  const filtered = useMemo(() => {
    let result = animals.filter((a: Animal) => a.is_available);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a: Animal) =>
        a.name.toLowerCase().includes(q) ||
        a.animal_type.name.toLowerCase().includes(q) ||
        a.breed.name.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        `${a.farmer.first_name} ${a.farmer.last_name}`.toLowerCase().includes(q)
      );
    }

    if (selectedTypes.length) {
      result = result.filter((a: Animal) =>
        selectedTypes.includes(a.animal_type.name)
      );
    }

    if (breed) result = result.filter((a: Animal) => a.breed.name === breed);
    if (location) result = result.filter((a: Animal) => a.location === location);

    if (minAge) result = result.filter((a: Animal) => a.age_months >= Number(minAge));
    if (maxAge) result = result.filter((a: Animal) => a.age_months <= Number(maxAge));

    if (minPrice) result = result.filter((a: Animal) => a.price >= Number(minPrice));
    if (maxPrice) result = result.filter((a: Animal) => a.price <= Number(maxPrice));

    if (verifiedOnly) result = result.filter((a: Animal) => !!a.farmer.id);

    switch (sort) {
      case 'price_asc':
        return [...result].sort((a, b) => a.price - b.price);
      case 'price_desc':
        return [...result].sort((a, b) => b.price - a.price);
      case 'rating':
        return [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:
        return [...result].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [
    animals,
    search,
    selectedTypes,
    breed,
    location,
    minAge,
    maxAge,
    minPrice,
    maxPrice,
    verifiedOnly,
    sort,
  ]);

  const toggleType = (type: AnimalType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedTypes([]);
    setBreed('');
    setLocation('');
    setMinAge('');
    setMaxAge('');
    setMinPrice('');
    setMaxPrice('');
    setVerifiedOnly(false);
  };

  const hasFilters =
    search ||
    selectedTypes.length ||
    breed ||
    location ||
    minAge ||
    maxAge ||
    minPrice ||
    maxPrice ||
    verifiedOnly;

  return (
    <div className="bg-[#F7F4EF] min-h-screen">
      <div className="bg-[#2D6A4F] text-white py-10">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="mb-1 text-2xl font-bold">Animal Marketplace</h1>
          <p className="text-[#B7E4C7] text-sm">
            Browse {animals.length}+ animals from verified farmers
          </p>

          <div className="mt-5 flex gap-2 max-w-xl">
            <div className="flex-1 flex items-center bg-white rounded-xl overflow-hidden">
              <Search className="w-4 h-4 text-gray-400 ml-4" />
              <input
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                placeholder="Search..."
                className="flex-1 px-3 py-3 text-sm outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-4 h-4 text-gray-400 mr-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <p>No animals found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}