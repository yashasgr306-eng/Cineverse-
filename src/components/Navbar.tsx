import { useState } from 'react';
import {
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Ticket,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { User } from '../types/cinema';
import { CITIES } from '../data/seedCatalog';

export type AppView =
  | 'HOME'
  | 'NOW_SHOWING'
  | 'THEATRES'
  | 'EVENTS'
  | 'PLAYS'
  | 'SPORTS'
  | 'MOVIE_DETAILS'
  | 'SEAT_SELECTION'
  | 'SNACKS'
  | 'CHECKOUT'
  | 'MY_TICKETS'
  | 'PROFILE'
  | 'ADMIN';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({
  currentView,
  onNavigate,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchChange,
  user,
  onOpenAuth,
  onLogout,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navItems: { label: string; view: AppView }[] = [
    { label: 'Movies', view: 'HOME' },
    { label: 'Now Showing', view: 'NOW_SHOWING' },
    { label: 'Theatres', view: 'THEATRES' },
    { label: 'Events', view: 'EVENTS' },
    { label: 'Plays', view: 'PLAYS' },
    { label: 'Sports', view: 'SPORTS' },
  ];

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark with Golden Ticket Icon */}
        <button
          type="button"
          onClick={() => handleNav('HOME')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#F5C518] rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-[#F5C518] text-[#060913] flex items-center justify-center">
            <Ticket className="w-4 h-4 stroke-[2.5]" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight text-white">
            CINE<span className="text-[#F5C518]">VERSE</span>
          </span>
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => {
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
                  active
                    ? 'text-[#F5C518] border-[#F5C518]'
                    : 'text-slate-300 border-transparent hover:text-white hover:border-white/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleNav('MY_TICKETS')}
            className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
              currentView === 'MY_TICKETS'
                ? 'text-[#F5C518] border-[#F5C518]'
                : 'text-slate-300 border-transparent hover:text-white hover:border-white/30'
            }`}
          >
            My Tickets
          </button>
          {user?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => handleNav('ADMIN')}
              className={`text-sm font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 pb-0.5 border-b-2 ${
                currentView === 'ADMIN'
                  ? 'text-[#F5C518] border-[#F5C518]'
                  : 'text-amber-300 border-transparent hover:text-[#F5C518]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: City, Search & Primary Account Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Inline expandable search bar on desktop */}
          <div className="hidden md:flex items-center">
            {searchOpen ? (
              <div className="flex items-center bg-[#0F172A] border border-white/15 rounded-lg px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (currentView !== 'NOW_SHOWING') onNavigate('NOW_SHOWING');
                  }}
                  placeholder="Search movies, theatres..."
                  aria-label="Search movies and theatres"
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-44"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setSearchOpen(false);
                  }}
                  aria-label="Close search"
                  className="text-slate-400 hover:text-white ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search movies and theatres"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* City Selector */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#0F172A] border border-white/10 rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#F5C518] shrink-0" />
            <select
              aria-label="Select city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="All Cities" className="bg-[#0B1020]">
                All Cities
              </option>
              {CITIES.map((c) => (
                <option key={c} value={c} className="bg-[#0B1020]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('PROFILE')}
                aria-label="Open user profile"
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                  currentView === 'PROFILE'
                    ? 'bg-[#F5C518]/15 border-[#F5C518] text-[#F5C518]'
                    : 'bg-[#111827] border-white/10 text-white hover:border-[#F5C518]'
                }`}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-[#F5C518] shrink-0" />
                )}
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 whitespace-nowrap shrink-0"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-lg text-slate-200 hover:bg-white/10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B1020] border-t border-white/10 px-4 py-4 space-y-3">
          <div className="flex items-center bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'NOW_SHOWING') onNavigate('NOW_SHOWING');
              }}
              placeholder="Search movies or theatres..."
              aria-label="Mobile search movies"
              className="bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">City</span>
            <select
              aria-label="Mobile select city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-[#0F172A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="All Cities">All Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => handleNav(item.view)}
                className={`px-3 py-2.5 rounded-lg text-left text-sm font-medium ${
                  currentView === item.view
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'bg-[#111827] text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNav('MY_TICKETS')}
              className={`px-3 py-2.5 rounded-lg text-left text-sm font-medium ${
                currentView === 'MY_TICKETS'
                  ? 'bg-[#F5C518] text-[#060913]'
                  : 'bg-[#111827] text-slate-200'
              }`}
            >
              My Tickets
            </button>
            {user && (
              <button
                type="button"
                onClick={() => handleNav('PROFILE')}
                className={`px-3 py-2.5 rounded-lg text-left text-sm font-medium ${
                  currentView === 'PROFILE'
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'bg-[#111827] text-slate-200'
                }`}
              >
                My Profile
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => handleNav('ADMIN')}
                className="px-3 py-2.5 rounded-lg text-left text-sm font-medium bg-[#111827] text-[#F5C518]"
              >
                Admin Dashboard
              </button>
            )}
          </div>

          {user ? (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => handleNav('PROFILE')}
                className="text-xs text-slate-300 hover:text-[#F5C518] underline"
              >
                Profile: {user.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-red-400 font-medium"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full py-2.5 rounded-lg bg-[#F5C518] text-[#060913] text-sm font-bold"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}
    </header>
  );
}
