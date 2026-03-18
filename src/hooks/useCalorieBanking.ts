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

const LOOKBACK_DAYS = 7; // Expanded from 3 to 7 days for more persistent balance tracking

/**
 * Fetches a day's log + meals from Supabase and returns its consumed total.
 */
async function fetchDayData(userId: string, dateKey: string) {
  const { data: log } = await supabase
    .from('daily_logs')
    .select('id, base_calorie_target, rollover_calories, spread_days')
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
    if (!profile?.id) { setLoading(false); return; }

    const realToday = format(new Date(), 'yyyy-MM-dd');
    const prefSpreadDays = profile.calorieSpreadDays || 1;
    const isViewing = profile.id !== user?.id;

    // Walk through the last LOOKBACK_DAYS to accumulate the total balance
    let runningBalance = 0;
    let anyDayHadData = false;

    for (let i = LOOKBACK_DAYS; i >= 1; i--) {
      const dayDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayData = await fetchDayData(profile.id, dayDate);

      if (dayData) {
        anyDayHadData = true;
        const dayTarget = (dayData.log as any).base_calorie_target || baseTarget;
        const dayConsumed = dayData.consumed || 0;
        
        const dayNet = dayTarget - dayConsumed;
        console.log(`[Banking] ${dayDate}: Target ${dayTarget}, Consumed ${dayConsumed}, Net ${dayNet}`);
        runningBalance += dayNet;

        // Update the day's calorie_balance trace in DB for audit - ONLY if not viewing someone else
        if (!isViewing) {
          await supabase.from('daily_logs')
            .update({ calorie_balance: dayNet, base_calorie_target: dayTarget })
            .eq('id', dayData.log.id);
        }
      }
    }
    
    console.log(`[Banking] Total Running Balance: ${runningBalance}`);

    let todayRollover = 0;
    let todaySpread = 1;

    if (anyDayHadData) {
      if (runningBalance < 0 && prefSpreadDays > 1) {
        todaySpread = prefSpreadDays;
        todayRollover = runningBalance / todaySpread;
      } else {
        todayRollover = runningBalance;
        todaySpread = 1;
      }
    }

    todayRollover = Math.round(todayRollover);

    // Persist today's calculated rollover to Supabase - ONLY if not viewing someone else
    if (!isViewing) {
      const { data: todayData } = await supabase
        .from('daily_logs')
        .select('rollover_calories, spread_days')
        .eq('user_id', profile.id)
        .eq('date', realToday)
        .maybeSingle();

      const savedRollover = todayData ? (todayData as any).rollover_calories : undefined;
      const savedSpread = todayData ? (todayData as any).spread_days : undefined;

      if (savedRollover !== todayRollover || savedSpread !== todaySpread) {
        await supabase.from('daily_logs')
          .update({
            rollover_calories: todayRollover,
            spread_days: todaySpread,
            base_calorie_target: baseTarget,
          })
          .eq('user_id', profile.id)
          .eq('date', realToday);
      }
    } else {
      // In viewing mode, we still want to show the correct today's rollover from DB if it exists
      const { data: todayData } = await supabase
        .from('daily_logs')
        .select('rollover_calories, spread_days')
        .eq('user_id', profile.id)
        .eq('date', realToday)
        .maybeSingle();
      
      if (todayData) {
        todayRollover = (todayData as any).rollover_calories || 0;
        todaySpread = (todayData as any).spread_days || 1;
      }
    }

    setRollover(todayRollover);
    setSpreadDays(todaySpread);
    setLoading(false);
  }, [user?.id, profile, baseTarget, mealFingerprint, currentDayLog.date]);

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
