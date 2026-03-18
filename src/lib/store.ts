import { useState, useEffect, useCallback, useMemo } from 'react';
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("LocalStorage save failed", e);
  }
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => loadJSON('nova-theme', 'dark'));
  const [accent, setAccent] = useState<AccentColor>(() => loadJSON('nova-accent', 'green'));

  useEffect(() => {
    try {
      const root = document.documentElement;
      const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
      root.className = root.className.replace(/accent-\w+/g, '');
      root.classList.add(`accent-${accent}`);
      saveJSON('nova-theme', mode);
      saveJSON('nova-accent', accent);
    } catch (e) {
      console.error("Theme effect failed", e);
    }
  }, [mode, accent]);

  return { mode, setMode, accent, setAccent };
}

export function useProfile(viewingUserId?: string) {
  const { user } = useAuth();
  const effectiveUserId = viewingUserId || user?.id;
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUserId) { setProfileState(null); setLoading(false); return; }
    
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', effectiveUserId)
          .maybeSingle();
        
        if (data) {
          const storedSpread = localStorage.getItem(`nova_spread_days_${effectiveUserId}`);
          const parsedSpread = storedSpread ? parseInt(storedSpread, 10) : 5;
          const storedChatHarshness = localStorage.getItem(`nova_chat_harshness_${effectiveUserId}`);
          const storedCoachName = localStorage.getItem(`nova_coach_name_${effectiveUserId}`);

          setProfileState({
            id: data.id,
            name: data.name || '',
            age: data.age || 30,
            gender: (data.gender || 'male') as any,
            heightCm: data.height_cm || 170,
            weightKg: data.weight_kg || 70,
            targetWeightKg: data.target_weight_kg || 65,
            activityLevel: (data.activity_level || 'sedentary') as any,
            goal: (data.goal || 'lose') as any,
            bmr: data.bmr || 1600,
            tdee: data.tdee || 2000,
            dailyCalorieTarget: data.daily_calorie_target || 2000,
            proteinTarget: data.protein_target || 150,
            carbsTarget: data.carbs_target || 200,
            fatsTarget: data.fats_target || 70,
            isPremium: (data as any).is_premium ?? false,
            calorieSpreadDays: parsedSpread,
            targetDate: (data as any).target_date ?? null,
            favoriteFood: (data as any).favorite_food ?? '',
            dietaryWeakness: (data as any).dietary_weakness ?? '',
            dailyHabits: (data as any).daily_habits ?? '',
            medicalConditions: (data as any).medical_conditions ?? '',
            chatHarshness: (data as any).chat_harshness ?? storedChatHarshness ?? 'בינוני',
            coachName: (data as any).coach_name ?? storedCoachName ?? 'NovaFit AI',
            weeklyPaceKg: (data as any).weekly_pace_kg ?? 0.5,
            uniqueCode: (data as any).unique_code,
            lastSeen: (data as any).last_seen,
            dietaryPreferences: (data as any).dietary_preferences || [],
            otherDietary: (data as any).other_dietary || '',
          });
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [effectiveUserId]);

  const setProfile = useCallback(async (p: UserProfile | null) => {
    if (!user?.id) return;

    // If viewing another user, we don't allow permanent updates to their profile (or accidental overwrites of our own)
    if (viewingUserId) {
      if (p) setProfileState(p);
      return;
    }

    if (!p) {
      try {
        await supabase.from('profiles').delete().eq('id', user.id);
        localStorage.removeItem(`nova_spread_days_${user.id}`);
        setProfileState(null);
      } catch (e) { console.error(e); }
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
      chat_harshness: p.chatHarshness || 'בינוני',
      coach_name: p.coachName || 'NovaFit AI',
      weekly_pace_kg: p.weeklyPaceKg,
      dietary_preferences: p.dietaryPreferences || [],
      other_dietary: p.otherDietary || '',
      updated_at: new Date().toISOString(),
    };
    
    try {
      const { error } = await supabase.from('profiles').upsert(row);
      if (error) console.error("Error saving profile to Supabase:", error);
      
      if (p.calorieSpreadDays !== undefined) {
        localStorage.setItem(`nova_spread_days_${user.id}`, p.calorieSpreadDays.toString());
      }
      if (p.chatHarshness) {
        localStorage.setItem(`nova_chat_harshness_${user.id}`, p.chatHarshness);
      }
      if (p.coachName) {
        localStorage.setItem(`nova_coach_name_${user.id}`, p.coachName);
      }
      setProfileState(p);
    } catch (e) { console.error(e); }
  }, [user?.id, viewingUserId]);

  return { profile, setProfile, loading };
}

