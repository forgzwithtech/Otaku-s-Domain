// src/components/Navbar.tsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/api';
import type { User } from '@supabase/supabase-js';
import type { GuildType } from '../App';
import blueLogo from '../assets/bluelogo.png';
import redLogo from '../assets/Redlogo.png';

interface NavbarProps {
  guild: GuildType | 'none';
  setGuild: (val: GuildType) => void;
}

export default function Navbar({ guild, setGuild }: NavbarProps) {
  const location = useLocation();
  const isBlue = guild === 'blue';
  const isRed = guild === 'red';
  const hasGuild = isBlue || isRed;
  
  const primaryColor = isBlue ? '#6bb5ff' : isRed ? '#FF2E4D' : '#a855f7';
  
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'User' | 'Moderator' | 'Admin' | 'Member'>('Member');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function syncUserGuildState(currentUserSession: User | null) {
      setUser(currentUserSession);
      if (currentUserSession) {
        try {
          const profile = await apiService.getMyProfile();
          if (profile) {
            if (profile.role) {
              setUserRole(profile.role);
            }

            if (profile.avatarUrl) {
              setAvatarUrl(profile.avatarUrl);
            } else {
              setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserSession.email}&backgroundColor=transparent`);
            }

            if (profile.faction) {
              const serverFaction = profile.faction.toLowerCase();
              if (serverFaction === 'blue' || serverFaction === 'red' || serverFaction === 'none') {
                setGuild(serverFaction as GuildType);
              }
            }
          }
        } catch (err) {
          console.error("Could not fetch user guild from backend:", err);
          setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserSession.email}&backgroundColor=transparent`);
        }
      } else {
        setGuild('none');
        setAvatarUrl('');
        setUserRole('Member');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserGuildState(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserGuildState(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setGuild]);

  const getDisplayName = () => {
    if (!user) return "";
    return user.user_metadata?.display_name || user.email?.split('@')[0] || "Operative";
  };

  const isAdmin = userRole === 'Admin';
  const isMod = userRole === 'Moderator';

  const currentAvatar = avatarUrl || (user ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}&backgroundColor=transparent` : '');

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-md border-b-4 transition-colors duration-500"
           style={{ 
             borderBottomColor: primaryColor,
             '--guild-primary': primaryColor 
           } as React.CSSProperties}>
        
        <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex justify-between items-center relative">
          
          {/* LOGO SECTION */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 relative z-10">
            <div className="relative">
              <img
                src={isRed ? redLogo : blueLogo}
                alt="Otaku Domain Logo"
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain relative z-10 transition-all duration-500 group-hover:rotate-[360deg] group-hover:scale-110"
                style={{
                  filter: !hasGuild ? 'hue-rotate(65deg) saturate(1.8)' : 'none'
                }}
              />
              <div className="absolute inset-0 blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300" 
                   style={{ backgroundColor: 'var(--guild-primary)' }} />
            </div>
            <div className="flex flex-col uppercase tracking-widest skew-x-[-10deg]">
              <span className="font-display text-lg sm:text-xl font-black leading-none text-white">Otaku's</span>
              <span className="font-display text-xs sm:text-sm font-bold leading-none transition-colors duration-500" style={{ color: 'var(--guild-primary)' }}>Domain</span>
            </div>
          </Link>

          {/* DESKTOP CENTER LINKS */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2 font-display text-sm uppercase tracking-wider font-bold">
            {['Vault', 'Forum', 'Events', 'Store'].map((item) => (
              <Link 
                key={item} 
                to={`/${item.toLowerCase()}`} 
                className="relative px-4 lg:px-5 py-2 skew-x-[-15deg] overflow-hidden group border-2 border-transparent hover:border-white/20 transition-all"
              >
                <div className="absolute inset-0 bg-[var(--guild-primary)] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 text-gray-300 group-hover:text-black transition-colors duration-300 block skew-x-[15deg]">
                  {item}
                </span>
              </Link>
            ))}

            {/* MODERATOR NAV LINK */}
            {isMod && (
              <Link 
                to="/interpool/mod" 
                className="relative px-4 lg:px-5 py-2 skew-x-[-15deg] overflow-hidden group border-2 border-yellow-400/40 hover:border-yellow-400 transition-all bg-yellow-400/10"
              >
                <div className="absolute inset-0 bg-yellow-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 text-yellow-300 group-hover:text-black transition-colors duration-300 block skew-x-[15deg]">
                  Mod Field
                </span>
              </Link>
            )}

            {/* ADMIN NAV LINK */}
            {isAdmin && (
              <Link 
                to="/interpool/admin" 
                className="relative px-4 lg:px-5 py-2 skew-x-[-15deg] overflow-hidden group border-2 border-red-500/40 hover:border-red-500 transition-all bg-red-500/10"
              >
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 text-red-300 group-hover:text-white transition-colors duration-300 block skew-x-[15deg]">
                  Admin
                </span>
              </Link>
            )}
          </div>

          {/* RIGHT SECTION */}
          <div className="relative z-10 flex items-center shrink-0 gap-3 sm:gap-6">
            
            {!user ? (
              /* STATE 1: NOT LOGGED IN */
              <Link 
                to="/auth" 
                className="hidden sm:inline-block group bg-white text-black font-display font-black uppercase px-5 sm:px-6 py-2 sm:py-2.5 skew-x-[-15deg] border-2 border-black hover:bg-[var(--guild-primary)] transition-all shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_#000]"
              >
                <span className="block skew-x-[15deg] tracking-widest text-xs sm:text-sm">Sign In</span>
              </Link>
            ) : (
              /* STATE 2 & 3: LOGGED IN */
              <>
                {/* User Profile Block */}
                <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
                  <div className="hidden lg:flex flex-col uppercase tracking-widest text-right">
                    <span className="text-[9px] text-gray-400 font-bold leading-none" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {isAdmin ? 'Level 2 Admin' : isMod ? 'Field Officer' : 'Level 1 Operative'}
                    </span>
                    <span className="text-sm text-white font-display font-black leading-none group-hover:text-[var(--guild-primary)] transition-colors">
                      @{getDisplayName()}
                    </span>
                  </div>
                  <div className="w-9 h-9 sm:w-11 sm:h-11 bg-zinc-900 border-2 border-[var(--guild-primary)] skew-x-[-10deg] overflow-hidden shadow-[2px_2px_0px_#000] sm:shadow-[3px_3px_0px_#000] group-hover:-translate-y-0.5 transition-transform flex items-center justify-center">
                    <img 
                      src={currentAvatar} 
                      alt="User Avatar" 
                      className="w-full h-full object-cover skew-x-[10deg]" 
                    />
                  </div>
                </Link>

                {/* Guild Alignment Display */}
                {!hasGuild ? (
                  <div className="hidden sm:flex items-center ml-1 sm:ml-2 pl-2 sm:pl-4 border-l-2 border-white/20">
                    <button
                      onClick={() => setGuild(isBlue ? 'red' : 'blue')}
                      className="group relative flex items-center h-9 sm:h-10 w-[120px] sm:w-[140px] bg-zinc-900 border-2 border-white/20 skew-x-[-15deg] overflow-hidden shadow-[3px_3px_0px_#000] sm:shadow-[4px_4px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                      aria-label="Switch guild"
                    >
                      <div
                        className="absolute inset-y-0 left-0 w-[55%] bg-blue-600 flex items-center justify-start pl-2 sm:pl-3 transition-transform duration-500 ease-in-out"
                        style={{ 
                          transform: isBlue ? 'translateX(0)' : isRed ? 'translateX(-100%)' : 'translateX(-25%)', 
                          boxShadow: isBlue ? '0 0 20px rgba(46,143,255,0.8)' : 'none' 
                        }}
                      >
                        <span className="font-display text-[10px] sm:text-xs font-black text-white skew-x-[15deg]">BLUE</span>
                      </div>
                      
                      <div
                        className="absolute inset-y-0 right-0 w-[55%] bg-red-600 flex items-center justify-end pr-2 sm:pr-3 transition-transform duration-500 ease-in-out"
                        style={{ 
                          transform: isRed ? 'translateX(0)' : isBlue ? 'translateX(100%)' : 'translateX(25%)', 
                          boxShadow: isRed ? '0 0 20px rgba(255,59,59,0.8)' : 'none' 
                        }}
                      >
                        <span className="font-display text-[10px] sm:text-xs font-black text-white skew-x-[15deg]">RED</span>
                      </div>

                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 bg-black border border-white flex items-center justify-center font-display font-black text-[8px] sm:text-[9px] text-white z-10 skew-x-[15deg] group-hover:rotate-12 transition-transform">
                        VS
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="hidden lg:flex items-center ml-2 pl-4 border-l-2 border-white/20">
                    <div className="bg-[var(--guild-primary)] border-2 border-black px-4 py-1.5 skew-x-[-15deg] shadow-[4px_4px_0px_#000]">
                      <span className="block skew-x-[15deg] font-display font-black text-black uppercase tracking-wider text-sm">
                        {isBlue ? 'Azure Syndicate' : 'Crimson Vanguard'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 text-white focus:outline-none cursor-pointer p-1"
              aria-label="Toggle navigation menu"
            >
              <span className={`block w-6 h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-6 h-[2px] bg-white transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`block w-6 h-[2px] bg-white transition-transform duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>

          </div>
        </div>
      </nav>

      {/* MOBILE OVERLAY DRAWER */}
      <div 
        className={`md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-2xl transition-all duration-500 flex flex-col justify-between p-6 sm:p-8 pt-28 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-5 font-display text-2xl uppercase tracking-wider">
          {['Vault', 'Forum', 'Events', 'Store'].map((item) => (
            <Link
              key={item}
              to={`/${item.toLowerCase()}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-[var(--guild-primary)] transition-colors py-1 flex items-center justify-between border-b border-white/10"
            >
              <span>{item}</span>
              <span className="text-sm font-mono text-zinc-600">➔</span>
            </Link>
          ))}
          
          {user && (
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-300 hover:text-[var(--guild-primary)] transition-colors py-1 flex items-center justify-between border-b border-white/10"
            >
              <span>Dashboard</span>
              <span className="text-sm font-mono text-zinc-600">➔</span>
            </Link>
          )}

          {/* MOBILE STAFF SHORTCUTS */}
          {isMod && (
            <Link
              to="/interpool/mod"
              onClick={() => setMobileMenuOpen(false)}
              className="text-yellow-400 hover:text-white transition-colors py-1 flex items-center justify-between border-b border-yellow-400/20"
            >
              <span>Mod Control</span>
              <span className="text-sm font-mono text-yellow-400">➔</span>
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/interpool/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-red-500 hover:text-white transition-colors py-1 flex items-center justify-between border-b border-red-500/20"
            >
              <span>Master Admin</span>
              <span className="text-sm font-mono text-red-500">➔</span>
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-6 border-t border-white/10">
          {!user ? (
            <Link
              to="/auth"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center bg-white text-black font-display font-black uppercase py-3 border-2 border-black shadow-[4px_4px_0px_#fff]"
            >
              Sign In to Syndicate
            </Link>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">FACTION ALIGNMENT:</span>
              <button
                onClick={() => setGuild(isBlue ? 'red' : 'blue')}
                className="px-4 py-1.5 bg-zinc-900 border border-white/20 text-xs font-display font-bold text-white uppercase"
              >
                {isBlue ? 'Blue Faction' : isRed ? 'Red Faction' : 'Select Faction'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}