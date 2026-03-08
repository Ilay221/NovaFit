import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ArrowLeft, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchFoods } from '@/lib/food-database';
import { FoodItem, MealEntry } from '@/lib/types';
import PortionEstimator from './PortionEstimator';

interface FoodLoggerProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}

const MEAL_TYPES: { value: MealEntry['mealType']; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export default function FoodLogger({ onAddMeal, onClose }: FoodLoggerProps) {
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<MealEntry['mealType']>('breakfast');
  const [addedId, setAddedId] = useState<string | null>(null);
  const [portionFood, setPortionFood] = useState<FoodItem | null>(null);
  const results = searchFoods(query);

  const handleFoodClick = (food: FoodItem) => {
    setPortionFood(food);
  };

  const handlePortionConfirm = (entry: MealEntry) => {
    onAddMeal(entry);
    setPortionFood(null);
  };

  if (portionFood) {
    return (
      <PortionEstimator
        food={portionFood}
        mealType={mealType}
        onConfirm={handlePortionConfirm}
        onBack={() => setPortionFood(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 px-5 pt-6 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9, rotate: -10 }}
          className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <h2 className="text-[17px] font-bold font-display tracking-tight">Log Food</h2>
      </motion.div>

      <div className="px-5 space-y-4 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Meal type pills */}
        <motion.div
          className="flex gap-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {MEAL_TYPES.map((mt, i) => (
            <motion.button
              key={mt.value}
              onClick={() => setMealType(mt.value)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-300 ${
                mealType === mt.value
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 text-[14px]"
            autoFocus
          />
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-1">
            {results.map((food, i) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, x: 40 }}
                transition={{ delay: i * 0.025, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                layout
                whileHover={{ x: 4, backgroundColor: 'hsl(var(--muted) / 0.4)' }}
                className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors cursor-pointer group ${
                  addedId === food.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => handleFoodClick(food)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px]">{food.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{food.servingSize} · {food.calories} kcal</div>
                  <div className="flex gap-2.5 mt-1.5 text-[10px] font-medium">
                    <span className="text-nova-protein tabular-nums">P {food.protein}g</span>
                    <span className="text-nova-carbs tabular-nums">C {food.carbs}g</span>
                    <span className="text-nova-fats tabular-nums">F {food.fats}g</span>
                  </div>
                </div>
                <motion.div
                  className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.2, rotate: 90 }}
                >
                  <Plus className="w-4 h-4 text-primary" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
