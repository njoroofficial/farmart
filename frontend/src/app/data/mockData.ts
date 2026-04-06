// =============================================================================
// FARMART — Mock Data (aligned with Flask REST API shapes)
// Backend BASE_URL: https://farmart-api.onrender.com/api/v1
// =============================================================================

// ─── Reference Types ──────────────────────────────────────────────────────────
export interface AnimalTypeRef {
  id: string;
  name: string;
}

export interface Breed {
  id: string;
  name: string;
  animal_type_id: string;
}

export interface AnimalImage {
  id: string;
  url: string;
  is_primary: boolean;
  public_id: string; // Cloudinary public_id
}

// ─── Core Types ───────────────────────────────────────────────────────────────
export interface Animal {
  id: string;
  name: string;
  description: string;
  animal_type: AnimalTypeRef;
  breed: Breed;
  age_months: number; // stored in months
  weight_kg: number;
  price: number; // KSh
  location: string; // e.g. "Nakuru, Kenya"
  is_available: boolean;
  images: AnimalImage[]; // from Cloudinary
  farmer: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string; // Kenyan format: 07XXXXXXXX
    farm_name: string;
    county: string;
  };
  created_at: string;
  updated_at: string;
  // UI-only optional fields (not in API spec)
  rating?: number;
  reviews?: number;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string; // Kenyan format: 07XXXXXXXX
  password: string; // client-side only — never sent back from API
  role: "farmer" | "buyer";
  is_verified: boolean;
  created_at: string;
  // Farmer-specific (from FarmerProfile)
  farm_name?: string;
  county?: string;
}

export interface CartItem {
  id: string;
  animal: Animal;
  added_at: string;
}

export interface OrderItem {
  id: string;
  animal: Animal;
  price_at_purchase: number; // KSh — snapshot at order time
}

export interface Order {
  id: string;
  buyer: { id: string; first_name: string; last_name: string; phone: string };
  items: OrderItem[];
  total_amount: number; // KSh
  status: "pending" | "confirmed" | "rejected" | "completed";
  delivery_address: string;
  delivery_county: string;
  buyer_phone: string; // Kenyan format
  payment_method: "mpesa" | "bank_transfer" | "cash_on_delivery";
  notes?: string;
  created_at: string;
}

export interface FarmerDashboard {
  total_listings: number;
  active_listings: number;
  pending_orders: number;
  confirmed_orders: number;
  total_revenue: number; // KSh
  recent_orders: Order[];
}

// ─── Kenyan Counties ──────────────────────────────────────────────────────────
export const KENYAN_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
];

// ─── Reference Data (mirrors GET /api/v1/reference/animal-types & breeds) ───
export const mockAnimalTypes: AnimalTypeRef[] = [
  { id: "at1", name: "Cattle" },
  { id: "at2", name: "Goat" },
  { id: "at3", name: "Sheep" },
  { id: "at4", name: "Poultry" },
  { id: "at5", name: "Pig" },
  { id: "at6", name: "Rabbit" },
  { id: "at7", name: "Turkey" },
];

export const mockBreeds: Breed[] = [
  // Cattle
  { id: "br1", name: "Friesian", animal_type_id: "at1" },
  { id: "br2", name: "Angus", animal_type_id: "at1" },
  { id: "br3", name: "Zebu", animal_type_id: "at1" },
  { id: "br4", name: "Boran", animal_type_id: "at1" },
  { id: "br5", name: "Ayrshire", animal_type_id: "at1" },
  { id: "br6", name: "Jersey", animal_type_id: "at1" },
  // Goat
  { id: "br7", name: "Boer", animal_type_id: "at2" },
  { id: "br8", name: "Galla", animal_type_id: "at2" },
  { id: "br9", name: "Toggenburg", animal_type_id: "at2" },
  { id: "br10", name: "Saanen", animal_type_id: "at2" },
  // Sheep
  { id: "br11", name: "Merino", animal_type_id: "at3" },
  { id: "br12", name: "Dorper", animal_type_id: "at3" },
  { id: "br13", name: "Red Maasai", animal_type_id: "at3" },
  { id: "br14", name: "Hampshire", animal_type_id: "at3" },
  // Poultry
  { id: "br15", name: "Ross 308 Broiler", animal_type_id: "at4" },
  { id: "br16", name: "Kienyeji", animal_type_id: "at4" },
  { id: "br17", name: "Kuroiler", animal_type_id: "at4" },
  { id: "br18", name: "Rainbow Rooster", animal_type_id: "at4" },
  // Pig
  { id: "br19", name: "Duroc", animal_type_id: "at5" },
  { id: "br20", name: "Large White", animal_type_id: "at5" },
  { id: "br21", name: "Landrace", animal_type_id: "at5" },
  // Rabbit
  { id: "br22", name: "New Zealand White", animal_type_id: "at6" },
  { id: "br23", name: "Californian", animal_type_id: "at6" },
  // Turkey
  { id: "br24", name: "Broad-Breasted Bronze", animal_type_id: "at7" },
  { id: "br25", name: "Broad-Breasted White", animal_type_id: "at7" },
];

