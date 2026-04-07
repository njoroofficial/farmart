import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Upload,
  X,
  CheckCircle,
  Star,
  AlertCircle,
  PenLine,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const getToken = () => localStorage.getItem("farmart_token") || "";

// Sentinel value used client-side to mean "let me type a custom breed"
const CUSTOM_BREED_SENTINEL = "__custom__";

interface AnimalTypeRef {
  id: string;
  name: string;
}
interface BreedRef {
  id: string;
  name: string;
  animal_type_id: string;
}
interface ExistingImage {
  id: string;
  url: string;
  is_primary: boolean;
}
interface Props {
  editId?: string;
}

const ANIMAL_ICONS: Record<string, string> = {
  Cattle: "🐄",
  Goat: "🐐",
  Sheep: "🐑",
  Pig: "🐖",
  Poultry: "🐓",
  Turkey: "🦃",
  Rabbit: "🐇",
  Other: "🐾",
};

export function AddAnimalPage({ editId }: Props) {
  const { addAnimal, updateAnimal } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(editId);

  // ── Reference data from API ──────────────────────────────────────────────
  const [animalTypes, setAnimalTypes] = useState<AnimalTypeRef[]>([]);
  const [breeds, setBreeds] = useState<BreedRef[]>([]);
  const [refLoading, setRefLoading] = useState(true);
  const [breedsLoading, setBreedsLoading] = useState(false);

  // IDs of the special "Other" records seeded in the DB.
  // These are used when the farmer enters a custom type / breed.
  const [otherTypeId, setOtherTypeId] = useState("");
  const [otherBreedId, setOtherBreedId] = useState("");

  // ── Form selections ──────────────────────────────────────────────────────
  const [typeId, setTypeId] = useState("");
  const [breedId, setBreedId] = useState(""); // may be CUSTOM_BREED_SENTINEL
  const [customTypeName, setCustomTypeName] = useState("");
  const [customBreedName, setCustomBreedName] = useState("");

  // ── Age ──────────────────────────────────────────────────────────────────
  const [ageYears, setAgeYears] = useState("0");
  const [ageMonths, setAgeMonths] = useState("0");

  // ── Text fields ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    weight_kg: "",
    price: "",
    description: "",
  });

  // ── Images ───────────────────────────────────────────────────────────────
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: string, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  // Derived helpers
  const isOtherType = Boolean(otherTypeId && typeId === otherTypeId);
  const isCustomBreed = breedId === CUSTOM_BREED_SENTINEL;

  // ── Fetch animal types on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/animal-types`)
      .then((r) => r.json())
      .then(({ data }) => {
        const types: AnimalTypeRef[] = data || [];
        setAnimalTypes(types);

        // Locate the "Other" type seeded for custom entries
        const other = types.find((t) => t.name === "Other");
        if (other) {
          setOtherTypeId(other.id);
          // Pre-fetch Other's breeds to get the "Other/Mixed" breed ID
          fetch(`${API_BASE}/animal-types/${other.id}/breeds`)
            .then((r) => r.json())
            .then(({ data: bd }) => {
              const mixed = (bd || []).find((b: BreedRef) =>
                b.name.toLowerCase().includes("other"),
              );
              if (mixed) setOtherBreedId(mixed.id);
            })
            .catch(() => {});
        }

        // Default-select the first non-Other type for new listings
        if (!isEdit && types.length) {
          const first = types.find((t) => t.name !== "Other") || types[0];
          setTypeId(first.id);
        }
      })
      .catch(() => {})
      .finally(() => setRefLoading(false));
  }, []);

  // ── Fetch breeds when typeId changes ────────────────────────────────────
  useEffect(() => {
    if (!typeId) return;
    setBreedsLoading(true);
    setBreedId(""); // reset breed on type change
    setCustomBreedName("");
    fetch(`${API_BASE}/animal-types/${typeId}/breeds`)
      .then((r) => r.json())
      .then(({ data }) => setBreeds(data || []))
      .catch(() => setBreeds([]))
      .finally(() => setBreedsLoading(false));
  }, [typeId]);

  // ── Fetch existing animal when editing ───────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/animals/${editId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return;
        setTypeId(data.animal_type?.id || "");
        setBreedId(data.breed?.id || "");
        const years = Math.floor((data.age_months || 0) / 12);
        const months = (data.age_months || 0) % 12;
        setAgeYears(String(years));
        setAgeMonths(String(months));
        setForm({
          name: data.name || "",
          weight_kg: data.weight_kg?.toString() || "",
          price: data.price?.toString() || "",
          description: data.description || "",
        });
        setExistingImages(
          (data.images || []).map((img: any) => ({
            id: img.id,
            url: img.cloudinary_url,
            is_primary: img.is_primary,
          })),
        );
      })
      .catch(() => {});
  }, [editId]);

  // ── Type change handler ──────────────────────────────────────────────────
  const handleTypeChange = (tid: string) => {
    setTypeId(tid);
    setCustomTypeName("");
  };

  // ── File handlers ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  };
  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);

    if (!isEdit) {
      // Type validation
      if (!typeId) {
        setError("Please select an animal type.");
        return;
      }
      if (isOtherType && !customTypeName.trim()) {
        setError("Please specify your animal type.");
        return;
      }

      // Breed validation
      if (!breedId) {
        setError("Please select a breed.");
        return;
      }
      if (isCustomBreed) {
        if (!customBreedName.trim()) {
          setError("Please specify the breed name.");
          return;
        }
        if (!otherBreedId) {
          setError(
            "Custom breeds are not yet available. Run 'flask seed-reference-data' on the server first.",
          );
          return;
        }
      }

      // Image validation
      if (files.length === 0) {
        setError("Please upload at least one photo.");
        return;
      }
    }

    setLoading(true);
    try {
      const age_months = Number(ageYears) * 12 + Number(ageMonths);

      // Resolve the actual breed_id: custom entries use the seeded "Other/Mixed"
      const resolvedBreedId = isCustomBreed ? otherBreedId : breedId;

      // Build description — prepend custom type / breed info so it is visible
      // to buyers even though the DB stores them under the catch-all "Other"
      const prefixParts: string[] = [];
      if (isOtherType && customTypeName.trim())
        prefixParts.push(`Animal type: ${customTypeName.trim()}`);
      if (isCustomBreed && customBreedName.trim())
        prefixParts.push(`Breed: ${customBreedName.trim()}`);
      const prefix = prefixParts.length
        ? `[${prefixParts.join(" | ")}]\n`
        : "";
      const finalDescription = prefix + form.description;

      if (isEdit && editId) {
        await updateAnimal(editId, {
          name: form.name,
          age_months,
          price: Number(form.price),
          weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
          description: finalDescription,
        } as any);
      } else {
        const formData = new FormData();
        formData.append("name", form.name);
        formData.append("animal_type_id", typeId);
        formData.append("breed_id", resolvedBreedId);
        formData.append("age_months", String(age_months));
        formData.append("price", form.price);
        if (form.weight_kg) formData.append("weight_kg", form.weight_kg);
        formData.append("description", finalDescription);
        files.forEach((f) => formData.append("images", f));
        await addAnimal(formData);
      }

      setSuccess(true);
      setTimeout(() => navigate("/farmer/listings"), 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#D8EAD1] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-[#2D6A4F]" />
          </div>
          <h2 className="text-[#1B2D1B] mb-1" style={{ fontWeight: 700 }}>
            {isEdit ? "Listing Updated!" : "Animal Listed!"}
          </h2>
          <p className="text-gray-500 text-sm">
            Redirecting to your listings...
          </p>
        </div>
      </div>
    );
  }

  const selectedType = animalTypes.find((t) => t.id === typeId);

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/farmer/listings"
          className="p-2 rounded-lg hover:bg-white transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1
            className="text-[#1B2D1B]"
            style={{ fontWeight: 800, fontSize: "1.5rem" }}
          >
            {isEdit ? "Edit Animal" : "Add New Animal"}
          </h1>
          <p className="text-gray-500 text-sm">
            {isEdit
              ? "Update your listing details"
              : "Create a new listing for sale"}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {refLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── 1. Animal Name ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>
              Animal Name
            </h2>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Friesian Dairy Cow"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
            />
          </div>

          {/* ── 2. Animal Type (new listings only) ────────────────────── */}
          {!isEdit && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>
                Animal Type
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {animalTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeChange(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      typeId === type.id
                        ? "border-[#2D6A4F] bg-[#F0F7F4]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span style={{ fontSize: "1.5rem" }}>
                      {ANIMAL_ICONS[type.name] ?? "🐾"}
                    </span>
                    <span
                      className="text-xs text-center leading-tight"
                      style={{ fontWeight: typeId === type.id ? 600 : 400 }}
                    >
                      {type.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom type name — shown when "Other" is selected */}
              {isOtherType && (
                <div className="mt-4">
                  <label
                    className="block text-xs text-gray-600 mb-1"
                    style={{ fontWeight: 500 }}
                  >
                    Specify your animal type *
                  </label>
                  <div className="flex items-center border border-[#2D6A4F] rounded-xl overflow-hidden bg-gray-50">
                    <PenLine className="w-4 h-4 text-[#2D6A4F] ml-3 shrink-0" />
                    <input
                      type="text"
                      value={customTypeName}
                      onChange={(e) => setCustomTypeName(e.target.value)}
                      placeholder="e.g. Donkey, Camel, Ostrich..."
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                    />
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Your listing will be categorised under "Other" and the
                    animal type you enter will appear in the description.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── 3. Breed (new listings only) ──────────────────────────── */}
          {!isEdit && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>
                Breed
              </h2>
              <select
                required
                value={breedId}
                onChange={(e) => {
                  setBreedId(e.target.value);
                  if (e.target.value !== CUSTOM_BREED_SENTINEL)
                    setCustomBreedName("");
                }}
                disabled={breedsLoading}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50 disabled:opacity-60"
              >
                <option value="">
                  {breedsLoading
                    ? "Loading breeds..."
                    : `Select a breed${selectedType ? ` for ${selectedType.name}` : ""}`}
                </option>

                {/* API breeds for this type */}
                {breeds
                  .filter((b) => !b.name.toLowerCase().includes("other"))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}

                {/* Separator + client-side "Other" option */}
                <option disabled>──────────────</option>
                <option value={CUSTOM_BREED_SENTINEL}>
                  Other (specify below)
                </option>
              </select>

              {!breedsLoading && !isCustomBreed && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {breeds.filter((b) => !b.name.toLowerCase().includes("other"))
                    .length}{" "}
                  breeds available
                  {selectedType ? ` for ${selectedType.name}` : ""}
                </p>
              )}

              {/* Custom breed name input */}
              {isCustomBreed && (
                <div className="mt-3">
                  <label
                    className="block text-xs text-gray-600 mb-1"
                    style={{ fontWeight: 500 }}
                  >
                    Specify the breed *
                  </label>
                  <div className="flex items-center border border-[#2D6A4F] rounded-xl overflow-hidden bg-gray-50">
                    <PenLine className="w-4 h-4 text-[#2D6A4F] ml-3 shrink-0" />
                    <input
                      type="text"
                      value={customBreedName}
                      onChange={(e) => setCustomBreedName(e.target.value)}
                      placeholder={
                        selectedType
                          ? `e.g. Your ${selectedType.name.toLowerCase()} breed...`
                          : "Enter breed name..."
                      }
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none bg-transparent"
                    />
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    The breed name will appear in your listing description.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── 4. Age ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
              Age
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 500 }}
                >
                  Years
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                  <span className="px-3 text-xs text-gray-400">yrs</span>
                </div>
              </div>
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 500 }}
                >
                  Months
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={ageMonths}
                    onChange={(e) => setAgeMonths(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                  <span className="px-3 text-xs text-gray-400">mo</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Total:{" "}
              <span style={{ fontWeight: 600 }} className="text-[#2D6A4F]">
                {Number(ageYears) * 12 + Number(ageMonths)} months
              </span>
            </p>
          </div>

          {/* ── 5. Weight & Price ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
              Weight & Price
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 500 }}
                >
                  Weight *
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <input
                    required
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={(e) => update("weight_kg", e.target.value)}
                    placeholder="e.g. 250"
                    className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                  <span className="px-3 text-xs text-gray-400 border-l border-gray-200">
                    kg
                  </span>
                </div>
              </div>
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 500 }}
                >
                  Price per Animal *
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <span className="px-3 text-xs text-gray-500 border-r border-gray-200">
                    KSh
                  </span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="e.g. 85000"
                    className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-transparent"
                  />
                </div>
                {form.price && (
                  <p
                    className="text-xs text-[#2D6A4F] mt-1"
                    style={{ fontWeight: 600 }}
                  >
                    = KSh {Number(form.price).toLocaleString("en-KE")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 6. Description ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>
              Description
            </h2>
            <textarea
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe your animal — health status, vaccination history, feeding regimen, special qualities..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.description.length}/1000 characters
            </p>
          </div>

          {/* ── 7. Photos ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-[#1B2D1B] mb-2" style={{ fontWeight: 700 }}>
              Photos
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              {isEdit
                ? "Current photos for this listing."
                : "Upload 1–5 photos. The first photo will be the primary image."}
            </p>

            {/* Existing images (edit mode) */}
            {isEdit && existingImages.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative">
                    <div
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 ${
                        img.is_primary
                          ? "border-[#2D6A4F]"
                          : "border-gray-200"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {img.is_primary && (
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-[#2D6A4F] rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-white fill-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New file previews & upload zone (create mode) */}
            {!isEdit && (
              <>
                {files.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className={`w-20 h-20 rounded-xl overflow-hidden border-2 ${
                            idx === 0
                              ? "border-[#2D6A4F]"
                              : "border-gray-200"
                          }`}
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {idx === 0 && (
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-[#2D6A4F] rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-white" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {files.length < 5 && (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#2D6A4F] transition-colors cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p
                      className="text-sm text-gray-500 mb-1"
                      style={{ fontWeight: 500 }}
                    >
                      Click to upload photos
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG, PNG, or WebP — up to 5 photos
                    </p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            )}
          </div>

          {/* ── Submit ────────────────────────────────────────────────── */}
          <div className="flex gap-3 pb-6">
            <Link
              to="/farmer/listings"
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white text-center transition-colors"
              style={{ fontWeight: 600 }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#2D6A4F] text-white py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors disabled:opacity-70"
              style={{ fontWeight: 700 }}
            >
              {loading
                ? "Saving..."
                : isEdit
                  ? "Update Listing"
                  : "Publish Listing"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
