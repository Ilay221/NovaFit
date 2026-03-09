export type WearableEnergySource = 'workout' | 'steps' | 'other';

export interface WearableEnergySample {
  /** Inclusive start timestamp */
  start: string | Date;
  /** Exclusive end timestamp; if missing/invalid, sample is treated as 1-minute long */
  end?: string | Date;
  /** Total kcal for the sample window */
  kcal: number;
  source: WearableEnergySource;
  /** Optional stable id from the provider */
  sourceId?: string;
}

export interface DeduplicateOptions {
  /** Minute granularity is the safest default and fast enough for a single day */
  bucketMinutes?: number; // default 1
  /** When multiple sources overlap, we keep the highest per-bucket kcal (prevents stacking). */
  overlapStrategy?: 'max'; // only supported for now
}

function toDate(d: string | Date | undefined): Date | null {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Robust deduplication of "active calories" across overlapping sources (e.g. workout kcal + steps kcal).
 *
 * We bucket the day into N-minute windows and, for each bucket, keep the MAX kcal across sources.
 * This prevents double counting when multiple devices track the same activity.
 */
export function deduplicateActiveCaloriesForDay(
  samples: WearableEnergySample[],
  day: string | Date,
  options: DeduplicateOptions = {}
): { totalKcal: number; buckets: number[] } {
  const bucketMinutes = options.bucketMinutes ?? 1;
  const overlapStrategy = options.overlapStrategy ?? 'max';
  if (overlapStrategy !== 'max') throw new Error('Unsupported overlapStrategy');

  const dayDate = toDate(day);
  if (!dayDate) return { totalKcal: 0, buckets: [] };

  const startOfDay = new Date(dayDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const bucketsPerDay = Math.ceil((24 * 60) / bucketMinutes);
  const maxPerBucket = new Float64Array(bucketsPerDay);

  for (const s of samples) {
    const start = toDate(s.start);
    const endRaw = toDate(s.end);
    if (!start) continue;

    // Normalize end: at least 1 minute window
    const end = endRaw && endRaw > start ? endRaw : new Date(start.getTime() + 60_000);

    // Skip if no overlap with the day
    if (end <= startOfDay || start >= endOfDay) continue;

    const kcal = typeof s.kcal === 'number' ? s.kcal : Number(s.kcal);
    if (!Number.isFinite(kcal) || kcal <= 0) continue;

    const windowStart = start < startOfDay ? startOfDay : start;
    const windowEnd = end > endOfDay ? endOfDay : end;

    const durationMin = Math.max(1, (windowEnd.getTime() - windowStart.getTime()) / 60_000);
    const kcalPerMin = kcal / durationMin;

    const startMinOfDay = (windowStart.getTime() - startOfDay.getTime()) / 60_000;
    const endMinOfDay = (windowEnd.getTime() - startOfDay.getTime()) / 60_000;

    const startBucket = clamp(Math.floor(startMinOfDay / bucketMinutes), 0, bucketsPerDay - 1);
    const endBucket = clamp(Math.ceil(endMinOfDay / bucketMinutes), 0, bucketsPerDay);

    for (let b = startBucket; b < endBucket; b++) {
      // Approximate bucket allocation uniformly; correctness comes from using MAX across sources.
      const bucketKcal = kcalPerMin * bucketMinutes;
      if (bucketKcal > maxPerBucket[b]) maxPerBucket[b] = bucketKcal;
    }
  }

  const buckets = Array.from(maxPerBucket, v => Math.round(v * 100) / 100);
  const totalKcal = Math.round(buckets.reduce((a, b) => a + b, 0));

  return { totalKcal, buckets };
}
