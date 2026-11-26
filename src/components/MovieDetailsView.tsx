import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Play,
  Star,
  Ticket,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { Movie, MovieFormat, Show } from '../types/cinema';
import { CITIES, SHOW_DATES } from '../data/seedCatalog';
import { cinemaAudio } from '../utils/cinemaAudio';

interface MovieDetailsViewProps {
  movie: Movie;
  shows: Show[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  onBack: () => void;
  onSelectShow: (show: Show) => void;
  onOpenNearbyTheatres?: () => void;
}

export function MovieDetailsView({
  movie,
  shows,
  selectedCity,
  onCityChange,
  onBack,
  onSelectShow,
  onOpenNearbyTheatres,
}: MovieDetailsViewProps) {
  const [soundOn, setSoundOn] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(SHOW_DATES[0].value);
  const [selectedLang, setSelectedLang] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState<MovieFormat | 'All'>('All');

  const showtimesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      cinemaAudio.stop();
    };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    cinemaAudio.toggleTrailerAmbience(next);
    setSoundOn(next);
  };

  const filteredShows = useMemo(() => {
    return shows.filter((s) => {
      if (selectedCity !== 'All Cities' && s.city !== selectedCity) return false;
      if (s.showDate !== selectedDate) return false;
      if (selectedLang !== 'All' && s.language !== selectedLang) return false;
      if (selectedFormat !== 'All' && s.format !== selectedFormat) return false;
      return true;
    });
  }, [shows, selectedCity, selectedDate, selectedLang, selectedFormat]);

  // Group filtered shows by theatre
  const showsByTheatre = useMemo(() => {
    const map = new Map<
      number,
      { theatreName: string; theatreAddress: string; city: string; shows: Show[] }
    >();
    for (const s of filteredShows) {
      const existing = map.get(s.theatreId);
      if (existing) {
        existing.shows.push(s);
      } else {
        map.set(s.theatreId, {
          theatreName: s.theatreName,
          theatreAddress: s.theatreAddress,
          city: s.city,
          shows: [s],
        });
      }
    }
    return Array.from(map.entries());
  }, [filteredShows]);

  const scrollToShowtimes = () => {
    showtimesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pb-16">
      {/* Full-Screen Cinematic Trailer Backdrop Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src={movie.backdropUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35 scale-105 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060913] via-[#060913]/85 to-[#060913]/65" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <button
            type="button"
            onClick={onBack}
            className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-[#F5C518] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Movies
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Poster */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="rounded-2xl overflow-hidden border border-white/15 bg-[#0D1426] aspect-[3/4] max-w-[280px]">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Movie Metadata & Actions */}
            <div className="md:col-span-8 lg:col-span-9 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
                  <span className="flex items-center gap-1 font-mono font-bold text-[#F5C518]">
                    <Star className="w-4 h-4 fill-[#F5C518]" />
                    <span className="tabular-nums text-sm">{movie.rating.toFixed(1)}/10</span>
                    <span className="text-slate-400 font-normal">({movie.votesCount} votes)</span>
                  </span>
                  <span className="text-slate-500">·</span>
                  <span>{movie.certificate}</span>
                  <span className="text-slate-500">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {movie.durationMinutes} min
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {movie.releaseDate}
                  </span>
                </div>

                <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white mt-3">
                  {movie.title}
                </h1>
                <p className="text-sm text-[#F5C518] mt-1 font-medium">{movie.tagline}</p>
              </div>

              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                {movie.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 max-w-2xl pt-2">
                <div>
                  <span className="text-slate-500 block">Director</span>
                  <span className="font-semibold text-white">{movie.director}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Starring</span>
                  <span className="font-semibold text-white">{movie.cast.join(', ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Languages</span>
                  <span className="font-semibold text-white">
                    {movie.languagesAvailable.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Formats</span>
                  <span className="font-semibold text-white">{movie.formats.join(' · ')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={scrollToShowtimes}
                  className="px-6 py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Ticket className="w-4 h-4" />
                  Book Tickets
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTrailerOpen(true);
                    if (!soundOn) {
                      cinemaAudio.toggleTrailerAmbience(true);
                      setSoundOn(true);
                    }
                  }}
                  className="px-5 py-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/15 text-white font-semibold text-sm flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4 text-[#F5C518]" />
                  Watch Trailer
                </button>

                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={soundOn ? 'Turn trailer sound off' : 'Turn trailer sound on'}
                  className="px-4 py-3 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/15 text-slate-200 font-medium text-sm flex items-center gap-2 transition-colors"
                >
                  {soundOn ? (
                    <>
                      <Volume2 className="w-4 h-4 text-[#F5C518]" />
                      Sound On
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-400" />
                      Sound Off
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Theatres & Showtimes Section */}
      <section ref={showtimesRef} className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Select Theatre & Showtime
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Filter by city, date, language, and projection format
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter theatres by city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-[#0D1426] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C518]"
            >
              <option value="All Cities">All Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter showtimes by language"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-[#0D1426] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C518]"
            >
              <option value="All">All Languages</option>
              {movie.languagesAvailable.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter showtimes by format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as MovieFormat | 'All')}
              className="bg-[#0D1426] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F5C518]"
            >
              <option value="All">All Formats</option>
              {(['2D', '3D', 'IMAX', '4DX'] as MovieFormat[]).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {onOpenNearbyTheatres && (
              <button
                type="button"
                onClick={onOpenNearbyTheatres}
                className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/15 hover:border-[#F5C518] text-xs font-semibold text-[#F5C518] flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <MapPin className="w-3.5 h-3.5" />
                Nearby Theatres Map
              </button>
            )}
          </div>
        </div>

        {/* Date Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {SHOW_DATES.map((d) => {
            const active = selectedDate === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => setSelectedDate(d.value)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:border-white/25'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Theatre List */}
        {showsByTheatre.length === 0 ? (
          <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-10 text-center">
            <p className="font-display text-lg font-semibold text-white">
              No showtimes match the active filters
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Try selecting All Cities, another date, or All Formats.
            </p>
            <button
              type="button"
              onClick={() => {
                onCityChange('All Cities');
                setSelectedLang('All');
                setSelectedFormat('All');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#F5C518] text-[#060913] text-xs font-bold"
            >
              Show All Showtimes
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {showsByTheatre.map(([theatreId, group]) => (
              <div
                key={theatreId}
                className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white">
                      {group.theatreName}
                    </h3>
                    <span className="text-xs font-medium text-[#F5C518]">{group.city}</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {group.theatreAddress}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {group.shows.map((show) => {
                    const total = show.totalSeats ?? 88;
                    const avail = show.availableSeats ?? total;
                    const ratio = total > 0 ? avail / total : 1;
                    const fillingFast = ratio <= 0.4;
                    return (
                      <button
                        key={show.id}
                        type="button"
                        onClick={() => onSelectShow(show)}
                        className={`px-4 py-2.5 rounded-xl bg-[#060913] border text-left transition-colors group ${
                          fillingFast
                            ? 'border-amber-500/50 hover:border-[#F5C518] hover:bg-[#F5C518]/10'
                            : 'border-emerald-500/40 hover:border-[#F5C518] hover:bg-[#F5C518]/10'
                        }`}
                      >
                        <span
                          className={`block font-mono text-sm font-bold group-hover:text-[#F5C518] tabular-nums ${
                            fillingFast ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {show.showTime}
                        </span>
                        <span className="block text-[11px] text-slate-300 mt-0.5">
                          {show.format} · {show.language}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                          {avail}/{total} seats open
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Interactive Trailer Preview Modal */}
      {trailerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${movie.title} Official Trailer`}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div className="bg-[#0D1426] border border-white/15 rounded-2xl max-w-3xl w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  {movie.title} — Theatrical Trailer Preview
                </h3>
                <p className="text-xs text-slate-400">{movie.tagline}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-200 flex items-center gap-1.5"
                >
                  {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#F5C518]" /> : <VolumeX className="w-3.5 h-3.5" />}
                  {soundOn ? 'Sound On' : 'Muted'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrailerOpen(false);
                    cinemaAudio.stop();
                    setSoundOn(false);
                  }}
                  aria-label="Close trailer modal"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-video bg-[#050811] overflow-hidden flex items-center justify-center">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-55 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-mono tracking-[0.22em] text-[#F5C518] uppercase">
                  CINEVERSE 4K LASER PREVIEW
                </p>
                <h4 className="font-display text-3xl sm:text-4xl font-extrabold text-white mt-2">
                  {movie.title}
                </h4>
                <p className="text-sm text-slate-300 mt-3 max-w-lg">{movie.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    setTrailerOpen(false);
                    cinemaAudio.stop();
                    setSoundOn(false);
                    scrollToShowtimes();
                  }}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-[#F5C518] text-[#060913] font-bold text-sm"
                >
                  Book Showtimes Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
