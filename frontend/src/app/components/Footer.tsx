import { Link } from "react-router";
import { Leaf, Phone, Mail, MapPin, Globe, AtSign, Camera } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1B2D1B] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-white"
                style={{ fontWeight: 700, fontSize: "1.1rem" }}
              >
                Far<span className="text-[#52B788]">mart</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Connecting farmers directly with buyers — eliminating middlemen
              and ensuring fair prices for everyone.
            </p>
            <div className="flex gap-3">
              {[Globe, AtSign, Camera].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#2D6A4F] transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div className="space-y-4">
            <h3 className="text-white" style={{ fontWeight: 600 }}>
              Marketplace
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                "Browse Animals",
                "Cattle",
                "Sheep & Goats",
                "Poultry",
                "Pigs",
                "Rabbits",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/marketplace"
                    className="hover:text-[#52B788] transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Farmers */}
          <div className="space-y-4">
            <h3 className="text-white" style={{ fontWeight: 600 }}>
              For Farmers
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                "Sell Animals",
                "Farmer Dashboard",
                "Manage Listings",
                "Order Management",
                "Pricing Guide",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="/register"
                    className="hover:text-[#52B788] transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-white" style={{ fontWeight: 600 }}>
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-[#52B788] shrink-0" />
                <span>
                  Nairobi, Kenya
                  <br />
                  Westlands, James Gichuru Rd
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#52B788] shrink-0" />
                <span>+254 704 125 004</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#52B788] shrink-0" />
                <span>hello@farmart.co.ke</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© 2026 Farmart Kenya. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-300">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-gray-300">
              Terms of Service
            </a>
            <a href="#" className="hover:text-gray-300">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
