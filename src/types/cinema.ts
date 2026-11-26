export type UserRole = 'USER' | 'ADMIN';

export type SeatCategory = 'ROYAL_RECLINER' | 'BALCONY' | 'PRIME' | 'CLASSIC';

export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'LOCKED' | 'SELECTED';

export type MovieFormat = '2D' | '3D' | 'IMAX' | '4DX';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export type PaymentMode = 'DEMO' | 'RAZORPAY_TEST';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  authProvider?: 'LOCAL' | 'GOOGLE';
  avatarUrl?: string;
  preferredCity?: string;
  preferredLanguage?: string;
  emailNotifications?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateProfilePayload {
  name: string;
  phone: string;
  preferredCity: string;
  preferredLanguage: string;
  emailNotifications: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ProfileOverview {
  user: User;
  upcomingBookings: BookingRecord[];
  pastBookings: BookingRecord[];
  totalBookings: number;
  totalSpent: number;
}

export interface Movie {
  id: number;
  title: string;
  tagline: string;
  language: string;
  languagesAvailable: string[];
  genre: string;
  durationMinutes: number;
  rating: number;
  votesCount: string;
  certificate: string;
  releaseDate: string;
  director: string;
  cast: string[];
  description: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  featured: boolean;
  nowShowing: boolean;
  formats: MovieFormat[];
  accentColor: string;
}

export interface Theatre {
  id: number;
  name: string;
  city: string;
  address: string;
  amenities: string[];
}

export interface Show {
  id: number;
  movieId: number;
  theatreId: number;
  theatreName: string;
  theatreAddress: string;
  city: string;
  screenId: number;
  screenName: string;
  showDate: string;
  showTime: string;
  language: string;
  format: MovieFormat;
  priceMultiplier: number;
  totalSeats?: number;
  availableSeats?: number;
  auditoriumProfile?: string;
}

export interface Seat {
  id: number;
  screenId: number;
  seatCode: string;
  rowLabel: string;
  rowIndex: number;
  colNumber: number;
  category: SeatCategory;
  price: number;
  status: SeatStatus;
  pairGroup?: string | null;
  lockedByUserId?: number | null;
  lockExpiresAt?: number | null;
}

export type SnackCategory = 'POPCORN' | 'BEVERAGES' | 'NACHOS' | 'BURGERS' | 'SANDWICHES' | 'COMBOS';

export interface Snack {
  id: number;
  name: string;
  description: string;
  category: SnackCategory;
  price: number;
  imageUrl: string;
  calories: string;
  isCombo: boolean;
  veg: boolean;
}

export interface CartSnackItem {
  snack: Snack;
  quantity: number;
}

export interface BookingSummaryBreakdown {
  ticketSubtotal: number;
  snacksSubtotal: number;
  convenienceFee: number;
  gstAmount: number;
  grandTotal: number;
}

export interface BookingRecord {
  id: number;
  bookingReference: string;
  userId: number;
  userName: string;
  userEmail: string;
  showId: number;
  movieId: number;
  movieTitle: string;
  moviePosterUrl: string;
  theatreName: string;
  screenName: string;
  city: string;
  showDate: string;
  showTime: string;
  language: string;
  format: MovieFormat;
  seatCodes: string[];
  seatCategories: SeatCategory[];
  snacks: { name: string; quantity: number; unitPrice: number }[];
  breakdown: BookingSummaryBreakdown;
  paymentMode: PaymentMode;
  paymentId: string;
  status: BookingStatus;
  qrPayload: string;
  createdAt: string;
}

export interface AdminStats {
  totalBookings: number;
  totalRevenue: number;
  activeMovies: number;
  activeTheatres: number;
  ticketsSold: number;
  recentBookings: BookingRecord[];
}
