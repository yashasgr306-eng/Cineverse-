import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket } from 'lucide-react';
import type { CartSnackItem, Movie, Seat, Show, Theatre, User } from './types/cinema';
import { cineverseApi } from './api/cineverseApi';
import { initGoogleAuthObserver } from './services/googleAuth';
import { Navbar, type AppView } from './components/Navbar';
import { HeroPanorama3D } from './components/three/HeroPanorama3D';
import { CategoryShowcaseView, HomeSections } from './components/HomeSections';
import { NowShowingView } from './components/NowShowingView';
import { MovieDetailsView } from './components/MovieDetailsView';
import { SeatSelectionView } from './components/SeatSelectionView';
import { SnacksView } from './components/SnacksView';
import { CheckoutView } from './components/CheckoutView';
import { MyTicketsView } from './components/MyTicketsView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { NearbyTheatresView } from './components/NearbyTheatresView';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('HOME');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');

  const [movies, setMovies] = useState<Movie[]>(() => cineverseApi.getInitialMovies());
  const [theatres, setTheatres] = useState<Theatre[]>(() => cineverseApi.getInitialTheatres());
  const [allTheatres, setAllTheatres] = useState<Theatre[]>(() => cineverseApi.getInitialTheatres());
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [movieShows, setMovieShows] = useState<Show[]>([]);
  const [activeShow, setActiveShow] = useState<Show | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [snackCart, setSnackCart] = useState<CartSnackItem[]>([]);

  const [user, setUser] = useState<User | null>(() => cineverseApi.getStoredAuth()?.user ?? null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    const unsubscribeGoogleAuth = initGoogleAuthObserver();
    return () => {
      window.removeEventListener('gmp-quota-exceeded', onQuota);
      unsubscribeGoogleAuth();
    };
  }, []);

  const loadCatalog = useCallback(async () => {
    const [movieList, theatreList, fullTheatres] = await Promise.all([
      cineverseApi.getMovies(),
      cineverseApi.getTheatres(selectedCity),
      cineverseApi.getTheatres('All Cities'),
    ]);
    setMovies(movieList);
    setTheatres(theatreList);
    setAllTheatres(fullTheatres);
  }, [selectedCity]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      if (selectedLanguage !== 'All') {
        const matchesLang =
          m.language.toLowerCase() === selectedLanguage.toLowerCase() ||
          m.languagesAvailable.some((l) => l.toLowerCase() === selectedLanguage.toLowerCase());
        if (!matchesLang) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hit =
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.cast.some((c) => c.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [movies, selectedLanguage, searchQuery]);

  const featuredMovies = useMemo(() => {
    const feat = movies.filter((m) => m.featured);
    return feat.length > 0 ? feat : movies.slice(0, 7);
  }, [movies]);

  const openMovieDetails = async (movie: Movie) => {
    setActiveMovie(movie);
    setSelectedSeats([]);
    setSnackCart([]);
    const shows = await cineverseApi.getShowsForMovie(movie.id);
    setMovieShows(shows);
    setCurrentView('MOVIE_DETAILS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectShow = (show: Show) => {
    setActiveShow(show);
    setSelectedSeats([]);
    setCurrentView('SEAT_SELECTION');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    cineverseApi.logout();
    setUser(null);
    if (currentView === 'ADMIN') setCurrentView('HOME');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-[#F4F6FB]">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentView === 'HOME' && (
          <>
            <HeroPanorama3D movies={featuredMovies} onSelectMovie={openMovieDetails} />
            <HomeSections
              movies={filteredMovies}
              theatres={theatres}
              selectedCity={selectedCity}
              onSelectMovie={openMovieDetails}
              onNavigate={handleNavigate}
            />
          </>
        )}

        {currentView === 'NOW_SHOWING' && (
          <NowShowingView
            movies={filteredMovies}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onSelectMovie={openMovieDetails}
          />
        )}

        {currentView === 'THEATRES' && (
          <NearbyTheatresView
            theatres={allTheatres}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onExploreMoviesInCity={(city) => {
              setSelectedCity(city);
              handleNavigate('NOW_SHOWING');
            }}
          />
        )}

        {(currentView === 'EVENTS' || currentView === 'PLAYS' || currentView === 'SPORTS') && (
          <CategoryShowcaseView
            category={currentView}
            selectedCity={selectedCity}
            onBookFeaturedMovie={() => handleNavigate('NOW_SHOWING')}
          />
        )}

        {currentView === 'MOVIE_DETAILS' && activeMovie && (
          <MovieDetailsView
            movie={activeMovie}
            shows={movieShows}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onBack={() => handleNavigate('HOME')}
            onSelectShow={handleSelectShow}
            onOpenNearbyTheatres={() => handleNavigate('THEATRES')}
          />
        )}

        {currentView === 'SEAT_SELECTION' && activeMovie && activeShow && (
          <SeatSelectionView
            movie={activeMovie}
            show={activeShow}
            user={user}
            onBack={() => handleNavigate('MOVIE_DETAILS')}
            onRequireAuth={() => setAuthModalOpen(true)}
            onConfirmSeats={(seats) => {
              setSelectedSeats(seats);
              handleNavigate('SNACKS');
            }}
          />
        )}

        {currentView === 'SNACKS' && activeMovie && activeShow && (
          <SnacksView
            selectedSeats={selectedSeats}
            cart={snackCart}
            onCartChange={setSnackCart}
            onBack={() => handleNavigate('SEAT_SELECTION')}
            onSkip={() => {
              setSnackCart([]);
              handleNavigate('CHECKOUT');
            }}
            onProceed={() => handleNavigate('CHECKOUT')}
          />
        )}

        {currentView === 'CHECKOUT' && activeMovie && activeShow && user && (
          <CheckoutView
            movie={activeMovie}
            show={activeShow}
            selectedSeats={selectedSeats}
            snacks={snackCart}
            user={user}
            onBack={() => handleNavigate('SNACKS')}
            onBookingConfirmed={() => {}}
            onViewMyTickets={() => handleNavigate('MY_TICKETS')}
          />
        )}

        {currentView === 'MY_TICKETS' && (
          <MyTicketsView
            user={user}
            onRequireAuth={() => setAuthModalOpen(true)}
            onExploreMovies={() => handleNavigate('NOW_SHOWING')}
          />
        )}

        {currentView === 'PROFILE' && (
          <ProfileView
            user={user}
            onUserUpdated={(updated) => setUser(updated)}
            onRequireAuth={() => setAuthModalOpen(true)}
            onExploreMovies={() => handleNavigate('NOW_SHOWING')}
          />
        )}

        {currentView === 'ADMIN' && (
          <AdminDashboardView
            user={user}
            movies={movies}
            theatres={theatres}
            onRefreshCatalog={loadCatalog}
          />
        )}
      </main>

      <footer className="border-t border-white/10 bg-[#050811] py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-[#F5C518] text-[#060913] flex items-center justify-center">
              <Ticket className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
            <span className="font-display font-bold text-white">CINEVERSE</span>
            <span>· Your Universe of Cinema</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('NOW_SHOWING')}
              className="hover:text-white transition-colors"
            >
              Now Showing
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('THEATRES')}
              className="hover:text-white transition-colors"
            >
              Nearby Theatres
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('MY_TICKETS')}
              className="hover:text-white transition-colors"
            >
              My Tickets
            </button>
            <span className="text-slate-500">IMAX · 4DX · Dolby Atmos</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(authedUser) => setUser(authedUser)}
      />
    </div>
  );
}
