import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useApp } from "../context/AppContext";
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
  Flame,
} from "lucide-react";
import { AnimalCard } from "../components/AnimalCard";
import {
  mockAnimals,
  mockAnimalTypes,
  SAMPLE_IMAGES,
  formatPrice,
} from "../data/mockData";

const HERO_IMG =
  "https://images.unsplash.com/photo-1599565092959-17e1b10a0a78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

// Derived from real animal data — no hardcoded counts or prices
const CATEGORIES = mockAnimalTypes.map((type) => {
  const available = mockAnimals.filter(
    (a) => a.animal_type.name === type.name && a.is_available,
  );
  const minPrice = available.length
    ? Math.min(...available.map((a) => a.price))
    : null;
  return {
    type: type.name,
    image: SAMPLE_IMAGES[type.name],
    count: available.length,
    fromPrice: minPrice,
  };
});

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

function CountUp({ target, duration = 2000 }: { target: string; duration?: number }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const match = target.match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)([^0-9]*)$/);
            if (!match) { setDisplay(target); return; }
            const prefix = match[1] || "";
            const numStr = match[2].replace(/,/g, "");
            const suffix = match[3] || "";
            const num = parseFloat(numStr);
            const startTime = performance.now();
            const animate = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const ease = 1 - Math.pow(1 - progress, 4);
              const current = Math.round(num * ease);
              setDisplay(`${prefix}${current.toLocaleString("en-US")}${suffix}`);
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{display}</span>;
}

function CategoryCarousel() {
  const [start, setStart] = useState(0);
  const [visible, setVisible] = useState(2);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1024) setVisible(5);
      else if (window.innerWidth >= 640) setVisible(3);
      else setVisible(2);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxStart = Math.max(0, CATEGORIES.length - visible);

  useEffect(() => {
    if (isPaused || maxStart === 0) return;
    const interval = setInterval(() => {
      setStart((s) => (s >= maxStart ? 0 : s + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, maxStart]);

  const showPrev = start > 0;
  const showNext = start < maxStart;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex gap-3 transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${start * (100 / visible + 0.5)}%)` }}
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.type}
              to={`/marketplace?type=${cat.type}`}
              className="group relative flex flex-col justify-end rounded-2xl overflow-hidden aspect-[4/3] hover:scale-[1.03] transition-transform duration-200 shadow-sm shrink-0"
              style={{ width: `${90 / visible}%` }}
            >
              <img
                src={cat.image}
                alt={cat.type}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 p-3">
                <p className="text-white text-sm" style={{ fontWeight: 700 }}>
                  {cat.type}
                </p>
                <p className="text-white/70 text-[10px]">
                  {cat.count > 0
                    ? `${cat.count} listed · from ${formatPrice(cat.fromPrice!)}`
                    : "Coming soon"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {showPrev && (
        <button
          onClick={() => setStart((s) => Math.max(0, s - 1))}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      )}
      {showNext && (
        <button
          onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      )}
    </div>
  );
}

export function LandingPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { currentUser } = useApp();

  // Top 4 by popularity (rating × review count), available only
  const featured = [...mockAnimals]
    .filter((a) => a.is_available)
    .sort(
      (a, b) =>
        (b.rating ?? 0) * (b.reviews ?? 0) - (a.rating ?? 0) * (a.reviews ?? 0),
    )
    .slice(0, 4);

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
                to={currentUser ? "/marketplace" : "/login"}
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
                  <CountUp target={stat.value} />
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
        <CategoryCarousel />
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
            {featured.map((animal, i) => (
              <div key={animal.id} className="relative">
                {i === 0 && (
                  <div
                    className="absolute -top-2.5 left-3 z-10 flex items-center gap-1 bg-[#E8845A] text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm"
                    style={{ fontWeight: 700 }}
                  >
                    <Flame className="w-3 h-3" /> Top Pick
                  </div>
                )}
                <AnimalCard animal={animal} />
              </div>
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
                    <CountUp target={item.value} />
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
