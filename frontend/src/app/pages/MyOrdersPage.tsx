import { useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MapPin,
  ChevronDown,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatPrice, getPrimaryImage, type Order } from "../data/mockData";

type StatusFilter = "all" | Order["status"];

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: Clock,
    border: "border-amber-300",
    description: "Waiting for farmer confirmation",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-green-100",
    text: "text-[#2D6A4F]",
    icon: CheckCircle,
    border: "border-green-300",
    description: "Farmer confirmed — delivery being arranged",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
    border: "border-red-300",
    description: "Farmer was unable to fulfil this order",
  },
  completed: {
    label: "Completed",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: CheckCircle,
    border: "border-blue-300",
    description: "Order delivered and completed",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-gray-100",
    text: "text-gray-600",
    icon: XCircle,
    border: "border-gray-300",
    description: "Order was cancelled",
  },
};

export function MyOrdersPage() {
  const { getOrdersByBuyer } = useApp();
  const orders = getOrdersByBuyer();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "rejected", label: "Rejected" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EF] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1
            className="text-[#1B2D1B]"
            style={{ fontWeight: 800, fontSize: "1.5rem" }}
          >
            My Orders
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {orders.length} order{orders.length !== 1 ? "s" : ""} placed
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { key: "pending", label: "Pending", color: "border-l-amber-400" },
              { key: "confirmed", label: "Confirmed", color: "border-l-green-500" },
              { key: "rejected", label: "Rejected", color: "border-l-red-400" },
              { key: "completed", label: "Completed", color: "border-l-blue-400" },
            ] as const
          ).map((s) => (
            <div
              key={s.key}
              className={`bg-white rounded-xl border border-gray-100 border-l-4 ${s.color} shadow-sm p-4`}
            >
              <p
                className="text-[#1B2D1B]"
                style={{ fontWeight: 700, fontSize: "1.4rem" }}
              >
                {counts[s.key]}
              </p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${
                filter === f.value
                  ? "bg-[#2D6A4F] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={{ fontWeight: filter === f.value ? 600 : 400 }}
            >
              {f.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === f.value
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {counts[f.value as keyof typeof counts] ?? orders.length}
              </span>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-[#1B2D1B]" style={{ fontWeight: 600 }}>
              {filter === "all" ? "No orders yet" : `No ${filter} orders`}
            </p>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              {filter === "all"
                ? "Browse the marketplace and buy your first animal"
                : "Orders with this status will appear here"}
            </p>
            {filter === "all" && (
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 bg-[#2D6A4F] text-white px-5 py-2.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
                style={{ fontWeight: 600 }}
              >
                Browse Animals
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => {
              const cfg =
                STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ||
                STATUS_CONFIG.pending;
              const isOpen = expanded === order.id;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${cfg.border}`}
                  style={{ borderLeftWidth: "4px" }}
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="w-full flex items-start gap-4 p-4 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}
                    >
                      <cfg.icon className={`w-5 h-5 ${cfg.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className="text-sm text-[#1B2D1B] font-mono"
                          style={{ fontWeight: 700 }}
                        >
                          #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} shrink-0`}
                          style={{ fontWeight: 500 }}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {cfg.description}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-xs text-gray-400">
                          {order.items.length} animal
                          {order.items.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-gray-400">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString(
                                "en-KE",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : ""}
                        </span>
                        <span
                          className="text-xs text-[#2D6A4F]"
                          style={{ fontWeight: 600 }}
                        >
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-1 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {/* Animals */}
                      <div>
                        <p
                          className="text-xs text-gray-400 uppercase tracking-wide mb-2"
                          style={{ fontWeight: 600 }}
                        >
                          Animals Purchased
                        </p>
                        <div className="space-y-2">
                          {order.items.map((item) => {
                            const imgUrl = getPrimaryImage(item.animal);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-200">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={item.animal.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-sm text-[#1B2D1B] truncate"
                                    style={{ fontWeight: 600 }}
                                  >
                                    {item.animal.name}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {item.animal.animal_type?.name || ""}
                                  </p>
                                </div>
                                <p
                                  className="text-sm text-[#2D6A4F] shrink-0"
                                  style={{ fontWeight: 700 }}
                                >
                                  {formatPrice(item.price_at_purchase)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Delivery info */}
                      <div>
                        <p
                          className="text-xs text-gray-400 uppercase tracking-wide mb-2"
                          style={{ fontWeight: 600 }}
                        >
                          Delivery
                        </p>
                        {order.delivery_address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                            {order.delivery_address}
                          </div>
                        )}
                        {order.notes && (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-2">
                            <span style={{ fontWeight: 600 }}>Notes:</span>{" "}
                            {order.notes}
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Store className="w-3.5 h-3.5" />
                          Order total
                        </div>
                        <p
                          className="text-[#2D6A4F]"
                          style={{ fontWeight: 800, fontSize: "1.05rem" }}
                        >
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>

                      {/* Status message for confirmed/rejected */}
                      {order.status === "confirmed" && (
                        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-green-700">
                            The farmer has confirmed your order. They will
                            contact you to arrange delivery.
                          </p>
                        </div>
                      )}
                      {order.status === "rejected" && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-red-700">
                            The farmer was unable to fulfil this order. The
                            animals are now available again for purchase.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center pt-2">
          <Link
            to="/marketplace"
            className="text-sm text-[#2D6A4F] hover:underline"
            style={{ fontWeight: 600 }}
          >
            Browse more animals →
          </Link>
        </div>
      </div>
    </div>
  );
}
