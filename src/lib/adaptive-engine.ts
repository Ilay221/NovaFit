import { UserProfile, Gender, Goal, WeightEntry } from './types';
import { calculateBMR, calculateTDEE, calculateMacros } from './calculations';
import { differenceInDays, parseISO } from 'date-fns';

// 1 kg of body fat ≈ 7,700 kcal
const KCAL_PER_KG = 7700;

// Safety floors
function getMinCalories(gender: Gender): number {
  return gender === 'male' ? 1500 : 1200;
}

export interface AdaptiveResult {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  isSafe: boolean;
  unsafeReason?: string;
  safestDate?: string; // earliest safe target date if current is unsafe
  dailyDeficit: number;
  daysRemaining: number;
}

/**
 * Reverse-engineers daily calorie target from a deadline.
 * Acts as a "GPS recalibration" — uses latest weight + remaining days.
 */
export function calculateAdaptiveTargets(
  profile: UserProfile,
  weightHistory: WeightEntry[],
  todayCaloriesConsumed: number = 0,
): AdaptiveResult {
  const { targetDate, goal, gender, heightCm, age, activityLevel, targetWeightKg } = profile;

  // Use latest weight or profile weight
  const currentWeight = weightHistory.length > 0
    ? weightHistory[weightHistory.length - 1].weightKg
    : profile.weightKg;

  // If no target date set, fall back to standard calculation
  if (!targetDate || goal === 'maintain') {
    const bmr = calculateBMR(gender, currentWeight, heightCm, age);
    const tdee = calculateTDEE(bmr, activityLevel);
    const macros = calculateMacros(profile.dailyCalorieTarget, goal);
    return {
      dailyCalorieTarget: profile.dailyCalorieTarget,
      proteinTarget: macros.protein,
      carbsTarget: macros.carbs,
      fatsTarget: macros.fats,
      isSafe: true,
      dailyDeficit: 0,
      daysRemaining: 0,
    };
  }

  const today = new Date();
  const deadline = parseISO(targetDate);
  const daysRemaining = Math.max(differenceInDays(deadline, today), 1);

  // Recalculate BMR with current weight
  const bmr = calculateBMR(gender, currentWeight, heightCm, age);
  const tdee = calculateTDEE(bmr, activityLevel);

  // Total kcal change needed
  const weightDiff = currentWeight - targetWeightKg; // positive = need to lose

  // Guardrails: if user is already at/over the target for their goal direction, don't "flip" the math.
  // This prevents inflated targets (e.g. 3000+ kcal) when goal/target weight are inconsistent.
  const goalDirectionSatisfied =
    (goal === 'lose' && weightDiff <= 0) ||
    (goal === 'gain' && weightDiff >= 0);

  if (goalDirectionSatisfied) {
    const macros = calculateMacros(profile.dailyCalorieTarget, goal);
    return {
      dailyCalorieTarget: profile.dailyCalorieTarget,
      proteinTarget: macros.protein,
      carbsTarget: macros.carbs,
      fatsTarget: macros.fats,
      isSafe: true,
      dailyDeficit: 0,
      daysRemaining,
    };
  }

  const totalKcalNeeded = weightDiff * KCAL_PER_KG;

  // Daily deficit/surplus needed
  const dailyDeficit = totalKcalNeeded / daysRemaining;

  // Target calories
  let dailyCalorieTarget = Math.round(tdee - dailyDeficit);

  const minCal = getMinCalories(gender);
  let isSafe = true;
  let unsafeReason: string | undefined;
  let safestDate: string | undefined;

  if (dailyCalorieTarget < minCal) {
    isSafe = false;
    unsafeReason = `Reaching your goal by this date requires eating only ${dailyCalorieTarget} kcal/day, which is below the safe minimum of ${minCal} kcal.`;
    
    // Calculate the nearest safe date
    const safeDeficit = tdee - minCal;
    if (safeDeficit > 0) {
      const safeDays = Math.ceil(totalKcalNeeded / safeDeficit);
      const safeDate = new Date();
      safeDate.setDate(safeDate.getDate() + safeDays);
      safestDate = safeDate.toISOString().slice(0, 10);
    }
    
    // Cap to safe minimum
    dailyCalorieTarget = minCal;
  }

  // For gain goals, cap at reasonable surplus (TDEE + 1000)
  const maxCal = tdee + 1000;
  if (goal === 'gain' && dailyCalorieTarget > maxCal) {
    isSafe = false;
    unsafeReason = `Reaching your goal by this date requires eating ${dailyCalorieTarget} kcal/day, which is an excessive surplus.`;
    dailyCalorieTarget = maxCal;
  }

  const macros = calculateMacros(dailyCalorieTarget, goal);

  return {
    dailyCalorieTarget,
    proteinTarget: macros.protein,
    carbsTarget: macros.carbs,
    fatsTarget: macros.fats,
    isSafe,
    unsafeReason,
    safestDate,
    dailyDeficit: Math.round(dailyDeficit),
    daysRemaining,
  };
}
