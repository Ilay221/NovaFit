import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MealEntry, FoodItem } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export default function NLPFoodInput({ onAddMeal, onClose }: NLPFoodInputProps) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [results, setResults] = useState<ParsedFood[]>([]);
  const [mealType, setMealType] = useState<MealEntry['mealType']>('lunch');

  const mealTypes: { value: MealEntry['mealType']; emoji: string; label: string }[] = [
    { value: 'breakfast', emoji: '🌅', label: 'Breakfast' },
    { value: 'lunch', emoji: '☀️', label: 'Lunch' },
    { value: 'dinner', emoji: '🌙', label: 'Dinner' },
    { value: 'snack', emoji: '🍎', label: 'Snack' },
  ];

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

    onAddMeal({
      id: crypto.randomUUID(),
      foodItem,
      quantity: 1,
      mealType,
      timestamp: new Date().toISOString(),
    });

    toast.success(`${food.name} logged!`);
  };

  const addAll = () => {
    results.forEach(addFood);
    setResults([]);
    setText('');
  };

  const totalCals = results.reduce((s, f) => s + Math.round(f.calories), 0);
  const totalP = results.reduce((s, f) => s + Math.round(f.protein), 0);
  const totalC = results.reduce((s, f) => s + Math.round(f.carbs), 0);
  const totalF = results.reduce((s, f) => s + Math.round(f.fats), 0);

  const examples = [
    "I had two scrambled eggs and a slice of toast",
    "Greek yogurt with banana and almonds",
    "Grilled chicken salad with olive oil dressing",
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
        <div>
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Describe Your Meal
          </h2>
          <p className="text-xs text-muted-foreground">Type what you ate and AI will log the macros</p>
        </div>
      </div>

      <div className="px-5 space-y-5 flex-1 overflow-auto hide-scrollbar pb-8">
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

        {/* Text input */}
        <div className="space-y-3">
          <Textarea
            placeholder="e.g. I ate two eggs and toast with butter..."
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            className="min-h-[100px] rounded-2xl bg-muted/40 border-0 focus-visible:ring-1 text-sm resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{text.length}/500</span>
            <Button
              onClick={handleParse}
              disabled={!text.trim() || parsing}
              className="rounded-2xl h-10 px-6 gap-2 font-semibold active:scale-95 transition-transform"
            >
              {parsing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Analyze</>
              )}
            </Button>
          </div>
        </div>

        {/* Example suggestions */}
        {results.length === 0 && !parsing && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Try saying</p>
            {examples.map((ex, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setText(ex)}
                className="w-full text-left p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-[0.98]"
              >
                "{ex}"
              </motion.button>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-display text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Parsed Items
                </h3>
                <Button
                  size="sm"
                  onClick={addAll}
                  className="rounded-xl h-8 px-4 text-xs font-semibold gap-1 active:scale-95"
                >
                  <Plus className="w-3 h-3" /> Log All
                </Button>
              </div>

              {/* Summary bar */}
              <div className="nova-card p-3 flex justify-around text-center">
                <div>
                  <div className="font-bold text-sm font-display">{totalCals}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">kcal</div>
                </div>
                <div>
                  <div className="font-bold text-sm font-display text-nova-protein">{totalP}g</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Protein</div>
                </div>
                <div>
                  <div className="font-bold text-sm font-display text-nova-carbs">{totalC}g</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Carbs</div>
                </div>
                <div>
                  <div className="font-bold text-sm font-display text-nova-fats">{totalF}g</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fats</div>
                </div>
              </div>

              {results.map((food, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="nova-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold">{food.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{food.servingSize} · {Math.round(food.calories)} kcal</div>
                      <div className="flex gap-3 mt-2 text-[11px] font-medium">
                        <span className="text-nova-protein px-2 py-0.5 rounded-full bg-nova-protein/10">P {Math.round(food.protein)}g</span>
                        <span className="text-nova-carbs px-2 py-0.5 rounded-full bg-nova-carbs/10">C {Math.round(food.carbs)}g</span>
                        <span className="text-nova-fats px-2 py-0.5 rounded-full bg-nova-fats/10">F {Math.round(food.fats)}g</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl h-9 px-4 font-semibold active:scale-95"
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
