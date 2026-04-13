import { Link } from "react-router";
import {
  Package,
  List,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatPrice } from "../../data/mockData";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: AlertCircle,
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-green-100",
    text: "text-[#2D6A4F]",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
  },
  completed: {
    label: "Completed",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: CheckCircle,
  },
};

export function DashboardPage() {
  const { currentUser, getFarmerAnimals, getOrdersByFarmer } = useApp();

  const myAnimals = getFarmerAnimals();
  const myOrders = getOrdersByFarmer();

  const total_listings = myAnimals.length;
  const active_listings = myAnimals.filter((a) => a.is_available).length;
  const pending_orders = myOrders.filter((o) => o.status === "pending").length;
  const confirmed_orders = myOrders.filter(
    (o) => o.status === "confirmed" || o.status === "completed",
  ).length;
  const total_revenue = myOrders
    .filter((o) => o.status === "confirmed" || o.status === "completed")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const recentOrders = myOrders.slice(0, 5);

  const stats = [
    {
      label: "Total Listings",
      value: total_listings,
      icon: List,
      color: "bg-blue-50 text-blue-600",
      trend: `${active_listings} active`,
    },
    {
      label: "Pending Orders",
      value: pending_orders,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      trend: "Needs review",
    },
    {
      label: "Confirmed Orders",
      value: confirmed_orders,
      icon: CheckCircle,
      color: "bg-green-50 text-[#2D6A4F]",
      trend: "All time",
    },
    {
      label: "Total Revenue",
      value: formatPrice(total_revenue),
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      trend: "Confirmed sales",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[#1B2D1B]"
            style={{ fontWeight: 800, fontSize: "1.5rem" }}
          >
            Good day, {currentUser?.first_name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {currentUser?.farm_name} · {currentUser?.county}, Kenya
          </p>
        </div>
        <Link
          to="/farmer/listings/add"
          className="hidden sm:flex items-center gap-2 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
          style={{ fontWeight: 600 }}
        >
          <PlusCircle className="w-4 h-4" /> Add Animal
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          >
            <div
              className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <p
              className="text-[#1B2D1B] mb-0.5"
              style={{ fontWeight: 700, fontSize: "1.25rem" }}
            >
              {stat.value}
            </p>
            <p className="text-gray-600 text-xs">{stat.label}</p>
            <p className="text-gray-400 text-xs mt-1">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
              Recent Orders
            </h2>
            <Link
              to="/farmer/orders"
              className="text-xs text-[#2D6A4F] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No orders yet
              </div>
            ) : (
              recentOrders.map((order) => {
                const cfg =
                  STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                // Buyer name: full_name was split in AppContext mapper
                const buyerName =
                  `${order.buyer.first_name} ${order.buyer.last_name}`.trim() ||
                  "Unknown buyer";
                // Item names: use snapshot name stored on each item
                const itemNames = order.items
                  .map((i) => i.animal?.name || "Animal")
                  .join(", ");

                return (
                  <div key={order.id} className="flex items-start gap-3 p-4">
                    <div
                      className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <cfg.icon className={`w-4 h-4 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className="text-sm text-[#1B2D1B] truncate"
                          style={{ fontWeight: 600 }}
                        >
                          {buyerName}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ml-2 shrink-0`}
                          style={{ fontWeight: 500 }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {itemNames}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-400">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString(
                                "en-KE",
                                { day: "numeric", month: "short" },
                              )
                            : ""}
                        </p>
                        <p
                          className="text-sm text-[#2D6A4F]"
                          style={{ fontWeight: 600 }}
                        >
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* My Listings summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
              My Listings
            </h2>
            <Link
              to="/farmer/listings"
              className="text-xs text-[#2D6A4F] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {myAnimals.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">
                  No animals listed yet
                </p>
                <Link
                  to="/farmer/listings/add"
                  className="text-xs bg-[#2D6A4F] text-white px-4 py-2 rounded-lg hover:bg-[#235A41] transition-colors"
                >
                  Add Your First Animal
                </Link>
              </div>
            ) : (
              myAnimals.slice(0, 5).map((animal) => (
                <div key={animal.id} className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={
                        animal.images.find((i) => i.is_primary)?.url ||
                        animal.images[0]?.url
                      }
                      alt={animal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-[#1B2D1B] truncate"
                      style={{ fontWeight: 600 }}
                    >
                      {animal.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {animal.animal_type.name} · {animal.breed.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className="text-sm text-[#2D6A4F]"
                      style={{ fontWeight: 700 }}
                    >
                      {formatPrice(animal.price)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        animal.is_available
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                      style={{ fontWeight: 500 }}
                    >
                      {animal.is_available ? "Available" : "Sold"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Add New Animal",
            to: "/farmer/listings/add",
            icon: PlusCircle,
            color: "bg-[#2D6A4F] text-white",
          },
          {
            label: "View Orders",
            to: "/farmer/orders",
            icon: Package,
            color: "bg-amber-50 text-amber-700 border border-amber-200",
          },
          {
            label: "My Listings",
            to: "/farmer/listings",
            icon: List,
            color: "bg-blue-50 text-blue-700 border border-blue-200",
          },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm transition-all hover:scale-[1.02] ${action.color}`}
            style={{ fontWeight: 600 }}
          >
            <action.icon
              className="w-4.5 h-4.5"
              style={{ width: "1.1rem", height: "1.1rem" }}
            />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
