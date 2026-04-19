import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Search,
  Package,
  ShoppingCart,
  LogOut,
  Leaf,
  ChevronRight,
  Menu,
  X,
  Heart,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", to: "/buyer/dashboard", icon: LayoutDashboard },
  { label: "Browse Animals", to: "/marketplace", icon: Search },
  { label: "My Orders", to: "/buyer/orders", icon: Package },
  { label: "Cart", to: "/buyer/cart", icon: ShoppingCart },
  { label: "Wishlist", to: "/marketplace", icon: Heart },
];

export function BuyerLayout() {
  const { currentUser, logout, cartCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-[#F7F4EF]">
      {/* ── Sidebar ── */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-[#1B2D1B] flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-white"
              style={{ fontWeight: 700, fontSize: "1.1rem" }}
            >
              Far<span className="text-[#52B788]">mart</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white"
              style={{ fontWeight: 700 }}
            >
              {currentUser?.first_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-white text-sm truncate"
                style={{ fontWeight: 600 }}
              >
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
              <p className="text-[#52B788] text-xs truncate">Buyer</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active =
              item.to === "/marketplace"
                ? location.pathname === "/marketplace"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-[#2D6A4F] text-white"
                    : "text-gray-400 hover:bg-white/8 hover:text-white"
                }`}
                style={{ fontWeight: active ? 600 : 400 }}
              >
                <item.icon
                  className="w-4.5 h-4.5 shrink-0"
                  style={{ width: "1.1rem", height: "1.1rem" }}
                />
                {item.label}
                {item.label === "Cart" && cartCount > 0 && (
                  <span className="ml-auto text-[10px] bg-[#E8845A] text-white px-1.5 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
                {active && item.label !== "Cart" && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-500/15 hover:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Topbar (mobile) */}
        <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[#1B2D1B]" style={{ fontWeight: 700 }}>
            {NAV.find((n) =>
              n.to === "/marketplace"
                ? location.pathname === "/marketplace"
                : location.pathname.startsWith(n.to)
            )?.label || "Dashboard"}
          </span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
