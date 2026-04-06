import { useState } from "react";
import { Link } from "react-router";
import {
  Leaf,
  Eye,
  EyeOff,
  CheckCircle,
  Tractor,
  ShoppingBag,
  Mail,
  ChevronDown,
} from "lucide-react";
import { useApp, type RegisterData } from "../context/AppContext";
import { KENYAN_COUNTIES } from "../data/mockData";

type Role = "farmer" | "buyer";

export function RegisterPage() {
  const { register } = useApp();

  const [role, setRole] = useState<Role>("buyer");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    farm_location: "",
    farm_name: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const update = (field: string, val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (!form.last_name.trim()) {
      setError("Please enter your last name.");
      return;
    }
    if (!form.email) {
      setError("Please enter your email.");
      return;
    }
    if (!form.password) {
      setError("Please create a password.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone) {
      setError("Phone number is required.");
      return;
    }
    if (role === "farmer" && !form.farm_location) {
      setError("Farm location is required for farmer accounts.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data: RegisterData = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        farm_name: role === "farmer" ? form.farm_name : undefined,
        farm_location: form.farm_location || undefined,
      };
      const success = await register(data);

      if (success) {
        setEmailSent(true);
      } else {
        setError(
          "Registration failed. An account with this email may already exist.",
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Email verification notice
  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-[#D8EAD1] flex items-center justify-center mx-auto mb-5">
            <Mail className="w-10 h-10 text-[#2D6A4F]" />
          </div>
          <h2
            className="text-[#1B2D1B] mb-2"
            style={{ fontWeight: 700, fontSize: "1.5rem" }}
          >
            Account Created!
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Welcome to Farmart,{" "}
            <span className="text-[#2D6A4F]" style={{ fontWeight: 600 }}>
              {form.first_name}
            </span>
            ! A verification email has been sent to{" "}
            <strong>{form.email}</strong>.
          </p>
          <p className="text-xs text-gray-400 bg-white rounded-xl p-4 border border-gray-100">
            Please verify your email to activate your account, then{" "}
            <Link to="/login" className="text-[#2D6A4F] underline">
              sign in
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
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
            Create your account
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Join thousands of farmers and buyers across Kenya
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  step > s
                    ? "bg-[#2D6A4F] text-white"
                    : step === s
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-gray-200 text-gray-500"
                }`}
                style={{ fontWeight: 600 }}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className="text-xs text-gray-500">
                {s === 1 ? "Account" : "Profile"}
              </span>
              {s < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {/* Step 1: Role + Credentials */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              {/* Role selection toggle */}
              <div>
                <label
                  className="block text-sm text-gray-700 mb-2"
                  style={{ fontWeight: 500 }}
                >
                  I am a…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        value: "buyer",
                        label: "Buyer",
                        Icon: ShoppingBag,
                        desc: "I want to buy farm animals",
                      },
                      {
                        value: "farmer",
                        label: "Farmer",
                        Icon: Tractor,
                        desc: "I want to sell my animals",
                      },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        role === r.value
                          ? "border-[#2D6A4F] bg-[#F0F7F4]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <r.Icon
                        className={`w-6 h-6 ${role === r.value ? "text-[#2D6A4F]" : "text-gray-400"}`}
                      />
                      <span className="text-sm" style={{ fontWeight: 600 }}>
                        {r.label}
                      </span>
                      <span className="text-xs text-gray-400 text-center">
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm text-gray-700 mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.first_name}
                    onChange={(e) => update("first_name", e.target.value)}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm text-gray-700 mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.last_name}
                    onChange={(e) => update("last_name", e.target.value)}
                    placeholder="Wanjiku"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-sm text-gray-700 mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPass ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    className="block text-sm text-gray-700 mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Confirm *
                  </label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#2D6A4F] text-white py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
                style={{ fontWeight: 600 }}
              >
                Continue →
              </button>
            </form>
          )}

          {/* Step 2: Profile info */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  ← Back
                </button>
                <span className="text-sm text-gray-600">
                  Complete your {role} profile
                </span>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              {/* Phone */}
              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Phone Number *{" "}
                  <span className="text-xs text-gray-400">(07XXXXXXXX)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="07XXXXXXXX"
                  pattern="^(07|01|\+2547|\+2541)[0-9]{8}$"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Kenyan format: 07XXXXXXXX or +2547XXXXXXXX
                </p>
              </div>

              {/* Farm location (county) */}
              <div>
                <label
                  className="block text-sm text-gray-700 mb-1.5"
                  style={{ fontWeight: 500 }}
                >
                  County{role === "farmer" && " *"}
                </label>
                <div className="relative">
                  <select
                    value={form.farm_location}
                    onChange={(e) => update("farm_location", e.target.value)}
                    required={role === "farmer"}
                    className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50 pr-8"
                  >
                    <option value="">Select your county</option>
                    {KENYAN_COUNTIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Farm name (farmers only) */}
              {role === "farmer" && (
                <div>
                  <label
                    className="block text-sm text-gray-700 mb-1.5"
                    style={{ fontWeight: 500 }}
                  >
                    Farm Name
                  </label>
                  <input
                    type="text"
                    value={form.farm_name}
                    onChange={(e) => update("farm_name", e.target.value)}
                    placeholder="e.g. Wanjiku Green Acres"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] focus:ring-2 focus:ring-[#2D6A4F]/10 bg-gray-50"
                  />
                </div>
              )}

              <p className="text-xs text-gray-400">
                By creating an account you agree to our{" "}
                <a href="#" className="text-[#2D6A4F] underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-[#2D6A4F] underline">
                  Privacy Policy
                </a>
                .
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2D6A4F] text-white py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors disabled:opacity-70"
                style={{ fontWeight: 600 }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#2D6A4F] hover:underline"
            style={{ fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
