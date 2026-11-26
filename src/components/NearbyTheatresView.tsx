import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  ExternalLink,
  Film,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Star,
  Ticket,
} from 'lucide-react';
import type { Theatre } from '../types/cinema';
import { CITIES } from '../data/seedCatalog';
import { getTheatreCapacitySummary } from '../utils/screenLayout';
import {
  type GeoCoords,
  clampSearchRadiusMeters,
  formatDistanceKm,
  haversineDistanceMeters,
  isQuotaErrorMessage,
  sortByDistanceAsc,
} from '../utils/geoDistance';

interface NearbyTheatresViewProps {
  theatres: Theatre[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  onExploreMoviesInCity: (city: string) => void;
}

interface NearbyCinemaPlace {
  id: string;
  name: string;
  address: string;
  location: GeoCoords;
  rating: number | null;
  ratingCount: number | null;
  businessStatus: string | null;
  googleMapsUri: string | null;
  distanceMeters: number | null;
}

// Standard metro viewport centers used purely to pan the Google Map when user picks a city
const CITY_VIEWPORT_CENTERS: Record<string, GeoCoords> = {
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
  'Delhi NCR': { lat: 28.6139, lng: 77.209 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Kochi: { lat: 9.9312, lng: 76.2673 },
  Kolkata: { lat: 22.5726, lng: 88.3639 },
};

const RADIUS_OPTIONS = [
  { label: '5 km', meters: 5000 },
  { label: '10 km', meters: 10000 },
  { label: '25 km', meters: 25000 },
  { label: '50 km', meters: 50000 },
];

interface MarkerItemProps {
  place: NearbyCinemaPlace;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onCloseInfo: () => void;
}

function NearbyCinemaMarker({ place, isSelected, onSelect, onCloseInfo }: MarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.name}
        onClick={() => onSelect(place.id)}
      >
        <Pin
          background={isSelected ? '#FFFFFF' : '#F5C518'}
          borderColor="#060913"
          glyphColor="#060913"
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo}>
          <div className="max-w-[240px] p-1 text-slate-900 space-y-1.5">
            <h3 className="font-bold text-sm leading-snug text-slate-950">{place.name}</h3>
            {place.address && <p className="text-xs text-slate-700">{place.address}</p>}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
              {place.rating !== null && (
                <span>
                  ★ {place.rating.toFixed(1)}
                  {place.ratingCount ? ` (${place.ratingCount})` : ''}
                </span>
              )}
              <span>· {formatDistanceKm(place.distanceMeters)}</span>
            </div>
            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline pt-0.5"
              >
                Open in Google Maps
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface InteractiveMapPanelProps {
  center: GeoCoords;
  userLocation: GeoCoords | null;
  radiusMeters: number;
  textQuery: string;
  searchTrigger: number;
  selectedPlaceId: string | null;
  onSelectPlace: (id: string | null) => void;
  onResultsLoaded: (places: NearbyCinemaPlace[]) => void;
  onSearchStateChange: (loading: boolean, error: string | null) => void;
}

interface GooglePlaceLike {
  id?: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: { lat: number | (() => number); lng: number | (() => number) } | null;
  rating?: number | null;
  userRatingCount?: number | null;
  businessStatus?: string | null;
  googleMapsURI?: string | null;
}

function InteractiveNearbyMap({
  center,
  userLocation,
  radiusMeters,
  textQuery,
  searchTrigger,
  selectedPlaceId,
  onSelectPlace,
  onResultsLoaded,
  onSearchStateChange,
}: InteractiveMapPanelProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');

  const lastCenterRef = useRef<string>('');
  const placesRef = useRef<NearbyCinemaPlace[]>([]);
  const [renderedPlaces, setRenderedPlaces] = useState<NearbyCinemaPlace[]>([]);

  const toNearbyCinema = useCallback(
    (place: GooglePlaceLike, origin: GeoCoords): NearbyCinemaPlace | null => {
      if (!place.location) return null;
      const lat =
        typeof place.location.lat === 'function' ? place.location.lat() : Number(place.location.lat);
      const lng =
        typeof place.location.lng === 'function' ? place.location.lng() : Number(place.location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const coords = { lat, lng };
      return {
        id: place.id || `${lat}-${lng}`,
        name: place.displayName || 'Movie Theatre',
        address: place.formattedAddress || '',
        location: coords,
        rating: typeof place.rating === 'number' ? place.rating : null,
        ratingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
        businessStatus: place.businessStatus ?? null,
        googleMapsUri: place.googleMapsURI ?? null,
        distanceMeters: haversineDistanceMeters(origin, coords),
      };
    },
    []
  );

  const runNearbySearch = useCallback(
    async (searchCenter: GeoCoords, searchRadius: number, queryOverride?: string) => {
      if (!placesLib) return;
      onSearchStateChange(true, null);

      const safeRadius = clampSearchRadiusMeters(searchRadius);
      const origin = userLocation ?? searchCenter;

      try {
        const fields = [
          'displayName',
          'location',
          'formattedAddress',
          'rating',
          'userRatingCount',
          'businessStatus',
          'googleMapsURI',
        ];

        let foundPlaces: GooglePlaceLike[] = [];

        if (queryOverride && queryOverride.trim()) {
          const response = (await placesLib.Place.searchByText({
            textQuery: `${queryOverride.trim()} movie theater cinema`,
            fields,
            locationBias: {
              center: searchCenter,
              radius: safeRadius,
            },
            includedType: 'movie_theater',
            maxResultCount: 15,
            language: 'en',
            region: 'IN',
          })) as unknown as { places?: GooglePlaceLike[] };
          foundPlaces = response?.places ?? [];
        } else {
          const response = (await placesLib.Place.searchNearby({
            fields,
            locationRestriction: {
              center: searchCenter,
              radius: safeRadius,
            },
            includedPrimaryTypes: ['movie_theater'],
            maxResultCount: 15,
            language: 'en',
            region: 'IN',
          })) as unknown as { places?: GooglePlaceLike[] };
          foundPlaces = response?.places ?? [];
        }

        const mapped = sortByDistanceAsc(
          foundPlaces
            .map((p) => toNearbyCinema(p, origin))
            .filter((p): p is NearbyCinemaPlace => p !== null)
        );

        placesRef.current = mapped;
        setRenderedPlaces(mapped);
        onResultsLoaded(mapped);

        if (map && coreLib && mapped.length > 0) {
          const bounds = new coreLib.LatLngBounds();
          mapped.forEach((p) => bounds.extend(p.location));
          if (userLocation) bounds.extend(userLocation);
          map.fitBounds(bounds, 56);
        }
        onSearchStateChange(false, null);
      } catch (err) {
        if (isQuotaErrorMessage(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onSearchStateChange(
          false,
          'Unable to fetch nearby cinemas right now. Browse CINEVERSE partner theatres below.'
        );
      }
    },
    [placesLib, coreLib, map, userLocation, toNearbyCinema, onResultsLoaded, onSearchStateChange]
  );

  // Pan map when selected center changes and trigger fresh nearby search
  useEffect(() => {
    const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)},${radiusMeters},${textQuery},${searchTrigger}`;
    if (!placesLib || lastCenterRef.current === key) return;
    lastCenterRef.current = key;

    if (map) {
      map.panTo(center);
      map.setZoom(radiusMeters <= 5000 ? 13 : radiusMeters <= 15000 ? 12 : 11);
    }
    void runNearbySearch(center, radiusMeters, textQuery);
  }, [center, radiusMeters, textQuery, searchTrigger, placesLib, map, runNearbySearch]);

  const handleSearchCurrentMapBounds = () => {
    if (!map || !geometryLib) {
      void runNearbySearch(center, radiusMeters, textQuery);
      return;
    }
    const bounds = map.getBounds();
    const mapCenter = map.getCenter();
    if (!bounds || !mapCenter) {
      void runNearbySearch(center, radiusMeters, textQuery);
      return;
    }
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const diameter = geometryLib.spherical.computeDistanceBetween(ne, sw);
    const dynamicRadius = clampSearchRadiusMeters(diameter / 2);
    void runNearbySearch(
      { lat: mapCenter.lat(), lng: mapCenter.lng() },
      dynamicRadius,
      textQuery
    );
  };

  return (
    <div className="relative w-full h-[440px] lg:h-[520px] rounded-2xl overflow-hidden border border-white/10 bg-[#080D1B]">
      <GoogleMap
        defaultCenter={center}
        defaultZoom={12}
        mapId="DEMO_MAP_ID"
        colorScheme="DARK"
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        {userLocation && (
          <AdvancedMarker position={userLocation} title="Your Location">
            <Pin background="#38BDF8" borderColor="#060913" glyphColor="#060913" />
          </AdvancedMarker>
        )}

        {renderedPlaces.map((place) => (
          <NearbyCinemaMarker
            key={place.id}
            place={place}
            isSelected={selectedPlaceId === place.id}
            onSelect={(id) => onSelectPlace(id)}
            onCloseInfo={() => onSelectPlace(null)}
          />
        ))}
      </GoogleMap>

      <div className="absolute top-3 left-3 z-10">
        <button
          type="button"
          onClick={handleSearchCurrentMapBounds}
          className="px-3.5 py-2 rounded-xl bg-[#0B1020]/95 border border-white/20 hover:border-[#F5C518] text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg transition-colors"
        >
          <Compass className="w-3.5 h-3.5 text-[#F5C518]" />
          Search This Map Area
        </button>
      </div>
    </div>
  );
}

export function NearbyTheatresView({
  theatres,
  selectedCity,
  onCityChange,
  onExploreMoviesInCity,
}: NearbyTheatresViewProps) {
  const mapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

  const activeCityKey =
    selectedCity !== 'All Cities' && CITY_VIEWPORT_CENTERS[selectedCity] ? selectedCity : 'Chennai';

  const [mapCenter, setMapCenter] = useState<GeoCoords>(CITY_VIEWPORT_CENTERS[activeCityKey]);
  const [userLocation, setUserLocation] = useState<GeoCoords | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(10000);
  const [searchInput, setSearchInput] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [searchTrigger, setSearchTrigger] = useState<number>(0);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyCinemaPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searching, setSearching] = useState<boolean>(false);
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCity !== 'All Cities' && CITY_VIEWPORT_CENTERS[selectedCity]) {
      setMapCenter(CITY_VIEWPORT_CENTERS[selectedCity]);
      setSubmittedQuery('');
      setSearchInput('');
    }
  }, [selectedCity]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setMapError('Browser geolocation is unavailable. Select a city or search by neighborhood below.');
      return;
    }
    setGeoLoading(true);
    setMapError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        setMapCenter(coords);
        setSubmittedQuery('');
        setSearchTrigger((v) => v + 1);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setMapError('Location permission denied. Choose a city preset or enter an area name to search nearby cinemas.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchInput.trim());
    setSearchTrigger((v) => v + 1);
  };

  const filteredPartnerTheatres = useMemo(() => {
    if (selectedCity === 'All Cities') return theatres;
    return theatres.filter((t) => t.city === selectedCity);
  }, [theatres, selectedCity]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
            18 Partner Multiplexes · Live Nearby Cinema Finder
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mt-1">
            Theatres &amp; Nearby Cinemas
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Discover movie theatres near your current location or explore CINEVERSE partner auditoriums across 8 major cities with screen-accurate seating.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="px-4 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Use My Location
          </button>

          <select
            aria-label="Filter by radius"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(clampSearchRadiusMeters(Number(e.target.value)))}
            className="bg-[#0D1426] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-white focus:outline-none focus:border-[#F5C518]"
          >
            {RADIUS_OPTIONS.map((opt) => (
              <option key={opt.meters} value={opt.meters}>
                Radius: {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City Focus Presets & Area Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCityChange('All Cities')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              selectedCity === 'All Cities'
                ? 'bg-[#F5C518] text-[#060913]'
                : 'bg-[#0D1426] border border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            All Cities ({theatres.length})
          </button>
          {CITIES.map((city) => {
            const active = selectedCity === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => {
                  onCityChange(city);
                  if (CITY_VIEWPORT_CENTERS[city]) {
                    setMapCenter(CITY_VIEWPORT_CENTERS[city]);
                    setSubmittedQuery('');
                    setSearchTrigger((v) => v + 1);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'bg-[#0D1426] border border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                {city}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search cinemas near an area, mall, or landmark (e.g. Indiranagar, Bandra, Velachery)..."
              aria-label="Search nearby cinemas by landmark or area"
              className="w-full bg-[#0D1426] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C518]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-[#1E293B] border border-white/15 hover:border-[#F5C518] text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0"
          >
            Find Nearby Cinemas
          </button>
        </form>
      </div>

      {/* Live Map + Nearby Cinemas Split Grid */}
      <section aria-label="Interactive nearby movie theatres map" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          {mapsApiKey ? (
            <APIProvider
              apiKey={mapsApiKey}
              libraries={['places', 'marker', 'geometry', 'core']}
              language="en"
              region="IN"
            >
              <InteractiveNearbyMap
                center={mapCenter}
                userLocation={userLocation}
                radiusMeters={radiusMeters}
                textQuery={submittedQuery}
                searchTrigger={searchTrigger}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={setSelectedPlaceId}
                onResultsLoaded={setNearbyPlaces}
                onSearchStateChange={(isLoading, err) => {
                  setSearching(isLoading);
                  setMapError(err);
                }}
              />
            </APIProvider>
          ) : (
            <div className="w-full h-[440px] lg:h-[520px] rounded-2xl border border-white/10 bg-[#0D1426] flex flex-col items-center justify-center p-8 text-center space-y-3">
              <MapPin className="w-10 h-10 text-[#F5C518]" />
              <h2 className="font-display text-lg font-bold text-white">
                Interactive Map Waiting for API Key
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Google Maps nearby discovery activates automatically when <code className="text-[#F5C518]">VITE_GOOGLE_MAPS_API_KEY</code> is configured. All 18 CINEVERSE partner multiplexes remain available below.
              </p>
            </div>
          )}

          {mapError && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs text-amber-200">
              {mapError}
            </div>
          )}
        </div>

        {/* Live Google Places Results Panel */}
        <div className="lg:col-span-5 bg-[#0D1426] border border-white/10 rounded-2xl p-5 space-y-4 lg:max-h-[520px] lg:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Nearby Movie Theatres
              </h2>
              <p className="text-xs text-slate-400">
                {submittedQuery
                  ? `Showing results for "${submittedQuery}"`
                  : `Within ${Math.round(clampSearchRadiusMeters(radiusMeters) / 1000)} km of ${
                      userLocation ? 'your location' : activeCityKey
                    }`}
              </p>
            </div>
            {searching && <Loader2 className="w-4 h-4 text-[#F5C518] animate-spin" />}
          </div>

          {nearbyPlaces.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Film className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-medium text-slate-300">
                {searching
                  ? 'Scanning nearby cinemas...'
                  : 'Pan the map, pick a city, or search an area to discover nearby cinemas.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyPlaces.map((place) => {
                const selected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id}
                    className={`rounded-xl p-4 border transition-colors ${
                      selected
                        ? 'bg-[#111827] border-[#F5C518]'
                        : 'bg-[#060913] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPlaceId(place.id)}
                      className="w-full text-left space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-bold text-white leading-snug">
                          {place.name}
                        </h3>
                        <span className="font-mono text-[11px] font-semibold text-[#F5C518] shrink-0">
                          {formatDistanceKm(place.distanceMeters)}
                        </span>
                      </div>

                      {place.address && (
                        <p className="text-xs text-slate-400 leading-relaxed">{place.address}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pt-1">
                        {place.rating !== null && (
                          <span className="inline-flex items-center gap-1 font-mono text-[#F5C518]">
                            <Star className="w-3 h-3 fill-[#F5C518]" />
                            {place.rating.toFixed(1)}
                            {place.ratingCount ? ` (${place.ratingCount})` : ''}
                          </span>
                        )}
                        {place.businessStatus === 'OPERATIONAL' && (
                          <span className="text-emerald-400 font-medium">Open / Operational</span>
                        )}
                      </div>
                    </button>

                    {place.googleMapsUri && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                        <a
                          href={place.googleMapsUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-[#F5C518]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Directions on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CINEVERSE Partner Multiplexes Grid */}
      <section aria-labelledby="partner-multiplexes-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 id="partner-multiplexes-heading" className="font-display text-2xl font-bold text-white">
              CINEVERSE Partner Multiplexes ({filteredPartnerTheatres.length})
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Screen-accurate 3D seating capacities matched to each theatre’s projection format
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartnerTheatres.map((t) => {
            const cap = getTheatreCapacitySummary(t);
            return (
              <div
                key={t.id}
                className="bg-[#0D1426] border border-white/10 hover:border-[#F5C518]/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-white leading-snug">
                      {t.name}
                    </h3>
                    <span className="text-xs font-semibold text-[#F5C518] shrink-0">{t.city}</span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    {t.address}
                  </p>
                  <p className="text-xs font-mono text-emerald-400">{cap.auditoriumLabel}</p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate">
                    {t.amenities.slice(0, 3).join(' · ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => onExploreMoviesInCity(t.city)}
                    className="px-3 py-1.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    Book
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
