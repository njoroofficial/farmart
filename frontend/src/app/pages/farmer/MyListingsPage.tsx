import { useState } from "react";
import { Link } from "react-router";
import {
  PlusCircle,
  Search,
  Package,
  Trash2,
  Edit3,
  Eye,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatPrice, formatAge, getPrimaryImage } from "../../data/mockData";

const TYPE_COLORS: Record<string, string> = {
  Cattle: "bg-amber-100 text-amber-700",
  Sheep: "bg-blue-100 text-blue-700",
  Goat: "bg-purple-100 text-purple-700",
  Poultry: "bg-orange-100 text-orange-700",
  Pig: "bg-pink-100 text-pink-700",
  Rabbit: "bg-teal-100 text-teal-700",
  Turkey: "bg-red-100 text-red-700",
};

// Maps backend status to display label and style
const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  available: {
    label: "Available",
    className: "bg-green-100 text-green-700",
  },
  reserved: {
    label: "Reserved",
    className: "bg-amber-100 text-amber-700",
  },
  sold: {
    label: "Sold",
    className: "bg-gray-100 text-gray-500",
  },
};

function statusBadge(animal: { is_available: boolean }) {
  // is_available is true only for "available" status; use it as a proxy.
  // For a richer display (reserved vs sold) the API status field would be needed,
  // but the frontend Animal type maps status → is_available.
  const key = animal.is_available ? "available" : "sold";
  return STATUS_BADGE[key] || STATUS_BADGE.available;
}

export function MyListingsPage() {
  const { getFarmerAnimals, deleteAnimal } = useApp();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const animals = getFarmerAnimals();
  const filtered = animals.filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.animal_type.name.toLowerCase().includes(search.toLowerCase()) ||
      a.breed.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAnimal(id);
      setConfirmDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || "Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-[#1B2D1B]"
            style={{ fontWeight: 800, fontSize: "1.5rem" }}
          >
            My Listings
          </h1>
          <p className="text-gray-500 text-sm">
            {animals.length} animals ·{" "}
            {animals.filter((a) => a.is_available).length} available
          </p>
        </div>
        <Link
          to="/farmer/listings/add"
          className="flex items-center gap-2 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
          style={{ fontWeight: 600 }}
        >
          <PlusCircle className="w-4 h-4" /> Add Animal
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm max-w-sm">
        <Search className="w-4 h-4 text-gray-400 ml-4 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, or breed..."
          className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none"
        />
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3
              className="text-center text-[#1B2D1B] mb-1.5"
              style={{ fontWeight: 700 }}
            >
              Delete Listing?
            </h3>
            <p className="text-center text-gray-500 text-sm mb-2">
              This will permanently remove the listing. This action cannot be
              undone.
            </p>
            {deleteError && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 mb-3">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table / Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-[#1B2D1B] mb-1" style={{ fontWeight: 600 }}>
            {search ? "No listings match your search" : "No animals listed yet"}
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {search
              ? "Try a different search term"
              : "Start by adding your first animal for sale"}
          </p>
          {!search && (
            <Link
              to="/farmer/listings/add"
              className="inline-flex items-center gap-2 bg-[#2D6A4F] text-white px-5 py-2.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
              style={{ fontWeight: 600 }}
            >
              <PlusCircle className="w-4 h-4" /> Add First Animal
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "Animal",
                  "Type / Breed",
                  "Age / Weight",
                  "Price",
                  "Status",
                  "Listed",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs text-gray-500 uppercase tracking-wide"
                    style={{ fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((animal) => {
                const badge = statusBadge(animal);
                return (
                  <tr
                    key={animal.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={getPrimaryImage(animal)}
                            alt={animal.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p
                          className="text-sm text-[#1B2D1B]"
                          style={{ fontWeight: 600 }}
                        >
                          {animal.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[animal.animal_type.name] || "bg-gray-100 text-gray-700"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {animal.animal_type.name}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {animal.breed.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <p>{formatAge(animal.age_months)}</p>
                      <p className="text-xs text-gray-400">
                        {animal.weight_kg} kg
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p
                        className="text-sm text-[#2D6A4F]"
                        style={{ fontWeight: 700 }}
                      >
                        {formatPrice(animal.price)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${badge.className}`}
                        style={{ fontWeight: 600 }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {animal.created_at
                        ? new Date(animal.created_at).toLocaleDateString(
                            "en-KE",
                            {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/animals/${animal.id}`}
                          className="p-1.5 text-gray-400 hover:text-[#2D6A4F] transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/farmer/listings/${animal.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setConfirmDelete(animal.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((animal) => {
              const badge = statusBadge(animal);
              return (
                <div key={animal.id} className="flex items-start gap-3 p-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={getPrimaryImage(animal)}
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p
                        className="text-sm text-[#1B2D1B]"
                        style={{ fontWeight: 600 }}
                      >
                        {animal.name}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ml-2 ${TYPE_COLORS[animal.animal_type.name] || "bg-gray-100 text-gray-700"}`}
                        style={{ fontWeight: 600 }}
                      >
                        {animal.animal_type.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {animal.breed.name} · {formatAge(animal.age_months)} ·{" "}
                      {animal.weight_kg} kg
                    </p>
                    <p
                      className="text-sm text-[#2D6A4F] mt-1"
                      style={{ fontWeight: 700 }}
                    >
                      {formatPrice(animal.price)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap items-center">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${badge.className}`}
                        style={{ fontWeight: 600 }}
                      >
                        {badge.label}
                      </span>
                      <Link
                        to={`/farmer/listings/${animal.id}/edit`}
                        className="flex items-center gap-1 text-xs border border-[#2D6A4F] text-[#2D6A4F] px-2.5 py-1 rounded-lg hover:bg-[#F0F7F4] transition-colors"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmDelete(animal.id);
                        }}
                        className="flex items-center gap-1 text-xs border border-red-200 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
