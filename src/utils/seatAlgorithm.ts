import type { Seat, SeatStatus } from '../types/cinema';

/**
 * Resolves the effective seat status taking temporary lock expiration into account.
 */
export function resolveEffectiveSeatStatus(
  seat: Seat,
  nowMs: number,
  currentUserId?: number | null
): SeatStatus {
  if (seat.status === 'BOOKED') return 'BOOKED';
  if (seat.status === 'LOCKED') {
    if (seat.lockExpiresAt && seat.lockExpiresAt <= nowMs) {
      return 'AVAILABLE';
    }
    if (currentUserId != null && seat.lockedByUserId === currentUserId) {
      return 'AVAILABLE'; // User's own temporary lock can still be toggled
    }
    return 'LOCKED';
  }
  return seat.status;
}

/**
 * Enforces paired Royal Recliner integrity:
 * - If a seat belongs to a `pairGroup`, returns all seats in that pair unless one is unavailable.
 */
export function getSeatSelectionUnit(seat: Seat, allSeats: Seat[]): Seat[] {
  if (!seat.pairGroup) return [seat];
  const groupSeats = allSeats.filter(
    (s) => s.rowLabel === seat.rowLabel && s.pairGroup === seat.pairGroup
  );
  return groupSeats.sort((a, b) => a.colNumber - b.colNumber);
}

/**
 * Recommends the best `targetCount` (default 2) adjacent available seats near the auditorium center.
 * Rules:
 * - Never selects BOOKED or actively LOCKED seats.
 * - Never splits paired Royal Recliner seats (`pairGroup`).
 * - Prefers Prime / Balcony center rows (rowIndex 3..8) and columns closest to horizontal center.
 * - Requires seats in the recommendation to be contiguous (no gap or missing column across aisles).
 */
export function recommendBestSeats(
  seats: Seat[],
  targetCount = 2,
  nowMs = Date.now(),
  currentUserId?: number | null
): Seat[] {
  if (targetCount <= 0 || seats.length === 0) return [];

  const availableSeats = seats.filter(
    (seat) => resolveEffectiveSeatStatus(seat, nowMs, currentUserId) === 'AVAILABLE'
  );

  if (availableSeats.length < targetCount) return [];

  // Group available seats by rowLabel
  const rowsMap = new Map<string, Seat[]>();
  for (const seat of availableSeats) {
    const list = rowsMap.get(seat.rowLabel) ?? [];
    list.push(seat);
    rowsMap.set(seat.rowLabel, list);
  }

  // Compute global center column & ideal viewing row index
  const maxCol = Math.max(...seats.map((s) => s.colNumber));
  const minCol = Math.min(...seats.map((s) => s.colNumber));
  const centerCol = (maxCol + minCol) / 2;

  const maxRowIdx = Math.max(...seats.map((s) => s.rowIndex));
  const idealRowIdx = Math.round(maxRowIdx * 0.58); // Sweet spot: upper-mid auditorium

  let bestWindow: Seat[] = [];
  let bestScore = Infinity;

  for (const rowSeats of rowsMap.values()) {
    const sorted = [...rowSeats].sort((a, b) => a.colNumber - b.colNumber);
    if (sorted.length < targetCount) continue;

    for (let i = 0; i <= sorted.length - targetCount; i++) {
      const candidate = sorted.slice(i, i + targetCount);

      // Check strict column contiguity (no gaps / booked seats / aisles in between)
      let contiguous = true;
      for (let j = 1; j < candidate.length; j++) {
        if (candidate[j].colNumber - candidate[j - 1].colNumber !== 1) {
          contiguous = false;
          break;
        }
      }
      if (!contiguous) continue;

      // Enforce paired recliner rule: never split a pairGroup
      const candidateIds = new Set(candidate.map((s) => s.id));
      let splitsPair = false;
      for (const s of candidate) {
        if (s.pairGroup) {
          const partners = seats.filter(
            (other) => other.rowLabel === s.rowLabel && other.pairGroup === s.pairGroup
          );
          if (partners.some((p) => !candidateIds.has(p.id))) {
            splitsPair = true;
            break;
          }
        }
      }
      if (splitsPair) continue;

      // Score: lower is better
      const avgCol = candidate.reduce((sum, s) => sum + s.colNumber, 0) / candidate.length;
      const colDist = Math.abs(avgCol - centerCol);
      const rowDist = Math.abs(candidate[0].rowIndex - idealRowIdx);

      // Slight preference for Prime / Balcony sweet spot over front Classic rows
      const categoryPenalty =
        candidate[0].category === 'PRIME'
          ? 0
          : candidate[0].category === 'BALCONY'
            ? 0.4
            : candidate[0].category === 'ROYAL_RECLINER'
              ? 0.9
              : 2.2;

      const score = colDist * 1.4 + rowDist * 1.1 + categoryPenalty;

      if (score < bestScore) {
        bestScore = score;
        bestWindow = candidate;
      }
    }
  }

  return bestWindow;
}
