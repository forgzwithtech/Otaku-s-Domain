import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface StoreNavbarProps {
  cartCount?: number;
}

export default function StoreNavbar({ cartCount: propCartCount }: StoreNavbarProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [faction, setFaction] = useState<"red" | "blue" | "purple">("purple");
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const syncCart = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("od_store_cart") || "[]");
        const count = stored.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(propCartCount !== undefined ? propCartCount : count);
      } catch {
        setCartCount(0);
      }
    };
    syncCart();
    window.addEventListener("storage", syncCart);
    return () => window.removeEventListener("storage", syncCart);
  }, [propCartCount]);

  useEffect(() => {
    async function loadFaction() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setFaction("purple");
          return;
        }
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5101/api";
        const res = await fetch(`${apiBase}/user/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          const f = profile?.faction?.toLowerCase();
          if (f === "red" || f === "crimson") setFaction("red");
          else if (f === "blue" || f === "azure") setFaction("blue");
          else setFaction("purple");
        }
      } catch {
        setFaction("purple");
      }
    }
    loadFaction();
  }, []);

  const factionDot = {
    red: "bg-red-500 shadow-[0_0_12px_#ef4444]",
    blue: "bg-cyan-400 shadow-[0_0_12px_#22d3ee]",
    purple: "bg-purple-400 shadow-[0_0_12px_#c084fc]",
  }[faction];

  const isStoreRoot = location.pathname === "/store" || location.pathname === "/store/";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 px-5 md:px-12 py-4 flex items-center justify-between transition-all duration-500 ${
          scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
        }`}
      >
        {/* Left: Brand Link & Desktop Return Route */}
        <div className="flex items-center gap-6">
          <Link to="/store" className="flex items-center gap-2.5 group">
            <span className={`w-2 h-2 rounded-full ${factionDot} transition-all duration-500`} />
            <span className="text-sm uppercase tracking-[0.25em] text-white font-medium group-hover:text-zinc-300 transition-colors">
              Otaku's Domain <span className="text-[9px] text-zinc-500 font-mono tracking-widest hidden md:inline ml-1">[オタクズ・ドメイン]</span>
            </span>
          </Link>

          {/* Desktop Direct Route Links */}
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-white/10">
            {isStoreRoot ? (
              <Link
                to="/"
                className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
              >
                ← Home Portal
              </Link>
            ) : (
              <Link
                to="/store"
                className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
              >
                ← Catalog
              </Link>
            )}
          </div>
        </div>

        {/* Right: Bag Pill & Mobile Hamburger */}
        <div className="flex items-center gap-4">
          <Link
            to="/store/bag"
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-zinc-300 hover:text-white py-1.5 px-3.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 transition-all active:scale-95"
          >
            <span className="hidden sm:inline">Bag</span>
            <span className="sm:hidden">🛒</span>
            <span className="font-bold text-white font-mono">({cartCount})</span>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 text-white focus:outline-none cursor-pointer"
          >
            <span
              className={`block w-5 h-[1.5px] bg-white transition-transform duration-300 ${
                menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-white transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block w-5 h-[1.5px] bg-white transition-transform duration-300 ${
                menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Smooth Mobile Navigation Drawer */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl transition-all duration-500 flex flex-col justify-between p-8 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex justify-between items-center pb-6 border-b border-white/10">
          <span className="text-xs font-mono uppercase tracking-[0.3em] text-zinc-400">
            Navigation Menu
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="text-white text-lg font-mono p-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-6 py-6 font-mono text-left">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="text-2xl font-bold uppercase tracking-wider text-white hover:text-zinc-400 transition-colors"
          >
            Home Portal
          </Link>
          <Link
            to="/store"
            onClick={() => setMenuOpen(false)}
            className="text-2xl font-bold uppercase tracking-wider text-white hover:text-zinc-400 transition-colors"
          >
            Armory Store
          </Link>
          <Link
            to="/store/bag"
            onClick={() => setMenuOpen(false)}
            className="text-2xl font-bold uppercase tracking-wider text-white hover:text-zinc-400 transition-colors flex items-center justify-between"
          >
            <span>Shopping Bag</span>
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-white text-black font-bold">
              {cartCount}
            </span>
          </Link>
          <Link
            to="/events"
            onClick={() => setMenuOpen(false)}
            className="text-xl uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Live Events & Tickets
          </Link>
          <Link
            to="/vault"
            onClick={() => setMenuOpen(false)}
            className="text-xl uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Grand Vault
          </Link>
          <Link
            to="/forum"
            onClick={() => setMenuOpen(false)}
            className="text-xl uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Guild Forums
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className="text-xl uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
          >
            Operative Dashboard
          </Link>
        </nav>

        <div className="pt-6 border-t border-white/10 text-center font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
          Akure Sector Delivery • Flat ₦1,500
        </div>
      </div>
    </>
  );
}