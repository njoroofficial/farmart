import { Link } from "react-router";
import {
  Package,
  ShoppingCart,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatPrice, getPrimaryImage } from "../../data/mockData";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
  confirmed: { label: "Confirmed", bg: "bg-green-100", text: "text-[#2D6A4F]", icon: CheckCircle },
  rejected: { label: "Rejected", bg: "bg-red-100", text: "text-red-700", icon: XCircle },
  completed: { label: "Completed", bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-600", icon: XCircle },
};

export function BuyerDashboardPage() {
  const { currentUser, getOrdersByBuyer, cart, cartTotal } = useApp();
  const orders = getOrdersByBuyer();

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "completed").length;
  const totalSpent = orders
    .filter((o) => o.status === "confirmed" || o.status === "completed")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const recentOrders = orders.slice(0, 4);
  const recentCart = cart.slice(0, 3);

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: Package,
      color: "bg-blue-50 text-blue-600",
      trend: `${pendingOrders} pending`,
    },
    {
      label: "Cart Items",
      value: cart.length,
      icon: ShoppingCart,
      color: "bg-amber-50 text-amber-600",
      trend: cartTotal > 0 ? formatPrice(cartTotal) : "Empty",
    },
    {
      label: "Confirmed Orders",
      value: confirmedOrders,
      icon: CheckCircle,
      color: "bg-green-50 text-[#2D6A4F]",
      trend: "All time",
    },
    {
      label: "Total Spent",
      value: formatPrice(totalSpent),
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      trend: "Confirmed purchases",
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
            Welcome back, {currentUser?.first_name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Here's what's happening with your orders
          </p>
        </div>
        <Link
          to="/marketplace"
          className="hidden sm:flex items-center gap-2 bg-[#2D6A4F] text-white px-4 py-2.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Search className="w-4 h-4" /> Browse Animals
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
              to="/buyer/orders"
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
                const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                const itemNames = order.items.map((i) => i.animal?.name || "Animal").join(", ");
                return (
                  <div key={order.id} className="flex items-start gap-3 p-4">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <cfg.icon className={`w-4 h-4 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-[#1B2D1B] truncate" style={{ fontWeight: 600 }}>
                          {itemNames}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ml-2 shrink-0`} style={{ fontWeight: 500 }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
                          : ""}
                      </p>
                      <p className="text-sm text-[#2D6A4F]" style={{ fontWeight: 600 }}>
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cart preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
              Your Cart
            </h2>
            <Link
              to="/buyer/cart"
              className="text-xs text-[#2D6A4F] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCart.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-3">Your cart is empty</p>
                <Link
                  to="/marketplace"
                  className="text-xs bg-[#2D6A4F] text-white px-4 py-2 rounded-lg hover:bg-[#235A41] transition-colors"
                >
                  Browse Animals
                </Link>
              </div>
            ) : (
              recentCart.map((item) => {
                const imgUrl = getPrimaryImage(item.animal);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-200">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.animal.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1B2D1B] truncate" style={{ fontWeight: 600 }}>
                        {item.animal.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.animal.animal_type.name} · {item.animal.breed.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-[#2D6A4F]" style={{ fontWeight: 700 }}>
                        {formatPrice(item.animal.price)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Browse Animals",
            to: "/marketplace",
            icon: Search,
            color: "bg-[#2D6A4F] text-white",
          },
          {
            label: "View Cart",
            to: "/buyer/cart",
            icon: ShoppingCart,
            color: "bg-amber-50 text-amber-700 border border-amber-200",
          },
          {
            label: "My Orders",
            to: "/buyer/orders",
            icon: Package,
            color: "bg-blue-50 text-blue-700 border border-blue-200",
          },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-sm transition-all hover:scale-[1.02] ${action.color}`}
            style={{ fontWeight: 600 }}
          >
            <action.icon className="w-4.5 h-4.5" style={{ width: "1.1rem", height: "1.1rem" }} />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
