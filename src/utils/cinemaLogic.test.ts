import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBookingBreakdown, calculateSeatPrice, formatINR } from './cinemaPricing';
import { recommendBestSeats, resolveEffectiveSeatStatus } from './seatAlgorithm';
import type { Seat, Snack } from '../types/cinema';

function makeSeat(
  id: number,
  rowLabel: string,
  rowIndex: number,
  colNumber: number,
  category: Seat['category'] = 'PRIME',
  status: Seat['status'] = 'AVAILABLE',
  pairGroup: string | null = null,
  lockExpiresAt: number | null = null
): Seat {
  return {
    id,
    screenId: 1,
    seatCode: `${rowLabel}${colNumber}`,
    rowLabel,
    rowIndex,
    colNumber,
    category,
    price: calculateSeatPrice(category),
    status,
    pairGroup,
    lockedByUserId: status === 'LOCKED' ? 99 : null,
    lockExpiresAt,
  };
}

test('calculateSeatPrice matches exact CINEVERSE category tiers', () => {
  assert.equal(calculateSeatPrice('ROYAL_RECLINER'), 550);
  assert.equal(calculateSeatPrice('BALCONY'), 320);
  assert.equal(calculateSeatPrice('PRIME'), 240);
  assert.equal(calculateSeatPrice('CLASSIC'), 160);
  assert.equal(formatINR(1250), '₹1,250');
});

test('calculateBookingBreakdown computes tickets, snacks, convenience fee, and GST', () => {
  const sampleSnack: Snack = {
    id: 1,
    name: 'Caramel Tub',
    description: 'Large popcorn',
    category: 'POPCORN',
    price: 320,
    imageUrl: '',
    calories: '420 kcal',
    isCombo: false,
    veg: true,
  };

  const breakdown = calculateBookingBreakdown(
    [{ price: 240 }, { price: 240 }],
    [{ snack: sampleSnack, quantity: 1 }]
  );

  assert.equal(breakdown.ticketSubtotal, 480);
  assert.equal(breakdown.snacksSubtotal, 320);
  assert.equal(breakdown.convenienceFee, 60); // 30 + 2 * 15
  assert.equal(breakdown.gstAmount, Math.round(60 * 0.18) + Math.round(320 * 0.05)); // 11 + 16 = 27
  assert.equal(breakdown.grandTotal, 480 + 320 + 60 + 27);
});

test('recommendBestSeats picks center adjacent PRIME seats and skips booked ones', () => {
  const seats: Seat[] = [
    // Classic front row (rowIndex 0)
    makeSeat(1, 'A', 0, 5, 'CLASSIC', 'AVAILABLE'),
    makeSeat(2, 'A', 0, 6, 'CLASSIC', 'AVAILABLE'),
    // Prime sweet spot row (rowIndex 4), cols 1..10, center is 5.5
    makeSeat(8, 'E', 4, 1, 'PRIME', 'BOOKED'),
    makeSeat(3, 'E', 4, 3, 'PRIME', 'AVAILABLE'),
    makeSeat(4, 'E', 4, 4, 'PRIME', 'AVAILABLE'),
    makeSeat(5, 'E', 4, 5, 'PRIME', 'BOOKED'), // Center col 5 is booked
    makeSeat(6, 'E', 4, 6, 'PRIME', 'AVAILABLE'),
    makeSeat(7, 'E', 4, 7, 'PRIME', 'AVAILABLE'),
    makeSeat(9, 'E', 4, 10, 'PRIME', 'BOOKED'),
  ];

  const picked = recommendBestSeats(seats, 2, 1000);
  assert.equal(picked.length, 2);
  assert.deepEqual(
    picked.map((s) => s.seatCode),
    ['E6', 'E7']
  );
});

