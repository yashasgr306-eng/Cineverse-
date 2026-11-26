import { useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  Film,
  IndianRupee,
  Pencil,
  Plus,
  Receipt,
  ShieldCheck,
  Ticket,
  Trash2,
} from 'lucide-react';
import type { AdminStats, Movie, MovieFormat, Show, Theatre, User } from '../types/cinema';
import { formatINR } from '../utils/cinemaPricing';
import { CITIES, SHOW_DATES } from '../data/seedCatalog';
import { cineverseApi } from '../api/cineverseApi';

interface AdminDashboardViewProps {
  user: User | null;
  movies: Movie[];
  theatres: Theatre[];
  onRefreshCatalog: () => void;
}

const POSTER_PRESETS = [
  { label: 'Ramayana: Part One Poster', url: '/src/assets/images/poster_ramayana_1794751352628.jpg' },
  { label: 'Jailer 2 Poster', url: '/src/assets/images/poster_jailer_two_1794751349463.jpg' },
  { label: 'Scene Poster', url: '/src/assets/images/poster_scene_2026_1794756609009.jpg' },
  { label: 'Mookuthi Amman 2 Poster', url: '/src/assets/images/poster_mookuthi_2026_1794756626504.jpg' },
  { label: 'Disco Poster', url: '/src/assets/images/poster_disco_2026_1794756644159.jpg' },
  { label: 'Drishyam 3 Poster', url: '/src/assets/images/poster_drishyam3_2026_1794756668247.jpg' },
  { label: 'Itllu Arjuna Poster', url: '/src/assets/images/poster_itllu_arjuna_2026_1794756683301.jpg' },
  { label: 'I Play Rocky Poster', url: '/src/assets/images/poster_i_play_rocky_2026_1794756708108.jpg' },
  { label: 'Gondhal Poster', url: '/src/assets/images/poster_gondhal_2026_1794756722802.jpg' },
  { label: 'Udta Teer Poster', url: '/src/assets/images/poster_udta_teer_2026_1794756737155.jpg' },
];

