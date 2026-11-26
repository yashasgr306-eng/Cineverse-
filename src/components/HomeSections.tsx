import { ArrowRight, Calendar, Film, MapPin, Sparkles, Star, Ticket, Volume2 } from 'lucide-react';
import type { Movie, Theatre } from '../types/cinema';
import type { AppView } from './Navbar';
import { getTheatreCapacitySummary } from '../utils/screenLayout';

interface HomeSectionsProps {
  movies: Movie[];
  theatres: Theatre[];
  selectedCity: string;
  onSelectMovie: (movie: Movie) => void;
  onNavigate: (view: AppView) => void;
}

export function HomeSections({
  movies,
  theatres,
  selectedCity,
  onSelectMovie,
  onNavigate,
}: HomeSectionsProps) {
  const topMovies = movies.slice(0, 6);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Now Showing Section */}
      <section aria-labelledby="now-showing-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
              In Theatres Across {selectedCity === 'All Cities' ? 'India' : selectedCity}
            </p>
            <h2
              id="now-showing-heading"
              className="font-display text-2xl sm:text-3xl font-bold text-white mt-1"
            >
              Now Showing in 3D & IMAX
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('NOW_SHOWING')}
            className="text-sm font-medium text-[#F5C518] hover:text-[#FFD84D] flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Explore All Movies
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topMovies.map((movie) => (
            <article
              key={movie.id}
              className="group bg-[#0D1426] border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-1 hover:border-[#F5C518]/50"
            >
              <button
                type="button"
                onClick={() => onSelectMovie(movie)}
                className="relative aspect-[3/4] w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-[#F5C518]"
              >
                <img
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D1426] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                  <span className="flex items-center gap-1 font-mono font-semibold text-[#F5C518]">
                    <Star className="w-3.5 h-3.5 fill-[#F5C518]" />
                    <span className="tabular-nums">{movie.rating.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({movie.votesCount})</span>
                  </span>
                  <span className="text-slate-300 font-medium">{movie.certificate}</span>
                </div>
              </button>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{movie.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {movie.language} · {movie.genre} · {movie.durationMinutes} min
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formats: {movie.formats.join(' / ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectMovie(movie)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Book Tickets
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Flagship Theatres & Formats */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-6">
          <Film className="w-6 h-6 text-[#F5C518] mb-3" />
          <h3 className="font-display text-lg font-bold text-white">Interactive 3D Seat Preview</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Inspect auditorium acoustics, balcony sightlines, and royal recliners in real-time 3D before locking your seats.
          </p>
        </div>

        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-6">
          <Volume2 className="w-6 h-6 text-[#F5C518] mb-3" />
          <h3 className="font-display text-lg font-bold text-white">Dolby Atmos & Laser IMAX</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Available across {theatres.length} partner multiplexes featuring 4K dual-laser projection and gourmet concessions.
          </p>
        </div>

        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-6">
          <Sparkles className="w-6 h-6 text-[#F5C518] mb-3" />
          <h3 className="font-display text-lg font-bold text-white">Smart Best-2-Seats Engine</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Automatically finds optimal center-aisle adjacent seats while preserving paired Royal Recliner loungers.
          </p>
        </div>
      </section>

      {/* Featured Multiplexes Strip */}
      <section aria-labelledby="theatres-heading">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 id="theatres-heading" className="font-display text-2xl font-bold text-white">
              Partner Theatres
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Curated auditoriums in {selectedCity === 'All Cities' ? '8 metro regions' : selectedCity}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('THEATRES')}
            className="text-sm font-medium text-[#F5C518] hover:text-[#FFD84D] flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Find Nearby Theatres on Map
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {theatres.slice(0, 6).map((t) => {
            const cap = getTheatreCapacitySummary(t);
            return (
              <div
                key={t.id}
                className="bg-[#0D1426] border border-white/10 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-white">{t.name}</h3>
                    <span className="text-xs text-[#F5C518] font-medium shrink-0">{t.city}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    {t.address}
                  </p>
                  <p className="text-xs font-mono text-emerald-400 mt-2">{cap.auditoriumLabel}</p>
                </div>
                <p className="text-xs text-slate-500 pt-2 border-t border-white/10">
                  {t.amenities.join(' · ')}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface CategoryShowcaseProps {
  category: 'EVENTS' | 'PLAYS' | 'SPORTS';
  selectedCity: string;
  onBookFeaturedMovie: () => void;
}

export function CategoryShowcaseView({
  category,
  selectedCity,
  onBookFeaturedMovie,
}: CategoryShowcaseProps) {
  const catalog: Record<
    'EVENTS' | 'PLAYS' | 'SPORTS',
    { title: string; subtitle: string; items: { name: string; venue: string; date: string; price: string }[] }
  > = {
    EVENTS: {
      title: 'Live Cinema Concerts & Premieres',
      subtitle: `Music tours, director Q&As, and fan premieres in ${selectedCity === 'All Cities' ? 'India' : selectedCity}`,
      items: [
        { name: 'Anirudh Hukum World Tour Live', venue: 'YMCA Grounds, Chennai', date: '22 Nov · 07:00 PM', price: '₹1,499' },
        { name: 'IMAX Soundtrack Symphony Night', venue: 'CINEVERSE Grand IMAX', date: '24 Nov · 08:00 PM', price: '₹899' },
        { name: 'Ramayana IMAX 3D Special Screening & Q&A', venue: 'AMB Gold Screen, Hyderabad', date: '29 Nov · 06:30 PM', price: '₹1,199' },
      ],
    },
    PLAYS: {
      title: 'Theatre, Stage & Performing Arts',
      subtitle: 'Curated live dramatic performances and classical stage productions',
      items: [
        { name: 'The Golden Curtain: Stage Noir', venue: 'Ranga Shankara, Bengaluru', date: '20 Nov · 07:30 PM', price: '₹550' },
        { name: 'Ponniyin Selvan: Live Epic Play', venue: 'Music Academy, Chennai', date: '23 Nov · 06:00 PM', price: '₹750' },
        { name: 'Midnight Monologues at BKC', venue: 'NCPA Tata Theatre, Mumbai', date: '28 Nov · 08:00 PM', price: '₹650' },
      ],
    },
    SPORTS: {
      title: 'Live Stadium Screenings & Sports',
      subtitle: 'Watch championship matches on 70ft laser IMAX screens with stadium surround sound',
      items: [
        { name: 'India vs Australia — Test Screening in IMAX', venue: 'CINEVERSE Select Citywalk', date: '21 Nov · 09:30 AM', price: '₹450' },
        { name: 'ISL Super Derby Live Screening', venue: 'CINEVERSE Orion 4DX', date: '25 Nov · 07:30 PM', price: '₹399' },
        { name: 'Grand Prix Night Race Screening', venue: 'CINEVERSE Maison BKC', date: '30 Nov · 08:30 PM', price: '₹599' },
      ],
    },
  };

  const data = catalog[category];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">{category}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">{data.title}</h1>
        <p className="text-sm text-slate-400 mt-2">{data.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.items.map((item) => (
          <div
            key={item.name}
            className="bg-[#0D1426] border border-white/10 rounded-2xl p-6 flex flex-col justify-between gap-5"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-white">{item.name}</h2>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F5C518]" />
                {item.venue}
              </p>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {item.date}
              </p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="font-mono font-bold text-white tabular-nums">{item.price}</span>
              <button
                type="button"
                onClick={onBookFeaturedMovie}
                className="px-4 py-2 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold transition-colors"
              >
                Explore Showtimes
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
