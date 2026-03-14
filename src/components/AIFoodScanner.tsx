import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AIFoodConfirmation from './AIFoodConfirmation';

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

const MEAL_TYPES: { value: MealEntry['mealType']; label: string }[] = [
  { value: 'breakfast', label: 'בוקר' },
  { value: 'lunch', label: 'צהריים' },
  { value: 'dinner', label: 'ערב' },
  { value: 'snack', label: 'חטיף' },
  { value: 'late_night', label: 'לילה' },
];

export default function AIFoodScanner({ onAddMeal, onClose }: AIFoodScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalyzedFood[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
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
      setShowConfirmation(false);
      analyzeImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Image: string) => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', { body: { image: base64Image } });
      if (error) throw error;
      if (data?.foods && Array.isArray(data.foods) && data.foods.length > 0) {
        setResults(data.foods);
        setShowConfirmation(true);
      } else {
        toast.error('לא ניתן לזהות מאכלים בתמונה');
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      toast.error('ניתוח התמונה נכשל. נסה שוב.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = (selectedFoods: AnalyzedFood[]) => {
    for (const food of selectedFoods) {
      const entry: MealEntry = {
        id: crypto.randomUUID(),
        foodItem: {
          id: crypto.randomUUID(),
          name: food.name,
          calories: Math.round(food.calories),
          protein: Math.round(food.protein),
          carbs: Math.round(food.carbs),
          fats: Math.round(food.fats),
          servingSize: food.servingSize,
          category: 'סריקת AI',
        },
        quantity: 1,
        mealType,
        timestamp: new Date().toISOString(),
      };
      onAddMeal(entry);
    }
    toast.success(`${selectedFoods.length} פריט${selectedFoods.length > 1 ? 'ים' : ''} נרשם/ו!`);
    setShowConfirmation(false);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
          <ArrowRight className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-[17px] font-bold font-display tracking-tight">סורק מזון AI</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">צלם תמונה לניתוח תזונתי</p>
        </div>
      </div>

      <div className="px-5 space-y-5 flex-1 overflow-auto hide-scrollbar pb-8">
        <div className="flex gap-1.5">
          {MEAL_TYPES.map(mt => (
            <button key={mt.value} onClick={() => setMealType(mt.value)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 active:scale-[0.97] ${
                mealType === mt.value ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>

        {!image ? (
          <div className="nova-card p-10 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Camera className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-bold font-display text-[15px]">צלם את הארוחה שלך</h3>
              <p className="text-[13px] text-muted-foreground mt-1.5">ה-AI ינתח את הערכים התזונתיים</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 h-[48px] rounded-xl gap-2 font-medium active:scale-[0.97] text-[13px]" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="w-4 h-4" /> מצלמה
              </Button>
              <Button className="flex-1 h-[48px] rounded-xl gap-2 font-medium active:scale-[0.97] text-[13px]" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" /> גלריה
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="nova-card overflow-hidden">
              <div className="relative">
                <img src={image} alt="מזון" className="w-full h-52 object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                    <p className="text-[13px] font-medium">מנתח את הארוחה שלך...</p>
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl text-[12px]" onClick={() => { setImage(null); setResults([]); setShowConfirmation(false); }}>
              צלם תמונה אחרת
            </Button>
            {results.length > 0 && !showConfirmation && (
              <div className="space-y-3">
                <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em]">פריטים שזוהו</h3>
                {results.map((food, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="nova-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-[14px]">{food.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">{food.servingSize} · {Math.round(food.calories)} קק"ל</div>
                        <div className="flex gap-2 mt-2 text-[10px] font-medium">
                          <span className="text-nova-protein tabular-nums px-2 py-0.5 rounded-md bg-nova-protein/8">ח {Math.round(food.protein)} גר׳</span>
                          <span className="text-nova-carbs tabular-nums px-2 py-0.5 rounded-md bg-nova-carbs/8">פ {Math.round(food.carbs)} גר׳</span>
                          <span className="text-nova-fats tabular-nums px-2 py-0.5 rounded-md bg-nova-fats/8">ש {Math.round(food.fats)} גר׳</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                        <span>✓ נוסף</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showConfirmation && results.length > 0 && (
          <AIFoodConfirmation foods={results} onConfirm={handleConfirm} onCancel={() => setShowConfirmation(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
