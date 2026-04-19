import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Leaf, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export function LoginPage() {
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  // Navigate after login once currentUser is populated in context
  useEffect(() => {
    if (loginAttempted && currentUser) {
      navigate(currentUser.role === "farmer" ? "/farmer/dashboard" : "/buyer/dashboard");
    }
  }, [currentUser, loginAttempted, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        setLoginAttempted(true);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-[#1B2D1B]"
              style={{ fontWeight: 700, fontSize: "1.5rem" }}
            >
              Far<span className="text-[#2D6A4F]">mart</span>
            </span>
          </Link>
          <h1
            className="text-[#1B2D1B] mt-2"
            style={{ fontWeight: 700, fontSize: "1.5rem" }}
          >
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-2 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label
                className="block text-sm text-gray-700 mb-1.5"
                style={{ fontWeight: 500 }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label
                  className="text-sm text-gray-700"
                  style={{ fontWeight: 500 }}
                >
                  Password
                </label>
                <a href="#" className="text-xs text-[#2D6A4F] hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2D6A4F] text-white py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ fontWeight: 600 }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[#2D6A4F] hover:underline"
            style={{ fontWeight: 600 }}
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
