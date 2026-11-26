import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  ShieldAlert,
  Ticket,
} from 'lucide-react';
import type {
  BookingRecord,
  CartSnackItem,
  Movie,
  PaymentMode,
  Seat,
  Show,
  User,
} from '../types/cinema';
import { calculateBookingBreakdown, formatINR } from '../utils/cinemaPricing';
import { cineverseApi, getBackendConnectionMode } from '../api/cineverseApi';

interface CheckoutViewProps {
  movie: Movie;
  show: Show;
  selectedSeats: Seat[];
  snacks: CartSnackItem[];
  user: User;
  onBack: () => void;
  onBookingConfirmed: (record: BookingRecord) => void;
  onViewMyTickets: () => void;
}

export async function downloadTicketCard(booking: BookingRecord, qrDataUrl: string) {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>CINEVERSE Ticket ${booking.bookingReference}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #060913; color: #f8fafc; padding: 32px; }
  .ticket { max-width: 560px; margin: 0 auto; background: #0d1426; border: 2px solid #f5c518; border-radius: 16px; padding: 24px; }
  .brand { color: #f5c518; font-weight: 800; letter-spacing: 0.1em; font-size: 14px; }
  h1 { margin: 8px 0 4px; font-size: 26px; }
  .meta { color: #94a3b8; font-size: 14px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px dashed #334155; padding-top: 16px; }
  .label { color: #94a3b8; font-size: 11px; text-transform: uppercase; }
  .val { font-weight: 700; font-size: 15px; margin-top: 2px; }
  .qr { text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px dashed #334155; }
  .qr img { width: 160px; height: 160px; background: #fff; padding: 8px; border-radius: 8px; }
</style></head>
<body>
  <div class="ticket">
    <div class="brand">CINEVERSE · OFFICIAL E-TICKET</div>
    <h1>${booking.movieTitle}</h1>
    <div class="meta">${booking.theatreName} (${booking.screenName}) · ${booking.format} · ${booking.language}</div>
    <div class="grid">
      <div><div class="label">Booking ID</div><div class="val">${booking.bookingReference}</div></div>
      <div><div class="label">Seats</div><div class="val">${booking.seatCodes.join(', ')}</div></div>
      <div><div class="label">Date & Time</div><div className="val">${booking.showDate} · ${booking.showTime}</div></div>
      <div><div class="label">Total Paid</div><div class="val">₹${booking.breakdown.grandTotal}</div></div>
    </div>
    <div class="qr">
      <img src="${qrDataUrl}" alt="Ticket QR Code" />
      <p style="font-size:12px;color:#94a3b8;">Payment Mode: ${booking.paymentMode} (${booking.paymentId})</p>
    </div>
  </div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CINEVERSE-Ticket-${booking.bookingReference}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function CheckoutView({
  movie,
  show,
  selectedSeats,
  snacks,
  user,
  onBack,
  onBookingConfirmed,
  onViewMyTickets,
}: CheckoutViewProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('DEMO');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookingRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const breakdown = calculateBookingBreakdown(selectedSeats, snacks);

  useEffect(() => {
    if (!confirmed) return;
    QRCode.toDataURL(confirmed.qrPayload, {
      width: 240,
      margin: 2,
      color: { dark: '#060913', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [confirmed]);

  const handlePay = async () => {
    setProcessing(true);
    setErrorMsg(null);
    try {
      const record = await cineverseApi.createBooking({
        show,
        movie,
        seats: selectedSeats,
        snacks,
        paymentMode,
        user,
      });
      setConfirmed(record);
      onBookingConfirmed(record);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to confirm booking.');
    } finally {
      setProcessing(false);
    }
  };

  if (confirmed) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-[#0D1426] border border-[#F5C518]/50 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono tracking-wider text-emerald-400 uppercase">
                Booking Confirmed ({confirmed.paymentMode === 'RAZORPAY_TEST' ? 'Razorpay Test Mode' : 'Demo Payment Mode'})
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                Your Tickets Are Ready
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Booking Reference:{' '}
                <span className="font-mono font-bold text-[#F5C518]">
                  {confirmed.bookingReference}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 bg-[#060913] border border-white/10 rounded-xl p-5">
            <div className="sm:col-span-8 space-y-3 text-sm">
              <div>
                <h2 className="font-display text-xl font-bold text-white">{confirmed.movieTitle}</h2>
                <p className="text-xs text-slate-400">
                  {confirmed.format} · {confirmed.language}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="text-slate-500 block">Theatre</span>
                  <span className="text-white font-semibold">{confirmed.theatreName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Screen</span>
                  <span className="text-white font-semibold">{confirmed.screenName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date & Showtime</span>
                  <span className="text-white font-semibold font-mono tabular-nums">
                    {confirmed.showDate} · {confirmed.showTime}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Seats</span>
                  <span className="text-[#F5C518] font-bold font-mono">
                    {confirmed.seatCodes.join(', ')}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Amount Recorded</span>
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {formatINR(confirmed.breakdown.grandTotal)}
                </span>
              </div>
            </div>

            <div className="sm:col-span-4 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR ticket for ${confirmed.bookingReference}`}
                  className="w-36 h-36 rounded-lg bg-white p-1.5"
                />
              )}
              <span className="text-[11px] font-mono text-slate-400 mt-2">
                Scan at Auditorium Entry
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => downloadTicketCard(confirmed, qrDataUrl)}
              className="px-5 py-2.5 rounded-xl bg-[#111827] border border-white/15 hover:border-[#F5C518] text-white text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#F5C518]" />
              Download E-Ticket
            </button>

            <button
              type="button"
              onClick={onViewMyTickets}
              className="px-6 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold flex items-center gap-2"
            >
              <Ticket className="w-4 h-4" />
              Go to My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#F5C518] mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Snacks
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Booking Summary & Payment
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Itemized Booking Summary */}
        <div className="lg:col-span-7 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex gap-4 border-b border-white/10 pb-5">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="w-20 h-28 rounded-xl object-cover shrink-0 border border-white/10"
            />
            <div>
              <h2 className="font-display text-xl font-bold text-white">{movie.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {show.theatreName} · {show.screenName}
              </p>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                {show.showDate} · {show.showTime} · {show.format} ({show.language})
              </p>
              <p className="text-xs text-[#F5C518] font-mono font-semibold mt-2">
                Seats: {selectedSeats.map((s) => s.seatCode).join(', ')}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Tickets ({selectedSeats.length})</span>
              <span className="font-mono tabular-nums">{formatINR(breakdown.ticketSubtotal)}</span>
            </div>

            {snacks.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <p className="text-xs font-semibold text-slate-400">Food & Beverages</p>
                {snacks.map((item) => (
                  <div key={item.snack.id} className="flex justify-between text-xs text-slate-300">
                    <span>
                      {item.quantity} × {item.snack.name}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatINR(item.snack.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-slate-300 pt-2 border-t border-white/10">
              <span>Convenience Fee</span>
              <span className="font-mono tabular-nums">{formatINR(breakdown.convenienceFee)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>GST (18% on fee + 5% on food)</span>
              <span className="font-mono tabular-nums">{formatINR(breakdown.gstAmount)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold text-white pt-3 border-t border-white/15">
              <span>Final Payable Amount</span>
              <span className="font-mono text-[#F5C518] tabular-nums">
                {formatINR(breakdown.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Payment Layer (Explicit Demo / Razorpay Test Mode Notice) */}
        <div className="lg:col-span-5 bg-[#0D1426] border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#F5C518]" />
            Payment Method
          </h2>

          <div className="bg-amber-950/35 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#F5C518] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Demo / Test Payment Notice</p>
              <p className="mt-0.5 text-amber-200/80">
                No real money is charged.{' '}
                {getBackendConnectionMode() === 'spring-boot'
                  ? 'Booking will be persisted to MySQL via the Spring Boot API.'
                  : 'Running in Preview Mode (Java backend offline — persisted locally in browser storage).'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                paymentMode === 'DEMO'
                  ? 'bg-[#F5C518]/10 border-[#F5C518]'
                  : 'bg-[#060913] border-white/10'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'DEMO'}
                onChange={() => setPaymentMode('DEMO')}
                className="mt-1 accent-[#F5C518]"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Demo Payment (Instant Simulated Checkout)
                </span>
                <span className="text-slate-400">
                  Clearly labelled academic/demo payment flow that generates a verified QR ticket.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                paymentMode === 'RAZORPAY_TEST'
                  ? 'bg-[#F5C518]/10 border-[#F5C518]'
                  : 'bg-[#060913] border-white/10'
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                checked={paymentMode === 'RAZORPAY_TEST'}
                onChange={() => setPaymentMode('RAZORPAY_TEST')}
                className="mt-1 accent-[#F5C518]"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Razorpay Test Mode Adapter
                </span>
                <span className="text-slate-400">
                  Uses Razorpay sandbox order IDs when test credentials are configured in Spring Boot.
                </span>
              </div>
            </label>
          </div>

          {errorMsg && (
            <div role="alert" className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={processing}
            onClick={handlePay}
            className="w-full py-3.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] disabled:opacity-50 text-[#060913] font-bold text-sm transition-colors"
          >
            {processing
              ? 'Confirming Reservation...'
              : `Complete ${paymentMode === 'RAZORPAY_TEST' ? 'Test' : 'Demo'} Payment · ${formatINR(breakdown.grandTotal)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
