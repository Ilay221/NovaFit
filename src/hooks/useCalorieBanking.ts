import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, DailyLog } from '@/lib/types';
import { format, subDays } from 'date-fns';

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
}

const todayKey = () => format(new Date(), 'yyyy-MM-dd');

function yesterdayKey(): string {
  return format(subDays(new Date(), 1), 'yyyy-MM-dd');
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
    const prefSpreadDays = profile.calorieSpreadDays || 1;

    // Check what is currently saved for today
    const { data: todayData } = await supabase
      .from('daily_logs')
      .select('rollover_calories, spread_days')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    // Calculate from yesterday's data
    const { data: yesterdayLog } = await supabase
      .from('daily_logs')
      .select('id, base_calorie_target, calorie_balance, rollover_calories, spread_days')
      .eq('user_id', user.id)
      .eq('date', yesterday)
      .maybeSingle();

    let todayRollover = 0;
    let todaySpread = 1;

    if (yesterdayLog) {
      // Get yesterday's meals total
      const { data: yesterdayMeals } = await supabase
        .from('meal_entries')
        .select('calories, quantity')
        .eq('daily_log_id', yesterdayLog.id);

      const yesterdayConsumed = (yesterdayMeals || []).reduce(
        (sum: number, m: any) => sum + m.calories * m.quantity, 0
      );

      const yesterdayTarget = (yesterdayLog as any).base_calorie_target || baseTarget;
      const yesterdayNet = yesterdayTarget - yesterdayConsumed; // Positive = savings, Negative = overate

      // Yesterday's true starting state
      const prevSpreadDays = Math.max(1, (yesterdayLog as any).spread_days || 1);
      const prevRollover = (yesterdayLog as any).rollover_calories || 0;
      
      const yesterdayTotalStartingBalance = prevRollover * prevSpreadDays;
      const todayTotalBalance = yesterdayTotalStartingBalance + yesterdayNet;

      // Save a trace of the raw net to yesterday
      await supabase.from('daily_logs')
        .update({ calorie_balance: yesterdayNet, base_calorie_target: yesterdayTarget })
        .eq('id', yesterdayLog.id);

      // --- THE SMART SPREAD ALGORITHM ---
      if (todayTotalBalance < 0 && prefSpreadDays > 1) {
        if (prevSpreadDays > 1) {
           const expectedPayment = Math.abs(prevRollover);
           // Allow a 15 kcal margin of error for "staying on track"
           const stayedOnTrack = yesterdayNet >= (expectedPayment - 15);
           
           if (stayedOnTrack) {
              // Smooth countdown: decrease remaining days to keep installment perfectly flat
              const remainingDays = prevSpreadDays - 1;
              if (remainingDays >= 1) {
                 todaySpread = remainingDays;
                 todayRollover = todayTotalBalance / todaySpread;
              } else {
                 todaySpread = prefSpreadDays;
                 todayRollover = todayTotalBalance / todaySpread;
              }
              // If user changed settings to a much shorter spread, respect it immediately
              if (prefSpreadDays < todaySpread) {
                  todaySpread = prefSpreadDays;
                  todayRollover = todayTotalBalance / todaySpread;
              }
           } else {
              // Missed payment (overate). Compassionate recalculation: respread total over full preferred duration.
              todaySpread = prefSpreadDays;
              todayRollover = todayTotalBalance / todaySpread;
           }
        } else {
           // Fresh start of a spread plan
           todaySpread = prefSpreadDays;
           todayRollover = todayTotalBalance / todaySpread;
        }
      } else {
        todayRollover = todayTotalBalance;
        todaySpread = 1;
      }
    }

    todayRollover = Math.round(todayRollover);

    const savedRollover = todayData ? (todayData as any).rollover_calories : undefined;
    const savedSpread = todayData ? (todayData as any).spread_days : undefined;

    // Save today's calculated rollover ONLY if it differs from what's currently saved
    if (savedRollover !== todayRollover || savedSpread !== todaySpread) {
      await supabase.from('daily_logs')
        .update({
          rollover_calories: todayRollover,
          spread_days: todaySpread,
          base_calorie_target: baseTarget,
        })
        .eq('user_id', user.id)
        .eq('date', today);
    }

    setRollover(todayRollover);
    setSpreadDays(todaySpread);
    setLoading(false);
  }, [user, profile, baseTarget]);

  useEffect(() => { calculateRollover(); }, [calculateRollover]);

  const dynamicTarget = Math.max(
    profile?.gender === 'female' ? 800 : 1000,
    Math.round(baseTarget + rollover)
  );

  // Determine status
  const status: CalorieBankingResult['status'] =
    rollover > 20 ? 'saved' : rollover < -20 ? 'overage' : 'neutral';

  // Build explanation
  let explanation: string;
  if (status === 'saved') {
    explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} + ${Math.round(rollover)} חסכון מאתמול)`;
  } else if (status === 'overage') {
    const absRollover = Math.abs(Math.round(rollover));
    const totalDebt = Math.abs(Math.round(rollover * spreadDays));
    if (spreadDays > 1) {
      explanation = `יעד היום: ${dynamicTarget} קק"ל (בסיס: ${baseTarget} - ${absRollover} תשלום על חריגה). יתרת חריגה: ${totalDebt} ל-${spreadDays} ימים.`;
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
    coachMessage = `אל דאגה לגבי החריגה! 💪 זה בטיפול אוטומטי. רק תקפיד על היעד החדש ונתאזן.`;
  } else {
    coachMessage = `יום חדש, התחלה חדשה! 🌟 ממשיכים חזק.`;
  }

  // Calculate prediction for tomorrow using the exact same Smart Spread algorithm
  const tomorrowProjectedTarget = useMemo(() => {
    if (!profile) return baseTarget;

    const todayNet = baseTarget - consumed; // Positive = savings, Negative = overate
    const prefSpreadDays = profile.calorieSpreadDays || 1;
    
    // Today's true starting state
    const todayTotalStartingBalance = rollover * (spreadDays === 0 ? 1 : spreadDays);
    const futureTotalBalance = todayTotalStartingBalance + todayNet;

    let futureRollover = futureTotalBalance;
    let futureSpread = 1;

    if (futureTotalBalance < 0 && prefSpreadDays > 1) {
       if (spreadDays > 1) {
          const expectedPayment = Math.abs(rollover);
          const stayedOnTrack = todayNet >= (expectedPayment - 15);
          
          if (stayedOnTrack) {
             const remainingDays = spreadDays - 1;
             if (remainingDays >= 1) {
                futureSpread = remainingDays;
                futureRollover = futureTotalBalance / futureSpread;
             } else {
                futureSpread = prefSpreadDays;
                futureRollover = futureTotalBalance / futureSpread;
             }
             if (prefSpreadDays < futureSpread) {
                futureSpread = prefSpreadDays;
                futureRollover = futureTotalBalance / futureSpread;
             }
          } else {
             futureSpread = prefSpreadDays;
             futureRollover = futureTotalBalance / futureSpread;
          }
       } else {
          futureSpread = prefSpreadDays;
          futureRollover = futureTotalBalance / futureSpread;
       }
    }

    return Math.max(
      profile.gender === 'female' ? 800 : 1000,
      Math.round(baseTarget + futureRollover)
    );
  }, [profile, baseTarget, rollover, consumed, spreadDays]);

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
  };
}