export function useDailyLog(selectedDate?: Date, viewingUserId?: string, dailyCalorieTarget?: number) {
  const { user } = useAuth();
  const effectiveUserId = viewingUserId || user?.id;
  const targetDateKey = format(selectedDate || new Date(), 'yyyy-MM-dd');
  
  const [pendingMeals, setPendingMeals] = useState<MealEntry[]>([]);
  const [dbMeals, setDbMeals] = useState<MealEntry[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [todayLogId, setTodayLogId] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveUserId) {
      try {
        const saved = localStorage.getItem(`nova_pending_meals_${effectiveUserId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setPendingMeals(parsed);
        }
      } catch (e) {
        console.error("Failed to load pending meals:", e);
      }
    }
  }, [effectiveUserId]);

  const fetchLog = useCallback(async () => {
    if (!effectiveUserId) return;
    
    try {
      let { data: log } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('date', targetDateKey)
        .maybeSingle();
      
      if (!log && !viewingUserId) {
        const { data: newLog, error: insertError } = await supabase
          .from('daily_logs')
          .insert({ user_id: effectiveUserId, date: targetDateKey, water_ml: 0 })
          .select()
          .maybeSingle();
        
        if (insertError) {
          console.error("Failed to create log, searching again:", insertError);
          // Try to select again in case of race condition
          const { data: retryLog } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', effectiveUserId)
            .eq('date', targetDateKey)
            .maybeSingle();
          log = retryLog;
        } else {
          log = newLog;
        }
      }
      
      if (!log) {
        console.warn("fetchLog: No log found or created for", targetDateKey);
        return;
      }
      setTodayLogId(log.id);
      setWaterMl(log.water_ml || 0);

      const { data: meals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('daily_log_id', log.id)
        .order('logged_at', { ascending: true });
      
      const mapped: MealEntry[] = (meals || []).map(m => ({
        id: m.id,
        foodItem: {
          id: m.id,
          name: m.food_name || 'Unknown',
          calories: m.calories || 0,
          protein: m.protein || 0,
          carbs: m.carbs || 0,
          fats: m.fats || 0,
          servingSize: m.serving_size || '',
          category: m.category || '',
        },
        quantity: m.quantity || 1,
        mealType: (m.meal_type || 'snack') as any,
        timestamp: m.logged_at || new Date().toISOString(),
      }));

      setDbMeals(mapped);
    } catch (err) {
      console.error("Critical error in fetchLog:", err);
    }
  }, [effectiveUserId, targetDateKey]);

  const todayLog = useMemo((): DailyLog => {
    const safePending = Array.isArray(pendingMeals) ? pendingMeals : [];
    const safeDb = Array.isArray(dbMeals) ? dbMeals : [];
    
    let relevantPending: MealEntry[] = [];
    try {
      relevantPending = safePending.filter(pm => {
        if (!pm || !pm.timestamp) return false;
        const d = new Date(pm.timestamp);
        return !isNaN(d.getTime()) && format(d, 'yyyy-MM-dd') === targetDateKey;
      });
    } catch (e) {
      console.error("Error filtering pending meals:", e);
    }

    return {
      date: targetDateKey,
      meals: [...safeDb, ...relevantPending],
      waterMl: waterMl || 0
    };
  }, [targetDateKey, dbMeals, pendingMeals, waterMl]);

  useEffect(() => {
    setDbMeals([]);
    setWaterMl(0);
    setTodayLogId(null);
    if (effectiveUserId) fetchLog();
  }, [targetDateKey, fetchLog, effectiveUserId]);

  const getOrCreateLogId = async (dateStr: string) => {
    if (!effectiveUserId || viewingUserId) return null;
    try {
      // 1. Try to find existing log
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('date', dateStr)
        .maybeSingle();
      
      if (existingLog) return existingLog.id;

      // 2. Not found, create it
      const { data: newLog, error: insertError } = await supabase
        .from('daily_logs')
        .insert({ 
          user_id: effectiveUserId, 
          date: dateStr, 
          water_ml: 0,
          base_calorie_target: dailyCalorieTarget || 2000,
          spread_days: 1,
          rollover_calories: 0,
          calorie_balance: 0
        })
        .select('id')
        .maybeSingle();
      
      if (newLog) return newLog.id;

      // 3. If insert failed (likely race condition), try select one last time
      const { data: retryLog } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('date', dateStr)
        .maybeSingle();
      
      return retryLog?.id || null;
    } catch (e) { 
      console.error("getOrCreateLogId failed:", e);
      return null; 
    }
  };

  useEffect(() => {
    if (!user?.id || !Array.isArray(pendingMeals) || pendingMeals.length === 0) return;

    const syncPending = async () => {
      try {
        const syncedIds: string[] = [];
        for (const meal of pendingMeals) {
          const mealDate = format(new Date(meal.timestamp || new Date()), 'yyyy-MM-dd');
          const correctLogId = await getOrCreateLogId(mealDate);
          if (!correctLogId) continue;

          const { error } = await supabase.from('meal_entries').insert({
            user_id: user.id,
            daily_log_id: correctLogId,
            food_name: meal.foodItem.name,
            calories: meal.foodItem.calories,
            protein: meal.foodItem.protein,
            carbs: meal.foodItem.carbs,
            fats: meal.foodItem.fats,
            serving_size: meal.foodItem.servingSize,
            category: meal.foodItem.category,
            quantity: meal.quantity,
            meal_type: meal.mealType,
            logged_at: meal.timestamp
          });
          if (!error) syncedIds.push(meal.id);
        }

        if (syncedIds.length > 0) {
          setPendingMeals(prev => {
            const newPending = prev.filter(m => !syncedIds.includes(m.id));
            localStorage.setItem(`nova_pending_meals_${user.id}`, JSON.stringify(newPending));
            return newPending;
          });
          fetchLog();
        }
      } catch (e) {
        console.error("Sync failed", e);
      }
    };

    const timer = setTimeout(syncPending, 800);
    return () => clearTimeout(timer);
  }, [user?.id, pendingMeals, fetchLog]);

  const getLog = useCallback((): DailyLog => todayLog, [todayLog]);

  const addMeal = useCallback(async (entry: MealEntry) => {
    if (!user?.id || viewingUserId) return;
    
    const mealWithId = { 
      ...entry, 
      id: entry.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7)), 
      timestamp: entry.timestamp || new Date().toISOString() 
    };

    try {
      // Optimistic update
      setDbMeals(prev => [...(prev || []), mealWithId]);

      const mealDate = format(new Date(mealWithId.timestamp), 'yyyy-MM-dd');
      let logId = todayLogId;
      
      // If adding to a different date or logId is null, get the correct one
      if (!logId || mealDate !== targetDateKey) {
        logId = await getOrCreateLogId(mealDate);
      }

      if (logId) {
        const { error } = await supabase.from('meal_entries').insert({
          user_id: user.id,
          daily_log_id: logId,
          food_name: mealWithId.foodItem.name,
          calories: mealWithId.foodItem.calories,
          protein: mealWithId.foodItem.protein,
          carbs: mealWithId.foodItem.carbs,
          fats: mealWithId.foodItem.fats,
          serving_size: mealWithId.foodItem.servingSize,
          category: mealWithId.foodItem.category,
          quantity: mealWithId.quantity,
          meal_type: mealWithId.mealType,
          logged_at: mealWithId.timestamp
        });
        
        if (error) throw error;
        
        // Final sync-up to ensure state matches DB
        await fetchLog();
      } else {
        throw new Error("Could not find or create daily log ID");
      }
    } catch (err) {
      console.error("Failed to add meal, ensuring local persistence:", err);
      // Revert optimistic update
      setDbMeals(prev => prev.filter(m => m.id !== mealWithId.id));
      
      setPendingMeals(prev => {
        const alreadyPending = (prev || []).some(m => m.id === mealWithId.id);
        if (alreadyPending) return prev;
        const updated = [...(prev || []), mealWithId];
        localStorage.setItem(`nova_pending_meals_${user.id}`, JSON.stringify(updated));
        return updated;
      });
      toast.info("נשמר בזיכרון המקומי ויסונכרן בהמשך...");
    }
  }, [user?.id, todayLogId, targetDateKey, fetchLog, getOrCreateLogId]);

  const removeMeal = useCallback(async (mealId: string) => {
    if (!user?.id || viewingUserId) return;
    const previousDbMeals = dbMeals;
    setDbMeals(prev => prev.filter(m => m.id !== mealId));
    try {
      const { error } = await supabase.from('meal_entries').delete().eq('id', mealId);
      if (error) throw error;
      setPendingMeals(prev => {
        const updated = (prev || []).filter(m => m.id !== mealId);
        localStorage.setItem(`nova_pending_meals_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Failed to remove meal:", err);
      setDbMeals(previousDbMeals);
      toast.error("שגיאה במחיקה.");
    }
  }, [user?.id, dbMeals]);

  const moveMeal = useCallback(async (mealId: string, newMealType: MealEntry['mealType']) => {
    if (!user?.id || viewingUserId) return;
    setDbMeals(prev => prev.map(m => (m.id === mealId ? { ...m, mealType: newMealType } : m)));
    try {
      const { error } = await supabase.from('meal_entries').update({ meal_type: newMealType }).eq('id', mealId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to move meal:", err);
      fetchLog(); 
      toast.error("שגיאה בהעברה.");
    }
  }, [user?.id, fetchLog]);

  const addWater = useCallback(async (ml: number) => {
    if (!user?.id || !todayLogId || viewingUserId) return;
    const newWater = (waterMl || 0) + ml;
    setWaterMl(newWater);
    try {
      const { error } = await supabase.from('daily_logs').update({ water_ml: newWater }).eq('id', todayLogId);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to add water:", e);
      fetchLog();
    }
  }, [user?.id, todayLogId, waterMl, fetchLog]);

  return { logs: {}, getLog, addMeal, removeMeal, moveMeal, addWater };
}

export function useWeightHistory(viewingUserId?: string) {
  const { user } = useAuth();
  const effectiveUserId = viewingUserId || user?.id;
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  useEffect(() => {
    if (!effectiveUserId) return;
    const fetch = async () => {
      try {
        const { data } = await supabase
          .from('weight_entries')
          .select('*')
          .eq('user_id', effectiveUserId)
          .order('date', { ascending: true });
        setEntries((data || []).map(e => ({ date: e.date, weightKg: e.weight_kg })));
      } catch (e) { console.error(e); }
    };
    fetch();
  }, [effectiveUserId]);

  const addEntry = useCallback(async (entry: WeightEntry) => {
    if (!effectiveUserId || viewingUserId) return;
    try {
      await supabase.from('weight_entries').upsert({
        user_id: effectiveUserId,
        date: entry.date,
        weight_kg: entry.weightKg,
      }, { onConflict: 'user_id,date' });
      setEntries(prev => [...prev.filter(e => e.date !== entry.date), entry].sort((a, b) => a.date.localeCompare(b.date)));
    } catch (e) { console.error(e); }
  }, [effectiveUserId, viewingUserId]);

  return { entries, addEntry };
}

export function useConnections() {
  const { user } = useAuth();
  const [trainees, setTrainees] = useState<UserProfile[]>([]);
  const [coaches, setCoaches] = useState<{ id: string; profile: UserProfile }[]>([]);
  const [requests, setRequests] = useState<{ id: string; coach: UserProfile }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch trainees (where current user is coach)
      const { data: traineeConns } = await (supabase
        .from('user_connections' as any) as any)
        .select('trainee_id, status, profiles:trainee_id(*)')
        .eq('coach_id', user.id);

      if (traineeConns) {
        const acceptedTrainees = (traineeConns || [])
          .filter(c => c.status === 'accepted' && c.profiles)
          .map((c: any) => ({
            id: c.profiles.id,
            name: c.profiles.name || 'משתמש ללא שם',
            uniqueCode: c.profiles.unique_code,
            lastSeen: c.profiles.last_seen,
          } as UserProfile));
        setTrainees(acceptedTrainees);
      }

      // Fetch pending requests (where current user is trainee)
      const { data: incomingRequests } = await (supabase
        .from('user_connections' as any) as any)
        .select('id, coach_id, status, profiles:coach_id(*)')
        .eq('trainee_id', user.id)
        .eq('status', 'pending');

      if (incomingRequests) {
        setRequests(incomingRequests
          .filter((r: any) => r.profiles)
          .map((r: any) => ({
            id: r.id,
            coach: {
              id: r.profiles.id,
              name: r.profiles.name || 'מאמן',
              uniqueCode: r.profiles.unique_code,
            } as UserProfile
          })));
      }

      // Fetch accepted coaches (where current user is trainee)
      const { data: coachConns } = await (supabase
        .from('user_connections' as any) as any)
        .select('id, coach_id, status, profiles:coach_id(*)')
        .eq('trainee_id', user.id)
        .eq('status', 'accepted');

      if (coachConns) {
        setCoaches(coachConns
          .filter((c: any) => c.profiles)
          .map((c: any) => ({
            id: c.id,
            profile: {
              id: c.profiles.id,
              name: c.profiles.name || 'מאמן',
              uniqueCode: c.profiles.unique_code,
              lastSeen: c.profiles.last_seen,
            } as UserProfile
          })));
      }
    } catch (e) {
      console.error("Error fetching connections:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addTraineeByCode = async (code: string) => {
    if (!user?.id) return { error: "Not authenticated" };
    try {
      // First find the user with this code
      const { data: trainee } = await (supabase
        .from('profiles')
        .select('id')
        .ilike('unique_code', code.trim()) as any)
        .maybeSingle();

      if (!trainee) return { error: "משתמש לא נמצא" };
      if (trainee.id === user.id) return { error: "אי אפשר להוסיף את עצמך" };

      const { error } = await (supabase
        .from('user_connections' as any) as any)
        .insert({
          coach_id: user.id,
          trainee_id: trainee.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') return { error: "כבר קיימת בקשה למשתמש זה" };
        throw error;
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { error: "שגיאה בחיבור" };
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        await (supabase
          .from('user_connections' as any) as any)
          .update({ status: 'accepted' })
          .eq('id', requestId);
      } else {
        await (supabase
          .from('user_connections' as any) as any)
          .delete()
          .eq('id', requestId);
      }
      fetchConnections();
    } catch (e) {
      console.error(e);
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      await (supabase
        .from('user_connections' as any) as any)
        .delete()
        .eq('id', connectionId);
      
      fetchConnections();
      return { success: true };
    } catch (e) {
      console.error(e);
      return { error: "שגיאה במחיקת החיבור" };
    }
  };

  return { trainees, coaches, requests, loading, addTraineeByCode, respondToRequest, removeConnection, refresh: fetchConnections };
}
