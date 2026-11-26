import type { BookingSummaryBreakdown, CartSnackItem, Seat, SeatCategory } from '../types/cinema';

export const CATEGORY_BASE_PRICES: Record<SeatCategory, number> = {
  ROYAL_RECLINER: 550,
  BALCONY: 320,
  PRIME: 240,
  CLASSIC: 160,
};

export const CATEGORY_LABELS: Record<SeatCategory, string> = {
  ROYAL_RECLINER: 'Royal Recliner',
  BALCONY: 'Balcony',
  PRIME: 'Prime',
  CLASSIC: 'Classic',
};

export function calculateSeatPrice(category: SeatCategory, multiplier = 1): number {
  const base = CATEGORY_BASE_PRICES[category];
  return Math.round(base * multiplier);
}

export function calculateSnacksSubtotal(items: CartSnackItem[]): number {
  return items.reduce((sum, item) => sum + item.snack.price * item.quantity, 0);
}

export function calculateBookingBreakdown(
  selectedSeats: Pick<Seat, 'price'>[],
  snackItems: CartSnackItem[]
): BookingSummaryBreakdown {
  const ticketSubtotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const snacksSubtotal = calculateSnacksSubtotal(snackItems);

  // Standard multiplex convenience fee: ₹30 base + ₹15 per ticket when tickets > 0
  const convenienceFee = selectedSeats.length > 0 ? 30 + selectedSeats.length * 15 : 0;

  // 18% GST applied to convenience fee + 5% food GST (rounded cleanly)
  const gstOnConvenience = Math.round(convenienceFee * 0.18);
  const gstOnSnacks = Math.round(snacksSubtotal * 0.05);
  const gstAmount = gstOnConvenience + gstOnSnacks;

  const grandTotal = ticketSubtotal + snacksSubtotal + convenienceFee + gstAmount;

  return {
    ticketSubtotal,
    snacksSubtotal,
    convenienceFee,
    gstAmount,
    grandTotal,
  };
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
