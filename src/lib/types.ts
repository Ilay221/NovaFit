export type AccentColor = 'green' | 'purple' | 'blue' | 'orange' | 'pink' | 'teal' | 'red' | 'amber' | 'indigo';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'late_night';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'בוקר',
  lunch: 'צהריים',
  dinner: 'ערב',
  snack: 'חטיף',
  late_night: 'לילה',
};

export const MEAL_TYPES = [
  { value: 'breakfast' as MealType, label: 'בוקר' },
  { value: 'lunch' as MealType, label: 'צהריים' },
  { value: 'dinner' as MealType, label: 'ערב' },
  { value: 'snack' as MealType, label: 'חטיף' },
  { value: 'late_night' as MealType, label: 'לילה' },
];

export function getCurrentMealType(): MealType {
  const hour = new Date().getHours();
  const minutes = new Date().getMinutes();
  const time = hour + minutes / 60;

  if (time >= 6 && time < 11) return 'breakfast';
  if (time >= 11 && time < 16.5) return 'lunch';
  if (time >= 16.5 && time < 19) return 'snack';
  if (time >= 19 && time < 23.5) return 'dinner';
  return 'late_night';
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Goal = 'lose' | 'maintain' | 'gain';

export type Gender = 'male' | 'female';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  isPremium?: boolean;
  calorieSpreadDays?: number; // 1, 3, 5, or 7 days
  targetDate?: string | null; // ISO date string e.g. '2026-06-15'
  favoriteFood?: string;
  dietaryWeakness?: string;
  dailyHabits?: string;
  medicalConditions?: string;
  shareCode?: string;
}

export type CoachingStatus = 'pending' | 'approved' | 'rejected';

export interface CoachingRelationship {
  id: string;
  coachId: string;
  clientId: string;
  status: CoachingStatus;
  createdAt: string;
}

export interface ClientProfile extends UserProfile {
  userId: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  category: string;
}

export interface MealEntry {
  id: string;
  foodItem: FoodItem;
  quantity: number;
  mealType: MealType;
  timestamp: string;
}

export interface DailyLog {
  date: string;
  meals: MealEntry[];
  waterMl: number;
  weightKg?: number;
  steps?: number;
  notes?: string;
}

export interface WeightEntry {
  date: string;
  weightKg: number;
}

export interface MealTemplate {
  id: string;
  name: string;
  items: { foodItem: FoodItem; quantity: number }[];
  mealType: MealType;
}
