import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, DailyLog } from '@/lib/types';

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
  /** Whether data has loaded */
  loading: boolean;
  /** Toggle spreading overages across multiple days */
  toggleSpread: (enabled: boolean) => Promise<void>;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function useCalorieBanking(
  profile: UserProfile | null,
  todayLog: DailyLog,
): CalorieBankingResult {
  const { user } = useAuth();
  const [rollover, setRollover] = useState(0);
  const [spreadDays, setSpreadDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseTarget = profile?.dailyCalorieTarget ?? 2000;

  // Calculate today's consumed calories
  const consumed = useMemo(() =>
    todayLog.meals.reduce((sum, m) => sum + m.foodItem.calories * m.quantity, 0),
    [todayLog.meals]
  );

  // Fetch yesterday's balance and calculate rollover for today
  const calculateRollover = useCallback(async () => {
    if (!user || !profile) { setLoading(false); return; }

    const today = todayKey();
    const yesterday = yesterdayKey();

    // Check if today already has a rollover saved
    const { data: todayData } = await supabase
      .from('daily_logs')
      .select('rollover_calories, spread_days')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (todayData && (todayData as any).rollover_calories !== 0) {
      setRollover((todayData as any).rollover_calories);
      setSpreadDays((todayData as any).spread_days || 0);
      setLoading(false);
      return;
    }

    // Calculate from yesterday's data
    const { data: yesterdayLog } = await supabase
      .from('daily_logs')
      .select('id, base_calorie_target, calorie_balance, rollover_calories, spread_days')
      .eq('user_id', user.id)
      .eq('date', yesterday)
      .maybeSingle();

    if (!yesterdayLog) { setLoading(false); return; }

    // Get yesterday's meals total
    const { data: yesterdayMeals } = await supabase
      .from('meal_entries')
      .select('calories, quantity')
      .eq('daily_log_id', yesterdayLog.id);

    const yesterdayConsumed = (yesterdayMeals || []).reduce(
      (sum: number, m: any) => sum + m.calories * m.quantity, 0
    );

    const yesterdayTarget = (yesterdayLog as any).base_calorie_target || baseTarget;
    const balance = yesterdayTarget - yesterdayConsumed; // positive = saved, negative = overage

    // Check for remaining spread from previous days
    const prevSpreadDays = (yesterdayLog as any).spread_days || 0;
    let newRollover = balance;

    // If yesterday had a spread active, carry forward the remaining portion
    if (prevSpreadDays > 1) {
      // There's still spread debt from before
      const prevRollover = (yesterdayLog as any).rollover_calories || 0;
      if (prevRollover < 0) {
        // Add remaining spread portion
        const remainingSpreadDebt = prevRollover * ((prevSpreadDays - 1) / prevSpreadDays);
        newRollover += remainingSpreadDebt;
      }
    }

    // Save balance to yesterday
    await supabase.from('daily_logs')
      .update({ calorie_balance: balance, base_calorie_target: yesterdayTarget })
      .eq('id', yesterdayLog.id);

    // Determine spread for today
    let todayRollover = newRollover;
    let todaySpread = 0;

    // Large overage: auto-suggest spreading across 3 days if > 500 kcal over
    if (newRollover < -500) {
      todaySpread = 3;
      todayRollover = Math.round(newRollover / 3);
    }

    // Save today's rollover
    await supabase.from('daily_logs')
      .update({
        rollover_calories: todayRollover,
        spread_days: todaySpread,
        base_calorie_target: baseTarget,
      })
      .eq('user_id', user.id)
      .eq('date', today);

    setRollover(todayRollover);
    setSpreadDays(todaySpread);
    setLoading(false);
  }, [user, profile, baseTarget]);

  useEffect(() => { calculateRollover(); }, [calculateRollover]);

  const dynamicTarget = Math.max(
    profile?.gender === 'female' ? 1200 : 1500,
    Math.round(baseTarget + rollover)
  );

  const toggleSpread = useCallback(async (enabled: boolean) => {
    if (!user) return;
    const today = todayKey();

    // Recalculate with/without spread
    const { data: todayData } = await supabase
      .from('daily_logs')
      .select('rollover_calories, spread_days')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!todayData) return;

    // Get original full rollover (before spread)
    const currentRollover = (todayData as any).rollover_calories;
    const currentSpread = (todayData as any).spread_days || 0;

    let newRollover: number;
    let newSpread: number;

    if (enabled && currentSpread === 0 && currentRollover < -300) {
      // Enable spread: divide across 3 days
      newSpread = 3;
      newRollover = Math.round(currentRollover * (currentSpread || 1) / 3);
    } else if (!enabled && currentSpread > 0) {
      // Disable spread: take full hit today
      newRollover = currentRollover * currentSpread;
      newSpread = 0;
    } else {
      return;
    }

    await supabase.from('daily_logs')
      .update({ rollover_calories: newRollover, spread_days: newSpread })
      .eq('user_id', user.id)
      .eq('date', today);

    setRollover(newRollover);
    setSpreadDays(newSpread);
  }, [user]);

  // Determine status
  const status: CalorieBankingResult['status'] =
    rollover > 20 ? 'saved' : rollover < -20 ? 'overage' : 'neutral';

  // Build explanation
  let explanation: string;
  if (status === 'saved') {
    explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} + ${Math.round(rollover)} חסכון מאתמול)`;
  } else if (status === 'overage') {
    const absRollover = Math.abs(Math.round(rollover));
    if (spreadDays > 0) {
      explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} - ${absRollover} חריגה מפוזרת על ${spreadDays} ימים)`;
    } else {
      explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} - ${absRollover} חריגה מאתמול)`;
    }
  } else {
    explanation = `יעד היום: ${dynamicTarget} קק"ל`;
  }

  // Build coach message
  let coachMessage: string;
  if (status === 'saved') {
    coachMessage = `כל הכבוד על אתמול! 🎉 יש לך ${Math.round(rollover)} קק"ל בונוס היום. תהנה!`;
  } else if (status === 'overage') {
    coachMessage = `אל דאגה לגבי אתמול! 💪 בואו נאזן את זה היום עם ארוחות קלות יותר.`;
  } else {
    coachMessage = `יום חדש, התחלה חדשה! 🌟 ממשיכים חזק.`;
  }

  return {
    dynamicTarget,
    baseTarget,
    rollover,
    spreadDays,
    explanation,
    coachMessage,
    status,
    loading,
    toggleSpread,
  };
}
