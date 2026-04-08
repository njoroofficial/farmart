import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { AnimalCard } from '../components/AnimalCard';
import { useApp } from '../context/AppContext';
import { AnimalType } from '../data/mockData';

const TYPES: AnimalType[] = ['Cattle', 'Sheep', 'Goat', 'Poultry', 'Pig', 'Rabbit', 'Turkey'];
const SORT_OPTIONS = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Top Rated', value: 'rating' },
];
const TYPE_EMOJIS: Record<string, string> = {
  Cattle: '🐄', Sheep: '🐑', Goat: '🐐', Poultry: '🐓', Pig: '🐖', Turkey: '🦃', Rabbit: '🐇',
};

export function MarketplacePage() {
  const { animals } = useApp();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedTypes, setSelectedTypes] = useState<AnimalType[]>(
    searchParams.get('type') ? [searchParams.get('type') as AnimalType] : []
  );
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [breed, setBreed] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const breeds = useMemo(() => [...new Set(animals.map(a => a.breed))], [animals]);
  const locations = useMemo(() => [...new Set(animals.map(a => a.location))], [animals]);

  const filtered = useMemo(() => {
    let result = [...animals].filter(a => a.status === 'available');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.breed.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.farmerName.toLowerCase().includes(q)
      );
    }
    if (selectedTypes.length) result = result.filter(a => selectedTypes.includes(a.type));
    if (breed) result = result.filter(a => a.breed === breed);
    if (location) result = result.filter(a => a.location === location);
    if (minAge) result = result.filter(a => a.age >= Number(minAge));
    if (maxAge) result = result.filter(a => a.age <= Number(maxAge));
    if (minPrice) result = result.filter(a => a.price >= Number(minPrice));
    if (maxPrice) result = result.filter(a => a.price <= Number(maxPrice));
    if (verifiedOnly) result = result.filter(a => a.verified);

    switch (sort) {
      case 'price_asc': return result.sort((a, b) => a.price - b.price);
      case 'price_desc': return result.sort((a, b) => b.price - a.price);
      case 'rating': return result.sort((a, b) => b.rating - a.rating);
      default: return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [animals, search, selectedTypes, breed, location, minAge, maxAge, minPrice, maxPrice, verifiedOnly, sort]);

  const toggleType = (type: AnimalType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const clearFilters = () => {
    setSearch(''); setSelectedTypes([]); setBreed(''); setLocation('');
    setMinAge(''); setMaxAge(''); setMinPrice(''); setMaxPrice(''); setVerifiedOnly(false);
  };

  const hasFilters = search || selectedTypes.length || breed || location || minAge || maxAge || minPrice || maxPrice || verifiedOnly;

  return (
    <div className="bg-[#F7F4EF] min-h-screen">
      {/* Header */}
      <div className="bg-[#2D6A4F] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="mb-1" style={{ fontWeight: 700, fontSize: '1.75rem' }}>Animal Marketplace</h1>
          <p className="text-[#B7E4C7] text-sm">Browse {animals.length}+ animals from verified farmers across Kenya</p>

          {/* Search */}
          <div className="mt-5 flex gap-2 max-w-xl">
            <div className="flex-1 flex items-center bg-white rounded-xl overflow-hidden">
              <Search className="w-4 h-4 text-gray-400 ml-4 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by type, breed, or location..."
                className="flex-1 px-3 py-3 text-sm text-gray-800 outline-none bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch('')} className="pr-3">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                showFilters ? 'bg-white text-[#2D6A4F]' : 'bg-white/15 text-white hover:bg-white/25 border border-white/30'
              }`}
              style={{ fontWeight: 600 }}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {hasFilters && <span className="w-2 h-2 rounded-full bg-[#E8845A]" />}
            </button>
          </div>

          {/* Type pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                  selectedTypes.includes(type)
                    ? 'bg-white text-[#2D6A4F]'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                }`}
                style={{ fontWeight: 500 }}
              >
                <span>{TYPE_EMOJIS[type]}</span> {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* ── Sidebar Filters ── */}
          <aside className={`${showFilters ? 'block' : 'hidden lg:block'} w-64 shrink-0`}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5 sticky top-20">
              <div className="flex items-center justify-between">
                <h3 className="text-[#1B2D1B] text-sm" style={{ fontWeight: 700 }}>Filters</h3>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-[#2D6A4F] hover:underline">Clear all</button>
                )}
              </div>

              {/* Breed */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Breed</label>
                <select value={breed} onChange={e => setBreed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50">
                  <option value="">All Breeds</option>
                  {breeds.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Location</label>
                <select value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50">
                  <option value="">All Locations</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Age Range */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Age (months)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={minAge} onChange={e => setMinAge(e.target.value)} placeholder="Min"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50" />
                  <input type="number" value={maxAge} onChange={e => setMaxAge(e.target.value)} placeholder="Max"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50" />
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide" style={{ fontWeight: 600 }}>Price (KES)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50" />
                  <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50" />
                </div>
              </div>

              {/* Verified only */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="verified" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#2D6A4F] rounded" />
                <label htmlFor="verified" className="text-sm text-gray-700">Verified farmers only</label>
              </div>
            </div>
          </aside>

          {/* ── Animal Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Sort + count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span style={{ fontWeight: 600 }}>{filtered.length}</span> animals found
                {hasFilters && <button onClick={clearFilters} className="ml-2 text-[#2D6A4F] hover:underline text-xs">Clear filters</button>}
              </p>
              <div className="relative">
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-[#2D6A4F] cursor-pointer">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <span className="text-5xl mb-4 block">🔍</span>
                <p className="text-[#1B2D1B] mb-1" style={{ fontWeight: 600 }}>No animals found</p>
                <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                <button onClick={clearFilters}
                  className="mt-4 text-sm text-[#2D6A4F] border border-[#2D6A4F] px-4 py-2 rounded-lg hover:bg-[#F0F7F4] transition-colors">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map(animal => (
                  <AnimalCard key={animal.id} animal={animal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
