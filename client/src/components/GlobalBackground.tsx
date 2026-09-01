import { useEffect } from "react";

export default function GlobalBackground() {
  useEffect(() => {
    if (document.getElementById("global-bg-assets")) return;
    const style = document.createElement("style");
    style.id = "global-bg-assets";
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&display=swap');
      
      .jp-bg-pattern {
        font-family: 'Noto Sans JP', sans-serif;
        word-break: break-all;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Darkened and subtler halftone texture
  const halftoneLight = {
    backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1.5px, transparent 1.5px)",
    backgroundSize: "8px 8px",
  };

  // Generate a massive repeating string to fill the background
  // "オタクの領域" translates to "Otaku's Domain"
  const repeatingText = Array(250).fill("オタクの領域").join(" ✦ ");

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#050505] overflow-hidden flex items-center justify-center">
      
      {/* Dynamic Ambient Glow based on Guild (Darkened for better contrast) */}
      <div
        className="absolute inset-0 opacity-10 blur-[150px] transition-colors duration-1000"
        style={{ backgroundColor: "var(--guild-primary)" }}
      />
      
      {/* Repeating Kanji Pattern - Angled and covering the entire screen */}
      <div className="absolute w-[250vw] md:w-[150vw] h-[200vh] flex items-center justify-center -rotate-[15deg] opacity-[0.03]">
        <p className="jp-bg-pattern text-white font-black text-[4rem] sm:text-[6rem] md:text-[8rem] leading-[1.1] text-center select-none">
          {repeatingText}
        </p>
      </div>

      {/* Screen-wide Halftone Paper Texture */}
      <div className="absolute inset-0 mix-blend-screen" style={halftoneLight} />
      
    </div>
  );
}