export function AdminDashboardView({
  user,
  movies,
  theatres,
  onRefreshCatalog,
}: AdminDashboardViewProps) {
  const [tab, setTab] = useState<'MOVIES' | 'THEATRES_SHOWS' | 'BOOKINGS'>('MOVIES');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Movie Form State
  const [editingMovieId, setEditingMovieId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [language, setLanguage] = useState('Tamil');
  const [genre, setGenre] = useState('Action · Thriller');
  const [durationMinutes, setDurationMinutes] = useState(160);
  const [rating, setRating] = useState(8.8);
  const [releaseDate, setReleaseDate] = useState('2026-11-20');
  const [director, setDirector] = useState('');
  const [castStr, setCastStr] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState(POSTER_PRESETS[0].url);
  const [trailerUrl, setTrailerUrl] = useState('https://www.youtube.com/embed/xenOE1Tma0A');

  // Theatre Form State
  const [theatreName, setTheatreName] = useState('');
  const [theatreCity, setTheatreCity] = useState<string>(CITIES[0]);
  const [theatreAddress, setTheatreAddress] = useState('');

  // Show Form State
  const [showMovieId, setShowMovieId] = useState<number>(movies[0]?.id ?? 1);
  const [showTheatreId, setShowTheatreId] = useState<number>(theatres[0]?.id ?? 1);
  const [showDate, setShowDate] = useState(SHOW_DATES[0].value);
  const [showTime, setShowTime] = useState('07:00 PM');
  const [showFormat, setShowFormat] = useState<MovieFormat>('IMAX');
  const [priceMultiplier, setPriceMultiplier] = useState(1.15);

  const loadAdminData = () => {
    cineverseApi.getAdminStats().then(setStats);
    cineverseApi.getAllShows().then(setShows);
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [user]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-[#0D1426] border border-red-500/30 rounded-2xl p-10 space-y-3">
          <ShieldCheck className="w-10 h-10 text-red-400 mx-auto" />
          <h1 className="font-display text-2xl font-bold text-white">Administrator Access Only</h1>
          <p className="text-sm text-slate-400">
            Please sign in with an administrator account (e.g. Demo Admin) to manage movies, theatres, pricing, and revenue records.
          </p>
        </div>
      </div>
    );
  }

  const resetMovieForm = () => {
    setEditingMovieId(undefined);
    setTitle('');
    setTagline('');
    setLanguage('Tamil');
    setGenre('Action · Thriller');
    setDurationMinutes(160);
    setRating(8.8);
    setReleaseDate('2026-11-20');
    setDirector('');
    setCastStr('');
    setDescription('');
    setPosterUrl(POSTER_PRESETS[0].url);
    setTrailerUrl('https://www.youtube.com/embed/xenOE1Tma0A');
  };

  const handleEditMovie = (m: Movie) => {
    setEditingMovieId(m.id);
    setTitle(m.title);
    setTagline(m.tagline);
    setLanguage(m.language);
    setGenre(m.genre);
    setDurationMinutes(m.durationMinutes);
    setRating(m.rating);
    setReleaseDate(m.releaseDate);
    setDirector(m.director);
    setCastStr(m.cast.join(', '));
    setDescription(m.description);
    setPosterUrl(m.posterUrl);
    setTrailerUrl(m.trailerUrl);
  };

  const handleSaveMovie = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !director.trim()) return;

    await cineverseApi.adminSaveMovie({
      id: editingMovieId,
      title: title.trim(),
      tagline: tagline.trim() || 'Now in CINEVERSE Theatres.',
      language,
      languagesAvailable: [language, 'Hindi', 'Tamil', 'Telugu'],
      genre: genre.trim(),
      durationMinutes: Number(durationMinutes),
      rating: Number(rating),
      votesCount: '12K',
      certificate: 'UA',
      releaseDate,
      director: director.trim(),
      cast: castStr
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      description: description.trim() || 'Cinematic theatrical presentation.',
      posterUrl,
      backdropUrl: posterUrl,
      trailerUrl,
      featured: true,
      nowShowing: true,
      formats: ['2D', 'IMAX'],
      accentColor: '#F5C518',
    });

    setStatusMessage(editingMovieId ? `Updated "${title}"` : `Added "${title}" to catalog`);
    resetMovieForm();
    onRefreshCatalog();
    loadAdminData();
  };

  const handleDeleteMovie = async (id: number, movieTitle: string) => {
    await cineverseApi.adminDeleteMovie(id);
    setStatusMessage(`Deleted "${movieTitle}"`);
    onRefreshCatalog();
    loadAdminData();
  };

  const handleAddTheatre = async (e: FormEvent) => {
    e.preventDefault();
    if (!theatreName.trim() || !theatreAddress.trim()) return;
    await cineverseApi.adminAddTheatre({
      name: theatreName.trim(),
      city: theatreCity,
      address: theatreAddress.trim(),
      amenities: ['Dolby Atmos', '4K Laser', 'Royal Recliners'],
    });
    setStatusMessage(`Added theatre "${theatreName}"`);
    setTheatreName('');
    setTheatreAddress('');
    onRefreshCatalog();
    loadAdminData();
  };

  const handleCreateShow = async (e: FormEvent) => {
    e.preventDefault();
    const t = theatres.find((item) => item.id === Number(showTheatreId));
    const m = movies.find((item) => item.id === Number(showMovieId));
    if (!t || !m) return;

    await cineverseApi.adminCreateShow({
      movieId: m.id,
      theatreId: t.id,
      theatreName: t.name,
      theatreAddress: t.address,
      city: t.city,
      screenId: 1,
      screenName: `${showFormat} Laser Screen 1`,
      showDate,
      showTime,
      language: m.language,
      format: showFormat,
      priceMultiplier: Number(priceMultiplier),
    });
    setStatusMessage(`Created ${showFormat} showtime at ${showTime} for ${m.title}`);
    loadAdminData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
            CINEVERSE Operations
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-1">Admin Dashboard</h1>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0D1426] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setTab('MOVIES')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'MOVIES' ? 'bg-[#F5C518] text-[#060913]' : 'text-slate-300 hover:text-white'
            }`}
          >
            Movies
          </button>
          <button
            type="button"
            onClick={() => setTab('THEATRES_SHOWS')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'THEATRES_SHOWS'
                ? 'bg-[#F5C518] text-[#060913]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Theatres & Shows
          </button>
          <button
            type="button"
            onClick={() => setTab('BOOKINGS')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'BOOKINGS' ? 'bg-[#F5C518] text-[#060913]' : 'text-slate-300 hover:text-white'
            }`}
          >
            Bookings & Revenue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-[#F5C518]" />
          </div>
          <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
            {formatINR(stats?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Bookings</span>
            <Receipt className="w-4 h-4 text-[#F5C518]" />
          </div>
          <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
            {stats?.totalBookings ?? 0}
          </p>
        </div>
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tickets Sold</span>
            <Ticket className="w-4 h-4 text-[#F5C518]" />
          </div>
          <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
            {stats?.ticketsSold ?? 0}
          </p>
        </div>
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Catalog</span>
            <Film className="w-4 h-4 text-[#F5C518]" />
          </div>
          <p className="font-mono text-2xl font-bold text-white mt-2 tabular-nums">
            {movies.length} Films · {theatres.length} Venues
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: MOVIES CRUD */}
      {tab === 'MOVIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveMovie}
            className="lg:col-span-5 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">
                {editingMovieId ? 'Update Movie' : 'Add New Movie'}
              </h2>
              {editingMovieId && (
                <button
                  type="button"
                  onClick={resetMovieForm}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Movie Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operation Mole"
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Primary Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {['Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Director</label>
                <input
                  type="text"
                  required
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="Director"
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={60}
                  max={260}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Genre & Tagline</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Action · Thriller"
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Tagline"
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Poster Artwork</label>
              <select
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              >
                {POSTER_PRESETS.map((p) => (
                  <option key={p.url} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cast (comma separated)</label>
              <input
                type="text"
                value={castStr}
                onChange={(e) => setCastStr(e.target.value)}
                placeholder="Actor 1, Actor 2"
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Synopsis</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter movie description..."
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {editingMovieId ? 'Save Movie Changes' : 'Publish Movie'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-white">Catalog ({movies.length})</h2>
            <div className="space-y-3">
              {movies.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#060913] border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={m.posterUrl}
                      alt={m.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-white truncate">{m.title}</h3>
                      <p className="text-xs text-slate-400 truncate">
                        {m.language} · {m.genre} · {m.durationMinutes} min
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditMovie(m)}
                      aria-label={`Edit ${m.title}`}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMovie(m.id, m.title)}
                      aria-label={`Delete ${m.title}`}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: THEATRES & SHOWS */}
      {tab === 'THEATRES_SHOWS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <form
            onSubmit={handleAddTheatre}
            className="bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#F5C518]" />
              Add Partner Theatre
            </h2>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Theatre Name</label>
              <input
                type="text"
                required
                value={theatreName}
                onChange={(e) => setTheatreName(e.target.value)}
                placeholder="CINEVERSE Galleria IMAX"
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">City</label>
              <select
                value={theatreCity}
                onChange={(e) => setTheatreCity(e.target.value)}
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Street Address</label>
              <input
                type="text"
                required
                value={theatreAddress}
                onChange={(e) => setTheatreAddress(e.target.value)}
                placeholder="100ft Road, Bengaluru"
                className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm"
            >
              Register Theatre
            </button>
          </form>

          <form
            onSubmit={handleCreateShow}
            className="bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-white">
              Schedule Showtime & Ticket Price Tier
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Movie</label>
                <select
                  value={showMovieId}
                  onChange={(e) => setShowMovieId(Number(e.target.value))}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Theatre</label>
                <select
                  value={showTheatreId}
                  onChange={(e) => setShowTheatreId(Number(e.target.value))}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {theatres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Date</label>
                <select
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  {SHOW_DATES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Time</label>
                <input
                  type="text"
                  value={showTime}
                  onChange={(e) => setShowTime(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Format</label>
                <select
                  value={showFormat}
                  onChange={(e) => setShowFormat(e.target.value as MovieFormat)}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                >
                  {(['2D', '3D', 'IMAX', '4DX'] as MovieFormat[]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Price Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  min={0.8}
                  max={2.0}
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(Number(e.target.value))}
                  className="w-full bg-[#060913] border border-white/15 rounded-xl px-2.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm"
            >
              Create Showtime ({shows.length} active shows)
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: BOOKINGS & PAYMENT RECORDS */}
      {tab === 'BOOKINGS' && (
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="font-display text-lg font-bold text-white">
              Customer Bookings & Payment Ledger
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#060913] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">Booking ID</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Movie & Theatre</th>
                  <th className="py-3 px-4 font-semibold">Seats</th>
                  <th className="py-3 px-4 font-semibold">Payment Ref</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(stats?.recentBookings ?? []).map((b) => (
                  <tr key={b.bookingReference} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#F5C518]">
                      {b.bookingReference}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      <span className="block font-medium">{b.userName}</span>
                      <span className="text-slate-400">{b.userEmail}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="block font-semibold text-white">{b.movieTitle}</span>
                      <span className="text-slate-400">
                        {b.theatreName} · {b.showDate} {b.showTime}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white">
                      {b.seatCodes.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {b.paymentId} ({b.paymentMode})
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white tabular-nums">
                      {formatINR(b.breakdown.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
