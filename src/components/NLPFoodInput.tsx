import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MealEntry, FoodItem } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import PortionEstimator from './PortionEstimator';

interface NLPFoodInputProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}

interface ParsedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
}

const MEAL_TYPES: { value: MealEntry['mealType']; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export default function NLPFoodInput({ onAddMeal, onClose }: NLPFoodInputProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<ParsedFood[]>([]);
  const [mealType, setMealType] = useState<MealEntry['mealType']>('lunch');
  const [portionFood, setPortionFood] = useState<FoodItem | null>(null);

  const handleParse = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setParsing(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('parse-food-text', {
        body: { text: trimmed },
      });

      if (error) throw error;

      if (data?.foods && Array.isArray(data.foods)) {
        setResults(data.foods);
      } else {
        toast.error('Could not parse the food description');
      }
    } catch (err: any) {
      console.error('NLP parse error:', err);
      toast.error('Failed to parse. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const addFood = (food: ParsedFood) => {
    const foodItem: FoodItem = {
      id: crypto.randomUUID(),
      name: food.name,
      calories: Math.round(food.calories),
      protein: Math.round(food.protein),
      carbs: Math.round(food.carbs),
      fats: Math.round(food.fats),
      servingSize: food.servingSize,
      category: 'AI Parsed',
    };
    setPortionFood(foodItem);
  };

  const handlePortionConfirm = (entry: MealEntry) => {
    onAddMeal(entry);
    setPortionFood(null);
    toast.success('Meal logged with custom portion!');
  };

  const addAll = () => {
    results.forEach(addFood);
  };

  const totalCals = results.reduce((s, f) => s + Math.round(f.calories), 0);
  const totalP = results.reduce((s, f) => s + Math.round(f.protein), 0);
  const totalC = results.reduce((s, f) => s + Math.round(f.carbs), 0);
  const totalF = results.reduce((s, f) => s + Math.round(f.fats), 0);

  const examples = [
    "Two scrambled eggs with a slice of toast",
    "Greek yogurt with banana and almonds",
    "Grilled chicken salad with olive oil",
  ];

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
        <div>
          <h2 className="text-[17px] font-bold font-display tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Describe Your Meal
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Type what you ate and AI will calculate the macros</p>
        </div>
      </div>

      <div className="px-5 space-y-5 flex-1 overflow-auto hide-scrollbar pb-8">
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

        {/* Text input */}
        <div className="space-y-3">
          <Textarea
            placeholder="e.g. Two eggs and toast with butter..."
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            className="min-h-[100px] rounded-xl bg-muted/40 border-0 focus-visible:ring-1 text-[14px] resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground tabular-nums">{text.length}/500</span>
            <Button
              onClick={handleParse}
              disabled={!text.trim() || parsing}
              className="rounded-xl h-10 px-6 gap-2 font-medium active:scale-[0.97] transition-transform text-[13px]"
            >
              {parsing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing</>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>
        </div>

        {/* Example suggestions */}
        {results.length === 0 && !parsing && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">Examples</p>
            {examples.map((ex, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setText(ex)}
                className="w-full text-left p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 text-[13px] text-muted-foreground hover:text-foreground transition-colors active:scale-[0.99]"
              >
                {ex}
              </motion.button>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">
                  Parsed Items
                </h3>
              </div>

              {/* Summary bar */}
              <div className="nova-card p-3.5 flex justify-around text-center">
                <div>
                  <div className="font-bold text-[14px] font-display tabular-nums">{totalCals}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">kcal</div>
                </div>
                <div>
                  <div className="font-bold text-[14px] font-display text-nova-protein tabular-nums">{totalP}g</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Protein</div>
                </div>
                <div>
                  <div className="font-bold text-[14px] font-display text-nova-carbs tabular-nums">{totalC}g</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Carbs</div>
                </div>
                <div>
                  <div className="font-bold text-[14px] font-display text-nova-fats tabular-nums">{totalF}g</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Fats</div>
                </div>
              </div>

              {results.map((food, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="nova-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-[14px]">{food.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{food.servingSize} · {Math.round(food.calories)} kcal</div>
                      <div className="flex gap-2 mt-2 text-[10px] font-medium">
                        <span className="text-nova-protein tabular-nums px-2 py-0.5 rounded-md bg-nova-protein/8">P {Math.round(food.protein)}g</span>
                        <span className="text-nova-carbs tabular-nums px-2 py-0.5 rounded-md bg-nova-carbs/8">C {Math.round(food.carbs)}g</span>
                        <span className="text-nova-fats tabular-nums px-2 py-0.5 rounded-md bg-nova-fats/8">F {Math.round(food.fats)}g</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl h-9 px-4 font-medium active:scale-[0.97] text-[12px]"
                      onClick={() => addFood(food)}
                    >
                      Add
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
