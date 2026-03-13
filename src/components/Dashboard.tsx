import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Droplets, TrendingDown, Scale, Utensils, Settings, ChevronLeft, Camera, MessageSquare, X, BarChart3, Crown, Sparkles, Calendar, AlertTriangle, GripVertical, ArrowLeftRight, Zap, TrendingUp, Info, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile, MealEntry, WeightEntry, DailyLog } from '@/lib/types';
import { predictGoalDate } from '@/lib/calculations';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import { sanitizeKcalTarget } from '@/lib/calorie-guardrails';
import CalorieRing from './CalorieRing';
import MacroBar from './MacroBar';
import FoodLogger from './FoodLogger';
import WeightChart from './WeightChart';
import SettingsPanel from './SettingsPanel';
import AIFoodScanner from './AIFoodScanner';
import NLPFoodInput from './NLPFoodInput';
import WeeklyAnalytics from './WeeklyAnalytics';
import NutritionCoach from './NutritionCoach';
import { useTheme } from '@/lib/store';
import { useCalorieBanking } from '@/hooks/useCalorieBanking';
import { format, parseISO, differenceInDays, isSameDay } from 'date-fns';
import { haptics } from '@/lib/haptics';
import DateStrip from './DateStrip';
import { useMealTemplates } from '@/hooks/useMealTemplates';
import { toast } from 'sonner';

import { useAppState } from '@/contexts/AppStateContext';

type View = 'dashboard' | 'food' | 'weight' | 'settings' | 'ai-scanner' | 'nlp-input' | 'analytics' | 'ai-coach';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] as const } }
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'ארוחת בוקר',
  lunch: 'ארוחת צהריים',
  dinner: 'ארוחת ערב',
  snack: 'חטיף',
};

