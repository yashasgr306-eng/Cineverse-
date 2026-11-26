import type { MovieFormat, Seat, SeatCategory, Show, Theatre } from '../types/cinema';

export interface ScreenRowSpec {
  label: string;
  category: SeatCategory;
  cols: number;
  paired?: boolean;
}

export interface ScreenSeatProfile {
  profileKey: 'IMAX_GRAND' | 'FOUR_DX_MOTION' | 'LUXE_BOUTIQUE' | 'STANDARD_ATMOS';
  label: string;
  totalSeats: number;
  rows: ScreenRowSpec[];
}

export interface ShowAvailabilitySummary {
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  lockedSeats: number;
  profileLabel: string;
}

const IMAX_ROWS: ScreenRowSpec[] = [
  { label: 'A', category: 'CLASSIC', cols: 12 },
  { label: 'B', category: 'CLASSIC', cols: 12 },
  { label: 'C', category: 'PRIME', cols: 12 },
  { label: 'D', category: 'PRIME', cols: 12 },
  { label: 'E', category: 'PRIME', cols: 12 },
  { label: 'F', category: 'PRIME', cols: 12 },
  { label: 'G', category: 'BALCONY', cols: 12 },
  { label: 'H', category: 'BALCONY', cols: 12 },
  { label: 'J', category: 'BALCONY', cols: 12 },
  { label: 'R', category: 'ROYAL_RECLINER', cols: 6, paired: true },
];

const FOUR_DX_ROWS: ScreenRowSpec[] = [
  { label: 'A', category: 'CLASSIC', cols: 8 },
  { label: 'B', category: 'CLASSIC', cols: 8 },
  { label: 'C', category: 'PRIME', cols: 8 },
  { label: 'D', category: 'PRIME', cols: 8 },
  { label: 'E', category: 'PRIME', cols: 8 },
  { label: 'F', category: 'BALCONY', cols: 8 },
  { label: 'G', category: 'BALCONY', cols: 8 },
  { label: 'R', category: 'ROYAL_RECLINER', cols: 6, paired: true },
];

const LUXE_ROWS: ScreenRowSpec[] = [
  { label: 'A', category: 'CLASSIC', cols: 10 },
  { label: 'B', category: 'PRIME', cols: 10 },
  { label: 'C', category: 'PRIME', cols: 10 },
  { label: 'D', category: 'PRIME', cols: 10 },
  { label: 'E', category: 'BALCONY', cols: 8 },
  { label: 'F', category: 'BALCONY', cols: 8 },
  { label: 'R', category: 'ROYAL_RECLINER', cols: 8, paired: true },
];

const STANDARD_ATMOS_ROWS: ScreenRowSpec[] = [
  { label: 'A', category: 'CLASSIC', cols: 10 },
  { label: 'B', category: 'CLASSIC', cols: 10 },
  { label: 'C', category: 'PRIME', cols: 10 },
  { label: 'D', category: 'PRIME', cols: 10 },
  { label: 'E', category: 'PRIME', cols: 10 },
  { label: 'F', category: 'PRIME', cols: 10 },
  { label: 'G', category: 'BALCONY', cols: 10 },
  { label: 'H', category: 'BALCONY', cols: 10 },
  { label: 'R', category: 'ROYAL_RECLINER', cols: 8, paired: true },
];

function countRowsSeats(rows: ScreenRowSpec[]): number {
  return rows.reduce((sum, r) => sum + r.cols, 0);
}

/**
 * Resolves exact auditorium seating rows and capacity based on screen format, screen name, and venue tier.
 */
export function getScreenSeatProfile(opts?: {
  format?: MovieFormat | string;
  screenName?: string;
  theatreName?: string;
}): ScreenSeatProfile {
  const fmt = (opts?.format ?? '').toUpperCase();
  const screen = (opts?.screenName ?? '').toLowerCase();
  const theatre = (opts?.theatreName ?? '').toLowerCase();

  if (
    fmt === 'IMAX' ||
    screen.includes('imax') ||
    screen.includes('giant') ||
    theatre.includes('prasads')
  ) {
    return {
      profileKey: 'IMAX_GRAND',
      label: 'IMAX Grand Hall',
      totalSeats: countRowsSeats(IMAX_ROWS), // 114 seats
      rows: IMAX_ROWS,
    };
  }

  if (fmt === '4DX' || screen.includes('4dx')) {
    return {
      profileKey: 'FOUR_DX_MOTION',
      label: '4DX Motion Pod',
      totalSeats: countRowsSeats(FOUR_DX_ROWS), // 62 seats
      rows: FOUR_DX_ROWS,
    };
  }

  if (
    screen.includes('luxe') ||
    screen.includes('gold') ||
    screen.includes('director') ||
    theatre.includes('luxe') ||
    theatre.includes('director') ||
    theatre.includes('gold') ||
    theatre.includes('heritage')
  ) {
    return {
      profileKey: 'LUXE_BOUTIQUE',
      label: 'Luxe Boutique Hall',
      totalSeats: countRowsSeats(LUXE_ROWS), // 64 seats
      rows: LUXE_ROWS,
    };
  }

  return {
    profileKey: 'STANDARD_ATMOS',
    label: 'Dolby Atmos Hall',
    totalSeats: countRowsSeats(STANDARD_ATMOS_ROWS), // 88 seats
    rows: STANDARD_ATMOS_ROWS,
  };
}

/**
 * Computes the representative screen capacity range/label for a theatre venue.
 */
export function getTheatreCapacitySummary(theatre: Pick<Theatre, 'name' | 'amenities'>): {
  primaryCapacity: number;
  auditoriumLabel: string;
} {
  const joined = `${theatre.name} ${theatre.amenities.join(' ')}`.toLowerCase();
  if (joined.includes('imax') || joined.includes('72ft')) {
    return { primaryCapacity: 114, auditoriumLabel: '114-Seat IMAX Laser' };
  }
  if (joined.includes('4dx')) {
    return { primaryCapacity: 62, auditoriumLabel: '62-Seat 4DX Motion' };
  }
  if (joined.includes('luxe') || joined.includes('director') || joined.includes('gold') || joined.includes('heritage')) {
    return { primaryCapacity: 64, auditoriumLabel: '64-Seat Luxe Lounge' };
  }
  return { primaryCapacity: 88, auditoriumLabel: '88-Seat Dolby Atmos' };
}

export function summarizeSeatAvailability(
  seats: Seat[],
  show?: Pick<Show, 'format' | 'screenName' | 'theatreName'>
): ShowAvailabilitySummary {
  const profile = getScreenSeatProfile(show);
  let availableSeats = 0;
  let bookedSeats = 0;
  let lockedSeats = 0;

  for (const seat of seats) {
    if (seat.status === 'AVAILABLE') availableSeats++;
    else if (seat.status === 'BOOKED') bookedSeats++;
    else if (seat.status === 'LOCKED') lockedSeats++;
  }

  return {
    totalSeats: seats.length,
    availableSeats,
    bookedSeats,
    lockedSeats,
    profileLabel: profile.label,
  };
}
