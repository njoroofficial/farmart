import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  ShoppingCart,
  Menu,
  X,
  Leaf,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  List,
  PlusCircle,
  Package,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export function Navbar() {
  const { currentUser, logout, cartCount } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/");
  };

  const isFarmer = currentUser?.role === "farmer";

  const navLinks = isFarmer
    ? [
        { label: "Dashboard", to: "/farmer/dashboard" },
        { label: "My Animals", to: "/farmer/listings" },
        { label: "Orders", to: "/farmer/orders" },
      ]
    : [
        { label: "Browse Animals", to: currentUser ? "/marketplace" : "/login" },
        { label: "Categories", to: "/marketplace?tab=categories" },
        ...(currentUser ? [{ label: "Dashboard", to: "/buyer/dashboard" }] : []),
      ];

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2D6A4F] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[#1B2D1B]"
              style={{ fontWeight: 700, fontSize: "1.25rem" }}
            >
              Far<span className="text-[#2D6A4F]">mart</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm transition-colors ${
                  location.pathname.startsWith(link.to.split("?")[0])
                    ? "text-[#2D6A4F] font-medium"
                    : "text-gray-600 hover:text-[#2D6A4F]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="hidden md:flex items-center gap-3">
            {!currentUser ? (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-[#2D6A4F] transition-colors px-3 py-1.5"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-[#2D6A4F] text-white px-4 py-2 rounded-lg hover:bg-[#235A41] transition-colors"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {/* Cart (buyers only) */}
                {!isFarmer && (
                  <Link
                    to="/buyer/cart"
                    className="relative p-2 text-gray-600 hover:text-[#2D6A4F] transition-colors"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#E8845A] text-white text-[10px] flex items-center justify-center rounded-full">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#2D6A4F] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-[#D8EAD1] flex items-center justify-center text-[#2D6A4F]"
                      style={{ fontWeight: 600 }}
                    >
                      {currentUser.first_name.charAt(0)}
                    </div>
                    <span className="max-w-30 truncate">
                      {currentUser.first_name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="text-sm" style={{ fontWeight: 600 }}>
                          {currentUser.first_name} {currentUser.last_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {currentUser.role}
                        </p>
                      </div>
                      {isFarmer && (
                        <>
                          <Link
                            to="/farmer/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2D6A4F]"
                          >
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </Link>
                          <Link
                            to="/farmer/listings/add"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2D6A4F]"
                          >
                            <PlusCircle className="w-4 h-4" /> Add Animal
                          </Link>
                        </>
                      )}
                      {!isFarmer && (
                        <>
                          <Link
                            to="/buyer/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2D6A4F]"
                          >
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                          </Link>
                          <Link
                            to="/buyer/orders"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#2D6A4F]"
                          >
                            <Package className="w-4 h-4" /> My Orders
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-gray-700 hover:text-[#2D6A4F] py-1"
            >
              {link.label}
            </Link>
          ))}
          {!currentUser ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-center border border-[#2D6A4F] text-[#2D6A4F] py-2 rounded-lg"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-center bg-[#2D6A4F] text-white py-2 rounded-lg"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              {!isFarmer && (
                <>
                  <Link
                    to="/buyer/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm text-gray-700 py-1"
                  >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link
                    to="/buyer/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm text-gray-700 py-1"
                  >
                    <ShoppingCart className="w-4 h-4" /> Cart{" "}
                    {cartCount > 0 && `(${cartCount})`}
                  </Link>
                  <Link
                    to="/buyer/orders"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-sm text-gray-700 py-1"
                  >
                    <Package className="w-4 h-4" /> My Orders
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 py-1"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