// ─── Images ───────────────────────────────────────────────────────────────────
const CATTLE_IMG =
  "https://images.unsplash.com/photo-1700737837793-4190578e7ec9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const SHEEP_IMG =
  "https://images.unsplash.com/photo-1606777346180-ab7b94842182?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const GOAT_IMG =
  "https://images.unsplash.com/photo-1723625449728-40e7a4d968e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const CHICKEN_IMG =
  "https://images.unsplash.com/photo-1658086130176-9e771ed4c9b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const PIG_IMG =
  "https://images.unsplash.com/photo-1655307556757-1bb51afa4b2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const COW_IMG =
  "https://images.unsplash.com/photo-1754968956580-1563cf7d8b48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const TURKEY_IMG =
  "https://images.unsplash.com/photo-1716561242235-2223ad9e19dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";
const RABBIT_IMG =
  "https://images.unsplash.com/photo-1767016627558-03d01fd6616e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800";

export const HERO_IMG =
  "https://images.unsplash.com/photo-1599565092959-17e1b10a0a78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

const img = (
  id: string,
  url: string,
  primary: boolean,
  pub: string,
): AnimalImage => ({ id, url, is_primary: primary, public_id: pub });

// ─── Farmer objects (reused across animals) ───────────────────────────────────
const FARMER_F1 = {
  id: "f1",
  first_name: "John",
  last_name: "Kamau",
  phone: "0712345678",
  farm_name: "Kamau Family Farms",
  county: "Nakuru",
};
const FARMER_F2 = {
  id: "f2",
  first_name: "Mary",
  last_name: "Wanjiku",
  phone: "0722456789",
  farm_name: "Wanjiku Green Acres",
  county: "Uasin Gishu",
};
const FARMER_F3 = {
  id: "f3",
  first_name: "Peter",
  last_name: "Mwangi",
  phone: "0733567890",
  farm_name: "Mwangi Livestock Ranch",
  county: "Kisumu",
};

