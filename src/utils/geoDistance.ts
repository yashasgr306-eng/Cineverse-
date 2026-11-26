export interface GeoCoords {
  lat: number;
  lng: number;
}

export const MAX_PLACES_SEARCH_RADIUS_METERS = 50000;

/**
 * Clamps requested search radius between 500m and Google Places API's 50,000m ceiling.
 */
export function clampSearchRadiusMeters(radiusMeters: number): number {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) return 5000;
  return Math.min(Math.max(Math.round(radiusMeters), 500), MAX_PLACES_SEARCH_RADIUS_METERS);
}

/**
 * Computes straight-line distance in meters between two WGS84 coordinates.
 */
export function haversineDistanceMeters(a: GeoCoords, b: GeoCoords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistanceKm(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return 'Nearby';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

export function sortByDistanceAsc<T extends { distanceMeters: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
    const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

export function isQuotaErrorMessage(err: unknown): boolean {
  const text =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === 'string'
        ? err
        : JSON.stringify(err ?? '');
  return (
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError') ||
    text.includes('429')
  );
}
