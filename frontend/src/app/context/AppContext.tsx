import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Animal, CartItem, Order, User } from "../data/mockData";

// =============================================================================
// BACKEND API CONFIGURATION
// =============================================================================
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const getToken = () => localStorage.getItem("farmart_token") || "";

const getAuthHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// =============================================================================
// TYPES
// =============================================================================
export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  role: "farmer" | "buyer";
  farm_name?: string;
  farm_location?: string;
}

// =============================================================================
// RESPONSE MAPPERS
// Map API response shapes to the frontend interface types
// =============================================================================

const mapApiUser = (u: any): User => ({
  id: u.id,
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  phone: u.phone_number || "",
  password: "", // never stored from API
  role: u.role,
  is_verified: u.is_verified,
  created_at: u.created_at || new Date().toISOString(),
  farm_name: u.profile?.farm_name,
  county: u.profile?.farm_location,
});

const mapApiAnimal = (a: any): Animal => ({
  id: a.id,
  name: a.name,
  description: a.description || "",
  animal_type: a.animal_type,
  breed: a.breed,
  age_months: a.age_months,
  weight_kg: a.weight_kg || 0,
  price: parseFloat(a.price),
  location: a.farmer?.farm_location || "",
  is_available: a.status === "available",
  images: (a.images || []).map((img: any) => ({
    id: img.id,
    url: img.cloudinary_url,
    is_primary: img.is_primary,
    public_id: img.cloudinary_public_id,
  })),
  farmer: {
    id: a.farmer?.id || "",
    first_name: a.farmer?.full_name?.split(" ")[0] || "",
    last_name: a.farmer?.full_name?.split(" ").slice(1).join(" ") || "",
    phone: a.farmer?.phone_number || "",
    farm_name: a.farmer?.farm_name || "",
    county: a.farmer?.farm_location || "",
  },
  created_at: a.created_at || "",
  updated_at: a.updated_at || "",
});

const mapApiCartItem = (item: any): CartItem => {
  const a = item.animal || {};
  return {
    id: item.id,
    animal: {
      id: a.id || "",
      name: a.name || "",
      description: "",
      animal_type: a.animal_type || { id: "", name: "" },
      breed: a.breed || { id: "", name: "", animal_type_id: "" },
      age_months: 0,
      weight_kg: 0,
      price: parseFloat(a.price) || 0,
      location: a.farmer?.farm_location || "",
      is_available: a.is_available ?? true,
      images: a.primary_image
        ? [{ id: "", url: a.primary_image, is_primary: true, public_id: "" }]
        : [],
      farmer: {
        id: "",
        first_name: "",
        last_name: "",
        phone: "",
        farm_name: a.farmer?.farm_name || "",
        county: a.farmer?.farm_location || "",
      },
      created_at: "",
      updated_at: "",
    },
    added_at: item.added_at || new Date().toISOString(),
  };
};

const mapApiOrder = (o: any): Order => ({
  id: o.id,
  buyer: {
    id: o.buyer?.id || "",
    first_name: o.buyer?.full_name?.split(" ")[0] || o.buyer?.first_name || "",
    last_name:
      o.buyer?.full_name?.split(" ").slice(1).join(" ") ||
      o.buyer?.last_name ||
      "",
    phone: o.buyer?.phone_number || "",
  },
  items: (o.items || []).map((item: any) => ({
    id: item.id,
    // Build a minimal Animal from snapshot fields — the API does not embed
    // the full animal object in order items; it provides snapshot fields instead.
    animal: {
      id: item.animal_id || "",
      name: item.animal_name_snapshot || "",
      description: "",
      animal_type: {
        id: "",
        name: item.animal_type_snapshot || "",
      },
      breed: { id: "", name: "", animal_type_id: "" },
      age_months: 0,
      weight_kg: 0,
      price: parseFloat(item.price_at_purchase) || 0,
      location: "",
      is_available: false,
      images: item.primary_image
        ? [{ id: "", url: item.primary_image, is_primary: true, public_id: "" }]
        : [],
      farmer: {
        id: "",
        first_name: "",
        last_name: "",
        phone: "",
        farm_name: "",
        county: "",
      },
      created_at: "",
      updated_at: "",
    } as Animal,
    price_at_purchase: parseFloat(item.price_at_purchase) || 0,
  })),
  total_amount: parseFloat(o.total_amount) || 0,
  status: o.status,
  delivery_address: o.delivery_address || "",
  delivery_county: "",
  buyer_phone: o.buyer?.phone_number || "",
  payment_method: "cash_on_delivery",
  notes: o.notes,
  created_at: o.created_at || "",
});

