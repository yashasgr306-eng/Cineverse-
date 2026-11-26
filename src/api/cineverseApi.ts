import type {
  AdminStats,
  AuthResponse,
  BookingRecord,
  CartSnackItem,
  ChangePasswordPayload,
  Movie,
  PaymentMode,
  ProfileOverview,
  Seat,
  Show,
  Snack,
  Theatre,
  UpdateProfilePayload,
  User,
} from '../types/cinema';
import {
  SEED_INITIAL_BOOKINGS,
  SEED_MOVIES,
  SEED_SNACKS,
  SEED_THEATRES,
  buildShowSeatLayout,
  generateSeedShows,
} from '../data/seedCatalog';
import { calculateBookingBreakdown } from '../utils/cinemaPricing';
import { recommendBestSeats, resolveEffectiveSeatStatus } from '../utils/seatAlgorithm';

import { getScreenSeatProfile, summarizeSeatAvailability } from '../utils/screenLayout';
import { signOutGoogle } from '../services/googleAuth';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:8080/api';

const STORAGE_KEYS = {
  AUTH: 'cineverse_auth_v1',
  MOVIES: 'cineverse_movies_v2',
  THEATRES: 'cineverse_theatres_v2',
  SHOWS: 'cineverse_shows_v4',
  BOOKINGS: 'cineverse_bookings_v1',
  SHOW_SEATS_PREFIX: 'cineverse_seats_v3_',
  USERS: 'cineverse_users_v1',
};

let backendMode: 'checking' | 'spring-boot' | 'preview-mirror' = 'checking';

export function getBackendConnectionMode() {
  return backendMode;
}

interface StoredUser extends User {
  passwordHash: string;
}

const DEFAULT_USERS: StoredUser[] = [
  {
    id: 1,
    name: 'Aarav Menon',
    email: 'user@cineverse.in',
    phone: '+91 98401 11223',
    role: 'USER',
    preferredCity: 'Chennai',
    preferredLanguage: 'Tamil',
    emailNotifications: true,
    createdAt: '2026-10-01T09:00:00Z',
    passwordHash: 'cinema123',
  },
  {
    id: 2,
    name: 'Vikramaditya Rao (Admin)',
    email: 'admin@cineverse.in',
    phone: '+91 99000 77889',
    role: 'ADMIN',
    preferredCity: 'Bengaluru',
    preferredLanguage: 'Tamil',
    emailNotifications: true,
    createdAt: '2026-09-15T09:00:00Z',
    passwordHash: 'admin123',
  },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function ensureLocalSeedInitialized() {
  if (!localStorage.getItem(STORAGE_KEYS.MOVIES)) {
    writeJson(STORAGE_KEYS.MOVIES, SEED_MOVIES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.THEATRES)) {
    writeJson(STORAGE_KEYS.THEATRES, SEED_THEATRES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SHOWS)) {
    writeJson(STORAGE_KEYS.SHOWS, generateSeedShows());
  }
  if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
    writeJson(STORAGE_KEYS.BOOKINGS, SEED_INITIAL_BOOKINGS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    writeJson(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }
}

async function trySpringBootFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status?: number; message?: string; networkError?: boolean }> {
  if (backendMode === 'preview-mirror') {
    return { ok: false, networkError: true };
  }

  const auth = readJson<AuthResponse | null>(STORAGE_KEYS.AUTH, null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 550);
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    window.clearTimeout(timer);

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    if (!isJson && res.status !== 204) {
      backendMode = 'preview-mirror';
      return { ok: false, networkError: true };
    }

    backendMode = 'spring-boot';
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, message: errBody.message || `HTTP ${res.status}` };
    }
    if (res.status === 204) {
      return { ok: true, data: undefined as unknown as T };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    backendMode = 'preview-mirror';
    return { ok: false, networkError: true };
  }
}

