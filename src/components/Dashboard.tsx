import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Droplets, TrendingDown, Flame, Scale, Utensils, Settings, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile, MealEntry, WeightEntry, DailyLog } from '@/lib/types';
import { predictGoalDate } from '@/lib/calculations';
import CalorieRing from './CalorieRing';
import MacroBar from './MacroBar';
import FoodLogger from './FoodLogger';
import WeightChart from './WeightChart';
import SettingsPanel from './SettingsPanel';
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

type View = 'dashboard' | 'food' | 'weight' | 'settings';

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
    <div className="min-h-screen bg-background pb-24">
      <AnimatePresence>
        {view === 'food' && (
          <FoodLogger onAddMeal={(entry) => { onAddMeal(entry); setView('dashboard'); }} onClose={() => setView('dashboard')} />
        )}
        {view === 'settings' && (
          <SettingsPanel theme={theme} profile={profile} onUpdateProfile={onUpdateProfile} onClose={() => setView('dashboard')} />
        )}
      </AnimatePresence>

      {view === 'dashboard' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <h1 className="text-2xl font-bold font-display">{profile.name} 👋</h1>
            </div>
            <button onClick={() => setView('settings')} className="p-2.5 rounded-full bg-card border hover:bg-muted transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Calorie Ring */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center py-4"
          >
            <CalorieRing consumed={totals.calories} target={profile.dailyCalorieTarget} />
            <div className="flex gap-6 mt-4 text-sm">
              <div className="text-center">
                <div className="font-bold">{profile.dailyCalorieTarget}</div>
                <div className="text-xs text-muted-foreground">Target</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{totals.calories}</div>
                <div className="text-xs text-muted-foreground">Consumed</div>
              </div>
              <div className="text-center">
                <div className="font-bold">{Math.max(profile.dailyCalorieTarget - totals.calories, 0)}</div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          </motion.div>

          {/* Macros */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="p-4 rounded-xl border bg-card space-y-3">
            <h3 className="font-semibold font-display text-sm">Macronutrients</h3>
            <MacroBar label="Protein" current={totals.protein} target={profile.proteinTarget} color="hsl(var(--nova-protein))" />
            <MacroBar label="Carbs" current={totals.carbs} target={profile.carbsTarget} color="hsl(var(--nova-carbs))" />
            <MacroBar label="Fats" current={totals.fats} target={profile.fatsTarget} color="hsl(var(--nova-fats))" />
          </motion.div>

          {/* Quick Stats */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-card text-center">
              <Droplets className="w-5 h-5 text-nova-info mx-auto mb-1" />
              <div className="font-bold text-sm">{dailyLog.waterMl}ml</div>
              <div className="text-xs text-muted-foreground">Water</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <Scale className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="font-bold text-sm">{latestWeight}kg</div>
              <div className="text-xs text-muted-foreground">Weight</div>
            </div>
            <div className="p-3 rounded-xl border bg-card text-center">
              <TrendingDown className="w-5 h-5 text-nova-success mx-auto mb-1" />
              <div className="font-bold text-sm">{progressKg.toFixed(1)}kg</div>
              <div className="text-xs text-muted-foreground">Lost</div>
            </div>
          </motion.div>

          {/* Water Quick Add */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
            className="p-4 rounded-xl border bg-card">
            <h3 className="font-semibold font-display text-sm mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-nova-info" /> Water Intake
            </h3>
            <div className="flex gap-2">
              {[250, 500, 750].map(ml => (
                <Button key={ml} variant="outline" size="sm" onClick={() => onAddWater(ml)} className="flex-1 text-xs">
                  +{ml}ml
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Weight Log */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold font-display text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" /> Log Weight
              </h3>
              {weightHistory.length > 0 && (
                <button onClick={() => setView('weight')} className="text-xs text-primary flex items-center gap-1">
                  History <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Input type="number" placeholder="Weight (kg)" value={weightInput} onChange={e => setWeightInput(e.target.value)} className="h-9" />
              <Button size="sm" onClick={handleLogWeight} className="h-9 px-4">Log</Button>
            </div>
            {profile.goal !== 'maintain' && (
              <p className="text-xs text-muted-foreground mt-2">
                Estimated goal date: <span className="text-foreground font-medium">{format(goalDate, 'MMM d, yyyy')}</span>
              </p>
            )}
          </motion.div>

          {/* Today's Meals */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}
            className="p-4 rounded-xl border bg-card">
            <h3 className="font-semibold font-display text-sm mb-3 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" /> Today's Meals
            </h3>
            {dailyLog.meals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No meals logged yet today</p>
            ) : (
              <div className="space-y-4">
                {mealGroups.map(type => {
                  const meals = dailyLog.meals.filter(m => m.mealType === type);
                  if (meals.length === 0) return null;
                  return (
                    <div key={type}>
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                        {type}
                      </div>
                      <div className="space-y-1.5">
                        {meals.map(meal => (
                          <div key={meal.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                            <div>
                              <span className="font-medium">{meal.foodItem.name}</span>
                              <span className="text-muted-foreground ml-2">{meal.foodItem.calories} kcal</span>
                            </div>
                            <button onClick={() => onRemoveMeal(meal.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <div className="h-4" />
        </motion.div>
      )}

      {view === 'weight' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto px-4 pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-display">Weight History</h2>
            <Button variant="outline" size="sm" onClick={() => setView('dashboard')}>Back</Button>
          </div>
          <WeightChart entries={weightHistory} targetWeight={profile.targetWeightKg} />
        </motion.div>
      )}

      {/* FAB */}
      {(view === 'dashboard') && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Button
            onClick={() => setView('food')}
            className="h-14 w-14 rounded-full shadow-lg nova-glow p-0"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
