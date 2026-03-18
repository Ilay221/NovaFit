import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, DailyLog } from '@/lib/types';
import { format, subDays, isSameDay } from 'date-fns';

export interface CalorieBankingResult {
  /** The dynamic target for today (base ± rollover) */
  dynamicTarget: number;
  /** The base daily target from the profile */
  baseTarget: number;
  /** Rollover amount (positive = saved, negative = overage debt) */
  rollover: number;
  /** How many days the overage is being spread across (0 = no spread) */
  spreadDays: number;
  /** Human-readable explanation of today's goal */
  explanation: string;
  /** Coaching insight message */
  coachMessage: string;
  /** 'saved' | 'overage' | 'neutral' */
  status: 'saved' | 'overage' | 'neutral';
  /** The dynamically predicted calorie target for tomorrow based on current consumption */
  tomorrowProjectedTarget: number;
  /** Whether data has loaded */
  loading: boolean;
  /** Whether the user is viewing the real today (not a past day) */
  isViewingToday: boolean;
}

const LOOKBACK_DAYS = 7; // Increased from 3 to ensure debt doesn't disappear too quickly

/**
 * Fetches a day's log + meals from Supabase and returns its consumed total.
 */
async function fetchDayData(userId: string, dateKey: string) {
  const { data: log } = await supabase
    .from('daily_logs')
    .select('id, base_calorie_target, rollover_calories, spread_days, calorie_balance')
    .eq('user_id', userId)
    .eq('date', dateKey)
    .maybeSingle();

  if (!log) return null;

  const { data: meals } = await supabase
    .from('meal_entries')
    .select('calories, quantity')
    .eq('daily_log_id', log.id);

  const consumed = (meals || []).reduce(
    (sum: number, m: any) => sum + m.calories * m.quantity, 0
  );

  return { log, consumed };
}