export default function Dashboard() {
  const { 
    profile, 
    dailyLog, 
    weightHistory, 
    onAddMeal, 
    onRemoveMeal, 
    onMoveMeal, 
    onAddWater, 
    onAddWeight, 
    onUpdateProfile, 
    selectedDate, 
    onDateChange 
  } = useAppState();
  
  if (!profile) return null;

  const [view, setView] = useState<View>('dashboard');
  const [weightInput, setWeightInput] = useState('');
  const theme = useTheme();
  const [draggingMeal, setDraggingMeal] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<string | null>(null);
  const dragOverTypeRef = useRef<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [moveMenuMealId, setMoveMenuMealId] = useState<string | null>(null);
  const [waterAnimation, setWaterAnimation] = useState<number | null>(null);

  const totals = dailyLog.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.foodItem.calories * m.quantity,
      protein: acc.protein + m.foodItem.protein * m.quantity,
      carbs: acc.carbs + m.foodItem.carbs * m.quantity,
      fats: acc.fats + m.foodItem.fats * m.quantity,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  // Calorie Banking System
  const banking = useCalorieBanking(profile, dailyLog);

  const hasTimeline = !!profile.targetDate && profile.goal !== 'maintain';

  const adaptive = useMemo(
    () => (hasTimeline ? calculateAdaptiveTargets(profile, weightHistory) : null),
    [hasTimeline, profile, weightHistory]
  );

  // Use the dynamic banking target instead of static profile target
  const ringCalorieTarget = banking.loading
    ? sanitizeKcalTarget(profile.dailyCalorieTarget, 0)
    : sanitizeKcalTarget(banking.dynamicTarget, 0);
  const effectiveProteinTarget = profile.proteinTarget;
  const effectiveCarbsTarget = profile.carbsTarget;
  const effectiveFatsTarget = profile.fatsTarget;

  const lastSyncKeyRef = useRef<string>('');
  useEffect(() => {
    if (!hasTimeline || !adaptive) return;
    // VERY IMPORTANT: Use adaptive target, NOT ring target (which includes rollover) to prevent compounding loops.
    const computed = sanitizeKcalTarget(adaptive.dailyCalorieTarget, adaptive.dailyCalorieTarget);
    if (computed > 5000) {
      console.warn('[CalorieTargetGuard] Blocked excessive target', { computed });
      return;
    }
    if (computed === profile.dailyCalorieTarget) return;
    const key = `${profile.targetDate ?? 'no-date'}:${computed}`;
    if (lastSyncKeyRef.current === key) return;
    lastSyncKeyRef.current = key;
    onUpdateProfile({
      ...profile,
      dailyCalorieTarget: computed,
      proteinTarget: adaptive.proteinTarget,
      carbsTarget: adaptive.carbsTarget,
      fatsTarget: adaptive.fatsTarget,
    });
  }, [adaptive, hasTimeline, onUpdateProfile, profile]);

  const goalDate = hasTimeline && profile.targetDate
    ? parseISO(profile.targetDate)
    : predictGoalDate(profile.weightKg, profile.targetWeightKg);
  const daysRemaining = hasTimeline && profile.targetDate
    ? differenceInDays(parseISO(profile.targetDate), new Date())
    : null;

  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weightKg : profile.weightKg;
  const progressKg = Math.abs(profile.weightKg - latestWeight);

  const handleLogWeight = () => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      onAddWeight({ date: new Date().toISOString().slice(0, 10), weightKg: w });
      setWeightInput('');
      haptics.success();
    }
  };

  const handleRemoveMeal = (id: string) => {
     if (!isSameDay(selectedDate, new Date())) {
       const userConfirmed = window.confirm('האם אתה בטוח שברצונך למחוק ארוחה מיום קודם?');
       if (!userConfirmed) return;
     }
     haptics.medium();
     onRemoveMeal(id);
  };
  
  const { saveTemplate } = useMealTemplates();
  const handleSaveTemplate = (mealType: string, meals: MealEntry[]) => {
    const name = window.prompt(`איך תרצה לקרוא לתבנית של ${MEAL_LABELS[mealType]}?`);
    if (!name || name.trim() === '') return;
    
    saveTemplate({
      name: name.trim(),
      mealType: mealType as any,
      items: meals.map(m => ({ foodItem: m.foodItem, quantity: m.quantity }))
    });
    
    haptics.success();
    toast.success(`התבנית "${name}" נשמרה. אפשר להשתמש בה מהיומן!`);
  };
  
  const handleAddWater = (ml: number) => {
     haptics.light();
     setWaterAnimation(ml);
     setTimeout(() => setWaterAnimation(null), 800);
     onAddWater(ml);
  };

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  const handleDragEnd = useCallback((mealId: string, originalType: string) => {
    const target = dragOverTypeRef.current;
    if (target && target !== originalType) {
      onMoveMeal(mealId, target as MealEntry['mealType']);
      haptics.success();
    }
    setDraggingMeal(null);
    setDragOverType(null);
    dragOverTypeRef.current = null;
  }, [onMoveMeal]);

  const updateDragOver = useCallback((y: number) => {
    let found: string | null = null;
    for (const type of mealGroups) {
      const el = groupRefs.current[type];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (y >= rect.top - 30 && y <= rect.bottom + 30) {
          found = type;
          break;
        }
      }
    }
    dragOverTypeRef.current = found;
    if (found !== dragOverType) {
       if (found) haptics.light();
       setDragOverType(found);
    }
  }, [dragOverType]);

  // Close move menu on outside click
  useEffect(() => {
    if (!moveMenuMealId) return;
    const handler = () => setMoveMenuMealId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [moveMenuMealId]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <AnimatePresence mode="wait">
        {view === 'food' && (
          <FoodLogger onAddMeal={(entry) => { onAddMeal(entry); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'settings' && (
          <SettingsPanel theme={theme} profile={profile} weightHistory={weightHistory} onUpdateProfile={onUpdateProfile} onClose={() => setView('dashboard')} />
        )}
        {view === 'ai-scanner' && (
          <AIFoodScanner onAddMeal={(entry) => { onAddMeal(entry); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'nlp-input' && (
          <NLPFoodInput onAddMeal={(entry) => { onAddMeal(entry); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'analytics' && (
          <WeeklyAnalytics profile={profile} onClose={() => setView('dashboard')} />
        )}
        {view === 'ai-coach' && (
          <NutritionCoach 
            onClose={() => setView('dashboard')} 
            userName={profile.name} 
            onAddMeal={onAddMeal}
            bankingContext={!banking.loading ? {
              dynamicTarget: banking.dynamicTarget,
              baseTarget: banking.baseTarget,
              rollover: banking.rollover,
              spreadDays: banking.spreadDays,
              status: banking.status,
              explanation: banking.explanation,
            } : undefined}
          />
        )}
      </AnimatePresence>

      {view === 'dashboard' && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-lg mx-auto px-5 pt-safe"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between pt-8 pb-4">
            <div>
              <div className="flex items-center gap-2 mt-0.5">
                <motion.h1
                  className="text-[22px] font-bold font-display tracking-tight"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {profile.name}
                </motion.h1>
                {profile.isPremium && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 15 }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20"
                  >
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.08em]">פרימיום</span>
                  </motion.div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setView('analytics')}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <BarChart3 className="w-[18px] h-[18px] text-muted-foreground" />
              </motion.button>
              <motion.button
                onClick={() => setView('settings')}
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Settings className="w-[18px] h-[18px] text-muted-foreground" />
              </motion.button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="-mx-5 mb-6">
            <DateStrip selectedDate={selectedDate} onChangeDate={onDateChange} />
          </motion.div>

          {/* Calorie Ring Card */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="nova-card p-6 nova-breathe"
          >
            <div className="flex flex-col items-center">
              <CalorieRing 
                consumed={totals.calories} 
                target={ringCalorieTarget} 
                bankingStatus={banking.status} 
                tomorrowTarget={banking.tomorrowProjectedTarget}
              />

              {/* Transparent Math Explanation */}
              {!banking.loading && banking.status !== 'neutral' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium leading-snug ${
                    banking.status === 'saved'
                      ? 'bg-[hsl(142_71%_45%/0.1)] text-[hsl(142_71%_35%)] border border-[hsl(142_71%_45%/0.2)]'
                      : 'bg-[hsl(25_95%_53%/0.1)] text-[hsl(25_95%_40%)] border border-[hsl(25_95%_53%/0.2)]'
                  }`}
                >
                  {banking.status === 'saved' ? (
                    <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Info className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{banking.explanation}</span>
                </motion.div>
              )}

        

              <div className="flex gap-10 mt-5">
                {[
                  { label: 'יעד', value: ringCalorieTarget },
                  { label: 'נצרך', value: totals.calories },
                  { label: 'נותר', value: ringCalorieTarget - totals.calories },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="text-center"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.4 }}
                  >
                    <div className={`text-[17px] font-bold font-display tabular-nums ${item.label === 'נותר' && item.value < 0 ? 'text-[hsl(0_72%_51%)]' : ''}`}>
                      {item.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">{item.label}</div>
                  </motion.div>
                ))}
              </div>
              {hasTimeline && daysRemaining !== null && (
                <motion.div
                  className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <Calendar className="w-3 h-3 text-primary" />
                  <span className="text-[11px] font-semibold text-primary tabular-nums">{daysRemaining} ימים נותרו</span>
                </motion.div>
              )}
              {hasTimeline && adaptive && !adaptive.isSafe && (
                <motion.div
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                  <span className="text-[10px] font-medium text-destructive">צריכה מוגבלת לבטיחות</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Smart Coach Insight */}
          {!banking.loading && banking.status !== 'neutral' && (
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className={`nova-card p-4 mt-4 flex items-start gap-3 ${
                banking.status === 'saved'
                  ? 'border-[hsl(142_71%_45%/0.3)]'
                  : 'border-[hsl(25_95%_53%/0.3)]'
              }`}
            >
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  banking.status === 'saved'
                    ? 'bg-[hsl(142_71%_45%/0.15)]'
                    : 'bg-[hsl(25_95%_53%/0.15)]'
                }`}
              >
                <Zap className={`w-4 h-4 ${
                  banking.status === 'saved' ? 'text-[hsl(142_71%_45%)]' : 'text-[hsl(25_95%_53%)]'
                }`} />
              </motion.div>
              <div>
                <p className="text-[13px] font-semibold font-display mb-0.5">
                  {banking.status === 'saved' ? 'חיסכון קלורי!' : 'איזון חכם'}
                </p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {banking.coachMessage}
                </p>
              </div>
            </motion.div>
          )}

          {/* Macros Card */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4 space-y-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">מאקרו תזונתיים</h3>
            <MacroBar label="חלבון" current={totals.protein} target={effectiveProteinTarget} color="hsl(var(--nova-protein))" />
            <MacroBar label="פחמימות" current={totals.carbs} target={effectiveCarbsTarget} color="hsl(var(--nova-carbs))" />
            <MacroBar label="שומנים" current={totals.fats} target={effectiveFatsTarget} color="hsl(var(--nova-fats))" />
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: <Droplets className="w-[18px] h-[18px] text-nova-info" />, value: `${dailyLog.waterMl}`, unit: 'מ"ל', label: 'מים' },
              { icon: <Scale className="w-[18px] h-[18px] text-primary" />, value: `${latestWeight}`, unit: 'ק"ג', label: 'משקל' },
              { icon: <TrendingDown className="w-[18px] h-[18px] text-nova-success" />, value: `${progressKg.toFixed(1)}`, unit: 'ק"ג', label: 'התקדמות' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="nova-card p-4 text-center overflow-hidden relative"
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20, rotateX: 15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Water Splash Overlay */}
                {stat.label === 'מים' && waterAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0 bg-nova-info/30 rounded-full w-10 h-10 m-auto z-0 pointer-events-none"
                  />
                )}
                
                <motion.div
                  className="flex justify-center mb-2.5 relative z-10"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                >
                  {stat.icon}
                </motion.div>
                <div className="font-bold text-[15px] font-display tabular-nums relative z-10">
                  {stat.value}<span className="text-[11px] text-muted-foreground font-normal me-0.5">{stat.unit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1 relative z-10">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="nova-card p-5 mt-4 overflow-hidden relative">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-nova-info" /> צריכת מים
            </h3>
            <div className="flex gap-2 relative z-10">
              {[250, 500, 750].map((ml, i) => (
                <motion.div key={ml} className="flex-1"
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddWater(ml)}
                    className="w-full text-xs rounded-xl h-10 font-medium transition-colors"
                  >
                    +{ml} מ"ל
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Weight Log */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-primary" /> שקילה
              </h3>
              {weightHistory.length > 0 && (
                <motion.button
                  onClick={() => setView('weight')}
                  whileHover={{ x: -3 }}
                  className="text-xs text-primary font-medium flex items-center gap-0.5 hover:opacity-70 transition-opacity"
                >
                  היסטוריה <ChevronLeft className="w-3 h-3" />
                </motion.button>
              )}
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder='משקל (ק"ג)' value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-10 rounded-xl text-[14px]" />
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" onClick={handleLogWeight} className="h-10 px-5 rounded-xl font-medium transition-transform text-[13px]">שמור</Button>
              </motion.div>
            </div>
            {profile.goal !== 'maintain' && (
              <motion.p
                className="text-xs text-muted-foreground mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                יעד משוער: <span className="text-foreground font-medium">{format(goalDate, 'MMM d, yyyy')}</span>
              </motion.p>
            )}
          </motion.div>

          {/* Today's Meals */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-primary" /> הארוחות של היום
            </h3>
            {dailyLog.meals.length === 0 ? (
              <div className="text-center py-10">
                <motion.div
                  className="w-12 h-12 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center mb-3"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <Utensils className="w-5 h-5 text-muted-foreground" />
                </motion.div>
                <p className="text-sm text-muted-foreground font-medium">עדיין לא נרשמו ארוחות</p>
                <p className="text-xs text-muted-foreground mt-1">לחץ על + כדי להוסיף ארוחה</p>
              </div>
            ) : (
              <div className="space-y-5">
                {mealGroups.map(type => {
                  const meals = dailyLog.meals.filter(m => m.mealType === type);
                  const isDropTarget = draggingMeal !== null && dragOverType === type;
                  const hasMealsOrDragging = meals.length > 0 || draggingMeal !== null;
                  if (!hasMealsOrDragging) return null;
                  return (
                    <div
                      key={type}
                      ref={el => { groupRefs.current[type] = el; }}
                      className={`rounded-xl transition-all duration-200 ${
                        isDropTarget ? 'bg-primary/10 ring-2 ring-primary/30 p-2 -m-2' : ''
                      }`}
                    >
                      <motion.div
                        className="flex items-center justify-between mb-2"
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
                          {MEAL_LABELS[type]}
                          {isDropTarget && (
                            <span className="text-primary me-2">← שחרר כאן</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleSaveTemplate(type, meals)}
                          className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <BookmarkPlus className="w-3 h-3" />
                          שמור כתבנית
                        </button>
                      </motion.div>
                      <div className="space-y-1.5">
                        {meals.map((meal, i) => {
                          const isDragging = draggingMeal === meal.id;
                          return (
                            <div key={meal.id} className="relative">
                              {/* Swipe Delete Action Indicator (Subtle overlay during swipe instead of full background) */}
                              <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-center opacity-0 z-0 transition-opacity">
                                <X className="w-5 h-5 text-destructive/50" />
                              </div>
                              
                              <motion.div
                                layout
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={{ left: 0.5, right: 0.1 }}
                                onDragEnd={(e, info) => {
                                  // Trigger delete if swiped far enough left
                                  if (info.offset.x < -100) {
                                    handleRemoveMeal(meal.id);
                                  }
                                }}
                                initial={{ opacity: 0, x: 12, scale: 0.95 }}
                                animate={{ opacity: isDragging ? 0.7 : 1, x: 0, scale: isDragging ? 1.03 : 1 }}
                                exit={{ opacity: 0, x: -100, scale: 0.95 }}
                                transition={{ delay: i * 0.04, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                                whileHover={{ backgroundColor: 'hsl(var(--muted) / 0.8)' }}
                                className={`flex items-center justify-between text-sm p-3.5 rounded-xl bg-muted/30 transition-colors group relative z-10 ${
                                  isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''
                                }`}
                                style={{ touchAction: 'pan-y' }}
                              >
                                <div className="flex items-center gap-2">
                                  {/* Drag Handle for Reordering (Desktop/Long Press) */}
                                  <motion.div 
                                    drag="y"
                                    dragConstraints={{ top: 0, bottom: 0 }}
                                    dragElastic={0}
                                    onDragStart={() => setDraggingMeal(meal.id)}
                                    onDrag={(_, info) => updateDragOver(info.point.y)}
                                    onDragEnd={() => handleDragEnd(meal.id, type)}
                                    whileTap={{ cursor: 'grabbing' }}
                                    className="cursor-grab p-1 -m-1"
                                    style={{ touchAction: 'none' }}
                                  >
                                    <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 hover:text-muted-foreground transition-colors" />
                                  </motion.div>
                                  
                                  <div>
                                    <span className="font-medium text-[14px]">{meal.foodItem.name}</span>
                                    <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">
                                      <span className="tabular-nums">{meal.foodItem.calories} קק"ל</span>
                                      <span className="text-border">·</span>
                                      <span className="text-nova-protein tabular-nums">ח {meal.foodItem.protein} גר׳</span>
                                      <span className="text-nova-carbs tabular-nums">פ {meal.foodItem.carbs} גר׳</span>
                                      <span className="text-nova-fats tabular-nums">ש {meal.foodItem.fats} גר׳</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  <div className="relative">
                                    <motion.button
                                      onClick={(e) => { e.stopPropagation(); setMoveMenuMealId(moveMenuMealId === meal.id ? null : meal.id); }}
                                      whileTap={{ scale: 0.85 }}
                                      className="opacity-40 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all p-1.5 rounded-lg hover:bg-primary/10"
                                    >
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                    </motion.button>
                                    <AnimatePresence>
                                      {moveMenuMealId === meal.id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                          transition={{ duration: 0.15 }}
                                          className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[120px]"
                                        >
                                          {mealGroups.filter(t => t !== type).map(t => (
                                            <button
                                              key={t}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onMoveMeal(meal.id, t);
                                                setMoveMenuMealId(null);
                                              }}
                                              className="w-full text-right px-3 py-2 text-xs font-medium hover:bg-muted/60 transition-colors"
                                            >
                                              {MEAL_LABELS[t]}
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                  <motion.button
                                    onClick={() => handleRemoveMeal(meal.id)}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.85 }}
                                    className="opacity-40 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-lg hover:bg-destructive/10"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                        {meals.length === 0 && isDropTarget && (
                          <div className="py-4 text-center text-[12px] text-primary/60 font-medium border-2 border-dashed border-primary/20 rounded-xl">
                            שחרר כאן להעברה
                          </div>
                        )}
                        {meals.length === 0 && !isDropTarget && (
                          <div className="h-6"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <div className="h-6" />
        </motion.div>
      )}

      {view === 'weight' && (
        <motion.div
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-lg mx-auto px-5 pt-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display tracking-tight">היסטוריית משקל</h2>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={() => setView('dashboard')} className="rounded-xl text-[13px]">חזרה</Button>
            </motion.div>
          </div>
          <WeightChart entries={weightHistory} targetWeight={profile.targetWeightKg} />
        </motion.div>
      )}

      {/* FAB Group */}
      {view === 'dashboard' && (
        <div className="fixed bottom-6 start-5 z-40 flex flex-col gap-2.5 items-start">
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.7, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.div whileHover={{ scale: 1.12, rotate: 10 }} whileTap={{ scale: 0.88 }}>
              <Button
                onClick={() => setView('ai-coach')}
                variant="outline"
                className="h-11 w-11 rounded-full shadow-md p-0 bg-card border-border/80 hover:bg-muted transition-all duration-200"
              >
                <Sparkles className="w-[18px] h-[18px]" />
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.div whileHover={{ scale: 1.12, rotate: 10 }} whileTap={{ scale: 0.88 }}>
              <Button
                onClick={() => setView('nlp-input')}
                variant="outline"
                className="h-11 w-11 rounded-full shadow-md p-0 bg-card border-border/80 hover:bg-muted transition-all duration-200"
              >
                <MessageSquare className="w-[18px] h-[18px]" />
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: 90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.div whileHover={{ scale: 1.12, rotate: -10 }} whileTap={{ scale: 0.88 }}>
              <Button
                onClick={() => setView('ai-scanner')}
                variant="outline"
                className="h-11 w-11 rounded-full shadow-md p-0 bg-card border-border/80 hover:bg-muted transition-all duration-200"
              >
                <Camera className="w-[18px] h-[18px]" />
              </Button>
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 20 }}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88, rotate: 90 }}
              className="relative"
            >
              <Button
                onClick={() => {
                  if (!isSameDay(selectedDate, new Date())) {
                    const userConfirmed = window.confirm('האם אתה בטוח שברצונך להוסיף ארוחה ליום קודם?');
                    if (!userConfirmed) return;
                  }
                  setView('food');
                }}
                className="h-14 w-14 rounded-full shadow-lg p-0 transition-transform duration-200 nova-pulse-ring"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
