import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X } from 'lucide-react';
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

  const mealTypes: { value: MealEntry['mealType']; emoji: string }[] = [
    { value: 'breakfast', emoji: '🌅' },
    { value: 'lunch', emoji: '☀️' },
    { value: 'dinner', emoji: '🌙' },
    { value: 'snack', emoji: '🍎' },
  ];

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold font-display">Log Food</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-auto hide-scrollbar">
        {/* Meal type selector */}
        <div className="flex gap-2">
          {mealTypes.map(mt => (
            <button key={mt.value} onClick={() => setMealType(mt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                mealType === mt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {mt.emoji} {mt.value.charAt(0).toUpperCase() + mt.value.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods or describe your meal..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Results */}
        <div className="space-y-2">
          {results.map(food => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{food.name}</div>
                <div className="text-xs text-muted-foreground">{food.servingSize} · {food.calories} kcal</div>
                <div className="flex gap-3 mt-1 text-xs">
                  <span className="text-nova-protein">P {food.protein}g</span>
                  <span className="text-nova-carbs">C {food.carbs}g</span>
                  <span className="text-nova-fats">F {food.fats}g</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => addFood(food)}>
                <Plus className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
