import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Target, Zap, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, ReferenceLine,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface WeeklyAnalyticsProps {
  profile: UserProfile;
  onClose: () => void;
}

interface DayData {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  target: number;
  adherence: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const } },
};

export default function WeeklyAnalytics({ profile, onClose }: WeeklyAnalyticsProps) {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const fetchWeekData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const today = new Date();
    const days: DayData[] = [];
    const startDate = format(subDays(today, 6), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    const { data: logs } = await supabase.from('daily_logs').select('id, date').eq('user_id', profile.id).gte('date', startDate).lte('date', endDate);
    const logIds = (logs || []).map(l => l.id);
    let meals: { daily_log_id: string; calories: number; protein: number; carbs: number; fats: number; quantity: number | null }[] = [];
    if (logIds.length > 0) {
      const { data } = await supabase.from('meal_entries').select('daily_log_id, calories, protein, carbs, fats, quantity').in('daily_log_id', logIds);
      if (data) meals = data;
    }
    const logDateMap: Record<string, string> = {};
    (logs || []).forEach(l => { logDateMap[l.id] = l.date; });
    const dateAgg: Record<string, { calories: number; protein: number; carbs: number; fats: number }> = {};
    meals.forEach(m => {
      const date = logDateMap[m.daily_log_id];
      if (!date) return;
      if (!dateAgg[date]) dateAgg[date] = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const qty = m.quantity || 1;
      dateAgg[date].calories += (m.calories * qty);
      dateAgg[date].protein += (m.protein * qty);
      dateAgg[date].carbs += (m.carbs * qty);
      dateAgg[date].fats += (m.fats * qty);
    });

    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const agg = dateAgg[dateStr] || { calories: 0, protein: 0, carbs: 0, fats: 0 };
      const adherence = profile.dailyCalorieTarget > 0 ? Math.round((agg.calories / profile.dailyCalorieTarget) * 100) : 0;
      days.push({
        date: dateStr, label: format(d, 'EEE'),
        calories: Math.round(agg.calories), protein: Math.round(agg.protein),
        carbs: Math.round(agg.carbs), fats: Math.round(agg.fats),
        target: profile.dailyCalorieTarget, adherence: Math.min(adherence, 200),
      });
    }
    setWeekData(days);

    const { data: allLogs } = await supabase.from('daily_logs').select('id, date').eq('user_id', profile.id).lte('date', endDate).order('date', { ascending: false }).limit(60);
    const allLogIds = (allLogs || []).map(l => l.id);
    let allMeals: { daily_log_id: string; calories: number; quantity: number | null }[] = [];
    if (allLogIds.length > 0) {
      const { data } = await supabase.from('meal_entries').select('daily_log_id, calories, quantity').in('daily_log_id', allLogIds);
      if (data) allMeals = data;
    }
    const allLogDateMap: Record<string, string> = {};
    (allLogs || []).forEach(l => { allLogDateMap[l.id] = l.date; });
    const allDateCals: Record<string, number> = {};
    allMeals.forEach(m => {
      const date = allLogDateMap[m.daily_log_id];
      if (!date) return;
      const qty = m.quantity || 1;
      allDateCals[date] = (allDateCals[date] || 0) + (m.calories * qty);
    });
    let currentStreak = 0;
    for (let i = 0; i < 60; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      const cals = allDateCals[d] || 0;
      const ratio = profile.dailyCalorieTarget > 0 ? cals / profile.dailyCalorieTarget : 0;
      
      if (ratio >= 0.5 && ratio <= 1.5) {
        currentStreak++;
      } else if (i === 0) {
        // Skip today if it indicates an incomplete day, avoiding premature streak breaks
        continue;
      } else {
        break; // break the streak if a prior day was failed
      }
    }
    setStreak(currentStreak);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchWeekData(); }, [fetchWeekData]);

  const avgCalories = weekData.length > 0 ? Math.round(weekData.reduce((s, d) => s + d.calories, 0) / weekData.filter(d => d.calories > 0).length || 0) : 0;
  const avgAdherence = weekData.length > 0 ? Math.round(weekData.filter(d => d.calories > 0).reduce((s, d) => s + d.adherence, 0) / (weekData.filter(d => d.calories > 0).length || 1)) : 0;
  const avgProtein = weekData.length > 0 ? Math.round(weekData.reduce((s, d) => s + d.protein, 0) / (weekData.filter(d => d.calories > 0).length || 1)) : 0;
  const calorieDiff = avgCalories - profile.dailyCalorieTarget;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="nova-glass rounded-xl px-3 py-2 text-xs border border-border/50 shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-muted-foreground tabular-nums">
            <span style={{ color: p.color }} className="font-medium">{p.name}</span>: {Math.round(p.value)}
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-50 glass-screen overflow-auto flex flex-col"
    >
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-lg mx-auto px-5 pt-safe">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 pt-8 pb-6">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ArrowRight className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-[22px] font-bold font-display tracking-tight">אנליטיקס</h1>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-[0.12em] mt-0.5">7 ימים אחרונים</p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <div className="nova-card p-4 text-center">
            <div className="flex justify-center mb-2.5"><Flame className="w-[18px] h-[18px] text-primary" /></div>
            <div className="font-bold text-[15px] font-display tabular-nums">{avgCalories}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">ממוצע קק"ל</div>
          </div>
          <div className="nova-card p-4 text-center">
            <div className="flex justify-center mb-2.5"><Target className="w-[18px] h-[18px] text-nova-success" /></div>
            <div className="font-bold text-[15px] font-display tabular-nums">{avgAdherence}%</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">עמידה ביעד</div>
          </div>
          <div className="nova-card p-4 text-center">
            <div className="flex justify-center mb-2.5"><Zap className="w-[18px] h-[18px] text-nova-warning" /></div>
            <div className="font-bold text-[15px] font-display tabular-nums">{streak}</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">ימי רצף</div>
          </div>
        </motion.div>

        {/* Calorie Trend */}
        <motion.div variants={itemVariants} className="nova-card p-5 mt-4" dir="ltr">
          <div className="flex items-center justify-between mb-4" dir="rtl">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-primary" /> מגמת קלוריות
            </h3>
            <div className="flex items-center gap-1 text-xs">
              {calorieDiff > 50 ? <TrendingUp className="w-3.5 h-3.5 text-destructive" /> : calorieDiff < -50 ? <TrendingDown className="w-3.5 h-3.5 text-nova-success" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
              <span className="tabular-nums font-medium text-muted-foreground">{calorieDiff > 0 ? '+' : ''}{calorieDiff} ממוצע</span>
            </div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={35} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={profile.dailyCalorieTarget} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Bar dataKey="calories" name="קלוריות" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground" dir="rtl">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary opacity-85" />
              <span>צריכה יומית</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-[1.5px] border-dashed border-primary opacity-60" />
              <span>יעד ({profile.dailyCalorieTarget})</span>
            </div>
          </div>
        </motion.div>

        {/* Macro Adherence */}
        <motion.div variants={itemVariants} className="nova-card p-5 mt-4" dir="ltr">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4" dir="rtl">
            פירוט מאקרו
          </h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={30} unit="g" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="protein" name="חלבון" stroke="hsl(var(--nova-protein))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="carbs" name="פחמימות" stroke="hsl(var(--nova-carbs))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="fats" name="שומנים" stroke="hsl(var(--nova-fats))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground" dir="rtl">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--nova-protein))' }} />
              <span>חלבון ({avgProtein} גר׳ ממוצע)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--nova-carbs))' }} />
              <span>פחמימות</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--nova-fats))' }} />
              <span>שומנים</span>
            </div>
          </div>
        </motion.div>

        {/* Daily Adherence Bar */}
        <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4">
            עמידה יומית ביעד
          </h3>
          <div className="space-y-2.5">
            {weekData.map(day => {
              const isGood = day.adherence >= 80 && day.adherence <= 120;
              const barWidth = Math.min(day.adherence, 100);
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground font-medium w-8 tabular-nums">{day.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden" dir="ltr">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
                      className={`h-full rounded-full ${
                        day.calories === 0 ? 'bg-muted-foreground/30' : isGood ? 'bg-nova-success' : day.adherence > 120 ? 'bg-destructive' : 'bg-nova-warning'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums font-medium w-8 text-start text-muted-foreground">
                    {day.calories > 0 ? `${day.adherence}%` : '--'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-nova-success" />
              <span>ביעד</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-nova-warning" />
              <span>מתחת</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>מעל</span>
            </div>
          </div>
        </motion.div>

        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
