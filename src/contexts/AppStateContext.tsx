import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
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
  
  const { getLog, addMeal, removeMeal, moveMeal, addWater } = useDailyLog(selectedDate);
  const { entries: weightHistory, addEntry: addWeight } = useWeightHistory();

  const isReady = !profileLoading;

  return (
    <AppStateContext.Provider
      value={{
        profile,
        dailyLog: getLog(),
        weightHistory,
        selectedDate,
        onDateChange: setSelectedDate,
        onAddMeal: addMeal,
        onRemoveMeal: removeMeal,
        onMoveMeal: moveMeal,
        onAddWater: addWater,
        onAddWeight: addWeight,
        onUpdateProfile,
        isReady,
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