export function useCalorieBanking(
  profile: UserProfile | null,
  currentDayLog: DailyLog,
  selectedDate: Date,
): CalorieBankingResult {
  const { user } = useAuth();
  const [rollover, setRollover] = useState(0);
  const [spreadDays, setSpreadDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseTarget = profile?.dailyCalorieTarget ?? 2000;
  const calFloor = profile?.gender === 'female' ? 800 : 1000;
  const isViewingToday = isSameDay(selectedDate, new Date());

  // Create a fingerprint of the current log's meals to detect changes
  const mealFingerprint = useMemo(() => {
    return currentDayLog.meals.map(m => `${m.id}:${m.foodItem.calories * m.quantity}`).join(',');
  }, [currentDayLog.meals]);

  // Calculate consumed for the currently viewed day
  const consumed = useMemo(() =>
    currentDayLog.meals.reduce((sum, m) => sum + m.foodItem.calories * m.quantity, 0),
    [currentDayLog.meals]
  );

  /**
   * MULTI-DAY CHAIN CALCULATION
   * 
   * Instead of only looking at "yesterday", we walk backwards through
   * all the days in our lookback window (3 days) and chain the balance
   * forward to arrive at today's correct rollover.
   * 
   * Chain: day-3 → day-2 → day-1 → today
   * Each step: runningBalance += (dayTarget - dayConsumed)
   */
  const calculateRollover = useCallback(async () => {
    if (!user || !profile || !selectedDate) { setLoading(false); return; }

    try {
      const anchorDateString = format(selectedDate, 'yyyy-MM-dd');
      const realTodayString = format(new Date(), 'yyyy-MM-dd');
      const prefSpreadDays = profile.calorieSpreadDays || 1;

      // Walk backwards from the SELECTED DATE to accumulate the total balance
      let runningBalance = 0;
      let anyDayHadData = false;

      for (let i = 1; i <= LOOKBACK_DAYS; i++) {
        const dayDate = format(subDays(selectedDate, i), 'yyyy-MM-dd');
        const dayData = await fetchDayData(user.id, dayDate);

        if (dayData) {
          anyDayHadData = true;
          const dayTarget = (dayData.log as any).base_calorie_target || baseTarget;
          const dayNet = dayTarget - dayData.consumed; // Positive = savings, Negative = overate
          runningBalance += dayNet;

          // Update the day's calorie_balance trace in DB for audit if missing or changed
          // This ensures we have a clear history of how debt accumulated
          if (dayData.log && (dayData.log as any).calorie_balance !== dayNet) {
            await supabase.from('daily_logs')
              .update({ calorie_balance: dayNet, base_calorie_target: dayTarget })
              .eq('id', dayData.log.id);
          }
        }
      }

      let calculatedRollover = 0;
      let calculatedSpread = 1;

      if (anyDayHadData) {
        if (runningBalance < 0 && prefSpreadDays > 1) {
          calculatedSpread = prefSpreadDays;
          calculatedRollover = runningBalance / calculatedSpread;
        } else {
          calculatedRollover = runningBalance;
          calculatedSpread = 1;
        }
      }

      calculatedRollover = Math.round(calculatedRollover);

      // Persist to Supabase if we are looking at "Today"
      if (anchorDateString === realTodayString) {
        const { data: todayData } = await supabase
          .from('daily_logs')
          .select('id, rollover_calories, spread_days')
          .eq('user_id', user.id)
          .eq('date', realTodayString)
          .maybeSingle();

        if (todayData) {
          const savedRollover = (todayData as any).rollover_calories;
          const savedSpread = (todayData as any).spread_days;

          if (savedRollover !== calculatedRollover || savedSpread !== calculatedSpread) {
            await supabase.from('daily_logs')
              .update({
                rollover_calories: calculatedRollover,
                spread_days: calculatedSpread,
                base_calorie_target: baseTarget,
              })
              .eq('id', todayData.id);
          }
        }
      }

      setRollover(calculatedRollover);
      setSpreadDays(calculatedSpread);
    } catch (err) {
      console.error("Error calculating calorie banking:", err);
    } finally {
      setLoading(false);
    }
  }, [user, profile, baseTarget, mealFingerprint, selectedDate]);

  useEffect(() => { calculateRollover(); }, [calculateRollover]);

  const rawTarget = Math.round(baseTarget + rollover);
  const dynamicTarget = Math.max(calFloor, rawTarget);
  const isFloorActive = rawTarget < calFloor;

  // Determine status
  const status: CalorieBankingResult['status'] =
    rollover > 20 ? 'saved' : rollover < -20 ? 'overage' : 'neutral';

  // Build explanation — now includes floor info
  let explanation: string;
  if (status === 'saved') {
    explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} + ${Math.round(rollover)} חיסכון מהימים האחרונים)`;
  } else if (status === 'overage') {
    const absRollover = Math.abs(Math.round(rollover));
    const totalDebt = Math.abs(Math.round(rollover * spreadDays));
    
    if (isFloorActive) {
      // Explain the floor
      explanation = `יעד היום: ${dynamicTarget} קק"ל (מינימום בריאותי). חריגה מצטברת: ${totalDebt} קק"ל${spreadDays > 1 ? ` נפרסת על ${spreadDays} ימים` : ''}.`;
    } else if (spreadDays > 1) {
      explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} - ${absRollover} תשלום). יתרת חריגה: ${totalDebt} ל-${spreadDays} ימים.`;
    } else {
      explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} - ${absRollover} חריגה מהימים האחרונים)`;
    }
  } else {
    explanation = `יעד היום: ${dynamicTarget} קק"ל`;
  }

  // Build coach message
  let coachMessage: string;
  if (status === 'saved') {
    coachMessage = `כל הכבוד! 🎉 יש לך ${Math.round(rollover)} קק"ל בונוס היום. תהנה!`;
  } else if (status === 'overage') {
    if (isFloorActive) {
      coachMessage = `אל דאגה! 💪 היעד מוגן ברצפה בריאותית של ${calFloor} קק"ל. האיזון אוטומטי.`;
    } else {
      coachMessage = `אל דאגה לגבי החריגה! 💪 זה בטיפול אוטומטי. רק תקפיד על היעד החדש ונתאזן.`;
    }
  } else {
    coachMessage = `יום חדש, התחלה חדשה! 🌟 ממשיכים חזק.`;
  }

  // Calculate prediction for tomorrow
  const tomorrowProjectedTarget = useMemo(() => {
    if (!profile) return baseTarget;

    // Assume user eats exactly their dynamic target unless they already overate it
    const projectedTodayConsumed = Math.max(consumed, dynamicTarget);
    const todayNet = baseTarget - projectedTodayConsumed;
    const prefSpreadDays = profile.calorieSpreadDays || 1;
    
    // Future balance = current running balance + today's projected net
    // Running balance is rollover * spreadDays (total remaining debt/savings)
    const currentTotalBalance = rollover * (spreadDays === 0 ? 1 : spreadDays);
    const futureTotalBalance = currentTotalBalance + todayNet;

    let futureRollover = futureTotalBalance;

    if (futureTotalBalance < 0 && prefSpreadDays > 1) {
      futureRollover = futureTotalBalance / prefSpreadDays;
    }

    return Math.max(calFloor, Math.round(baseTarget + futureRollover));
  }, [profile, baseTarget, rollover, consumed, spreadDays, dynamicTarget, calFloor]);

  return {
    dynamicTarget,
    baseTarget,
    rollover,
    spreadDays,
    explanation,
    coachMessage,
    status,
    tomorrowProjectedTarget,
    loading,
    isViewingToday,
  };
}
