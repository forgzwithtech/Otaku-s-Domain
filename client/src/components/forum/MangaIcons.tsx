

export function IconChat({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}

export function IconShurikenRepost({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function IconScrollQuote({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4V3z" />
      <path d="M20 3h-4v7h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
      <path d="M4 10v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}

export function IconKatanaHeart({ className = "w-4 h-4", filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      <line x1="3" y1="21" x2="9" y2="15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconKunaiLink({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12,2 15,9 13,9 13,19 11,19 11,9 9,9" />
      <circle cx="12" cy="21" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconRadarAlert({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9l6 3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}