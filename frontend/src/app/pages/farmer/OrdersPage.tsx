import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Phone,
  MapPin,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { formatPrice, type Order } from "../../data/mockData";

type StatusFilter = "all" | Order["status"];

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: Clock,
    border: "border-amber-300",
  },
  confirmed: {
    label: "Confirmed",
    bg: "bg-green-100",
    text: "text-[#2D6A4F]",
    icon: CheckCircle,
    border: "border-green-300",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-100",
    text: "text-red-700",
    icon: XCircle,
    border: "border-red-300",
  },
  completed: {
    label: "Completed",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: CheckCircle,
    border: "border-blue-300",
  },
};

export function OrdersPage() {
  const { getOrdersByFarmer, updateOrderStatus } = useApp();
  const orders = getOrdersByFarmer();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection reason modal state
  const [rejectModal, setRejectModal] = useState<{
    orderId: string;
    reason: string;
  } | null>(null);

  const filtered =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  // action must match AppContext: "confirm" | "reject"
  const handleAction = async (orderId: string, action: "confirm" | "reject", reason?: string) => {
    setActionLoading(orderId + action);
    setActionError(null);
    try {
      await updateOrderStatus(orderId, action, reason);
      setRejectModal(null);
    } catch (err: any) {
      setActionError(err.message || `Failed to ${action} order.`);
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "rejected", label: "Rejected" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-[#1B2D1B]"
          style={{ fontWeight: 800, fontSize: "1.5rem" }}
        >
          Order Management
        </h1>
        <p className="text-gray-500 text-sm">{orders.length} total orders</p>
      </div>

      {/* Global action error */}
      {actionError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

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
              style={{ fontWeight: 700, fontSize: "1.5rem" }}
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
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-[#1B2D1B]" style={{ fontWeight: 600 }}>
            No {filter === "all" ? "" : filter} orders
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Orders will appear here when buyers purchase your animals
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const isOpen = expanded === order.id;
            const buyerName =
              `${order.buyer.first_name} ${order.buyer.last_name}`.trim() ||
              "Unknown buyer";

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
                    <div className="flex items-center justify-between">
                      <p
                        className="text-sm text-[#1B2D1B] font-mono"
                        style={{ fontWeight: 700 }}
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} shrink-0 ml-2`}
                        style={{ fontWeight: 500 }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{buyerName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs text-gray-400">
                        {order.items.length} item
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
                    {/* Items */}
                    <div>
                      <p
                        className="text-xs text-gray-400 uppercase tracking-wide mb-2"
                        style={{ fontWeight: 600 }}
                      >
                        Order Items
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                          >
                            {item.animal?.images?.[0]?.url && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                                <img
                                  src={item.animal.images[0].url}
                                  alt={item.animal.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <p
                                className="text-sm text-[#1B2D1B]"
                                style={{ fontWeight: 600 }}
                              >
                                {item.animal?.name || "Animal"}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.animal?.animal_type?.name || ""}
                              </p>
                            </div>
                            <p
                              className="text-sm text-[#2D6A4F]"
                              style={{ fontWeight: 700 }}
                            >
                              {formatPrice(item.price_at_purchase)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Buyer info */}
                    <div>
                      <p
                        className="text-xs text-gray-400 uppercase tracking-wide mb-2"
                        style={{ fontWeight: 600 }}
                      >
                        Buyer Info
                      </p>
                      <div className="space-y-1.5">
                        {order.buyer_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <a
                              href={`tel:${order.buyer_phone}`}
                              className="hover:text-[#2D6A4F] transition-colors"
                            >
                              {order.buyer_phone}
                            </a>
                          </div>
                        )}
                        {order.delivery_address && (
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                            {order.delivery_address}
                          </div>
                        )}
                        {order.notes && (
                          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-1">
                            <span style={{ fontWeight: 600 }}>Notes:</span>{" "}
                            {order.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400">Total Amount</p>
                        <p
                          className="text-[#2D6A4F]"
                          style={{ fontWeight: 800, fontSize: "1.1rem" }}
                        >
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>

                      {order.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setRejectModal({ orderId: order.id, reason: "" })
                            }
                            disabled={actionLoading !== null}
                            className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                            style={{ fontWeight: 600 }}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(order.id, "confirm")}
                            disabled={actionLoading === order.id + "confirm"}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#2D6A4F] text-white rounded-xl text-sm hover:bg-[#235A41] transition-colors disabled:opacity-50"
                            style={{ fontWeight: 600 }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading === order.id + "confirm"
                              ? "Confirming..."
                              : "Confirm Order"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3
              className="text-[#1B2D1B] mb-1"
              style={{ fontWeight: 700 }}
            >
              Reject Order
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Optionally provide a reason. The buyer will be notified.
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal({ ...rejectModal, reason: e.target.value })
              }
              placeholder="e.g. Animal is no longer available"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleAction(rejectModal.orderId, "reject", rejectModal.reason)
                }
                disabled={actionLoading === rejectModal.orderId + "reject"}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {actionLoading === rejectModal.orderId + "reject"
                  ? "Rejecting..."
                  : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