export const cineverseApi = {
  getInitialMovies(): Movie[] {
    ensureLocalSeedInitialized();
    return readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
  },

  getInitialTheatres(city?: string): Theatre[] {
    ensureLocalSeedInitialized();
    const theatres = readJson<Theatre[]>(STORAGE_KEYS.THEATRES, SEED_THEATRES);
    return city && city !== 'All Cities' ? theatres.filter((t) => t.city === city) : theatres;
  },

  getStoredAuth(): AuthResponse | null {
    return readJson<AuthResponse | null>(STORAGE_KEYS.AUTH, null);
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    void signOutGoogle();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const remote = await trySpringBootFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (remote.ok) {
      writeJson(STORAGE_KEYS.AUTH, remote.data);
      return remote.data;
    }
    if (!remote.networkError) {
      throw new Error(remote.message || 'Invalid credentials');
    }

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const found = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.passwordHash === password
    );
    if (!found) {
      throw new Error('Invalid email or password. Try user@cineverse.in / cinema123 or admin@cineverse.in / admin123');
    }
    const auth: AuthResponse = {
      token: `cv-jwt-${found.role.toLowerCase()}-${found.id}-${Date.now()}`,
      user: {
        id: found.id,
        name: found.name,
        email: found.email,
        phone: found.phone,
        role: found.role,
        preferredCity: found.preferredCity ?? 'Chennai',
        preferredLanguage: found.preferredLanguage ?? 'Tamil',
        emailNotifications: found.emailNotifications ?? true,
        createdAt: found.createdAt ?? '2026-10-01T09:00:00Z',
      },
    };
    writeJson(STORAGE_KEYS.AUTH, auth);
    return auth;
  },

  async register(name: string, email: string, phone: string, password: string): Promise<AuthResponse> {
    const remote = await trySpringBootFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    });
    if (remote.ok) {
      writeJson(STORAGE_KEYS.AUTH, remote.data);
      return remote.data;
    }
    if (!remote.networkError) {
      throw new Error(remote.message || 'Registration failed');
    }

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser: StoredUser = {
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'USER',
      preferredCity: 'Chennai',
      preferredLanguage: 'Tamil',
      emailNotifications: true,
      createdAt: new Date().toISOString(),
      passwordHash: password,
    };
    writeJson(STORAGE_KEYS.USERS, [...users, newUser]);
    const auth: AuthResponse = {
      token: `cv-jwt-user-${newUser.id}`,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        preferredCity: newUser.preferredCity,
        preferredLanguage: newUser.preferredLanguage,
        emailNotifications: newUser.emailNotifications,
        createdAt: newUser.createdAt,
      },
    };
    writeJson(STORAGE_KEYS.AUTH, auth);
    return auth;
  },

  async loginWithGoogle(payload: {
    idToken: string;
    accessToken?: string | null;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> {
    const remote = await trySpringBootFetch<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        idToken: payload.idToken,
        accessToken: payload.accessToken || undefined,
      }),
    });
    if (remote.ok) {
      writeJson(STORAGE_KEYS.AUTH, remote.data);
      return remote.data;
    }
    if (!remote.networkError) {
      throw new Error(remote.message || 'Google authentication failed.');
    }

    // Verify Google profile via Google UserInfo endpoint if access token is available in memory
    let resolvedName = payload.name.trim();
    let resolvedEmail = payload.email.trim().toLowerCase();
    let resolvedAvatar = payload.avatarUrl;

    if (payload.accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${payload.accessToken}` },
        });
        if (res.ok) {
          const info = (await res.json()) as {
            email?: string;
            name?: string;
            picture?: string;
          };
          if (info.email) resolvedEmail = info.email.trim().toLowerCase();
          if (info.name) resolvedName = info.name.trim();
          if (info.picture) resolvedAvatar = info.picture;
        }
      } catch {
        // Fallback to verified Firebase Auth user attributes
      }
    }

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === resolvedEmail);

    let targetUser: StoredUser;
    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      targetUser = {
        ...existing,
        name: existing.name || resolvedName,
        authProvider: 'GOOGLE',
        avatarUrl: resolvedAvatar ?? existing.avatarUrl,
      };
      const updatedUsers = [...users];
      updatedUsers[existingIndex] = targetUser;
      writeJson(STORAGE_KEYS.USERS, updatedUsers);
    } else {
      targetUser = {
        id: Date.now(),
        name: resolvedName || 'CINEVERSE Guest',
        email: resolvedEmail,
        phone: '',
        role: 'USER',
        authProvider: 'GOOGLE',
        avatarUrl: resolvedAvatar,
        preferredCity: 'Chennai',
        preferredLanguage: 'Tamil',
        emailNotifications: true,
        createdAt: new Date().toISOString(),
        passwordHash: '',
      };
      writeJson(STORAGE_KEYS.USERS, [...users, targetUser]);
    }

    const auth: AuthResponse = {
      token: `cv-jwt-google-${targetUser.id}-${Date.now()}`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        authProvider: 'GOOGLE',
        avatarUrl: targetUser.avatarUrl,
        preferredCity: targetUser.preferredCity ?? 'Chennai',
        preferredLanguage: targetUser.preferredLanguage ?? 'Tamil',
        emailNotifications: targetUser.emailNotifications ?? true,
        createdAt: targetUser.createdAt ?? new Date().toISOString(),
      },
    };
    writeJson(STORAGE_KEYS.AUTH, auth);
    return auth;
  },

  async getProfile(userId: number): Promise<ProfileOverview> {
    const remote = await trySpringBootFetch<ProfileOverview>('/profile');
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const storedAuth = this.getStoredAuth();
    const matched = users.find((u) => u.id === userId);
    const user: User = matched
      ? {
          id: matched.id,
          name: matched.name,
          email: matched.email,
          phone: matched.phone,
          role: matched.role,
          authProvider: matched.authProvider ?? 'LOCAL',
          avatarUrl: matched.avatarUrl,
          preferredCity: matched.preferredCity ?? 'Chennai',
          preferredLanguage: matched.preferredLanguage ?? 'Tamil',
          emailNotifications: matched.emailNotifications ?? true,
          createdAt: matched.createdAt ?? '2026-10-01T09:00:00Z',
        }
      : storedAuth?.user ?? {
          id: userId,
          name: 'CINEVERSE Guest',
          email: 'user@cineverse.in',
          phone: '+91 98401 11223',
          role: 'USER',
          authProvider: 'LOCAL',
          preferredCity: 'Chennai',
          preferredLanguage: 'Tamil',
          emailNotifications: true,
          createdAt: '2026-10-01T09:00:00Z',
        };

    const allBookings = await this.getMyBookings(userId);
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingBookings = allBookings.filter((b) => b.showDate >= todayStr);
    const pastBookings = allBookings.filter((b) => b.showDate < todayStr);
    const totalSpent = allBookings.reduce((sum, b) => sum + b.breakdown.grandTotal, 0);

    return {
      user,
      upcomingBookings,
      pastBookings,
      totalBookings: allBookings.length,
      totalSpent,
    };
  },

  async updateProfile(userId: number, payload: UpdateProfilePayload): Promise<User> {
    const remote = await trySpringBootFetch<User>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (remote.ok) {
      const auth = this.getStoredAuth();
      if (auth) {
        writeJson(STORAGE_KEYS.AUTH, { ...auth, user: remote.data });
      }
      return remote.data;
    }
    if (!remote.networkError) {
      throw new Error(remote.message || 'Unable to update profile.');
    }

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    let updatedUser: User | null = null;
    const nextUsers = users.map((u) => {
      if (u.id !== userId) return u;
      const merged: StoredUser = {
        ...u,
        name: payload.name.trim(),
        phone: payload.phone.trim(),
        preferredCity: payload.preferredCity,
        preferredLanguage: payload.preferredLanguage,
        emailNotifications: payload.emailNotifications,
      };
      updatedUser = {
        id: merged.id,
        name: merged.name,
        email: merged.email,
        phone: merged.phone,
        role: merged.role,
        authProvider: merged.authProvider ?? 'LOCAL',
        avatarUrl: merged.avatarUrl,
        preferredCity: merged.preferredCity,
        preferredLanguage: merged.preferredLanguage,
        emailNotifications: merged.emailNotifications,
        createdAt: merged.createdAt,
      };
      return merged;
    });
    writeJson(STORAGE_KEYS.USERS, nextUsers);

    const auth = this.getStoredAuth();
    if (auth && updatedUser) {
      writeJson(STORAGE_KEYS.AUTH, { ...auth, user: updatedUser });
    }
    if (!updatedUser) {
      throw new Error('User profile not found.');
    }
    return updatedUser;
  },

  async changePassword(userId: number, payload: ChangePasswordPayload): Promise<string> {
    const remote = await trySpringBootFetch<{ message: string }>('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (remote.ok) return remote.data.message || 'Password updated successfully.';
    if (!remote.networkError) {
      throw new Error(remote.message || 'Unable to update password.');
    }

    ensureLocalSeedInitialized();
    const users = readJson<StoredUser[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('User account not found.');
    if (target.authProvider === 'GOOGLE' && !target.passwordHash) {
      throw new Error('This account uses Google Sign-In. Manage your password through your Google Account.');
    }
    if (target.passwordHash !== payload.currentPassword) {
      throw new Error('Current password is incorrect.');
    }
    if (payload.newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }
    if (payload.newPassword === payload.currentPassword) {
      throw new Error('New password must be different from your current password.');
    }

    const nextUsers = users.map((u) =>
      u.id === userId ? { ...u, passwordHash: payload.newPassword } : u
    );
    writeJson(STORAGE_KEYS.USERS, nextUsers);
    return 'Password updated successfully.';
  },

  async getMovies(query?: string, language?: string): Promise<Movie[]> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (language && language !== 'All') params.set('language', language);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const remote = await trySpringBootFetch<Movie[]>(`/movies${qs}`);
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    let movies = readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
    if (language && language !== 'All') {
      movies = movies.filter(
        (m) =>
          m.language.toLowerCase() === language.toLowerCase() ||
          m.languagesAvailable.some((l) => l.toLowerCase() === language.toLowerCase())
      );
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      movies = movies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.cast.some((c) => c.toLowerCase().includes(q))
      );
    }
    return movies;
  },

  async getMovieById(id: number): Promise<Movie | null> {
    const remote = await trySpringBootFetch<Movie>(`/movies/${id}`);
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const movies = readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
    return movies.find((m) => m.id === id) ?? null;
  },

  async getTheatres(city?: string): Promise<Theatre[]> {
    const qs = city ? `?city=${encodeURIComponent(city)}` : '';
    const remote = await trySpringBootFetch<Theatre[]>(`/theatres${qs}`);
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const theatres = readJson<Theatre[]>(STORAGE_KEYS.THEATRES, SEED_THEATRES);
    return city && city !== 'All Cities' ? theatres.filter((t) => t.city === city) : theatres;
  },

  enrichShowWithSeatAvailability(show: Show): Show {
    const key = `${STORAGE_KEYS.SHOW_SEATS_PREFIX}${show.id}`;
    const saved = readJson<Seat[] | null>(key, null);
    const now = Date.now();
    const auth = this.getStoredAuth();
    const profile = getScreenSeatProfile({
      format: show.format,
      screenName: show.screenName,
      theatreName: show.theatreName,
    });
    const seats = (saved ?? buildShowSeatLayout(show.id, show.priceMultiplier, show)).map((seat) => ({
      ...seat,
      status: resolveEffectiveSeatStatus(seat, now, auth?.user.id),
    }));
    const summary = summarizeSeatAvailability(seats, show);
    return {
      ...show,
      totalSeats: summary.totalSeats,
      availableSeats: summary.availableSeats,
      auditoriumProfile: profile.label,
    };
  },

  async getShowsForMovie(movieId: number): Promise<Show[]> {
    const remote = await trySpringBootFetch<Show[]>(`/shows?movieId=${movieId}`);
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const shows = readJson<Show[]>(STORAGE_KEYS.SHOWS, generateSeedShows());
    return shows
      .filter((s) => s.movieId === movieId)
      .map((s) => this.enrichShowWithSeatAvailability(s));
  },

  async getAllShows(): Promise<Show[]> {
    const remote = await trySpringBootFetch<Show[]>('/shows');
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const shows = readJson<Show[]>(STORAGE_KEYS.SHOWS, generateSeedShows());
    return shows.map((s) => this.enrichShowWithSeatAvailability(s));
  },

  async getShowSeats(
    showId: number,
    multiplier = 1,
    screenContext?: {
      screenId?: number;
      screenName?: string;
      format?: string;
      theatreName?: string;
    }
  ): Promise<Seat[]> {
    const remote = await trySpringBootFetch<Seat[]>(`/shows/${showId}/seats`);
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const key = `${STORAGE_KEYS.SHOW_SEATS_PREFIX}${showId}`;
    let seats = readJson<Seat[] | null>(key, null);
    if (!seats) {
      let resolvedContext = screenContext;
      if (!resolvedContext) {
        const shows = readJson<Show[]>(STORAGE_KEYS.SHOWS, generateSeedShows());
        const matchedShow = shows.find((s) => s.id === showId);
        if (matchedShow) resolvedContext = matchedShow;
      }
      seats = buildShowSeatLayout(showId, multiplier, resolvedContext);
      writeJson(key, seats);
    }
    const now = Date.now();
    const auth = this.getStoredAuth();
    return seats.map((seat) => ({
      ...seat,
      status: resolveEffectiveSeatStatus(seat, now, auth?.user.id),
    }));
  },

  async lockSeats(showId: number, seatIds: number[], userId: number): Promise<Seat[]> {
    const remote = await trySpringBootFetch<Seat[]>(`/shows/${showId}/seats/lock`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
    if (remote.ok) return remote.data;
    if (!remote.networkError) {
      throw new Error(remote.message || 'Unable to lock selected seats');
    }

    const key = `${STORAGE_KEYS.SHOW_SEATS_PREFIX}${showId}`;
    const seats = await this.getShowSeats(showId);
    const now = Date.now();
    const lockUntil = now + 5 * 60 * 1000; // 5-minute temporary lock TTL

    // Validate no target seat is booked or locked by another user
    for (const id of seatIds) {
      const target = seats.find((s) => s.id === id);
      if (!target) throw new Error('Selected seat not found.');
      const effective = resolveEffectiveSeatStatus(target, now, userId);
      if (effective === 'BOOKED' || effective === 'LOCKED') {
        throw new Error(`Seat ${target.seatCode} was just reserved by another guest.`);
      }
    }

    const idSet = new Set(seatIds);
    const updated = seats.map((s) => {
      if (idSet.has(s.id)) {
        return {
          ...s,
          status: 'LOCKED' as const,
          lockedByUserId: userId,
          lockExpiresAt: lockUntil,
        };
      }
      // Release previous locks held by this user in this show if not in new set
      if (s.lockedByUserId === userId && s.status === 'LOCKED') {
        return {
          ...s,
          status: 'AVAILABLE' as const,
          lockedByUserId: null,
          lockExpiresAt: null,
        };
      }
      return s;
    });

    writeJson(key, updated);
    return updated;
  },

  async recommendBestSeatsForShow(showId: number, count = 2): Promise<Seat[]> {
    const remote = await trySpringBootFetch<Seat[]>(`/shows/${showId}/seats/recommend?count=${count}`);
    if (remote.ok) return remote.data;

    const seats = await this.getShowSeats(showId);
    const auth = this.getStoredAuth();
    return recommendBestSeats(seats, count, Date.now(), auth?.user.id);
  },

  async getSnacks(): Promise<Snack[]> {
    const remote = await trySpringBootFetch<Snack[]>('/snacks');
    if (remote.ok) return remote.data;

    return SEED_SNACKS;
  },

  async createBooking(payload: {
    show: Show;
    movie: Movie;
    seats: Seat[];
    snacks: CartSnackItem[];
    paymentMode: PaymentMode;
    user: User;
  }): Promise<BookingRecord> {
    const remote = await trySpringBootFetch<BookingRecord>('/bookings', {
      method: 'POST',
      body: JSON.stringify({
        showId: payload.show.id,
        seatIds: payload.seats.map((s) => s.id),
        snacks: payload.snacks.map((item) => ({ snackId: item.snack.id, quantity: item.quantity })),
        paymentMode: payload.paymentMode,
      }),
    });
    if (remote.ok) return remote.data;
    if (!remote.networkError) {
      throw new Error(remote.message || 'Booking confirmation failed.');
    }

    // Local preview transaction validation
    const key = `${STORAGE_KEYS.SHOW_SEATS_PREFIX}${payload.show.id}`;
    const currentSeats = await this.getShowSeats(payload.show.id, payload.show.priceMultiplier);
    const now = Date.now();
    const seatIds = new Set(payload.seats.map((s) => s.id));

    for (const s of payload.seats) {
      const latest = currentSeats.find((item) => item.id === s.id);
      if (!latest) throw new Error(`Seat ${s.seatCode} does not exist.`);
      if (latest.status === 'BOOKED') {
        throw new Error(`Seat ${s.seatCode} is already booked.`);
      }
      if (
        latest.status === 'LOCKED' &&
        latest.lockedByUserId !== payload.user.id &&
        latest.lockExpiresAt &&
        latest.lockExpiresAt > now
      ) {
        throw new Error(`Seat ${s.seatCode} is temporarily held by another guest.`);
      }
    }

    const updatedSeats = currentSeats.map((s) =>
      seatIds.has(s.id)
        ? { ...s, status: 'BOOKED' as const, lockedByUserId: null, lockExpiresAt: null }
        : s
    );
    writeJson(key, updatedSeats);

    const breakdown = calculateBookingBreakdown(payload.seats, payload.snacks);
    const refNumber = Math.floor(10000 + Math.random() * 89999);
    const bookingReference = `CV-2026-${refNumber}`;

    const record: BookingRecord = {
      id: Date.now(),
      bookingReference,
      userId: payload.user.id,
      userName: payload.user.name,
      userEmail: payload.user.email,
      showId: payload.show.id,
      movieId: payload.movie.id,
      movieTitle: payload.movie.title,
      moviePosterUrl: payload.movie.posterUrl,
      theatreName: payload.show.theatreName,
      screenName: payload.show.screenName,
      city: payload.show.city,
      showDate: payload.show.showDate,
      showTime: payload.show.showTime,
      language: payload.show.language,
      format: payload.show.format,
      seatCodes: payload.seats.map((s) => s.seatCode),
      seatCategories: payload.seats.map((s) => s.category),
      snacks: payload.snacks.map((item) => ({
        name: item.snack.name,
        quantity: item.quantity,
        unitPrice: item.snack.price,
      })),
      breakdown,
      paymentMode: payload.paymentMode,
      paymentId: `${payload.paymentMode === 'RAZORPAY_TEST' ? 'RZP_TEST_' : 'DEMO_PAY_'}${refNumber}`,
      status: 'CONFIRMED',
      qrPayload: JSON.stringify({
        ref: bookingReference,
        movie: payload.movie.title,
        theatre: payload.show.theatreName,
        date: payload.show.showDate,
        time: payload.show.showTime,
        seats: payload.seats.map((s) => s.seatCode),
        total: breakdown.grandTotal,
      }),
      createdAt: new Date().toISOString(),
    };

    const existing = readJson<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, SEED_INITIAL_BOOKINGS);
    writeJson(STORAGE_KEYS.BOOKINGS, [record, ...existing]);
    return record;
  },

  async getMyBookings(userId: number): Promise<BookingRecord[]> {
    const remote = await trySpringBootFetch<BookingRecord[]>('/bookings/my');
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const all = readJson<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, SEED_INITIAL_BOOKINGS);
    return all.filter((b) => b.userId === userId);
  },

  // --- Admin Endpoints ---
  async getAdminStats(): Promise<AdminStats> {
    const remote = await trySpringBootFetch<AdminStats>('/admin/stats');
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const bookings = readJson<BookingRecord[]>(STORAGE_KEYS.BOOKINGS, SEED_INITIAL_BOOKINGS);
    const movies = readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
    const theatres = readJson<Theatre[]>(STORAGE_KEYS.THEATRES, SEED_THEATRES);

    return {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.breakdown.grandTotal, 0),
      activeMovies: movies.length,
      activeTheatres: theatres.length,
      ticketsSold: bookings.reduce((sum, b) => sum + b.seatCodes.length, 0),
      recentBookings: bookings,
    };
  },

  async adminSaveMovie(movie: Omit<Movie, 'id'> & { id?: number }): Promise<Movie> {
    const method = movie.id ? 'PUT' : 'POST';
    const path = movie.id ? `/admin/movies/${movie.id}` : '/admin/movies';
    const remote = await trySpringBootFetch<Movie>(path, {
      method,
      body: JSON.stringify(movie),
    });
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const movies = readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
    if (movie.id) {
      const updatedMovie: Movie = { ...movie, id: movie.id };
      writeJson(
        STORAGE_KEYS.MOVIES,
        movies.map((m) => (m.id === movie.id ? updatedMovie : m))
      );
      return updatedMovie;
    } else {
      const created: Movie = { ...movie, id: Math.max(0, ...movies.map((m) => m.id)) + 1 };
      writeJson(STORAGE_KEYS.MOVIES, [created, ...movies]);
      return created;
    }
  },

  async adminDeleteMovie(movieId: number): Promise<void> {
    const remote = await trySpringBootFetch<void>(`/admin/movies/${movieId}`, { method: 'DELETE' });
    if (remote.ok) return;

    ensureLocalSeedInitialized();
    const movies = readJson<Movie[]>(STORAGE_KEYS.MOVIES, SEED_MOVIES);
    writeJson(
      STORAGE_KEYS.MOVIES,
      movies.filter((m) => m.id !== movieId)
    );
  },

  async adminAddTheatre(theatre: Omit<Theatre, 'id'>): Promise<Theatre> {
    const remote = await trySpringBootFetch<Theatre>('/admin/theatres', {
      method: 'POST',
      body: JSON.stringify(theatre),
    });
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const theatres = readJson<Theatre[]>(STORAGE_KEYS.THEATRES, SEED_THEATRES);
    const created: Theatre = { ...theatre, id: Math.max(0, ...theatres.map((t) => t.id)) + 1 };
    writeJson(STORAGE_KEYS.THEATRES, [...theatres, created]);
    return created;
  },

  async adminCreateShow(show: Omit<Show, 'id'>): Promise<Show> {
    const remote = await trySpringBootFetch<Show>('/admin/shows', {
      method: 'POST',
      body: JSON.stringify(show),
    });
    if (remote.ok) return remote.data;

    ensureLocalSeedInitialized();
    const shows = readJson<Show[]>(STORAGE_KEYS.SHOWS, generateSeedShows());
    const created: Show = { ...show, id: Math.max(100, ...shows.map((s) => s.id)) + 1 };
    writeJson(STORAGE_KEYS.SHOWS, [created, ...shows]);
    return created;
  },
};
