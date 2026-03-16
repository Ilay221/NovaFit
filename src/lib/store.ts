import { useState, useEffect, useCallback } from 'react';
import { AccentColor, ThemeMode, UserProfile, DailyLog, MealEntry, WeightEntry } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => loadJSON('nova-theme', 'dark'));
  const [accent, setAccent] = useState<AccentColor>(() => loadJSON('nova-accent', 'green'));

  useEffect(() => {
    const root = document.documentElement;
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    root.className = root.className.replace(/accent-\w+/g, '');
    root.classList.add(`accent-${accent}`);
    saveJSON('nova-theme', mode);
    saveJSON('nova-accent', accent);
  }, [mode, accent]);

  return { mode, setMode, accent, setAccent };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfileState(null); setLoading(false); return; }
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data) {
        // Read local storage fallback for calorieSpreadDays
        const storedSpread = localStorage.getItem(`nova_spread_days_${user.id}`);
        const parsedSpread = storedSpread ? parseInt(storedSpread, 10) : 5;

        setProfileState({
          name: data.name,
          age: data.age,
          gender: data.gender as any,
          heightCm: data.height_cm,
          weightKg: data.weight_kg,
          targetWeightKg: data.target_weight_kg,
          activityLevel: data.activity_level as any,
          goal: data.goal as any,
          bmr: data.bmr,
          tdee: data.tdee,
          dailyCalorieTarget: data.daily_calorie_target,
          proteinTarget: data.protein_target,
          carbsTarget: data.carbs_target,
          fatsTarget: data.fats_target,
          isPremium: (data as any).is_premium ?? false,
          calorieSpreadDays: parsedSpread,
          targetDate: (data as any).target_date ?? null,
          favoriteFood: (data as any).favorite_food ?? '',
          dietaryWeakness: (data as any).dietary_weakness ?? '',
          dailyHabits: (data as any).daily_habits ?? '',
          medicalConditions: (data as any).medical_conditions ?? '',
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const setProfile = useCallback(async (p: UserProfile | null) => {
    if (!user) return;
    if (!p) {
      await supabase.from('profiles').delete().eq('id', user.id);
      localStorage.removeItem(`nova_spread_days_${user.id}`);
      setProfileState(null);
      return;
    }
    
    const row = {
      id: user.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      height_cm: p.heightCm,
      weight_kg: p.weightKg,
      target_weight_kg: p.targetWeightKg,
      activity_level: p.activityLevel,
      goal: p.goal,
      bmr: p.bmr,
      tdee: p.tdee,
      daily_calorie_target: p.dailyCalorieTarget,
      protein_target: p.proteinTarget,
      carbs_target: p.carbsTarget,
      fats_target: p.fatsTarget,
      target_date: p.targetDate || null,
      favorite_food: p.favoriteFood || '',
      dietary_weakness: p.dietaryWeakness || '',
      daily_habits: p.dailyHabits || '',
      medical_conditions: p.medicalConditions || '',
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase.from('profiles').upsert(row);
    if (error) console.error("Error saving profile to Supabase:", error);
    
    if (p.calorieSpreadDays !== undefined) {
      localStorage.setItem(`nova_spread_days_${user.id}`, p.calorieSpreadDays.toString());
    }

    setProfileState(p);
  }, [user]);

  return { profile, setProfile, loading };
}

const todayKey = () => format(new Date(), 'yyyy-MM-dd');

export function useDailyLog(selectedDate?: Date) {
  const { user } = useAuth();
  
  // Compute the string key for the currently requested date
  const targetDateKey = format(selectedDate || new Date(), 'yyyy-MM-dd');
  
  const [todayLog, setTodayLog] = useState<DailyLog>({ date: targetDateKey, meals: [], waterMl: 0 });
  const [todayLogId, setTodayLogId] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    if (!user) return;
    
    // Get or create daily log for the target date
    let { data: log } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDateKey)
      .maybeSingle();
    
    if (!log) {
      const { data: newLog, error } = await supabase
        .from('daily_logs')
        .insert({ user_id: user.id, date: targetDateKey, water_ml: 0 })
        .select()
        .maybeSingle();
      
      log = newLog;
      
      // Handle potential race condition (Unique Constraint Violation)
      if (error || !log) {
        const { data: fallbackLog } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', targetDateKey)
          .single();
        log = fallbackLog;
      }
    }
    
    if (!log) return;
    setTodayLogId(log.id);

    // Fetch meals
    const { data: meals } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('daily_log_id', log.id)
      .order('logged_at', { ascending: true });
    
    const mealEntries: MealEntry[] = (meals || []).map(m => ({
      id: m.id,
      foodItem: {
        id: m.id,
        name: m.food_name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fats: m.fats,
        servingSize: m.serving_size,
        category: m.category,
      },
      quantity: m.quantity,
      mealType: m.meal_type as any,
      timestamp: m.logged_at,
    }));

    setTodayLog({ date: targetDateKey, meals: mealEntries, waterMl: log.water_ml });
  }, [user, targetDateKey]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const getLog = useCallback((): DailyLog => todayLog, [todayLog]);

  const addMeal = useCallback(async (entry: MealEntry) => {
    if (!user || !todayLogId) {
      console.warn("Attempted to add meal without user or log ID");
      return;
    }
    
    // Add logic to avoid double-adding if called rapidly
    try {
      const { error } = await supabase.from('meal_entries').insert({
        user_id: user.id,
        daily_log_id: todayLogId,
        food_name: entry.foodItem.name,
        calories: entry.foodItem.calories,
        protein: entry.foodItem.protein,
        carbs: entry.foodItem.carbs,
        fats: entry.foodItem.fats,
        serving_size: entry.foodItem.servingSize,
        category: entry.foodItem.category,
        quantity: entry.quantity,
        meal_type: entry.mealType,
      });

      if (error) throw error;
      
      // Refresh to get the actual database ID for the new meal
      await fetchLog();
    } catch (err) {
      console.error("Failed to add meal:", err);
      toast.error("שגיאה ברישום הארוחה. נסה שנית.");
    }
  }, [user, todayLogId, fetchLog]);

  const removeMeal = useCallback(async (mealId: string) => {
    if (!user) return;
    
    // Optimistic delete
    const previousMeals = todayLog.meals;
    setTodayLog(prev => ({
      ...prev,
      meals: prev.meals.filter(m => m.id !== mealId)
    }));

    try {
      const { error } = await supabase.from('meal_entries').delete().eq('id', mealId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to remove meal:", err);
      // Rollback on error
      setTodayLog(prev => ({ ...prev, meals: previousMeals }));
      toast.error("שגיאה במחיקת הארוחה.");
    }
  }, [user, todayLog.meals]);

  const moveMeal = useCallback(async (mealId: string, newMealType: MealEntry['mealType']) => {
    if (!user) return;

    // Optimistic update
    const previousMeals = todayLog.meals;
    setTodayLog(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.id === mealId ? { ...m, mealType: newMealType } : m),
    }));

    try {
      const { error } = await supabase.from('meal_entries').update({ meal_type: newMealType }).eq('id', mealId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to move meal:", err);
      // Rollback on error
      setTodayLog(prev => ({ ...prev, meals: previousMeals }));
      toast.error("שגיאה בהעברת הארוחה.");
    }
  }, [user, todayLog.meals]);

  const addWater = useCallback(async (ml: number) => {
    if (!user || !todayLogId) return;
    const newWater = todayLog.waterMl + ml;
    await supabase.from('daily_logs').update({ water_ml: newWater }).eq('id', todayLogId);
    setTodayLog(prev => ({ ...prev, waterMl: newWater }));
  }, [user, todayLogId, todayLog.waterMl]);

  return { logs: {}, getLog, addMeal, removeMeal, moveMeal, addWater };
}

export function useWeightHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      setEntries((data || []).map(e => ({ date: e.date, weightKg: e.weight_kg })));
    };
    fetch();
  }, [user]);

  const addEntry = useCallback(async (entry: WeightEntry) => {
    if (!user) return;
    await supabase.from('weight_entries').upsert({
      user_id: user.id,
      date: entry.date,
      weight_kg: entry.weightKg,
    }, { onConflict: 'user_id,date' });
    
    setEntries(prev => {
      const updated = [...prev.filter(e => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date));
      return updated;
    });
  }, [user]);

  return { entries, addEntry };
}
