import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PLACES_SEARCH_RADIUS_METERS,
  clampSearchRadiusMeters,
  formatDistanceKm,
  haversineDistanceMeters,
  isQuotaErrorMessage,
  sortByDistanceAsc,
} from './geoDistance';

test('clampSearchRadiusMeters enforces 500m floor and 50km ceiling', () => {
  assert.equal(clampSearchRadiusMeters(100), 500);
  assert.equal(clampSearchRadiusMeters(8500), 8500);
  assert.equal(clampSearchRadiusMeters(120000), MAX_PLACES_SEARCH_RADIUS_METERS);
  assert.equal(clampSearchRadiusMeters(NaN), 5000);
});

test('haversineDistanceMeters computes realistic distance and formatDistanceKm formats meters/km', () => {
  const a = { lat: 13.0827, lng: 80.2707 };
  const b = { lat: 13.0067, lng: 80.2206 };
  const dist = haversineDistanceMeters(a, b);
  assert.ok(dist > 8000 && dist < 12000);
  assert.equal(formatDistanceKm(420), '420 m away');
  assert.equal(formatDistanceKm(3450), '3.5 km away');
  assert.equal(formatDistanceKm(null), 'Nearby');
});

test('sortByDistanceAsc sorts closest places first and pushes null distances last', () => {
  const sorted = sortByDistanceAsc([
    { id: 'c', distanceMeters: null },
    { id: 'b', distanceMeters: 4200 },
    { id: 'a', distanceMeters: 950 },
  ]);
  assert.deepEqual(
    sorted.map((x) => x.id),
    ['a', 'b', 'c']
  );
});

test('isQuotaErrorMessage detects GMP quota exhaustion errors without false positives', () => {
  assert.equal(isQuotaErrorMessage(new Error('RESOURCE_EXHAUSTED: daily quota')), true);
  assert.equal(isQuotaErrorMessage('OVER_QUERY_LIMIT'), true);
  assert.equal(isQuotaErrorMessage(new Error('NOT_FOUND: 0 results')), false);
});
