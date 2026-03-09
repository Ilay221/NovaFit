import { describe, it, expect } from 'vitest';
import { deduplicateActiveCaloriesForDay } from '@/lib/wearables/deduplicateActiveCalories';

describe('deduplicateActiveCaloriesForDay', () => {
  it('prevents stacking when workout + steps overlap fully', () => {
    const day = '2026-03-08';
    const { totalKcal } = deduplicateActiveCaloriesForDay(
      [
        { start: '2026-03-08T10:00:00.000Z', end: '2026-03-08T11:00:00.000Z', kcal: 500, source: 'workout' },
        { start: '2026-03-08T10:00:00.000Z', end: '2026-03-08T11:00:00.000Z', kcal: 300, source: 'steps' },
      ],
      day
    );

    // overlap strategy is MAX, so result should be ~500 not 800
    expect(totalKcal).toBeGreaterThanOrEqual(490);
    expect(totalKcal).toBeLessThanOrEqual(510);
  });

  it('sums when sources do not overlap', () => {
    const day = '2026-03-08';
    const { totalKcal } = deduplicateActiveCaloriesForDay(
      [
        { start: '2026-03-08T08:00:00.000Z', end: '2026-03-08T09:00:00.000Z', kcal: 200, source: 'workout' },
        { start: '2026-03-08T12:00:00.000Z', end: '2026-03-08T13:00:00.000Z', kcal: 150, source: 'steps' },
      ],
      day
    );
    expect(totalKcal).toBeGreaterThanOrEqual(340);
    expect(totalKcal).toBeLessThanOrEqual(360);
  });

  it('handles partial overlap by keeping max during overlap and counting remainder', () => {
    const day = '2026-03-08';
    const { totalKcal } = deduplicateActiveCaloriesForDay(
      [
        { start: '2026-03-08T10:00:00.000Z', end: '2026-03-08T11:00:00.000Z', kcal: 400, source: 'workout' },
        { start: '2026-03-08T10:30:00.000Z', end: '2026-03-08T11:30:00.000Z', kcal: 300, source: 'steps' },
      ],
      day
    );

    // Expected roughly: 10:00-11:00 keep workout (400), 11:00-11:30 keep steps (150) => ~550
    expect(totalKcal).toBeGreaterThanOrEqual(520);
    expect(totalKcal).toBeLessThanOrEqual(580);
  });
});