// ─── Mock Animals (aligns with GET /api/v1/animals) ───────────────────────────
export const mockAnimals: Animal[] = [
  {
    id: "a1",
    name: "Friesian Dairy Cow",
    description:
      "High-milk-yielding Friesian cows raised on certified organic pasture in Nakuru. Each cow produces an average of 25 litres per day. Fully vaccinated against FMD and Brucellosis. Health-certified by a registered vet. Ideal for dairy farms looking to boost production significantly.",
    animal_type: { id: "at1", name: "Cattle" },
    breed: { id: "br1", name: "Friesian", animal_type_id: "at1" },
    age_months: 36,
    weight_kg: 550,
    price: 85000,
    location: "Nakuru, Kenya",
    is_available: true,
    images: [
      img("img1a", CATTLE_IMG, true, "farmart/cattle_friesian_1"),
      img("img1b", COW_IMG, false, "farmart/cattle_friesian_2"),
    ],
    farmer: FARMER_F1,
    created_at: "2025-03-01T08:00:00Z",
    updated_at: "2025-03-01T08:00:00Z",
    rating: 4.8,
    reviews: 12,
  },
  {
    id: "a2",
    name: "Merino Wool Sheep",
    description:
      "Premium Merino sheep known for their fine, soft wool and good meat quality. Well-nourished and disease-free. Vaccinated against FMD and PPR. Raised on improved pasture in the Eldoret highlands. Great for both wool production and meat. Ready for immediate sale.",
    animal_type: { id: "at3", name: "Sheep" },
    breed: { id: "br11", name: "Merino", animal_type_id: "at3" },
    age_months: 18,
    weight_kg: 65,
    price: 12000,
    location: "Uasin Gishu, Kenya",
    is_available: true,
    images: [img("img2a", SHEEP_IMG, true, "farmart/sheep_merino_1")],
    farmer: FARMER_F2,
    created_at: "2025-03-05T08:00:00Z",
    updated_at: "2025-03-05T08:00:00Z",
    rating: 4.6,
    reviews: 8,
  },
  {
    id: "a3",
    name: "Boer Meat Goat",
    description:
      "South African Boer goats, renowned for fast growth and superior meat quality. Well-adapted to the Kenyan climate and arid conditions. All goats are dewormed and vaccinated against PPR and foot rot. Excellent for meat and crossbreeding purposes with local breeds.",
    animal_type: { id: "at2", name: "Goat" },
    breed: { id: "br7", name: "Boer", animal_type_id: "at2" },
    age_months: 12,
    weight_kg: 45,
    price: 9500,
    location: "Nakuru, Kenya",
    is_available: true,
    images: [img("img3a", GOAT_IMG, true, "farmart/goat_boer_1")],
    farmer: FARMER_F1,
    created_at: "2025-03-08T08:00:00Z",
    updated_at: "2025-03-08T08:00:00Z",
    rating: 4.7,
    reviews: 15,
  },
  {
    id: "a4",
    name: "Ross 308 Broiler Chicken",
    description:
      "Fast-growing Ross 308 broiler chickens, market-ready in just 6 weeks. Fed on quality grower feeds with no growth hormones or antibiotics. Ideal for restaurants, butcheries, and households. Raised in a well-ventilated, biosecure poultry house in Kisumu county.",
    animal_type: { id: "at4", name: "Poultry" },
    breed: { id: "br15", name: "Ross 308 Broiler", animal_type_id: "at4" },
    age_months: 2,
    weight_kg: 2.5,
    price: 700,
    location: "Kisumu, Kenya",
    is_available: true,
    images: [img("img4a", CHICKEN_IMG, true, "farmart/poultry_ross_1")],
    farmer: FARMER_F3,
    created_at: "2025-03-10T08:00:00Z",
    updated_at: "2025-03-10T08:00:00Z",
    rating: 4.5,
    reviews: 22,
  },
  {
    id: "a5",
    name: "Duroc Breeding Pig",
    description:
      "High-quality Duroc pigs known for their excellent meat-to-fat ratio and docile temperament. Raised in a free-range environment with balanced nutrition in Eldoret. Each pig has a health certificate from a registered vet. Great for commercial pork farming.",
    animal_type: { id: "at5", name: "Pig" },
    breed: { id: "br19", name: "Duroc", animal_type_id: "at5" },
    age_months: 8,
    weight_kg: 90,
    price: 22000,
    location: "Uasin Gishu, Kenya",
    is_available: true,
    images: [img("img5a", PIG_IMG, true, "farmart/pig_duroc_1")],
    farmer: FARMER_F2,
    created_at: "2025-03-12T08:00:00Z",
    updated_at: "2025-03-12T08:00:00Z",
    rating: 4.3,
    reviews: 5,
  },
  {
    id: "a6",
    name: "Aberdeen Angus Bull",
    description:
      "Premium Aberdeen Angus bull — excellent for breeding or quality beef production. Known for marbled, tender meat with superior taste. Comes with pedigree papers and full veterinary certificate. Adaptable to Kenya's varying climatic zones. Registered and traceable.",
    animal_type: { id: "at1", name: "Cattle" },
    breed: { id: "br2", name: "Angus", animal_type_id: "at1" },
    age_months: 24,
    weight_kg: 420,
    price: 95000,
    location: "Kisumu, Kenya",
    is_available: true,
    images: [
      img("img6a", COW_IMG, true, "farmart/cattle_angus_1"),
      img("img6b", CATTLE_IMG, false, "farmart/cattle_angus_2"),
    ],
    farmer: FARMER_F3,
    created_at: "2025-03-15T08:00:00Z",
    updated_at: "2025-03-15T08:00:00Z",
    rating: 4.9,
    reviews: 7,
  },
  {
    id: "a7",
    name: "Broad-Breasted Bronze Turkey",
    description:
      "Plump and healthy Bronze turkeys, great for festivities, weddings, and special occasions. Raised on quality grain feed with no antibiotics. Live weight 10–14 kg. Ready for immediate processing or live delivery to Nairobi and surrounding areas on request.",
    animal_type: { id: "at7", name: "Turkey" },
    breed: { id: "br24", name: "Broad-Breasted Bronze", animal_type_id: "at7" },
    age_months: 5,
    weight_kg: 12,
    price: 4500,
    location: "Nakuru, Kenya",
    is_available: true,
    images: [img("img7a", TURKEY_IMG, true, "farmart/turkey_bronze_1")],
    farmer: FARMER_F1,
    created_at: "2025-03-18T08:00:00Z",
    updated_at: "2025-03-18T08:00:00Z",
    rating: 4.4,
    reviews: 9,
  },
  {
    id: "a8",
    name: "New Zealand White Rabbit",
    description:
      "New Zealand White rabbits, ideal for both meat and fur production. Healthy, fast-growing, and easy to rear. Vaccinated against Rabbit Haemorrhagic Disease (RHD). Raised in clean, well-ventilated hutches. Each rabbit has been dewormed and is ready for relocation.",
    animal_type: { id: "at6", name: "Rabbit" },
    breed: { id: "br22", name: "New Zealand White", animal_type_id: "at6" },
    age_months: 3,
    weight_kg: 3.5,
    price: 1800,
    location: "Uasin Gishu, Kenya",
    is_available: true,
    images: [img("img8a", RABBIT_IMG, true, "farmart/rabbit_nzw_1")],
    farmer: FARMER_F2,
    created_at: "2025-03-20T08:00:00Z",
    updated_at: "2025-03-20T08:00:00Z",
    rating: 4.2,
    reviews: 11,
  },
  {
    id: "a9",
    name: "Galla Dairy Goat",
    description:
      "Hardy Kenyan Galla goats — drought-resistant and highly adaptable to arid and semi-arid conditions. Excellent milk and meat producers. Ideal for small-scale farmers in Kisumu and Western Kenya. Well-suited for crossbreeding with Toggenburg for improved dairy production.",
    animal_type: { id: "at2", name: "Goat" },
    breed: { id: "br8", name: "Galla", animal_type_id: "at2" },
    age_months: 18,
    weight_kg: 40,
    price: 8500,
    location: "Kisumu, Kenya",
    is_available: false,
    images: [img("img9a", GOAT_IMG, true, "farmart/goat_galla_1")],
    farmer: FARMER_F3,
    created_at: "2025-03-22T08:00:00Z",
    updated_at: "2025-03-22T08:00:00Z",
    rating: 4.6,
    reviews: 18,
  },
];

