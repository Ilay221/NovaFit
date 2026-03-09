import { Goal } from './types';

const MAX_REASONABLE_KCAL = 10000;

export function sanitizeKcalTarget(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 0) return fallback;
  return Math.min(rounded, MAX_REASONABLE_KCAL);
}

export function isSuspiciousInflation(params: {
  goal: Goal;
  persistedTargetKcal: number;
  computedTargetKcal: number;
}): boolean {
  const persisted = sanitizeKcalTarget(params.persistedTargetKcal, 0);
  const computed = sanitizeKcalTarget(params.computedTargetKcal, persisted);

  // For lose/maintain, any increase is suspicious (common double-counting symptom).
  if (params.goal !== 'gain' && computed > persisted) return true;

  // Generic guard: sudden huge targets are always suspicious.
  if (computed > 5000) return true;

  return false;
}
