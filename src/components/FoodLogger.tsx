import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchFoods } from '@/lib/food-database';
import { FoodItem, MealEntry } from '@/lib/types';

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
  const results = searchFoods(query);

  const addFood = (food: FoodItem) => {
    onAddMeal({
      id: crypto.randomUUID(),
      foodItem: food,
      quantity: 1,
      mealType,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[17px] font-bold font-display tracking-tight">Log Food</h2>
      </div>

      <div className="px-5 space-y-4 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Meal type pills */}
        <div className="flex gap-1.5">
          {MEAL_TYPES.map(mt => (
            <button key={mt.value} onClick={() => setMealType(mt.value)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97] ${
                mealType === mt.value
                  ? 'bg-foreground text-background'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 text-[14px]"
          />
        </div>

        {/* Results */}
        <div className="space-y-1.5">
          {results.map((food, i) => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer group"
              onClick={() => addFood(food)}
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
              <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
