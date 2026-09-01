// src/components/forum/ForumFloatingDock.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const F_DISPLAY = "'Anton', sans-serif";

interface Props {
  onNewTransmission?: () => void;
  newTransmissionHref?: string;
}

export default function ForumFloatingDock({ onNewTransmission, newTransmissionHref }: Props) {
  const [showTop, setShowTop] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleNew = () => {
    if (onNewTransmission) onNewTransmission();
    else if (newTransmissionHref) navigate(newTransmissionHref);
  };

  return (
    <div
      className="fixed z-40 flex flex-col items-end gap-3"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
      }}
    >
      {showTop && (
        <button
          onClick={scrollTop}
          aria-label="Scroll to top"
          className="w-12 h-12 ink-box-forum bg-white border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-black hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all animate-[fadeIn_0.2s_ease-out]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}

      {(onNewTransmission || newTransmissionHref) && (
        <button
          onClick={handleNew}
          aria-label="Start new transmission"
          className="ink-box-forum bg-black text-white border-2 border-black pl-4 pr-5 py-3.5 shadow-[5px_5px_0px_var(--guild-primary)] hover:bg-[var(--guild-primary)] hover:text-black hover:shadow-[7px_7px_0px_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 uppercase text-xs font-black"
          style={{ fontFamily: F_DISPLAY }}
        >
          <span className="text-xl leading-none">+</span>
          <span>New Transmission</span>
        </button>
      )}
    </div>
  );
}