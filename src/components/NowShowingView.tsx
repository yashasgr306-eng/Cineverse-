import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Star, Ticket } from 'lucide-react';
import type { Movie } from '../types/cinema';

interface NowShowingViewProps {
  movies: Movie[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onSelectMovie: (movie: Movie) => void;
}

const LANGUAGES = ['All', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi', 'English'];

export function NowShowingView({
  movies,
  searchQuery,
  onSearchChange,
  selectedLanguage,
  onLanguageChange,
  onSelectMovie,
}: NowShowingViewProps) {
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const featuredList = movies.length > 0 ? movies : [];
  const activeSpotlight = featuredList[spotlightIndex % Math.max(1, featuredList.length)];

  useEffect(() => {
    if (featuredList.length <= 1) return;
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % featuredList.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [featuredList.length]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
            CINEVERSE Theatrical Slate
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            Now Showing
          </h1>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search movie, cast, director..."
            aria-label="Filter movies by keyword"
            className="w-full bg-[#0D1426] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C518]"
          />
        </div>
      </div>

      {/* Rotating Featured Movie Carousel */}
      {activeSpotlight && (
        <div className="relative rounded-2xl overflow-hidden bg-[#0D1426] border border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch min-h-[280px]">
            <div className="md:col-span-5 lg:col-span-4 relative h-64 md:h-auto overflow-hidden">
              <img
                src={activeSpotlight.posterUrl}
                alt={activeSpotlight.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0D1426]/80 hidden md:block" />
            </div>

            <div className="md:col-span-7 lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#F5C518] font-medium">
                  <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
                  <span className="font-mono tabular-nums">{activeSpotlight.rating.toFixed(1)}/10</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">{activeSpotlight.language}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{activeSpotlight.genre}</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
                  {activeSpotlight.title}
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  {activeSpotlight.description}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  Starring: {activeSpotlight.cast.join(', ')} · Directed by {activeSpotlight.director}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onSelectMovie(activeSpotlight)}
                  className="px-5 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  Book Tickets
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous spotlight movie"
                    onClick={() =>
                      setSpotlightIndex(
                        (prev) => (prev - 1 + featuredList.length) % featuredList.length
                      )
                    }
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-400 tabular-nums px-1">
                    {(spotlightIndex % featuredList.length) + 1} / {featuredList.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Next spotlight movie"
                    onClick={() => setSpotlightIndex((prev) => (prev + 1) % featuredList.length)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Filter Segmented Bar */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Language filter">
        {LANGUAGES.map((lang) => {
          const active = selectedLanguage === lang;
          return (
            <button
              key={lang}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onLanguageChange(lang)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#F5C518] text-[#060913]'
                  : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:border-white/25 hover:text-white'
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>

      {/* Movie Grid */}
      {movies.length === 0 ? (
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-12 text-center">
          <p className="font-display text-lg font-semibold text-white">No movies match your filters</p>
          <p className="text-sm text-slate-400 mt-1">
            Try clearing your search term or switching back to All languages.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onLanguageChange('All');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#F5C518] text-[#060913] text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <article
              key={movie.id}
              className="group bg-[#0D1426] border border-white/10 rounded-2xl overflow-hidden flex flex-col hover:border-[#F5C518]/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectMovie(movie)}
                className="relative aspect-[3/4] w-full overflow-hidden text-left"
              >
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1426] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-mono font-bold text-[#F5C518]">
                    <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
                    <span className="tabular-nums">{movie.rating.toFixed(1)}</span>
                  </span>
                  <span className="text-slate-300">{movie.releaseDate}</span>
                </div>
              </button>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold text-white truncate">
                    {movie.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 truncate">
                    {movie.language} · {movie.genre}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectMovie(movie)}
                  className="w-full py-2 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold transition-colors"
                >
                  Book Tickets
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
