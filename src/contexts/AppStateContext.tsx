import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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
  const { profile, setProfile, loading: profileLoading } = useProfile();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
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
        onUpdateProfile: setProfile as any,
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
