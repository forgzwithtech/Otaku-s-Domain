import { useState, useEffect, type FormEvent } from "react";

/**
 * ------------------------------------------------------------------
 *  SUGGESTION FOOTER — Editorial Note, Manuscript Paper & Imprint
 * ------------------------------------------------------------------
 */

function useFooterMangaAssets() {
  useEffect(() => {
    if (document.getElementById("footer-manga-assets")) return;
    const style = document.createElement("style");
    style.id = "footer-manga-assets";
    style.innerHTML = `
      .ink-box-footer {
        border: 4px solid #000;
        border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px;
      }
      .halftone-footer {
        background-image: radial-gradient(rgba(0,0,0,0.6) 1.5px, transparent 1.5px);
        background-size: 6px 6px;
      }
      .vertical-jp-footer {
        writing-mode: vertical-rl;
        text-orientation: upright;
        font-family: 'Noto Sans JP', sans-serif;
      }
      .manga-stamp {
        border: 4px solid #dc2626;
        color: #dc2626;
        border-radius: 4px;
        mask-image: radial-gradient(circle, transparent 2px, black 3px);
        mask-size: 8px 8px;
        mask-position: -4px -4px;
      }
      .manga-barcode {
        background: repeating-linear-gradient(
          90deg,
          #000,
          #000 2px,
          transparent 2px,
          transparent 4px,
          #000 4px,
          #000 5px,
          transparent 5px,
          transparent 8px,
          #000 8px,
          #000 11px,
          transparent 11px,
          transparent 13px
        );
      }
      .manga-tape {
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(0,0,0,0.1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        backdrop-filter: blur(2px);
      }
    `;
    document.head.appendChild(style);
  }, []);
}

const F_DISPLAY = "'Anton', sans-serif";
const F_MONO = "'Space Mono', monospace";