// ─── Mock Users (aligns with POST /api/v1/auth/login → AuthUser) ─────────────
export const mockUsers: User[] = [
  {
    id: "f1",
    first_name: "John",
    last_name: "Kamau",
    email: "farmer@farmart.com",
    password: "password",
    phone: "0712345678",
    role: "farmer",
    is_verified: true,
    created_at: "2024-01-15T00:00:00Z",
    farm_name: "Kamau Family Farms",
    county: "Nakuru",
  },
  {
    id: "f2",
    first_name: "Mary",
    last_name: "Wanjiku",
    email: "mary@farmart.com",
    password: "password",
    phone: "0722456789",
    role: "farmer",
    is_verified: true,
    created_at: "2024-02-20T00:00:00Z",
    farm_name: "Wanjiku Green Acres",
    county: "Uasin Gishu",
  },
  {
    id: "f3",
    first_name: "Peter",
    last_name: "Mwangi",
    email: "peter@farmart.com",
    password: "password",
    phone: "0733567890",
    role: "farmer",
    is_verified: true,
    created_at: "2024-03-10T00:00:00Z",
    farm_name: "Mwangi Livestock Ranch",
    county: "Kisumu",
  },
  {
    id: "b1",
    first_name: "Alice",
    last_name: "Njeri",
    email: "buyer@farmart.com",
    password: "password",
    phone: "0711234567",
    role: "buyer",
    is_verified: true,
    created_at: "2024-04-05T00:00:00Z",
    county: "Nairobi",
  },
];

