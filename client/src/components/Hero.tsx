// client/src/components/Hero.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import pageFlipSound from "../assets/page.ogg";
import { supabase } from "../lib/supabase";

export interface GuildType {
  name: string;
  primary: string;
  secondary: string;
}

interface SlideMember {
  name: string;
  avatar: string;
  quote: string;
}

interface SlideData {
  id: number;
  panel: string;
  tag: string;
  stamp: string;
  sfx: string;
  title1: string;
  title2: string;
  desc: string; 
  btn: string;
  targetUrl?: string;
  image: string;
  kanji: string;
  member?: SlideMember;
}

interface DailyTrialData {
  id?: number;
  question: string;
  rewardPoints: number;
  activeDate?: string;
}

interface HeroProps {
  guild?: GuildType;
}

const DEFAULT_GUILD: GuildType = {
  name: "Crimson Guild",
  primary: "#FF2E4D", 
  secondary: "#FFE14D", 
};

function useMangaAssets() {
  useEffect(() => {
    if (document.getElementById("manga-hero-assets")) return;
    const style = document.createElement("style");
    style.id = "manga-hero-assets";
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Anton&family=Space+Mono:wght@400;700&family=Noto+Sans+JP:wght@900&display=swap');
      .ink-box { border: 4px solid #000; border-radius: 2px 255px 3px 255px / 255px 5px 225px 3px; }
      .vertical-jp { writing-mode: vertical-rl; text-orientation: upright; font-family: 'Noto Sans JP', sans-serif; }
      .focus-lines {
        background: repeating-conic-gradient(from 0deg, transparent 0deg 5deg, rgba(0, 0, 0, 0.15) 5deg 10deg, transparent 10deg 15deg, rgba(255, 255, 255, 0.1) 15deg 20deg);
        animation: rotate-focus 20s linear infinite;
      }
      @keyframes rotate-focus { from { transform: rotate(0deg) scale(2); } to { transform: rotate(360deg) scale(2); } }
      .jagged-bubble { clip-path: polygon(0% 5%, 5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 20% 100%, 15% 115%, 10% 100%, 5% 100%, 0% 95%); }
      @keyframes flip-next-paper {
        0% { transform: perspective(2500px) rotateY(0deg) rotateX(0deg) scale(1); filter: brightness(1); }
        40% { transform: perspective(2500px) rotateY(-80deg) rotateX(-2deg) scale(1.03); filter: brightness(1.3); }
        100% { transform: perspective(2500px) rotateY(-180deg) rotateX(0deg) scale(1); filter: brightness(0.8); }
      }
      @keyframes flip-prev-paper {
        0% { transform: perspective(2500px) rotateY(0deg) rotateX(0deg) scale(1); filter: brightness(1); }
        40% { transform: perspective(2500px) rotateY(80deg) rotateX(2deg) scale(1.03); filter: brightness(1.3); }
        100% { transform: perspective(2500px) rotateY(180deg) rotateX(0deg) scale(1); filter: brightness(0.8); }
      }
      .paper-flip-next { animation: flip-next-paper 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      .paper-flip-prev { animation: flip-prev-paper 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
      @keyframes anime-shake {
        0% { transform: translate(2px, 2px) rotate(0deg); }
        20% { transform: translate(-4px, 0px) rotate(2deg); }
        40% { transform: translate(2px, -2px) rotate(-1deg); }
        60% { transform: translate(-4px, 2px) rotate(1deg); }
        80% { transform: translate(-2px, -2px) rotate(2deg); }
        100% { transform: translate(2px, -4px) rotate(-1deg); }
      }
      .animate-manga-impact { animation: anime-shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
    `;
    document.head.appendChild(style);
  }, []);
}

const F_DISPLAY = "'Anton', sans-serif";
const F_SFX = "'Bangers', cursive";
const F_MONO = "'Space Mono', monospace";
const halftoneDark = { backgroundImage: "radial-gradient(rgba(0,0,0,0.8) 1.5px, transparent 1.5px)", backgroundSize: "6px 6px" };
const halftoneLight = { backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px)", backgroundSize: "8px 8px" };

function SfxBurst({ text, className = "", triggerAnim = false }: { text: string; className?: string; triggerAnim?: boolean }) {
  return (
    <div
      className={`select-none pointer-events-none absolute z-50 ${className} ${triggerAnim ? "animate-manga-impact" : ""}`}
      style={{
        fontFamily: F_SFX,
        color: "var(--guild-secondary)",
        WebkitTextStroke: "2.5px black",
        fontSize: "clamp(3.5rem, 7vw, 6rem)",
        lineHeight: 0.9,
        filter: "drop-shadow(6px 6px 0px rgba(0,0,0,1))",
      }}
    >
      {text}
    </div>
  );
}

function SlidePanel({ slide, isFlipping = false }: { slide: SlideData; isFlipping?: boolean }) {
  const navigate = useNavigate();

  const handleActionClick = () => {
    if (slide.targetUrl) {
      navigate(slide.targetUrl);
      return;
    }
    const btnLow = slide.btn.toLowerCase();
    if (btnLow.includes("ticket") || btnLow.includes("event") || btnLow.includes("fest")) {
      navigate("/events");
    } else if (btnLow.includes("vault") || btnLow.includes("watch") || btnLow.includes("manga")) {
      navigate("/vault");
    } else if (btnLow.includes("store") || btnLow.includes("merch") || btnLow.includes("gear")) {
      navigate("/store");
    } else if (btnLow.includes("forum") || btnLow.includes("discuss")) {
      navigate("/forum");
    } else if (btnLow.includes("leaderboard") || btnLow.includes("rank") || btnLow.includes("guild")) {
      navigate("/dashboard");
    } else {
      navigate("/vault");
    }
  };

  return (
    <div className="absolute inset-0 bg-[#e8e4d8] overflow-hidden flex flex-col p-4 md:p-6 gap-4">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={halftoneDark} />
      <SfxBurst text={slide.sfx} className="top-10 left-8 -rotate-12" triggerAnim={!isFlipping} />

      <div className="relative w-full flex-1 ink-box overflow-hidden bg-black shadow-[8px_8px_0px_#000]" style={{ clipPath: "polygon(0 0, 100% 0, 100% 90%, 0 100%)" }}>
        <img src={slide.image} alt={slide.title1} className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-[20000ms] hover:scale-125" />
        <div className="absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none" style={halftoneLight} />
        <div className="absolute right-6 top-6 vertical-jp text-white/90 text-6xl md:text-7xl lg:text-8xl font-black drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mix-blend-overlay tracking-widest z-10">
          {slide.kanji}
        </div>
      </div>

      <div className="relative w-full h-auto min-h-[200px] flex flex-col md:flex-row gap-4 items-end z-20">
        <div className="ink-box bg-white flex-1 p-6 shadow-[8px_8px_0px_#000] relative">
          <div className="absolute -top-4 -left-2 bg-[var(--guild-primary)] text-black font-bold uppercase text-xs px-3 py-1 ink-box rotate-[-3deg]" style={{ fontFamily: F_MONO }}>
            {slide.stamp}
          </div>
          <h1 className="uppercase text-5xl md:text-6xl lg:text-7xl leading-[0.85] text-black tracking-tight mb-4 mt-2" style={{ fontFamily: F_DISPLAY }}>
            {slide.title1} <br/> <span style={{ color: "var(--guild-primary)", WebkitTextStroke: "2px black", textShadow: "4px 4px 0px #000" }}>{slide.title2}</span>
          </h1>
          {slide.member ? (
             <div className="flex items-center gap-3 bg-zinc-100 p-2 border-2 border-dashed border-black">
               <img src={slide.member.avatar} alt={slide.member.name} className="w-10 h-10 border-2 border-black object-cover rounded-full" />
               <div>
                 <p className="text-black text-[10px] uppercase font-bold" style={{ fontFamily: F_MONO }}>{slide.member.name}</p>
                 <p className="text-black/80 text-xs font-bold italic leading-tight">"{slide.member.quote}"</p>
               </div>
             </div>
          ) : (
            <p className="text-black/80 text-sm md:text-base font-bold leading-snug border-l-4 border-black pl-3" style={{ fontFamily: F_MONO }}>
              {slide.desc}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <button
            onClick={handleActionClick}
            className="ink-box bg-black text-white px-8 py-6 uppercase tracking-widest text-lg hover:bg-[var(--guild-primary)] hover:text-black transition-all shadow-[6px_6px_0px_var(--guild-primary)] hover:shadow-[8px_8px_0px_#000] active:translate-y-2 active:shadow-none -rotate-2 cursor-pointer"
            style={{ fontFamily: F_DISPLAY }}
          >
            {slide.btn} ➔
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Hero({ guild = DEFAULT_GUILD }: HeroProps) {
  useMangaAssets();

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [dailyTrial, setDailyTrial] = useState<DailyTrialData>({ question: "Connecting...", rewardPoints: 50 });
  const [answerInput, setAnswerInput] = useState("");
  const [trialStatus, setTrialStatus] = useState<string | null>(null);

  const [socialHandle, setSocialHandle] = useState("");
  const [recruitStatus, setRecruitStatus] = useState<string | null>(null);
  
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [current, setCurrent] = useState<number>(0);
  const [pending, setPending] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFlipping = pending !== null;

  useEffect(() => {
    async function fetchLandingData() {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://otaku-s-domain.onrender.com/api';
      try {
        const [slidesRes, trialRes] = await Promise.all([
          fetch(`${apiBase}/landing/slides`),
          fetch(`${apiBase}/landing/daily-trial`)
        ]);

        if (slidesRes.ok) {
          const slideData = await slidesRes.json();
          const formattedSlides = slideData.map((s: any) => ({
            id: s.id,
            panel: s.panel,
            tag: s.tag,
            stamp: s.stamp,
            sfx: s.sfx,
            title1: s.title1,
            title2: s.title2,
            desc: s.desc,
            btn: s.btnText || s.btn || "Explore",
            targetUrl: s.targetUrl || "/vault",
            image: s.imageUrl || s.image,
            kanji: s.kanji,
            member: s.memberName ? { name: s.memberName, avatar: s.memberAvatar, quote: s.memberQuote || "Leading the charge!" } : undefined
          }));
          if (formattedSlides.length > 0) setSlides(formattedSlides);
        }

        if (trialRes.ok) {
          const trialData = await trialRes.json();
          if (trialData) {
            setDailyTrial(trialData);
            const trialKey = `trial_solved_${trialData.id || "today"}`;
            setIsCompleted(localStorage.getItem(trialKey) === "true");
          }
        }
      } catch (err) {
        console.error("Failed to sync landing feed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLandingData();
  }, []);

  useEffect(() => {
    audioRef.current = new Audio(pageFlipSound);
    audioRef.current.volume = 0.6;
  }, []);

  const playFlipSound = () => {
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const goTo = (targetIndex: number, dir: "next" | "prev") => {
    if (isFlipping || targetIndex === current || slides.length === 0) return;
    setDirection(dir);
    setPending(targetIndex);
    playFlipSound();
  };

  const handleNext = () => { if (slides.length > 0) goTo((current + 1) % slides.length, "next"); };
  const handlePrev = () => { if (slides.length > 0) goTo((current - 1 + slides.length) % slides.length, "prev"); };
  
  const handleJump = (targetIndex: number) => {
    if (targetIndex === current || slides.length === 0) return;
    const len = slides.length;
    const diff = (targetIndex - current + len) % len;
    goTo(targetIndex, diff <= len / 2 ? "next" : "prev");
  };

  const onPageTransitionEnd = (e: React.AnimationEvent) => {
    if (e.animationName.includes('flip') && pending !== null) {
      setCurrent(pending);
      setPending(null);
    }
  };

  useEffect(() => {
    if (slides.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(handleNext, 8500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, isFlipping, isMuted, slides.length]);

  const handleTriviaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || isCompleted) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://otaku-s-domain.onrender.com/api';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setTrialStatus("Please sign in to earn Quest Points!");
        return;
      }

      // Explicitly send trialId to verify against the active question
      const res = await fetch(`${apiBase}/landing/submit-trial`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          answer: answerInput, 
          trialId: dailyTrial.id 
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCompleted(true);
        const trialKey = `trial_solved_${dailyTrial.id || "today"}`;
        localStorage.setItem(trialKey, "true");
        setTrialStatus(data.message);
      } else {
        setTrialStatus(data.message || "Incorrect answer.");
      }
    } catch {
      setTrialStatus("Network error validating trial.");
    }
  };

  const handleRecruitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialHandle.trim()) return;

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://otaku-s-domain.onrender.com/api';
    try {
      const res = await fetch(`${apiBase}/landing/recruit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: socialHandle })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRecruitStatus(data.message);
        setSocialHandle("");
      } else {
        setRecruitStatus(data.message || "Submission failed.");
      }
    } catch {
      setRecruitStatus("Network error connecting to casting server.");
    }
  };

  if (loading || slides.length === 0) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center text-white font-mono uppercase tracking-widest animate-pulse">
        Loading Manga Spread...
      </section>
    );
  }

  const bottomSlide = slides[isFlipping && pending !== null ? pending : current] || slides[0];
  const topSlide = slides[current] || slides[0];
  const flipClass = direction === "next" ? "paper-flip-next" : "paper-flip-prev";

  return (
    <section style={{ "--guild-primary": guild.primary, "--guild-secondary": guild.secondary } as React.CSSProperties} className="min-h-screen bg-transparent pt-10 md:pt-6 pb-6 px-4 md:px-6 max-w-[100rem] mx-auto w-full flex flex-col lg:flex-row gap-6 relative overflow-hidden">
      <div className="w-full lg:w-2/3 lg:h-full relative flex-1 min-h-[70vh] rounded-lg overflow-visible bg-black z-10 shadow-[15px_15px_0px_rgba(0,0,0,0.5)] border-l-[12px] border-l-black" style={{ perspective: "3000px" }}>
        <SlidePanel slide={bottomSlide} isFlipping={isFlipping} />

        {isFlipping && (
          <div className={`absolute inset-0 z-30 ${flipClass}`} style={{ transformStyle: "preserve-3d", transformOrigin: direction === "next" ? "left center" : "right center" }} onAnimationEnd={onPageTransitionEnd}>
            <div className="absolute inset-0 shadow-[20px_0_30px_rgba(0,0,0,0.5)]" style={{ backfaceVisibility: "hidden" }}>
              <SlidePanel slide={topSlide} isFlipping={true} />
            </div>
            <div className="absolute inset-0 bg-[#e8e4d8] flex items-center justify-center border-l-[12px] border-black" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <div className="absolute inset-0 opacity-70" style={halftoneDark} />
              <div className="text-black/40 font-black text-[12rem] tracking-tighter" style={{ fontFamily: F_DISPLAY }}>{topSlide.panel}</div>
            </div>
          </div>
        )}

        {isFlipping && (
          <div className="absolute inset-y-0 w-32 z-[35] pointer-events-none" style={{ [direction === "next" ? "left" : "right"]: 0, background: `linear-gradient(to ${direction === "next" ? "right" : "left"}, rgba(0,0,0,1), transparent)` }} />
        )}

        <div className="absolute -bottom-5 right-6 z-40 flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className="ink-box bg-white w-12 h-12 flex items-center justify-center text-black hover:bg-[var(--guild-secondary)] shadow-[4px_4px_0px_#000] active:translate-y-1 transition-all cursor-pointer" aria-label="Toggle Page Flip Sound">
            {isMuted ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
          </button>
          <div className="flex gap-1 ink-box bg-white p-1 shadow-[4px_4px_0px_#000]">
            <button onClick={handlePrev} className="w-10 h-10 bg-black text-white hover:bg-[var(--guild-primary)] flex justify-center items-center cursor-pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg></button>
            <button onClick={handleNext} className="w-10 h-10 bg-black text-white hover:bg-[var(--guild-primary)] flex justify-center items-center cursor-pointer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg></button>
          </div>
        </div>

        <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex flex-col gap-2 z-0">
          {slides.map((s, i) => (
             <button key={s.id} onClick={() => handleJump(i)} className={`w-12 h-14 ink-box flex items-center justify-center transition-transform hover:-translate-x-2 cursor-pointer ${i === current ? 'bg-[var(--guild-primary)] -translate-x-3' : 'bg-white'}`} style={{ borderLeft: 'none', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}>
               <span className="font-black text-black -rotate-90" style={{ fontFamily: F_DISPLAY }}>{s.panel}</span>
             </button>
          ))}
        </div>
      </div>

      <aside className="w-full lg:w-1/3 lg:h-full flex flex-col gap-6 z-10">
        <div className="flex-1 ink-box bg-zinc-900 shadow-[10px_10px_0px_#000] relative overflow-hidden flex flex-col group min-h-[300px]">
          <div className="absolute inset-0 focus-lines opacity-40 pointer-events-none mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
          
          <div className="relative z-10 p-6 flex flex-col h-full justify-between items-center text-center">
            <h3 className="uppercase text-4xl text-white tracking-wide" style={{ fontFamily: F_DISPLAY, textShadow: "3px 3px 0 #000" }}>
              <span className="text-[var(--guild-primary)] block text-5xl mb-1 animate-pulse">⚡</span>
              Daily Trial ({dailyTrial.rewardPoints} QP)
            </h3>

            <div className="jagged-bubble bg-white text-black p-6 w-full max-w-[90%] my-2 relative">
               <p className="font-black text-lg italic leading-tight" style={{ fontFamily: F_MONO }}>"{dailyTrial.question}"</p>
            </div>

            {isCompleted ? (
              <div className="w-full bg-[var(--guild-secondary)] text-black p-4 ink-box font-bold uppercase text-sm tracking-wider" style={{ fontFamily: F_MONO }}>
                ✓ Trial Cleared! +{dailyTrial.rewardPoints} QP Credited.
              </div>
            ) : (
              <form onSubmit={handleTriviaSubmit} className="w-full flex flex-col gap-3">
                <input type="text" value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} placeholder="Enter your answer..." className="w-full bg-white text-black font-bold px-4 py-2 border-2 border-black ink-box text-sm focus:outline-none" style={{ fontFamily: F_MONO }} required />
                <button type="submit" className="w-full py-3 ink-box bg-[var(--guild-primary)] text-black uppercase text-lg tracking-widest hover:bg-white transition-all shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none shrink-0 cursor-pointer" style={{ fontFamily: F_DISPLAY }}>
                  Submit Answer
                </button>
              </form>
            )}

            {trialStatus && (
              <p className="text-xs font-bold text-[var(--guild-secondary)] mt-2" style={{ fontFamily: F_MONO }}>{trialStatus}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 ink-box shadow-[10px_10px_0px_#000] p-6 relative overflow-visible group hover:-translate-y-2 transition-all" style={{ backgroundColor: "var(--guild-secondary)" }}>
          <div className="absolute inset-0 opacity-20 mix-blend-multiply pointer-events-none" style={halftoneDark} />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-white/40 rotate-2 border border-white/20 backdrop-blur-sm shadow-sm z-50" />
          <SfxBurst text="JOIN!" className="-top-12 -right-6 rotate-[25deg]" triggerAnim={true} />

          <form onSubmit={handleRecruitSubmit} className="relative z-10 flex flex-col items-start">
            <h3 className="uppercase text-4xl text-black leading-none mb-2" style={{ fontFamily: F_DISPLAY }}>Star in our video</h3>
            <p className="text-black bg-white px-2 py-1 text-xs uppercase mb-4 font-bold border-2 border-black ink-box" style={{ fontFamily: F_MONO }}>Drop your Snapchat/Instagram handle</p>

            <div className="flex w-full shadow-[6px_6px_0px_rgba(0,0,0,1)]">
              <input type="text" value={socialHandle} onChange={(e) => setSocialHandle(e.target.value)} placeholder="@your_insta" className="flex-1 bg-white border-y-4 border-l-4 border-black px-4 py-3 focus:outline-none text-black font-bold placeholder-gray-400" style={{ fontFamily: F_MONO }} required />
              <button type="submit" className="bg-black text-white border-4 border-black uppercase text-lg px-6 py-3 hover:bg-[var(--guild-primary)] hover:text-black transition-colors cursor-pointer" style={{ fontFamily: F_DISPLAY }}>Go</button>
            </div>

            {recruitStatus && (
              <p className="text-[11px] font-bold text-black mt-2 bg-white/80 p-1 border border-black w-full text-center" style={{ fontFamily: F_MONO }}>
                {recruitStatus}
              </p>
            )}
          </form>
        </div>
      </aside>
    </section>
  );
}