// =============================================================================
// CONTEXT INTERFACE
// =============================================================================
interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;

  // Animals
  animals: Animal[];
  addAnimal: (formData: FormData) => Promise<void>;
  updateAnimal: (id: string, data: Partial<Animal>) => Promise<void>;
  deleteAnimal: (id: string) => Promise<void>;
  getAnimalById: (id: string) => Animal | undefined;
  getFarmerAnimals: () => Animal[];

  // Cart
  cart: CartItem[];
  addToCart: (animal: Animal) => Promise<void>;
  removeFromCart: (animalId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  cartTotal: number;
  cartCount: number;
  isInCart: (animalId: string) => boolean;

  // Orders
  orders: Order[];
  placeOrder: (deliveryAddress: string, notes?: string) => Promise<string>;
  updateOrderStatus: (
    orderId: string,
    action: "confirm" | "reject",
    reason?: string,
  ) => Promise<void>;
  getOrdersByFarmer: () => Order[];
  getOrdersByBuyer: () => Order[];
}

const AppContext = createContext<AppContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  // Farmer-specific listings across all statuses (available + reserved + sold).
  // The public `animals` array only holds available listings, so we maintain a
  // separate array for the farmer's own dashboard/listings pages.
  const [farmerAnimals, setFarmerAnimals] = useState<Animal[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // ── On mount: restore session & fetch animals ─────────────────────────────

  useEffect(() => {
    fetchAnimals();
    if (getToken()) {
      restoreSession();
    }
  }, []);

  // Fetch role-specific data whenever the logged-in user changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "buyer") {
        fetchCart();
        fetchBuyerOrders();
      } else if (currentUser.role === "farmer") {
        fetchFarmerOrders();
        fetchFarmerAnimals(currentUser.id);
      }
    } else {
      setCart([]);
      setOrders([]);
      setFarmerAnimals([]);
    }
  }, [currentUser?.id]);

  // ── Data fetchers ─────────────────────────────────────────────────────────

  const restoreSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCurrentUser(mapApiUser(data));
      } else {
        localStorage.removeItem("farmart_token");
      }
    } catch {
      localStorage.removeItem("farmart_token");
    }
  };

  const fetchAnimals = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/animals`);
      if (res.ok) {
        const { data } = await res.json();
        setAnimals((data || []).map(mapApiAnimal));
      }
    } catch {
      // silently fail — no internet / server down
    }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cart`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCart((data.items || []).map(mapApiCartItem));
      }
    } catch {
      // silently fail
    }
  };

  const fetchBuyerOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrders((data || []).map(mapApiOrder));
      }
    } catch {
      // silently fail
    }
  };

  const fetchFarmerOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/farmer/orders`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const { data } = await res.json();
        setOrders((data || []).map(mapApiOrder));
      }
    } catch {
      // silently fail
    }
  };

  // Fetch ALL of a farmer's listings regardless of status (available / reserved / sold).
  // The public /animals endpoint defaults to status=available, so we run three
  // parallel requests — one per status — and merge the results.
  const fetchFarmerAnimals = async (farmerId: string) => {
    try {
      const statuses = ["available", "reserved", "sold"];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(
            `${API_BASE_URL}/animals?farmer_id=${farmerId}&status=${s}&per_page=100`,
          )
            .then((r) => r.json())
            .catch(() => ({ data: [] })),
        ),
      );
      const all = results.flatMap((r) => (r.data || []).map(mapApiAnimal));
      all.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setFarmerAnimals(all);
    } catch {
      // silently fail
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return false;
    const { data } = await res.json();
    localStorage.setItem("farmart_token", data.access_token);
    setCurrentUser(mapApiUser(data.user));
    return true;
  };

  const register = async (data: RegisterData): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone,
        password: data.password,
        role: data.role,
        farm_name: data.farm_name,
        farm_location: data.farm_location,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Registration failed. Please try again.");
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem("farmart_token");
      setCurrentUser(null);
    }
  };

  // ── Animals ───────────────────────────────────────────────────────────────

  const addAnimal = async (formData: FormData): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/animals`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to create listing");
    }
    const { data } = await res.json();
    const mapped = mapApiAnimal(data);
    setAnimals((prev) => [mapped, ...prev]);
    setFarmerAnimals((prev) => [mapped, ...prev]);
  };

  const updateAnimal = async (
    id: string,
    data: Partial<Animal>,
  ): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/animals/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to update listing");
    }
    const { data: updated } = await res.json();
    const mapped = mapApiAnimal(updated);
    setAnimals((prev) => prev.map((a) => (a.id === id ? mapped : a)));
    setFarmerAnimals((prev) => prev.map((a) => (a.id === id ? mapped : a)));
  };

  const deleteAnimal = async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/animals/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to delete listing");
    }
    setAnimals((prev) => prev.filter((a) => a.id !== id));
    setFarmerAnimals((prev) => prev.filter((a) => a.id !== id));
  };

  const getAnimalById = (id: string) => animals.find((a) => a.id === id);

  // Returns the farmer's own listings (all statuses). For farmer dashboard/listings pages.
  const getFarmerAnimals = useCallback(() => farmerAnimals, [farmerAnimals]);

  // ── Cart ──────────────────────────────────────────────────────────────────

  const addToCart = async (animal: Animal): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ animal_id: animal.id }),
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    await fetchCart();
  };

  const removeFromCart = async (animalId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/cart/items/${animalId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to remove from cart");
    setCart((prev) => prev.filter((i) => i.animal.id !== animalId));
  };

  const clearCart = async (): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to clear cart");
    setCart([]);
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.animal.price, 0),
    [cart],
  );
  const cartCount = cart.length;
  const isInCart = (animalId: string) =>
    cart.some((i) => i.animal.id === animalId);

  // ── Orders ────────────────────────────────────────────────────────────────

  const placeOrder = async (
    deliveryAddress: string,
    notes?: string,
  ): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ delivery_address: deliveryAddress, notes }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Checkout failed");
    }
    const { data } = await res.json();
    // API now returns { orders: [...], order_count: N }
    const createdOrders: Order[] = (data.orders || [data]).map(mapApiOrder);
    setOrders((prev) => [...createdOrders, ...prev]);
    setCart([]);
    // Return the first order's id for the success page redirect
    return createdOrders[0]?.id ?? "";
  };

  const updateOrderStatus = async (
    orderId: string,
    action: "confirm" | "reject",
    reason?: string,
  ): Promise<void> => {
    const res = await fetch(
      `${API_BASE_URL}/farmer/orders/${orderId}/${action}`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: action === "reject" ? JSON.stringify({ reason }) : undefined,
      },
    );
    if (!res.ok) throw new Error(`Failed to ${action} order`);
    const { data } = await res.json();
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: data.status } : o)),
    );
  };

  // The backend /farmer/orders endpoint already filters to this farmer's orders,
  // so every entry in `orders` (when role=farmer) belongs to them.
  const getOrdersByFarmer = useCallback(() => orders, [orders]);

  // The backend /orders endpoint already filters to this buyer's orders,
  // so every entry in `orders` (when role=buyer) belongs to them.
  const getOrdersByBuyer = useCallback(() => orders, [orders]);

  // ── Provider render ───────────────────────────────────────────────────────
  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        register,
        logout,
        animals,
        addAnimal,
        updateAnimal,
        deleteAnimal,
        getAnimalById,
        getFarmerAnimals,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        isInCart,
        orders,
        placeOrder,
        updateOrderStatus,
        getOrdersByFarmer,
        getOrdersByBuyer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
