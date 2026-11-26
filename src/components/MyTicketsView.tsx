import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Calendar, Download, MapPin, QrCode, Ticket, X } from 'lucide-react';
import type { BookingRecord, User } from '../types/cinema';
import { formatINR } from '../utils/cinemaPricing';
import { cineverseApi } from '../api/cineverseApi';
import { downloadTicketCard } from './CheckoutView';

interface MyTicketsViewProps {
  user: User | null;
  onRequireAuth: () => void;
  onExploreMovies: () => void;
}

export function MyTicketsView({
  user,
  onRequireAuth,
  onExploreMovies,
}: MyTicketsViewProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'UPCOMING' | 'PREVIOUS'>('UPCOMING');
  const [activeQrBooking, setActiveQrBooking] = useState<BookingRecord | null>(null);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }
    setLoading(true);
    cineverseApi.getMyBookings(user.id).then((list) => {
      setBookings(list);
      setLoading(false);
      // Pre-generate QR data URLs for displayed tickets
      list.forEach((b) => {
        QRCode.toDataURL(b.qrPayload, {
          width: 220,
          margin: 2,
          color: { dark: '#060913', light: '#FFFFFF' },
        })
          .then((url) => {
            setQrMap((prev) => ({ ...prev, [b.bookingReference]: url }));
          })
          .catch(() => {});
      });
    });
  }, [user]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const { upcoming, previous } = useMemo(() => {
    const up: BookingRecord[] = [];
    const prev: BookingRecord[] = [];
    for (const b of bookings) {
      if (b.showDate >= todayStr) up.push(b);
      else prev.push(b);
    }
    return { upcoming: up, previous: prev };
  }, [bookings]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-10 space-y-4">
          <Ticket className="w-10 h-10 text-[#F5C518] mx-auto" />
          <h1 className="font-display text-2xl font-bold text-white">Sign In to View My Tickets</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Access your upcoming QR tickets, seat details, and booking history securely tied to your CINEVERSE account.
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

  const activeList = tab === 'UPCOMING' ? upcoming : previous;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#F5C518] uppercase">
            {user.name} · {user.email}
          </p>
          <h1 className="font-display text-3xl font-bold text-white mt-1">My Tickets</h1>
        </div>

        <div className="flex items-center gap-2 bg-[#0D1426] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTab('UPCOMING')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'UPCOMING'
                ? 'bg-[#F5C518] text-[#060913]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('PREVIOUS')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === 'PREVIOUS'
                ? 'bg-[#F5C518] text-[#060913]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Previous ({previous.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 bg-[#0D1426] rounded-2xl border border-white/10">
          Loading your bookings...
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-[#0D1426] border border-white/10 rounded-2xl p-12 text-center space-y-4">
          <p className="font-display text-lg font-semibold text-white">
            No {tab.toLowerCase()} bookings found
          </p>
          <p className="text-sm text-slate-400">
            Ready for the next blockbuster? Pick a screen from the 3D panorama.
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
        <div className="space-y-5">
          {activeList.map((booking) => {
            const qrUrl = qrMap[booking.bookingReference] ?? '';
            return (
              <article
                key={booking.bookingReference}
                className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-6 justify-between"
              >
                <div className="flex gap-4 sm:gap-5">
                  <img
                    src={booking.moviePosterUrl}
                    alt={booking.movieTitle}
                    referrerPolicy="no-referrer"
                    className="w-24 h-36 rounded-xl object-cover shrink-0 border border-white/10"
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono font-bold text-[#F5C518]">
                        {booking.bookingReference}
                      </span>
                      <span>·</span>
                      <span>{booking.format}</span>
                      <span>·</span>
                      <span>{booking.language}</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-white">
                      {booking.movieTitle}
                    </h2>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {booking.theatreName} · {booking.screenName}
                    </p>
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      {booking.showDate} · {booking.showTime}
                    </p>
                    <p className="text-xs text-slate-200 pt-1">
                      Seats:{' '}
                      <span className="font-mono font-bold text-[#F5C518]">
                        {booking.seatCodes.join(', ')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-slate-400 block">Total Paid</span>
                    <span className="font-mono text-xl font-bold text-white tabular-nums">
                      {formatINR(booking.breakdown.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveQrBooking(booking)}
                      className="px-4 py-2 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      View QR
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTicketCard(booking, qrUrl)}
                      aria-label={`Download ticket ${booking.bookingReference}`}
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
