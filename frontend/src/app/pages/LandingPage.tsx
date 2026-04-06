import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  ArrowRight,
  Star,
  ShieldCheck,
  TrendingUp,
  Users,
  Package,
  Truck,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { AnimalCard } from "../components/AnimalCard";
import { mockAnimals } from "../data/mockData";

const HERO_IMG =
  "https://images.unsplash.com/photo-1599565092959-17e1b10a0a78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

const CATEGORIES = [
  {
    type: "Cattle",
    emoji: "🐄",
    color: "bg-amber-50  border-amber-200 text-amber-800",
  },
  {
    type: "Sheep",
    emoji: "🐑",
    color: "bg-blue-50   border-blue-200  text-blue-800",
  },
  {
    type: "Goat",
    emoji: "🐐",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
  {
    type: "Poultry",
    emoji: "🐓",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
  {
    type: "Pig",
    emoji: "🐖",
    color: "bg-pink-50   border-pink-200  text-pink-800",
  },
  {
    type: "Turkey",
    emoji: "🦃",
    color: "bg-red-50    border-red-200   text-red-800",
  },
  {
    type: "Rabbit",
    emoji: "🐇",
    color: "bg-teal-50   border-teal-200  text-teal-800",
  },
];

const TESTIMONIALS = [
  {
    name: "Grace Muthoni",
    role: "Dairy Farmer, Nakuru",
    text: "Farmart helped me reach buyers directly. My income increased by 30% in just 3 months!",
    rating: 5,
  },
  {
    name: "James Otieno",
    role: "Livestock Buyer, Nairobi",
    text: "I love the transparency — I know exactly where my animals come from. Quality has been consistently excellent.",
    rating: 5,
  },
  {
    name: "Sara Chebet",
    role: "Goat Farmer, Eldoret",
    text: "No more middlemen taking cuts. My prices are fair and I decide who to sell to. Highly recommend!",
    rating: 5,
  },
];

const HOW_IT_WORKS = [
  {
    icon: Users,
    title: "Create Account",
    desc: "Register as a Farmer or Buyer in minutes.",
    step: "01",
  },
  {
    icon: Package,
    title: "List or Browse",
    desc: "Farmers list animals; buyers browse by type, breed, or location.",
    step: "02",
  },
  {
    icon: ShieldCheck,
    title: "Verify & Connect",
    desc: "Animals are verified for quality and authenticity.",
    step: "03",
  },
  {
    icon: Truck,
    title: "Order & Deliver",
    desc: "Pay securely and receive delivery right to your door.",
    step: "04",
  },
];

export function LandingPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const featured = mockAnimals.slice(0, 4);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/marketplace?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="bg-[#F7F4EF]">
      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#0D1F0D]/85 via-[#0D1F0D]/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <span
              className="inline-flex items-center gap-1.5 bg-[#2D6A4F]/90 text-[#B7E4C7] text-xs px-3 py-1.5 rounded-full mb-5"
              style={{ fontWeight: 600 }}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Kenya's #1 Farm Animal
              Marketplace
            </span>

            <h1
              className="text-white mb-4"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Direct from Farm
              <br />
              <span className="text-[#52B788]">to Your Door</span>
            </h1>

            <p
              className="text-gray-300 mb-8 max-w-xl"
              style={{ fontSize: "1.1rem", lineHeight: 1.7 }}
            >
              Buy and sell farm animals directly — no middlemen, no hidden fees.
              Farmers earn more, buyers pay less.
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-lg">
              <div className="flex-1 flex items-center bg-white rounded-xl overflow-hidden shadow-lg">
                <Search className="w-4 h-4 text-gray-400 ml-4 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by type, breed or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-3 py-3.5 text-sm text-gray-800 outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="bg-[#E8845A] hover:bg-[#D4733D] text-white px-5 py-3.5 rounded-xl text-sm transition-colors shrink-0"
                style={{ fontWeight: 600 }}
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/marketplace"
                className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#235A41] text-white px-6 py-3 rounded-xl text-sm transition-colors"
                style={{ fontWeight: 600 }}
              >
                Browse Animals <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/30 px-6 py-3 rounded-xl text-sm transition-colors"
                style={{ fontWeight: 600 }}
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-3 gap-4">
            {[
              { value: "1,200+", label: "Animals Listed" },
              { value: "340+", label: "Verified Farmers" },
              { value: "2,500+", label: "Happy Buyers" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="text-white"
                  style={{ fontWeight: 700, fontSize: "1.25rem" }}
                >
                  {stat.value}
                </p>
                <p className="text-gray-300 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-[#1B2D1B]"
              style={{ fontWeight: 700, fontSize: "1.75rem" }}
            >
              Browse by Category
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Find the exact animal you're looking for
            </p>
          </div>
          <Link
            to="/marketplace"
            className="flex items-center gap-1 text-[#2D6A4F] text-sm hover:underline"
            style={{ fontWeight: 600 }}
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.type}
              to={`/marketplace?type=${cat.type}`}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${cat.color} hover:scale-105 transition-transform`}
            >
              <span style={{ fontSize: "2rem" }}>{cat.emoji}</span>
              <span className="text-sm text-center" style={{ fontWeight: 600 }}>
                {cat.type}
              </span>
              <span className="text-xs opacity-70">
                {
                  mockAnimals.filter(
                    (a) => a.animal_type.name === cat.type && a.is_available,
                  ).length
                }{" "}
                listed
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Listings ── */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-[#1B2D1B]"
                style={{ fontWeight: 700, fontSize: "1.75rem" }}
              >
                Featured Listings
              </h2>
              <p className="text-gray-500 mt-1 text-sm">
                Top picks from verified farmers
              </p>
            </div>
            <Link
              to="/marketplace"
              className="flex items-center gap-1 text-[#2D6A4F] text-sm hover:underline"
              style={{ fontWeight: 600 }}
            >
              See All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2
            className="text-[#1B2D1B] mb-2"
            style={{ fontWeight: 700, fontSize: "1.75rem" }}
          >
            How Farmart Works
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Simple, transparent, and designed for both farmers and buyers
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.step}
              className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#2D6A4F] text-white text-xs flex items-center justify-center"
                style={{ fontWeight: 700 }}
              >
                {step.step}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D8EAD1] flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-[#2D6A4F]" />
              </div>
              <h3 className="text-[#1B2D1B] mb-1.5" style={{ fontWeight: 600 }}>
                {step.title}
              </h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gray-200 z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Farmart ── */}
      <section className="bg-[#2D6A4F] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-white mb-4"
                style={{ fontWeight: 700, fontSize: "1.75rem" }}
              >
                Why Choose Farmart?
              </h2>
              <p className="text-[#B7E4C7] mb-6 text-sm leading-relaxed">
                We're on a mission to transform how Kenyans buy and sell farm
                animals — making it fair, transparent, and efficient for all
                parties.
              </p>
              <ul className="space-y-3">
                {[
                  "Zero middlemen — deals happen directly between farmer and buyer",
                  "All farmers and animals are verified for quality assurance",
                  "Secure payment via M-Pesa, Bank Transfer, or Card",
                  "Real-time order tracking and transparent pricing",
                  "24/7 customer support for any disputes",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm text-[#D8EAD1]"
                  >
                    <CheckCircle className="w-4 h-4 text-[#52B788] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link
                  to="/register"
                  className="bg-white text-[#2D6A4F] px-5 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Join as Farmer
                </Link>
                <Link
                  to="/marketplace"
                  className="border border-white/40 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Start Buying
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Avg. Farmer Revenue Increase",
                  value: "+32%",
                  icon: TrendingUp,
                },
                {
                  label: "Animals Successfully Sold",
                  value: "4,800+",
                  icon: Package,
                },
                { label: "Verified Farmers", value: "340+", icon: ShieldCheck },
                { label: "Happy Buyers", value: "2,500+", icon: Users },
              ].map((item) => (
                <div key={item.label} className="bg-white/10 rounded-2xl p-5">
                  <item.icon className="w-6 h-6 text-[#52B788] mb-3" />
                  <p
                    className="text-white mb-1"
                    style={{ fontWeight: 700, fontSize: "1.5rem" }}
                  >
                    {item.value}
                  </p>
                  <p className="text-[#B7E4C7] text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2
            className="text-[#1B2D1B] mb-2"
            style={{ fontWeight: 700, fontSize: "1.75rem" }}
          >
            What Our Users Say
          </h2>
          <p className="text-gray-500 text-sm">
            Trusted by farmers and buyers across Kenya
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm italic mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full bg-[#D8EAD1] flex items-center justify-center text-[#2D6A4F]"
                  style={{ fontWeight: 700 }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p
                    className="text-sm text-[#1B2D1B]"
                    style={{ fontWeight: 600 }}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-[#F0F7F4] border-y border-green-100 py-12">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2
            className="text-[#1B2D1B] mb-2"
            style={{ fontWeight: 700, fontSize: "1.5rem" }}
          >
            Ready to Get Started?
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Join thousands of farmers and buyers already using Farmart
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="bg-[#2D6A4F] text-white px-6 py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
              style={{ fontWeight: 600 }}
            >
              Create Free Account
            </Link>
            <Link
              to="/marketplace"
              className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Browse Listings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
