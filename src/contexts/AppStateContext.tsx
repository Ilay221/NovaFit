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
  viewingUserId: string | null;
  setViewingUserId: (id: string | null) => void;
  isViewing: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const { profile, setProfile, loading: profileLoading } = useProfile(viewingUserId || undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { getLog, addMeal, removeMeal, moveMeal, addWater } = useDailyLog(selectedDate, viewingUserId || undefined, profile?.dailyCalorieTarget);
  const { entries: weightHistory, addEntry: addWeight } = useWeightHistory(viewingUserId || undefined);

  const isReady = !profileLoading;
  const isViewing = !!viewingUserId;

  // Update last_seen
  useEffect(() => {
    if (!profile?.id || isViewing) return;

    const updateLastSeen = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await (supabase
          .from('profiles' as any) as any)
          .update({ last_seen: new Date().toISOString() })
          .eq('id', profile.id);
      } catch (e) {
        console.error("Failed to update last_seen:", e);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [profile?.id, isViewing]);

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
        viewingUserId,
        setViewingUserId,
        isViewing,
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
