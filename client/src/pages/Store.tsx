import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchStoreCatalog } from "../services/storeApi";
import StoreNavbar from "../components/store/StoreNavbar";
import merchVideo from "../assets/merchvid.mp4";

const F_DISPLAY = "'Anton', sans-serif";
const F_JP = "'Noto Sans JP', sans-serif";

interface Product {
  id: number;
  categoryId: number;
  title: string;
  slug: string;
  tagline?: string;
  description: string;
  basePrice: number;
  thumbnailUrl: string;
  isFeatured: boolean;
  isSoldOut: boolean;
  category?: { name: string; slug: string; kanjiTitle?: string };
  colorVariants?: Array<{
    id: number;
    colorName: string;
    colorHex: string;
    angleImagesJson: string;
  }>;
}

const HERO_LOOKBOOK = [
  {
    theme: "Attack on Titan Drop",
    themeKanji: "進撃の巨人",
    headline: "Rep your show",
    headlineKanji: "調査兵団",
    subtext: " Streetwear • Built for Otaku",
    type: "video",
    src: merchVideo,
  }
];

export default function Store() {
  const [catalog, setCatalog] = useState<{ products: Product[]; categories: any[]; drops: any[] }>({
    products: [],
    categories: [],
    drops: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchStoreCatalog(selectedCat || undefined);
        setCatalog({
          products: data.products || [],
          categories: data.categories || [],
          drops: data.drops || [],
        });
      } catch (err) {
        console.error("Failed to load catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCat]);

  // Swipes every 10 seconds (10,000 ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_LOOKBOOK.length);
    }, 1100000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_LOOKBOOK[slideIdx];

  return (
    <div className="min-h-screen bg-[#060608] text-white selection:bg-white selection:text-black font-mono overflow-x-hidden">
      <StoreNavbar />

      {/* FULLSCREEN 100VH HERO */}
      <section className="relative w-full h-screen flex flex-col justify-between p-6 md:p-12 overflow-hidden border-b border-white/10">
        {/* Background Layer */}
        {slide.type === "video" ? (
          <video
            key={slide.src}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 filter contrast-125 brightness-75 transition-opacity duration-1000"
            src={slide.src}
          />
        ) : (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.headline}
            className="absolute inset-0 w-full h-full object-cover opacity-35 filter contrast-115 brightness-75 transition-opacity duration-1000"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-black/60 pointer-events-none" />

        {/* Subtle Watermark Kanji in corners */}
        <div
          className="absolute right-6 md:right-16 top-28 text-white/[0.035] select-none pointer-events-none font-black text-4xl md:text-6xl tracking-[0.6em] [writing-mode:vertical-rl]"
          style={{ fontFamily: F_JP }}
        >
          {slide.headlineKanji}
        </div>
        <div
          className="absolute left-6 md:left-16 bottom-24 text-white/[0.025] select-none pointer-events-none font-black text-3xl md:text-5xl tracking-[0.5em] [writing-mode:vertical-rl]"
          style={{ fontFamily: F_JP }}
        >
          {slide.themeKanji}
        </div>

        {/* Top Spacer */}
        <div className="pt-20" />

        {/* Center Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-zinc-400 mb-3 flex items-center gap-2">
            <span>{slide.theme}</span>
            <span className="text-[9px] text-zinc-600">[{slide.themeKanji}]</span>
          </div>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl uppercase font-black tracking-tight text-white mb-3"
            style={{ fontFamily: F_DISPLAY }}
          >
            {slide.headline}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 tracking-[0.2em] uppercase max-w-md mb-8">
            {slide.subtext}
          </p>

          <a
            href="#catalog"
            className="px-8 py-3 rounded-full border border-white/20 hover:border-white bg-white/5 hover:bg-white text-white hover:text-black text-xs uppercase tracking-[0.25em] transition-all"
          >
            View Merch <span className="text-[9px] opacity-70">[一覧]</span> ↓
          </a>
        </div>

        {/* Bottom Pagination & Subscript Info */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-500 uppercase tracking-widest">
          <div className="flex gap-2">
            {HERO_LOOKBOOK.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                className={`h-1 transition-all rounded-full cursor-pointer ${
                  slideIdx === i ? "w-8 bg-white" : "w-3 bg-white/20 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          <div>
            <span>Delivery restricted to Akure</span>
            <span className="text-zinc-600 ml-1.5">[アクレ限定]</span>
            <span className="mx-2">•</span>
            <span>Flat ₦1,500</span>
          </div>
        </div>
      </section>

      {/* CATALOG SECTION */}
      <section id="catalog" className="max-w-[104rem] mx-auto px-6 md:px-12 py-20">
        {/* Category Filter Pills */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 pb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block mb-1">
              Store Catalog <span className="text-zinc-600">[衣服コレクション]</span>
            </span>
            <h2 className="text-3xl md:text-4xl uppercase font-black tracking-tight" style={{ fontFamily: F_DISPLAY }}>
              The Drops
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-widest">
            <button
              onClick={() => setSelectedCat("")}
              className={`px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                selectedCat === ""
                  ? "bg-white text-black border-white"
                  : "border-white/10 text-zinc-400 hover:border-white/40 hover:text-white"
              }`}
            >
              All Drops <span className="text-[9px] opacity-60">[全て]</span>
            </button>
            {catalog.categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c.slug)}
                className={`px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                  selectedCat === c.slug
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-zinc-400 hover:border-white/40 hover:text-white"
                }`}
              >
                {c.name} {c.kanjiTitle && <span className="text-[9px] opacity-60 ml-1">[{c.kanjiTitle}]</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards */}
        {loading ? (
          <div className="text-center py-28 text-xs uppercase tracking-widest text-zinc-500">
            Loading drops...
          </div>
        ) : catalog.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {catalog.products.map((p) => {
              const colorways = p.colorVariants?.length || 0;
              return (
                <Link
                  key={p.id}
                  to={`/store/product/${p.slug}`}
                  className="group flex flex-col justify-between bg-white/[0.02] border border-white/10 hover:border-white/40 p-5 rounded-xl transition-all duration-300"
                >
                  <div className="w-full aspect-[4/5] bg-black/50 overflow-hidden mb-4 rounded-lg relative border border-white/5">
                    <img
                      src={p.thumbnailUrl || "/assets/fest.jpeg"}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.isFeatured && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/70 border border-white/20 text-[9px] uppercase tracking-widest text-white">
                        Drop 01
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] uppercase text-zinc-500 mb-1.5">
                      <span>{p.category?.name || "Apparel"}</span>
                      <span>{colorways} {colorways === 1 ? "Colorway" : "Colorways"}</span>
                    </div>

                    <h3 className="text-xl uppercase font-bold text-white group-hover:text-zinc-300 transition-colors mb-1.5" style={{ fontFamily: F_DISPLAY }}>
                      {p.title}
                    </h3>

                    <p className="text-xs text-zinc-400 line-clamp-1 mb-4">
                      {p.tagline || p.description}
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs">
                      <span className="font-bold text-white text-base">
                        ₦{p.basePrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                        Select & Fit ➔
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 text-xs uppercase tracking-widest text-zinc-500 border border-white/10 rounded-xl">
            No drops found in this category.
          </div>
        )}
      </section>
    </div>
  );
}