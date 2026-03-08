import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Droplets, TrendingDown, Scale, Utensils, Settings, ChevronRight, Camera, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile, MealEntry, WeightEntry, DailyLog } from '@/lib/types';
import { predictGoalDate } from '@/lib/calculations';
import CalorieRing from './CalorieRing';
import MacroBar from './MacroBar';
import FoodLogger from './FoodLogger';
import WeightChart from './WeightChart';
import SettingsPanel from './SettingsPanel';
import AIFoodScanner from './AIFoodScanner';
import NLPFoodInput from './NLPFoodInput';
import { useTheme } from '@/lib/store';
import { format } from 'date-fns';

interface DashboardProps {
  profile: UserProfile;
  dailyLog: DailyLog;
  weightHistory: WeightEntry[];
  onAddMeal: (entry: MealEntry) => void;
  onRemoveMeal: (id: string) => void;
  onAddWater: (ml: number) => void;
  onAddWeight: (entry: WeightEntry) => void;
  onUpdateProfile: (profile: UserProfile | null) => void;
}

type View = 'dashboard' | 'food' | 'weight' | 'settings' | 'ai-scanner' | 'nlp-input';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const } }
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function Dashboard({
  profile, dailyLog, weightHistory, onAddMeal, onRemoveMeal, onAddWater, onAddWeight, onUpdateProfile
}: DashboardProps) {
  const [view, setView] = useState<View>('dashboard');
  const [weightInput, setWeightInput] = useState('');
  const theme = useTheme();

  const totals = dailyLog.meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.foodItem.calories * m.quantity,
      protein: acc.protein + m.foodItem.protein * m.quantity,
      carbs: acc.carbs + m.foodItem.carbs * m.quantity,
      fats: acc.fats + m.foodItem.fats * m.quantity,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const goalDate = predictGoalDate(profile.weightKg, profile.targetWeightKg);
  const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weightKg : profile.weightKg;
  const progressKg = Math.abs(profile.weightKg - latestWeight);

  const handleLogWeight = () => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      onAddWeight({ date: new Date().toISOString().slice(0, 10), weightKg: w });
      setWeightInput('');
    }
  };

  const mealGroups = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  return (
    <div className="min-h-screen bg-background pb-28">
      <AnimatePresence>
        {view === 'food' && (
          <FoodLogger onAddMeal={(entry) => { onAddMeal(entry); setView('dashboard'); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'settings' && (
          <SettingsPanel theme={theme} profile={profile} onUpdateProfile={onUpdateProfile} onClose={() => setView('dashboard')} />
        )}
        {view === 'ai-scanner' && (
          <AIFoodScanner onAddMeal={(entry) => { onAddMeal(entry); setView('dashboard'); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'nlp-input' && (
          <NLPFoodInput onAddMeal={(entry) => { onAddMeal(entry); setView('dashboard'); }} onClose={() => setView('dashboard')} />
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
          <motion.div variants={itemVariants} className="flex items-center justify-between pt-8 pb-6">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">{format(new Date(), 'EEEE, MMM d')}</p>
              <h1 className="text-[22px] font-bold font-display mt-0.5 tracking-tight">{profile.name}</h1>
            </div>
            <button
              onClick={() => setView('settings')}
              className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95"
            >
              <Settings className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </motion.div>

          {/* Calorie Ring Card */}
          <motion.div variants={itemVariants} className="nova-card p-6">
            <div className="flex flex-col items-center">
              <CalorieRing consumed={totals.calories} target={profile.dailyCalorieTarget} />
              <div className="flex gap-10 mt-6">
                {[
                  { label: 'Target', value: profile.dailyCalorieTarget },
                  { label: 'Consumed', value: totals.calories },
                  { label: 'Remaining', value: Math.max(profile.dailyCalorieTarget - totals.calories, 0) },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="text-[17px] font-bold font-display tabular-nums">{item.value}</div>
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Macros Card */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4 space-y-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">Macronutrients</h3>
            <MacroBar label="Protein" current={totals.protein} target={profile.proteinTarget} color="hsl(var(--nova-protein))" />
            <MacroBar label="Carbs" current={totals.carbs} target={profile.carbsTarget} color="hsl(var(--nova-carbs))" />
            <MacroBar label="Fats" current={totals.fats} target={profile.fatsTarget} color="hsl(var(--nova-fats))" />
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: <Droplets className="w-[18px] h-[18px] text-nova-info" />, value: `${dailyLog.waterMl}`, unit: 'ml', label: 'Water' },
              { icon: <Scale className="w-[18px] h-[18px] text-primary" />, value: `${latestWeight}`, unit: 'kg', label: 'Weight' },
              { icon: <TrendingDown className="w-[18px] h-[18px] text-nova-success" />, value: `${progressKg.toFixed(1)}`, unit: 'kg', label: 'Progress' },
            ].map(stat => (
              <div key={stat.label} className="nova-card p-4 text-center">
                <div className="flex justify-center mb-2.5">{stat.icon}</div>
                <div className="font-bold text-[15px] font-display tabular-nums">
                  {stat.value}<span className="text-[11px] text-muted-foreground font-normal ml-0.5">{stat.unit}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.1em] mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Water Quick Add */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-nova-info" /> Water Intake
            </h3>
            <div className="flex gap-2">
              {[250, 500, 750].map(ml => (
                <Button
                  key={ml}
                  variant="outline"
                  size="sm"
                  onClick={() => onAddWater(ml)}
                  className="flex-1 text-xs rounded-xl h-10 font-medium hover:bg-muted transition-colors active:scale-[0.97]"
                >
                  +{ml}ml
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Weight Log */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] flex items-center gap-2">
                <Scale className="w-3.5 h-3.5 text-primary" /> Log Weight
              </h3>
              {weightHistory.length > 0 && (
                <button onClick={() => setView('weight')} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:opacity-70 transition-opacity">
                  History <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Weight (kg)" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-10 rounded-xl text-[14px]" />
              <Button size="sm" onClick={handleLogWeight} className="h-10 px-5 rounded-xl font-medium active:scale-[0.97] transition-transform text-[13px]">Log</Button>
            </div>
            {profile.goal !== 'maintain' && (
              <p className="text-xs text-muted-foreground mt-3">
                Estimated goal: <span className="text-foreground font-medium">{format(goalDate, 'MMM d, yyyy')}</span>
              </p>
            )}
          </motion.div>

          {/* Today's Meals */}
          <motion.div variants={itemVariants} className="nova-card p-5 mt-4">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-3.5 flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-primary" /> Today's Meals
            </h3>
            {dailyLog.meals.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center mb-3">
                  <Utensils className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">No meals logged yet</p>
                <p className="text-xs text-muted-foreground mt-1">Tap + to add your first meal</p>
              </div>
            ) : (
              <div className="space-y-5">
                {mealGroups.map(type => {
                  const meals = dailyLog.meals.filter(m => m.mealType === type);
                  if (meals.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2">
                        {MEAL_LABELS[type]}
                      </div>
                      <div className="space-y-1.5">
                        {meals.map(meal => (
                          <motion.div
                            key={meal.id}
                            layout
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between text-sm p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                          >
                            <div>
                              <span className="font-medium text-[14px]">{meal.foodItem.name}</span>
                              <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">
                                <span className="tabular-nums">{meal.foodItem.calories} kcal</span>
                                <span className="text-border">·</span>
                                <span className="text-nova-protein tabular-nums">P {meal.foodItem.protein}g</span>
                                <span className="text-nova-carbs tabular-nums">C {meal.foodItem.carbs}g</span>
                                <span className="text-nova-fats tabular-nums">F {meal.foodItem.fats}g</span>
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveMeal(meal.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-lg hover:bg-destructive/10"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="max-w-lg mx-auto px-5 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display tracking-tight">Weight History</h2>
            <Button variant="outline" size="sm" onClick={() => setView('dashboard')} className="rounded-xl text-[13px]">Back</Button>
          </div>
          <WeightChart entries={weightHistory} targetWeight={profile.targetWeightKg} />
        </motion.div>
      )}

      {/* FAB Group */}
      {view === 'dashboard' && (
        <div className="fixed bottom-6 right-5 z-40 flex flex-col gap-2.5 items-end">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={() => setView('nlp-input')}
              variant="outline"
              className="h-11 w-11 rounded-full shadow-md p-0 bg-card border-border/80 hover:bg-muted active:scale-90 transition-all duration-200"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
            </Button>
          </motion.div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={() => setView('ai-scanner')}
              variant="outline"
              className="h-11 w-11 rounded-full shadow-md p-0 bg-card border-border/80 hover:bg-muted active:scale-90 transition-all duration-200"
            >
              <Camera className="w-[18px] h-[18px]" />
            </Button>
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={() => setView('food')}
              className="h-14 w-14 rounded-full shadow-lg p-0 active:scale-90 transition-transform duration-200"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
