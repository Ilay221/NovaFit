import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Upload, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealEntry, FoodItem } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIFoodScannerProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}

interface AnalyzedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
}

export default function AIFoodScanner({ onAddMeal, onClose }: AIFoodScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalyzedFood[]>([]);
  const [mealType, setMealType] = useState<MealEntry['mealType']>('lunch');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImage(base64);
      setResults([]);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { image: base64Image },
      });

      if (error) throw error;
      
      if (data?.foods && Array.isArray(data.foods)) {
        setResults(data.foods);
      } else {
        toast.error('Could not identify food items in this image');
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error('Failed to analyze image. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const addFood = (food: AnalyzedFood) => {
    const foodItem: FoodItem = {
      id: crypto.randomUUID(),
      name: food.name,
      calories: Math.round(food.calories),
      protein: Math.round(food.protein),
      carbs: Math.round(food.carbs),
      fats: Math.round(food.fats),
      servingSize: food.servingSize,
      category: 'AI Scanned',
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
        <div>
          <h2 className="text-lg font-bold font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> AI Food Scanner
          </h2>
          <p className="text-xs text-muted-foreground">Take a photo to analyze nutrition</p>
        </div>
      </div>

      <div className="px-5 space-y-5 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Meal type */}
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

        {/* Image preview or upload area */}
        {!image ? (
          <div className="nova-card p-8 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-bold font-display">Snap Your Meal</h3>
              <p className="text-sm text-muted-foreground mt-1">AI will analyze the nutritional content</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-2xl gap-2 font-semibold active:scale-95"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl gap-2 font-semibold active:scale-95"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> Gallery
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="nova-card overflow-hidden">
              <div className="relative">
                <img src={image} alt="Food" className="w-full h-56 object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm font-semibold">Analyzing your meal...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Retake */}
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => { setImage(null); setResults([]); }}
            >
              Take Another Photo
            </Button>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold font-display text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Detected Food Items
                </h3>
                {results.map((food, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
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
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