export default function SuggestionFooter() {
  useFooterMangaAssets();
  const [message, setMessage] = useState("");

  const handleSendMail = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Otaku's Domain Editorial Submission");
    const body = encodeURIComponent(message);
    window.location.href = `mailto:domainotakus@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    // shadow-[0_100vh_0_0_#050505] casts a solid black shadow infinitely downwards 
    // to hide the global background without breaking your scroll height.
    <footer className="w-full bg-[#050505] relative z-50 border-t-[12px] border-black pt-20 pb-16 shadow-[0_100vh_0_0_#050505]">
      
      {/* --- TO BE CONTINUED BANNER --- */}
      <div className="absolute top-0 right-4 md:right-12 bg-white text-black px-8 py-3 border-b-4 border-l-4 border-r-4 border-black ink-box-footer rounded-none rounded-b-2xl shadow-[6px_6px_0px_var(--guild-primary)] z-20 flex items-center gap-4">
        <span className="font-black text-2xl md:text-3xl tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
          TO BE CONTINUED
        </span>
        <span className="text-2xl font-black mb-1 text-[var(--guild-primary)] drop-shadow-[1px_1px_0px_#000]">➔</span>
      </div>

      {/* Perfect Widescreen Container (max-w-7xl) - Wide enough to breathe, constrained enough to look like a page */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">

        {/* --- EDITORIAL SUBMISSION FORM --- */}
        <form onSubmit={handleSendMail} className="relative mb-20 group mt-10">
          <div className="ink-box-footer bg-[#e8e4d8] p-8 md:p-14 relative overflow-hidden z-10 shadow-[15px_15px_0px_#000]">
            
            {/* Background Screentone */}
            <div className="absolute inset-0 opacity-[0.12] pointer-events-none halftone-footer" />

            {/* Faded Watermark */}
            <div className="absolute -right-4 -bottom-8 vertical-jp-footer text-black/5 font-black text-[14rem] tracking-widest pointer-events-none select-none z-0 leading-none">
              編集部
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-stretch">
              
              {/* Left Col: Prompt & Stamp */}
              <div className="flex-[0.8] w-full relative flex flex-col justify-between">
                
                {/* Postage Stamp */}
                <div className="absolute -top-10 -left-10 manga-stamp px-4 py-1 font-black uppercase text-xl md:text-3xl rotate-[-12deg] bg-[#e8e4d8] shadow-[4px_4px_0px_rgba(220,38,38,0.2)] z-20" style={{ fontFamily: F_DISPLAY }}>
                  CONFIDENTIAL
                </div>

                <div className="mt-8">
                  <span className="inline-block bg-black text-white font-bold uppercase text-[11px] px-4 py-1.5 ink-box-footer rotate-[-2deg] mb-5 shadow-[4px_4px_0px_var(--guild-primary)]" style={{ fontFamily: F_MONO }}>
                    Vol. 1 // Reader's Voice
                  </span>
                  <h2 className="uppercase text-5xl md:text-7xl text-black tracking-tighter leading-[0.85]" style={{ fontFamily: F_DISPLAY }}>
                    Submit to the <br/>
                    <span className="text-white" style={{ WebkitTextStroke: "2px black", textShadow: "4px 4px 0px var(--guild-primary)" }}>Editors</span>
                  </h2>
                  <p className="mt-6 text-black/80 font-bold max-w-sm border-l-4 border-black pl-5 text-sm md:text-base leading-relaxed" style={{ fontFamily: F_MONO }}>
                    What happens in the next chapter? Drop your event ideas, manga recommendations, or platform feedback directly to Otaku's Domain editorial team.
                  </p>
                </div>
              </div>

              {/* Right Col: Input Form (The Manuscript Paper) */}
              <div className="flex-[1.2] w-full flex flex-col relative">
                
                {/* Faux Tape Elements */}
                <div className="absolute -top-4 -left-6 w-16 h-6 manga-tape rotate-[-15deg] z-20" />
                <div className="absolute -bottom-4 -right-4 w-20 h-6 manga-tape rotate-[10deg] z-20" />

                <div className="relative flex-1 shadow-[10px_10px_0px_rgba(0,0,0,1)] focus-within:shadow-[12px_12px_0px_var(--guild-primary)] transition-shadow ink-box-footer bg-white overflow-hidden group-hover:-translate-y-1 duration-300 flex flex-col">
                  
                  {/* Manuscript grid lines */}
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(transparent 95%, #e5e7eb 95%)", backgroundSize: "100% 2.5rem" }} />
                  
                  {/* Header of the paper */}
                  <div className="bg-black text-white px-5 py-2.5 flex justify-between items-center z-10" style={{ fontFamily: F_MONO }}>
                    <span className="text-[11px] font-bold uppercase tracking-widest">Form No. 994</span>
                    <span className="text-[10px] tracking-widest text-white/60">DO NOT FOLD</span>
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Draft your transmission..."
                    className="w-full flex-1 bg-transparent p-5 text-black font-bold text-xl md:text-2xl focus:outline-none resize-none placeholder-black/20 relative z-10 leading-[2.5rem]"
                    style={{ fontFamily: F_MONO }}
                    required
                  />
                </div>
                
                <div className="flex justify-end mt-6">
                  <button 
                    type="submit"
                    className="bg-black text-white uppercase text-2xl px-12 py-4 ink-box-footer border-4 border-black hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[6px_6px_0px_var(--guild-primary)] hover:shadow-[8px_8px_0px_#000] active:translate-y-2 active:shadow-none -rotate-2 cursor-pointer"
                    style={{ fontFamily: F_DISPLAY }}
                  >
                    SEND IT
                  </button>
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* --- FOOTER BOTTOM BAR (Links & Imprint) --- */}
        <div className="border-t-4 border-white/10 pt-12 flex flex-col md:flex-row justify-between items-center md:items-end gap-12">
          
          {/* Copyright & Legal Links */}
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-3 bg-white text-black px-6 py-2 ink-box-footer rotate-1 shadow-[5px_5px_0px_var(--guild-primary)]">
              <span className="w-3 h-3 bg-black rounded-full animate-pulse" />
              <span className="font-black text-sm md:text-base uppercase tracking-widest" style={{ fontFamily: F_DISPLAY }}>© 2026 Otaku's Domain</span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-8 font-bold text-[11px] md:text-xs text-gray-400 uppercase tracking-widest" style={{ fontFamily: F_MONO }}>
              <a href="#" className="hover:text-white hover:underline transition-all">Terms</a>
              <a href="#" className="hover:text-white hover:underline transition-all">Privacy</a>
              <a href="#" className="hover:text-white hover:underline transition-all">Merch Policy</a>
            </div>
          </div>

          {/* EMBERZ TECHNOLOGY IMPRINT (The ISBN Barcode Block) */}
          <a 
            href="https://emberz-technology.vercel.app/" 
            className="group flex flex-col items-center bg-white p-4 ink-box-footer shadow-[8px_8px_0px_rgba(255,255,255,0.1)] hover:shadow-[10px_10px_0px_var(--guild-primary)] hover:-translate-y-1 transition-all rotate-[-1deg] w-full max-w-[280px]"
          >
            {/* The Barcode */}
            <div className="w-full h-12 manga-barcode mb-3 border-b-4 border-black pb-1" />
            
            <div className="flex items-center gap-4 w-full justify-between px-2 text-black">
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ fontFamily: F_MONO }}>
                  Powered By
                </span>
                <span className="text-2xl uppercase tracking-tighter" style={{ fontFamily: F_DISPLAY }}>
                  Emberz Tech
                </span>
              </div>
              <span className="text-[var(--guild-primary)] font-black text-3xl" style={{ textShadow: "1.5px 1.5px 0 #000" }}>⚙</span>
            </div>
            
            {/* ISBN Number */}
            <div className="w-full text-left mt-2 pt-1 border-t-2 border-black/20 px-2">
               <span className="text-black/60 text-[9px] font-bold tracking-widest" style={{ fontFamily: F_MONO }}>ISBN 978-E-M-B-E-R-Z</span>
            </div>
          </a>

        </div>
      </div>
    </footer>
  );
}