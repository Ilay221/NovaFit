import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFoods } from '@/lib/food-database';
import { FoodItem, MealEntry } from '@/lib/types';

interface FoodLoggerProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}

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

  const mealTypes: { value: MealEntry['mealType']; emoji: string; label: string }[] = [
    { value: 'breakfast', emoji: '🌅', label: 'Breakfast' },
    { value: 'lunch', emoji: '☀️', label: 'Lunch' },
    { value: 'dinner', emoji: '🌙', label: 'Dinner' },
    { value: 'snack', emoji: '🍎', label: 'Snack' },
  ];

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
        <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold font-display">Log Food</h2>
      </div>

      <div className="px-5 space-y-4 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Meal type pills */}
        <div className="flex gap-2">
          {mealTypes.map(mt => (
            <button key={mt.value} onClick={() => setMealType(mt.value)}
              className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
                mealType === mt.value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.emoji} {mt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-muted/40 border-0 focus-visible:ring-1 text-sm"
          />
        </div>

        {/* Results */}
        <div className="space-y-2">
          {results.map((food, i) => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-4 rounded-2xl nova-card-hover cursor-pointer group"
              onClick={() => addFood(food)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{food.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{food.servingSize} · {food.calories} kcal</div>
                <div className="flex gap-3 mt-1.5 text-[11px] font-medium">
                  <span className="text-nova-protein">P {food.protein}g</span>
                  <span className="text-nova-carbs">C {food.carbs}g</span>
                  <span className="text-nova-fats">F {food.fats}g</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