// ─── Mock Orders (aligns with GET /api/v1/farmer/orders & /api/v1/orders) ─────
export const mockOrders: Order[] = [
  {
    id: "ord-2025-001",
    buyer: {
      id: "b1",
      first_name: "Alice",
      last_name: "Njeri",
      phone: "0711234567",
    },
    items: [
      {
        id: "oi-001-1",
        animal: mockAnimals[0],
        price_at_purchase: mockAnimals[0].price,
      },
    ],
    total_amount: mockAnimals[0].price,
    status: "pending",
    delivery_address: "123 Westlands Road",
    delivery_county: "Nairobi",
    buyer_phone: "0711234567",
    payment_method: "mpesa",
    created_at: "2025-03-23T10:30:00Z",
  },
  {
    id: "ord-2025-002",
    buyer: {
      id: "b1",
      first_name: "Alice",
      last_name: "Njeri",
      phone: "0711234567",
    },
    items: [
      {
        id: "oi-002-1",
        animal: mockAnimals[2],
        price_at_purchase: mockAnimals[2].price,
      },
      {
        id: "oi-002-2",
        animal: mockAnimals[6],
        price_at_purchase: mockAnimals[6].price,
      },
    ],
    total_amount: mockAnimals[2].price + mockAnimals[6].price,
    status: "confirmed",
    delivery_address: "123 Westlands Road",
    delivery_county: "Nairobi",
    buyer_phone: "0711234567",
    payment_method: "bank_transfer",
    created_at: "2025-03-20T14:00:00Z",
  },
  {
    id: "ord-2025-003",
    buyer: {
      id: "b2",
      first_name: "James",
      last_name: "Otieno",
      phone: "0722987654",
    },
    items: [
      {
        id: "oi-003-1",
        animal: mockAnimals[2],
        price_at_purchase: mockAnimals[2].price,
      },
    ],
    total_amount: mockAnimals[2].price,
    status: "rejected",
    delivery_address: "45 Mombasa Road, Mlolongo",
    delivery_county: "Machakos",
    buyer_phone: "0722987654",
    payment_method: "mpesa",
    notes: "Please arrange transport to Machakos.",
    created_at: "2025-03-18T09:15:00Z",
  },
  {
    id: "ord-2025-004",
    buyer: {
      id: "b3",
      first_name: "Grace",
      last_name: "Adhiambo",
      phone: "0733123456",
    },
    items: [
      {
        id: "oi-004-1",
        animal: mockAnimals[6],
        price_at_purchase: mockAnimals[6].price,
      },
    ],
    total_amount: mockAnimals[6].price,
    status: "completed",
    delivery_address: "78 Karen Road, Karen",
    delivery_county: "Nairobi",
    buyer_phone: "0733123456",
    payment_method: "cash_on_delivery",
    created_at: "2025-03-10T11:00:00Z",
  },
];

// ─── Utility helpers ───────────────────────────────────────────────────────────

/** Format price as "KSh X,XXX" with Kenyan thousands separator */
export const formatPrice = (price: number): string =>
  `KSh ${price.toLocaleString("en-KE")}`;

/** Convert age in months to human-readable string */
export const formatAge = (months: number): string => {
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} yr${years !== 1 ? "s" : ""}`;
  return `${years} yr ${rem} mo`;
};

/** Get the primary image URL from an animal's images array */
export const getPrimaryImage = (animal: Animal): string =>
  animal.images.find((i) => i.is_primary)?.url || animal.images[0]?.url || "";

/** Get full name from farmer or user */
export const getFullName = (person: {
  first_name: string;
  last_name: string;
}): string => `${person.first_name} ${person.last_name}`;

// ─── Sample images map for Add/Edit animal form (demo placeholder) ────────────
export const SAMPLE_IMAGES: Record<string, string> = {
  Cattle: CATTLE_IMG,
  Goat: GOAT_IMG,
  Sheep: SHEEP_IMG,
  Poultry: CHICKEN_IMG,
  Pig: PIG_IMG,
  Rabbit: RABBIT_IMG,
  Turkey: TURKEY_IMG,
};
