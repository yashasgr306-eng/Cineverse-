import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, Sparkles, Users } from 'lucide-react';
import type { Movie, Seat, SeatCategory, Show, User } from '../types/cinema';
import { CATEGORY_LABELS, calculateSeatPrice, formatINR } from '../utils/cinemaPricing';
import { getSeatSelectionUnit, recommendBestSeats } from '../utils/seatAlgorithm';
import { cinemaAudio } from '../utils/cinemaAudio';
import { CinemaHall3D } from './three/CinemaHall3D';
import { cineverseApi } from '../api/cineverseApi';

interface SeatSelectionViewProps {
  movie: Movie;
  show: Show;
  user: User | null;
  onBack: () => void;
  onRequireAuth: () => void;
  onConfirmSeats: (selectedSeats: Seat[]) => void;
}

const CATEGORY_ORDER: SeatCategory[] = ['ROYAL_RECLINER', 'BALCONY', 'PRIME', 'CLASSIC'];

export function SeatSelectionView({
  movie,
  show,
  user,
  onBack,
  onRequireAuth,
  onConfirmSeats,
}: SeatSelectionViewProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [ticketQuantity, setTicketQuantity] = useState<number>(2);
  const [previewSeat, setPreviewSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    cineverseApi
      .getShowSeats(show.id, show.priceMultiplier, {
        screenId: show.screenId,
        screenName: show.screenName,
        format: show.format,
        theatreName: show.theatreName,
      })
      .then((data) => {
        if (!active) return;
        setSeats(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setErrorMsg('Unable to load auditorium seat map.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [show.id, show.priceMultiplier, show.screenId, show.screenName, show.format, show.theatreName]);

  const availableCount = useMemo(
    () => seats.filter((s) => s.status === 'AVAILABLE').length,
    [seats]
  );

  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedIds.includes(s.id)),
    [seats, selectedIds]
  );

  const totalSeatAmount = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + s.price, 0),
    [selectedSeats]
  );

  // Group seats by row for the accessible 2D synchronized layout
  const seatRows = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const s of seats) {
      const list = map.get(s.rowLabel) ?? [];
      list.push(s);
      map.set(s.rowLabel, list);
    }
    return Array.from(map.entries()).map(([rowLabel, rowSeats]) => ({
      rowLabel,
      category: rowSeats[0].category,
      seats: [...rowSeats].sort((a, b) => a.colNumber - b.colNumber),
    }));
  }, [seats]);

  const handleToggleSeat = (seat: Seat) => {
    setErrorMsg(null);
    setInfoBanner(null);

    if (seat.status === 'BOOKED' || seat.status === 'LOCKED') {
      setErrorMsg(`Seat ${seat.seatCode} is unavailable (${seat.status.toLowerCase()}).`);
      return;
    }

    const unit = getSeatSelectionUnit(seat, seats);
    // Ensure all seats in a paired recliner unit are available
    if (unit.some((u) => u.status === 'BOOKED' || u.status === 'LOCKED')) {
      setErrorMsg('This paired Royal Recliner unit has an unavailable partner seat.');
      return;
    }

    const unitIds = unit.map((u) => u.id);
    const alreadySelected = unitIds.every((id) => selectedIds.includes(id));

    if (alreadySelected) {
      cinemaAudio.playSeatClick(false);
      setSelectedIds((prev) => prev.filter((id) => !unitIds.includes(id)));
      return;
    }

    // Check ticket quantity limit
    const nextIds = Array.from(new Set([...selectedIds, ...unitIds]));
    if (nextIds.length > ticketQuantity) {
      // Replace oldest selection cleanly or expand if paired unit
      if (unitIds.length <= ticketQuantity) {
        cinemaAudio.playSeatClick(true);
        setSelectedIds(unitIds);
        setInfoBanner(
          unit.length > 1
            ? `Paired Royal Recliners (${unit.map((u) => u.seatCode).join(' & ')}) must stay together.`
            : `Selection updated to fit ${ticketQuantity} ticket${ticketQuantity > 1 ? 's' : ''}.`
        );
      } else {
        setErrorMsg(
          `Paired Royal Recliners require at least 2 tickets. Increase ticket quantity to select ${unit.map((u) => u.seatCode).join(' & ')}.`
        );
      }
      return;
    }

    cinemaAudio.playSeatClick(true);
    setSelectedIds(nextIds);
    if (unit.length > 1) {
      setInfoBanner(`Paired Royal Recliners ${unit.map((u) => u.seatCode).join(' & ')} selected together.`);
    }
  };

  const handleRecommendBestSeats = () => {
    setErrorMsg(null);
    const countToPick = ticketQuantity === 1 ? 1 : Math.min(ticketQuantity, 2);
    const recommended = recommendBestSeats(seats, countToPick, Date.now(), user?.id);
    if (recommended.length === 0) {
      setErrorMsg('No adjacent center seats available for that quantity.');
      return;
    }
    cinemaAudio.playSeatClick(true);
    setSelectedIds(recommended.map((s) => s.id));
    setInfoBanner(
      `Recommended best ${recommended.length} center seat${recommended.length > 1 ? 's' : ''}: ${recommended
        .map((s) => s.seatCode)
        .join(', ')}`
    );
  };

  const handleProceedToSnacks = async () => {
    if (selectedSeats.length === 0) {
      setErrorMsg('Please select at least 1 seat to continue.');
      return;
    }
    if (!user) {
      onRequireAuth();
      return;
    }

    setLocking(true);
    setErrorMsg(null);
    try {
      const updated = await cineverseApi.lockSeats(
        show.id,
        selectedSeats.map((s) => s.id),
        user.id
      );
      setSeats(updated);
      onConfirmSeats(selectedSeats);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to lock seats.');
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumb & Show Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#F5C518] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Change Showtime
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            {movie.title} · <span className="text-[#F5C518]">{show.format}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {show.theatreName} ({show.screenName}) · {show.showDate} · {show.showTime} · {show.language}
          </p>
        </div>

        {/* Ticket Quantity & Best 2 Seats Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0D1426] border border-white/10 rounded-xl px-3 py-2">
            <Users className="w-4 h-4 text-[#F5C518]" />
            <label htmlFor="ticket-qty" className="text-xs text-slate-300 font-medium">
              Tickets:
            </label>
            <select
              id="ticket-qty"
              value={ticketQuantity}
              onChange={(e) => {
                const nextQty = Number(e.target.value);
                setTicketQuantity(nextQty);
                if (selectedIds.length > nextQty) {
                  setSelectedIds((prev) => prev.slice(0, nextQty));
                }
              }}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n} className="bg-[#0B1020]">
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleRecommendBestSeats}
            className="px-4 py-2.5 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Best 2 Seats
          </button>

          <button
            type="button"
            disabled={selectedSeats.length === 0}
            onClick={() => {
              if (selectedSeats[0]) {
                setPreviewSeat({ ...selectedSeats[0] });
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-[#0D1426] border border-white/15 hover:border-[#F5C518] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-[#F5C518]" />
            Screen Preview
          </button>
        </div>
      </div>

      {/* Category Tiers & Availability Legend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORY_ORDER.map((cat) => (
          <div
            key={cat}
            className="bg-[#0D1426] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <span className="text-xs font-medium text-slate-300">{CATEGORY_LABELS[cat]}</span>
            <span className="font-mono text-sm font-bold text-[#F5C518] tabular-nums">
              {formatINR(calculateSeatPrice(cat, show.priceMultiplier))}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 bg-[#0D1426] border border-white/10 rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block" />
            Available ({availableCount})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-[#F5C518] inline-block" />
            Selected ({selectedSeats.length})
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-600 inline-block" />
            Booked
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-red-500 inline-block" />
            Locked / Held
          </span>
        </div>
        <span className="font-mono text-slate-400 tabular-nums">
          {show.auditoriumProfile ?? show.screenName} · {availableCount} / {seats.length} Seats Open
        </span>
      </div>

      {errorMsg && (
        <div role="alert" className="bg-red-950/60 border border-red-500/40 rounded-xl px-4 py-3 text-xs text-red-200">
          {errorMsg}
        </div>
      )}
      {infoBanner && (
        <div className="bg-amber-950/40 border border-[#F5C518]/40 rounded-xl px-4 py-3 text-xs text-amber-200">
          {infoBanner}
        </div>
      )}

      {/* 3D Interactive Cinema Hall */}
      {loading ? (
        <div className="h-[460px] rounded-2xl bg-[#0D1426] border border-white/10 flex items-center justify-center text-sm text-slate-400">
          Initializing 3D Auditorium...
        </div>
      ) : (
        <CinemaHall3D
          key={show.id}
          seats={seats}
          selectedSeatIds={selectedIds}
          movieTitle={movie.title}
          moviePosterUrl={movie.posterUrl}
          onToggleSeat={handleToggleSeat}
          previewSeat={previewSeat}
        />
      )}

      {/* In-Flow Booking Summary & Proceed Bar (never occludes the 3D camera dock) */}
      <div className="bg-[#0D1426] border border-[#F5C518]/30 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <span className="text-xs text-slate-400 block">Selected Seats</span>
            <span className="font-mono text-sm font-bold text-white">
              {selectedSeats.length > 0
                ? selectedSeats.map((s) => s.seatCode).join(', ')
                : 'None selected'}
            </span>
          </div>
          <div className="h-8 w-px bg-white/10 hidden sm:block" />
          <div>
            <span className="text-xs text-slate-400 block">Ticket Subtotal</span>
            <span className="font-mono text-base font-bold text-[#F5C518] tabular-nums">
              {formatINR(totalSeatAmount)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={selectedSeats.length === 0 || locking}
          onClick={handleProceedToSnacks}
          className="px-6 py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] disabled:bg-slate-700 disabled:text-slate-400 text-[#060913] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {locking
            ? 'Reserving Seats...'
            : user
              ? 'Proceed to Snacks'
              : 'Sign In to Lock Seats'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Synchronized Interactive 2D Seat Map (Quick Pick / Mobile Touch / Accessibility) */}
      <section aria-labelledby="seat-map-2d-heading" className="bg-[#0D1426] border border-white/10 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 id="seat-map-2d-heading" className="font-display text-lg font-bold text-white">
              Quick Interactive Seat Map
            </h2>
            <p className="text-xs text-slate-400">
              Synchronized live with the 3D auditorium above · Tap any green seat to select
            </p>
          </div>
          {selectedSeats.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-white underline self-start sm:self-auto"
            >
              Clear Selection
            </button>
          )}
        </div>

        <div className="max-w-3xl mx-auto space-y-2.5 overflow-x-auto pb-2">
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-transparent via-[#F5C518]/70 to-transparent mb-4" />
          <p className="text-center text-[11px] font-mono tracking-[0.22em] text-slate-400 mb-4">
            SCREEN THIS WAY
          </p>

          {seatRows
            .slice()
            .reverse()
            .map((row) => (
              <div key={row.rowLabel} className="flex items-center justify-center gap-2 min-w-max mx-auto">
                <span className="w-8 text-xs font-mono font-bold text-slate-400 text-right shrink-0">
                  {row.rowLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  {row.seats.map((seat, idx) => {
                    const isSelected = selectedIds.includes(seat.id);
                    const isBooked = seat.status === 'BOOKED';
                    const isLocked = seat.status === 'LOCKED';
                    const halfPoint = Math.floor(row.seats.length / 2);
                    const aisleMargin = idx === halfPoint ? 'ml-5' : '';

                    return (
                      <button
                        key={seat.id}
                        type="button"
                        disabled={isBooked || isLocked}
                        onClick={() => handleToggleSeat(seat)}
                        aria-label={`Seat ${seat.seatCode}, ${CATEGORY_LABELS[seat.category]}, ₹${seat.price}, ${
                          isSelected ? 'Selected' : seat.status
                        }`}
                        className={`${aisleMargin} ${
                          seat.category === 'ROYAL_RECLINER' ? 'w-10 h-8' : 'w-8 h-8'
                        } rounded-lg text-[11px] font-mono font-semibold transition-colors flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#F5C518] text-[#060913] ring-2 ring-[#FFD84D]'
                            : isBooked
                              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                              : isLocked
                                ? 'bg-red-500/80 text-white cursor-not-allowed'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-500 hover:text-[#060913]'
                        }`}
                      >
                        {seat.seatCode}
                      </button>
                    );
                  })}
                </div>
                <span className="w-24 text-[11px] text-slate-500 pl-2 shrink-0 truncate">
                  {CATEGORY_LABELS[row.category]}
                </span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
