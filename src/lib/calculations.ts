import { ActivityLevel, Gender, Goal } from './types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (gender === 'male') {
    return Math.round(88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age);
  }
  return Math.round(447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age);
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'lose': return Math.round(tdee - 500);
    case 'gain': return Math.round(tdee + 300);
    default: return tdee;
  }
}

export function calculateMacros(calorieTarget: number, goal: Goal) {
  let proteinRatio: number, fatRatio: number;
  if (goal === 'lose') { proteinRatio = 0.35; fatRatio = 0.25; }
  else if (goal === 'gain') { proteinRatio = 0.30; fatRatio = 0.25; }
  else { proteinRatio = 0.30; fatRatio = 0.30; }
  const carbRatio = 1 - proteinRatio - fatRatio;
  return {
    protein: Math.round((calorieTarget * proteinRatio) / 4),
    carbs: Math.round((calorieTarget * carbRatio) / 4),
    fats: Math.round((calorieTarget * fatRatio) / 9),
  };
}

export function predictGoalDate(
  currentWeight: number,
  targetWeight: number,
  weeklyChangeKg: number = 0.5
): Date {
  const diff = Math.abs(currentWeight - targetWeight);
  const weeks = diff / weeklyChangeKg;
  const date = new Date();
  date.setDate(date.getDate() + Math.round(weeks * 7));
  return date;
}