test('recommendBestSeats never splits paired Royal Recliner seats', () => {
  const seats: Seat[] = [
    // Paired recliners: [1,2], [3,4], [5,6]
    makeSeat(10, 'R', 8, 1, 'ROYAL_RECLINER', 'AVAILABLE', 'R-1-2'),
    makeSeat(11, 'R', 8, 2, 'ROYAL_RECLINER', 'AVAILABLE', 'R-1-2'),
    makeSeat(12, 'R', 8, 3, 'ROYAL_RECLINER', 'AVAILABLE', 'R-3-4'),
    makeSeat(13, 'R', 8, 4, 'ROYAL_RECLINER', 'AVAILABLE', 'R-3-4'),
    makeSeat(14, 'R', 8, 5, 'ROYAL_RECLINER', 'AVAILABLE', 'R-5-6'),
    makeSeat(15, 'R', 8, 6, 'ROYAL_RECLINER', 'AVAILABLE', 'R-5-6'),
  ];

  // Center is 3.5 -> should choose intact pair R3 & R4, never R2 & R3 across pairs!
  const picked = recommendBestSeats(seats, 2, 1000);
  assert.deepEqual(
    picked.map((s) => s.seatCode),
    ['R3', 'R4']
  );

  // If R1 is booked, R2 alone cannot be picked with R3 (would split R-3-4)
  seats[0].status = 'BOOKED';
  seats[3].status = 'BOOKED'; // R4 booked too, leaving only R2, R3, R5, R6
  const pickedAfter = recommendBestSeats(seats, 2, 1000);
  assert.deepEqual(
    pickedAfter.map((s) => s.seatCode),
    ['R5', 'R6']
  );
});

test('resolveEffectiveSeatStatus treats expired locks as AVAILABLE', () => {
  const lockedSeat = makeSeat(20, 'D', 3, 5, 'PRIME', 'LOCKED', null, 5000);
  assert.equal(resolveEffectiveSeatStatus(lockedSeat, 4000, 1), 'LOCKED');
  assert.equal(resolveEffectiveSeatStatus(lockedSeat, 6000, 1), 'AVAILABLE');
});

import { getScreenSeatProfile, getTheatreCapacitySummary, summarizeSeatAvailability } from './screenLayout';
import { buildShowSeatLayout } from '../data/seedCatalog';

test('getScreenSeatProfile & buildShowSeatLayout produce accurate capacities per theatre screen type', () => {
  const imaxProfile = getScreenSeatProfile({ format: 'IMAX', screenName: 'IMAX Laser Audi 1' });
  assert.equal(imaxProfile.totalSeats, 114);
  const imaxSeats = buildShowSeatLayout(101, 1.15, { format: 'IMAX', screenName: 'IMAX Laser Audi 1' });
  assert.equal(imaxSeats.length, 114);

  const fourDxProfile = getScreenSeatProfile({ format: '4DX', screenName: '4DX Motion Audi 2' });
  assert.equal(fourDxProfile.totalSeats, 62);
  const fourDxSeats = buildShowSeatLayout(102, 1.2, { format: '4DX', screenName: '4DX Motion Audi 2' });
  assert.equal(fourDxSeats.length, 62);

  const luxeProfile = getScreenSeatProfile({ format: '2D', screenName: 'Luxe Lounge Audi 1', theatreName: 'Sathyam Luxe Cinema' });
  assert.equal(luxeProfile.totalSeats, 64);
  const luxeSeats = buildShowSeatLayout(103, 1.0, { format: '2D', screenName: 'Luxe Lounge Audi 1', theatreName: 'Sathyam Luxe Cinema' });
  assert.equal(luxeSeats.length, 64);

  const atmosProfile = getScreenSeatProfile({ format: '2D', screenName: 'Grand Atmos Audi 1' });
  assert.equal(atmosProfile.totalSeats, 88);
  const atmosSeats = buildShowSeatLayout(104, 1.0, { format: '2D', screenName: 'Grand Atmos Audi 1' });
  assert.equal(atmosSeats.length, 88);

  const summary = summarizeSeatAvailability(imaxSeats, { format: 'IMAX', screenName: 'IMAX Laser Audi 1', theatreName: 'CINEVERSE Grand IMAX' });
  assert.equal(summary.totalSeats, 114);
  assert.equal(summary.availableSeats + summary.bookedSeats + summary.lockedSeats, 114);
  assert.ok(summary.availableSeats > 0 && summary.availableSeats < 114);

  const cap = getTheatreCapacitySummary({ name: 'CINEVERSE Grand IMAX · Phoenix', amenities: ['Laser IMAX'] });
  assert.equal(cap.primaryCapacity, 114);
});

