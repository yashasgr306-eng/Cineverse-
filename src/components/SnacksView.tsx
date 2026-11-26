import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import type { CartSnackItem, Seat, Snack, SnackCategory } from '../types/cinema';
import { calculateSnacksSubtotal, formatINR } from '../utils/cinemaPricing';
import { cineverseApi } from '../api/cineverseApi';

interface SnacksViewProps {
  selectedSeats: Seat[];
  cart: CartSnackItem[];
  onCartChange: (nextCart: CartSnackItem[]) => void;
  onBack: () => void;
  onSkip: () => void;
  onProceed: () => void;
}

const CATEGORIES: { label: string; value: SnackCategory | 'ALL' }[] = [
  { label: 'All Items', value: 'ALL' },
  { label: 'Combos', value: 'COMBOS' },
  { label: 'Popcorn', value: 'POPCORN' },
  { label: 'Beverages', value: 'BEVERAGES' },
  { label: 'Nachos', value: 'NACHOS' },
  { label: 'Burgers', value: 'BURGERS' },
  { label: 'Sandwiches', value: 'SANDWICHES' },
];

export function SnacksView({
  selectedSeats,
  cart,
  onCartChange,
  onBack,
  onSkip,
  onProceed,
}: SnacksViewProps) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [activeCategory, setActiveCategory] = useState<SnackCategory | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cineverseApi.getSnacks().then((list) => {
      setSnacks(list);
      setLoading(false);
    });
  }, []);

  const filteredSnacks = useMemo(() => {
    if (activeCategory === 'ALL') return snacks;
    return snacks.filter((s) => s.category === activeCategory);
  }, [snacks, activeCategory]);

  const getQty = (snackId: number) =>
    cart.find((item) => item.snack.id === snackId)?.quantity ?? 0;

  const updateQty = (snack: Snack, delta: number) => {
    const current = getQty(snack.id);
    const nextQty = Math.max(0, current + delta);
    if (nextQty === 0) {
      onCartChange(cart.filter((item) => item.snack.id !== snack.id));
    } else if (current === 0) {
      onCartChange([...cart, { snack, quantity: nextQty }]);
    } else {
      onCartChange(
        cart.map((item) =>
          item.snack.id === snack.id ? { ...item, quantity: nextQty } : item
        )
      );
    }
  };

  const snacksTotal = calculateSnacksSubtotal(cart);
  const ticketsTotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#F5C518] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Seat Selection
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Gourmet Cinema Snacks & Combos
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Seats reserved: {selectedSeats.map((s) => s.seatCode).join(', ')} · Pre-order for express pickup
          </p>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2.5 rounded-xl bg-[#0D1426] border border-white/15 hover:border-white/30 text-xs font-semibold text-slate-200 self-start sm:self-auto"
        >
          Skip Snacks
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setActiveCategory(c.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              activeCategory === c.value
                ? 'bg-[#F5C518] text-[#060913]'
                : 'bg-[#0D1426] text-slate-300 border border-white/10 hover:border-white/25'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Snacks Grid */}
        <div className="lg:col-span-8">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400 bg-[#0D1426] rounded-2xl border border-white/10">
              Loading concession menu...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredSnacks.map((snack) => {
                const qty = getQty(snack.id);
                return (
                  <article
                    key={snack.id}
                    className="bg-[#0D1426] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#060913]">
                        <img
                          src={snack.imageUrl}
                          alt={snack.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                          <span>{snack.veg ? 'Vegetarian' : 'Classic Grill'}</span>
                          <span>{snack.calories}</span>
                        </div>
                        <h2 className="font-display text-base font-bold text-white mt-1">
                          {snack.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {snack.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 flex items-center justify-between border-t border-white/10">
                      <span className="font-mono text-base font-bold text-[#F5C518] tabular-nums">
                        {formatINR(snack.price)}
                      </span>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateQty(snack, 1)}
                          aria-label={`Add ${snack.name}`}
                          className="px-4 py-2 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] text-xs font-bold transition-colors"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-[#060913] border border-[#F5C518]/50 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            aria-label={`Decrease ${snack.name}`}
                            onClick={() => updateQty(snack, -1)}
                            className="p-1 text-slate-300 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs font-bold text-white w-5 text-center tabular-nums">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${snack.name}`}
                            onClick={() => updateQty(snack, 1)}
                            className="p-1 text-[#F5C518] hover:text-[#FFD84D]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Order Cart */}
        <aside className="lg:col-span-4 bg-[#0D1426] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#F5C518]" />
              Your Order Summary
            </h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {totalItems} snack{totalItems === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Tickets ({selectedSeats.map((s) => s.seatCode).join(', ')})</span>
              <span className="font-mono font-semibold text-white tabular-nums">
                {formatINR(ticketsTotal)}
              </span>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="py-6 text-center border border-dashed border-white/10 rounded-xl">
              <UtensilsCrossed className="w-5 h-5 text-slate-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No snacks added yet.</p>
            </div>
          ) : (
            <div className="space-y-3 border-t border-white/10 pt-3">
              {cart.map((item) => (
                <div key={item.snack.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{item.snack.name}</p>
                    <p className="text-slate-400 font-mono tabular-nums">
                      {item.quantity} × {formatINR(item.snack.price)}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-white tabular-nums shrink-0">
                    {formatINR(item.snack.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-300">Subtotal (before taxes)</span>
              <span className="font-mono text-[#F5C518] tabular-nums">
                {formatINR(ticketsTotal + snacksTotal)}
              </span>
            </div>

            <button
              type="button"
              onClick={onProceed}
              className="w-full py-3 rounded-xl bg-[#F5C518] hover:bg-[#FFD84D] text-[#060913] font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              Proceed to Booking Summary
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
