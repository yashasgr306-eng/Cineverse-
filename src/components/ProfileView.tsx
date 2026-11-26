import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  CheckCircle2,
  Download,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Ticket,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { BookingRecord, ProfileOverview, User } from '../types/cinema';
import { CITIES } from '../data/seedCatalog';
import { formatINR } from '../utils/cinemaPricing';
import { cineverseApi } from '../api/cineverseApi';
import { downloadTicketCard } from './CheckoutView';

interface ProfileViewProps {
  user: User | null;
  onUserUpdated: (updated: User) => void;
  onRequireAuth: () => void;
  onExploreMovies: () => void;
}

const LANGUAGES = ['Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'English'];

export function ProfileView({
  user,
  onUserUpdated,
  onRequireAuth,
  onExploreMovies,
}: ProfileViewProps) {
  const [tab, setTab] = useState<'DETAILS' | 'BOOKINGS' | 'SECURITY'>('DETAILS');
  const [bookingSubTab, setBookingSubTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // Personal Details Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredCity, setPreferredCity] = useState<string>('Chennai');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('Tamil');
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security / Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // QR Modal
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [activeQrBooking, setActiveQrBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (!user) {
      setOverview(null);
      return;
    }

    let active = true;
    setLoading(true);
    cineverseApi
      .getProfile(user.id)
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setName(data.user.name);
        setPhone(data.user.phone);
        setPreferredCity(data.user.preferredCity || 'Chennai');
        setPreferredLanguage(data.user.preferredLanguage || 'Tamil');
        setEmailNotifications(data.user.emailNotifications ?? true);
        setLoading(false);

        const all = [...data.upcomingBookings, ...data.pastBookings];
        all.forEach((b) => {
          QRCode.toDataURL(b.qrPayload, {
            width: 220,
            margin: 2,
            color: { dark: '#060913', light: '#FFFFFF' },
          })
            .then((url) => {
              if (active) {
                setQrMap((prev) => ({ ...prev, [b.bookingReference]: url }));
              }
            })
            .catch(() => {});
        });
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-10 space-y-4">
          <UserIcon className="w-10 h-10 text-[#F5C518] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-white">
            Sign In to Manage Your Profile
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            View your personal details, manage cinema preferences, inspect past & upcoming bookings, and update your password securely.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-6 py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);
    if (name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }
    const isGoogleUser = user.authProvider === 'GOOGLE';
    if ((!isGoogleUser || phone.trim().length > 0) && phone.trim().length < 7) {
      setProfileError('Please enter a valid contact phone number (at least 7 digits).');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await cineverseApi.updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        preferredCity,
        preferredLanguage,
        emailNotifications,
      });
      onUserUpdated(updated);
      setOverview((prev) => (prev ? { ...prev, user: updated } : prev));
      setProfileNotice('Profile details and cinema preferences saved.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const msg = await cineverseApi.changePassword(user.id, {
        currentPassword,
        newPassword,
      });
      setPasswordNotice(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const profileUser = overview?.user ?? user;
  const upcomingBookings = overview?.upcomingBookings ?? [];
  const pastBookings = overview?.pastBookings ?? [];
  const displayedBookings = bookingSubTab === 'UPCOMING' ? upcomingBookings : pastBookings;
  const memberSince = profileUser.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Oct 2026';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Identity & Membership Overview */}
      <section className="bg-[#0D1426] border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          {profileUser.avatarUrl ? (
            <img
              src={profileUser.avatarUrl}
              alt={profileUser.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-[#F5C518]/50 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#F5C518] text-[#060913] font-display text-2xl font-extrabold flex items-center justify-center shrink-0">
              {profileUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
              {profileUser.role === 'ADMIN'
                ? 'CINEVERSE Administrator'
                : profileUser.authProvider === 'GOOGLE'
                  ? 'Google Account Member'
                  : 'CINEVERSE Member'}{' '}
              · Joined {memberSince}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5 truncate">
              {profileUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {profileUser.email}
              </span>
              {profileUser.phone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {profileUser.phone}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-5 border-t lg:border-t-0 lg:border-l border-white/10 pt-5 lg:pt-0 lg:pl-8 shrink-0">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Upcoming
            </span>
            <span className="font-mono text-xl font-bold text-[#F5C518] tabular-nums">
              {upcomingBookings.length}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Past Shows
            </span>
            <span className="font-mono text-xl font-bold text-white tabular-nums">
              {pastBookings.length}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Total Spent
            </span>
            <span className="font-mono text-xl font-bold text-white tabular-nums">
              {formatINR(overview?.totalSpent ?? 0)}
            </span>
          </div>
        </div>
      </section>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setTab('DETAILS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            tab === 'DETAILS'
              ? 'bg-[#F5C518] text-[#060913]'
              : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:text-white'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          Personal Details & Preferences
        </button>
        <button
          type="button"
          onClick={() => setTab('BOOKINGS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            tab === 'BOOKINGS'
              ? 'bg-[#F5C518] text-[#060913]'
              : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:text-white'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          Bookings ({overview?.totalBookings ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setTab('SECURITY')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            tab === 'SECURITY'
              ? 'bg-[#F5C518] text-[#060913]'
              : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Security & Password
        </button>
      </div>

      {/* TAB 1: PERSONAL DETAILS & PREFERENCES */}
      {tab === 'DETAILS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-8 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-5"
          >
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Account Information & Preferences
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Update your contact details and default cinema preferences synced via Spring Security.
              </p>
            </div>

            {profileError && (
              <div role="alert" className="bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-xs text-red-200">
                {profileError}
              </div>
            )}
            {profileNotice && (
              <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {profileNotice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-name" className="text-xs text-slate-300 font-medium block mb-1.5">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="text-xs text-slate-300 font-medium block mb-1.5">
                  Email Address (JWT Login ID)
                </label>
                <input
                  id="profile-email"
                  type="email"
                  disabled
                  value={profileUser.email}
                  className="w-full bg-[#060913]/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="text-xs text-slate-300 font-medium block mb-1.5">
                  Mobile Number {profileUser.authProvider === 'GOOGLE' ? '(Optional)' : ''}
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  required={profileUser.authProvider !== 'GOOGLE'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98401 11223"
                  className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="profile-city" className="text-xs text-slate-300 font-medium block mb-1.5">
                  Preferred City
                </label>
                <select
                  id="profile-city"
                  value={preferredCity}
                  onChange={(e) => setPreferredCity(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-language" className="text-xs text-slate-300 font-medium block mb-1.5">
                  Preferred Movie Language
                </label>
                <select
                  id="profile-language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 accent-[#F5C518] rounded"
                  />
                  <span className="text-xs text-slate-200">
                    Receive QR ticket confirmations & premiere alerts via email
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-6 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] disabled:opacity-50 text-[#060913] font-bold text-sm transition-colors"
              >
                {savingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </div>
          </form>

          <aside className="lg:col-span-4 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#F5C518] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              JWT Session Identity
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your CINEVERSE account is authenticated via stateless Bearer JWT tokens issued by Spring Security. Changes to your name, contact info, preferences, or password synchronize with the Spring Boot `/api/profile` endpoints.
            </p>
            <div className="border-t border-white/10 pt-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Sign-In Method</span>
                <span className="font-mono font-bold text-[#F5C518]">
                  {profileUser.authProvider === 'GOOGLE' ? 'Google Sign-In' : 'Email & Password'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Role</span>
                <span className="font-mono font-bold text-white">{profileUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Default City</span>
                <span className="font-medium text-white">{preferredCity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Language Focus</span>
                <span className="font-medium text-white">{preferredLanguage}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* TAB 2: PAST & UPCOMING BOOKINGS */}
      {tab === 'BOOKINGS' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-white">Your Booking History</h2>
            <div className="flex items-center gap-2 bg-[#0D1426] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBookingSubTab('UPCOMING')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  bookingSubTab === 'UPCOMING'
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Upcoming ({upcomingBookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingSubTab('PAST')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  bookingSubTab === 'PAST'
                    ? 'bg-[#F5C518] text-[#060913]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Past ({pastBookings.length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-[#0D1426] rounded-2xl border border-white/10">
              Loading booking history...
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-12 text-center space-y-4">
              <p className="font-display text-lg font-semibold text-white">
                No {bookingSubTab.toLowerCase()} bookings found
              </p>
              <p className="text-sm text-slate-400">
                Explore Now Showing movies and reserve seats in the interactive 3D auditorium.
              </p>
              <button
                type="button"
                onClick={onExploreMovies}
                className="px-5 py-2.5 rounded-xl bg-[#F5C518] text-[#060913] text-xs font-bold"
              >
                Browse Movies
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => {
                const qrUrl = qrMap[booking.bookingReference] ?? '';
                return (
                  <article
                    key={booking.bookingReference}
                    className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row gap-5 justify-between"
                  >
                    <div className="flex gap-4">
                      <img
                        src={booking.moviePosterUrl}
                        alt={booking.movieTitle}
                        referrerPolicy="no-referrer"
                        className="w-20 h-28 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="font-mono font-bold text-[#F5C518]">
                            {booking.bookingReference}
                          </span>
                          <span>·</span>
                          <span>{booking.format}</span>
                          <span>·</span>
                          <span>{booking.language}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold text-white">
                          {booking.movieTitle}
                        </h3>
                        <p className="text-xs text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {booking.theatreName} · {booking.screenName}
                        </p>
                        <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {booking.showDate} · {booking.showTime}
                        </p>
                        <p className="text-xs text-slate-200">
                          Seats:{' '}
                          <span className="font-mono font-bold text-[#F5C518]">
                            {booking.seatCodes.join(', ')}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0">
                      <div className="text-left md:text-right">
                        <span className="text-xs text-slate-400 block">Total Paid</span>
                        <span className="font-mono text-lg font-bold text-white tabular-nums">
                          {formatINR(booking.breakdown.grandTotal)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveQrBooking(booking)}
                          className="px-3.5 py-2 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          View QR
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadTicketCard(booking, qrUrl)}
                          className="px-3.5 py-2 rounded-xl bg-[#111827] border border-white/15 hover:border-[#F5C518] text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#F5C518]" />
                          Download
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SECURITY & PASSWORD */}
      {tab === 'SECURITY' &&
        (profileUser.authProvider === 'GOOGLE' ? (
          <div className="max-w-xl bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#F5C518]" />
              <h2 className="font-display text-xl font-bold text-white">
                Google Account Security Active
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              You are signed in to CINEVERSE with your Google account ({profileUser.email}). Your login credentials, two-step verification, and password protection are managed directly through your Google Account settings.
            </p>
            <p className="text-xs text-slate-400">
              You can still manage your phone number, preferred city, movie language, and email ticket alerts from the Personal Details tab.
            </p>
          </div>
        ) : (
        <form
          onSubmit={handleChangePassword}
          className="max-w-xl bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#F5C518]" />
              Update Account Password
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify your current credentials before setting a new BCrypt-hashed password.
            </p>
          </div>

          {passwordError && (
            <div role="alert" className="bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-xs text-red-200">
              {passwordError}
            </div>
          )}
          {passwordNotice && (
            <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {passwordNotice}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="text-xs text-slate-300 font-medium block mb-1.5">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="text-xs text-slate-300 font-medium block mb-1.5">
                New Password (minimum 6 characters)
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="text-xs text-slate-300 font-medium block mb-1.5">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-[#060913] border border-white/15 focus:border-[#F5C518] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-6 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] disabled:opacity-50 text-[#060913] font-bold text-sm transition-colors"
            >
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
        ))}

      {/* QR Code Modal */}
      {activeQrBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ticket QR Code"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#0D1426] border border-[#F5C518]/50 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#F5C518]">
                {activeQrBooking.bookingReference}
              </span>
              <button
                type="button"
                onClick={() => setActiveQrBooking(null)}
                aria-label="Close QR dialog"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-display text-xl font-bold text-white">
              {activeQrBooking.movieTitle}
            </h3>
            <p className="text-xs text-slate-400">
              {activeQrBooking.theatreName} · {activeQrBooking.showDate} · {activeQrBooking.showTime}
            </p>
            {qrMap[activeQrBooking.bookingReference] && (
              <img
                src={qrMap[activeQrBooking.bookingReference]}
                alt={`QR Code for ${activeQrBooking.bookingReference}`}
                className="w-48 h-48 mx-auto rounded-xl bg-white p-2"
              />
            )}
            <p className="font-mono text-sm font-bold text-[#F5C518]">
              Seats: {activeQrBooking.seatCodes.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
