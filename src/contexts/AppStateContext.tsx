import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile, useDailyLog, useWeightHistory } from '@/lib/store';
import { UserProfile, DailyLog, WeightEntry, MealEntry } from '@/lib/types';

interface AppStateContextType {
  profile: UserProfile | null;
  dailyLog: DailyLog;
  weightHistory: WeightEntry[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddMeal: (entry: MealEntry) => void;
  onRemoveMeal: (id: string) => void;
  onMoveMeal: (id: string, newMealType: MealEntry['mealType']) => void;
  onAddWater: (ml: number) => void;
  onAddWeight: (entry: WeightEntry) => void;
  onUpdateProfile: (profile: UserProfile | null) => void;
  isReady: boolean;
  viewingClientId: string | null;
  setViewingClientId: (id: string | null) => void;
  clientProfile: UserProfile | null;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { profile: dbProfile, setProfile: setDbProfile, loading: profileLoading } = useProfile();
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('nova_last_profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [clientProfile, setClientProfile] = useState<UserProfile | null>(null);

  // Sync DB profile to local if available, else use local
  const profile = dbProfile || localProfile;

  const onUpdateProfile = useCallback(async (p: UserProfile | null) => {
    setLocalProfile(p);
    if (p) {
      localStorage.setItem('nova_last_profile', JSON.stringify(p));
    } else {
      localStorage.removeItem('nova_last_profile');
    }
    await setDbProfile(p);
  }, [setDbProfile]);
  
  const { getLog: getPersonalLog, addMeal, removeMeal, moveMeal, addWater } = useDailyLog(selectedDate);
  const { entries: personalWeightHistory, addEntry: addWeight } = useWeightHistory();

  const { getLog: getClientLog } = useDailyLog(selectedDate, viewingClientId || undefined);
  const { entries: clientWeightHistory } = useWeightHistory(viewingClientId || undefined);

  useEffect(() => {
    if (!viewingClientId) {
      setClientProfile(null);
      return;
    }
    const fetchClientProfile = async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', viewingClientId).maybeSingle();
      if (data) {
        setClientProfile({
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
        });
      }
    };
    fetchClientProfile();
  }, [viewingClientId]);

  const isReady = !profileLoading;

  return (
    <AppStateContext.Provider
      value={{
        profile: viewingClientId ? clientProfile : profile,
        dailyLog: viewingClientId ? getClientLog() : getPersonalLog(),
        weightHistory: viewingClientId ? clientWeightHistory : personalWeightHistory,
        selectedDate,
        onDateChange: setSelectedDate,
        onAddMeal: viewingClientId ? () => {} : addMeal,
        onRemoveMeal: viewingClientId ? () => {} : removeMeal,
        onMoveMeal: viewingClientId ? () => {} : moveMeal,
        onAddWater: viewingClientId ? () => {} : addWater,
        onAddWeight: viewingClientId ? () => {} : addWeight,
        onUpdateProfile,
        isReady,
        viewingClientId,
        setViewingClientId,
        clientProfile,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
