import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FoodItem, MealEntry, MealType, MEAL_TYPES } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface PortionEstimatorProps {
  food: FoodItem;
  mealType: MealEntry['mealType'];
  onConfirm: (entry: MealEntry) => void;
  onMealTypeChange?: (type: MealType) => void;
  onBack: () => void;
}

const REFERENCE_OBJECTS = [
  { name: 'כדור גולף', icon: '⛳', grams: 30, scale: 0.3 },
  { name: 'אגרוף', icon: '✊', grams: 120, scale: 0.6 },
  { name: 'סמארטפון', icon: '📱', grams: 200, scale: 0.75 },
  { name: 'צלחת מלאה', icon: '🍽️', grams: 400, scale: 1.0 },
];

const PORTION_STOPS = [
  { label: 'כפית', multiplier: 0.05, emoji: '🥄' },
  { label: 'כף', multiplier: 0.1, emoji: '🥄' },
  { label: '¼ כוס', multiplier: 0.25, emoji: '🥣' },
  { label: '½ כוס', multiplier: 0.5, emoji: '🥣' },
  { label: 'כוס', multiplier: 1.0, emoji: '🍚' },
  { label: '1.5 כוסות', multiplier: 1.5, emoji: '🍚' },
  { label: '2 כוסות', multiplier: 2.0, emoji: '🥘' },
  { label: 'קערה מלאה', multiplier: 3.0, emoji: '🍲' },
  { label: 'סיר מלא', multiplier: 5.0, emoji: '🫕' },
];

export default function PortionEstimator({ food, mealType, onConfirm, onBack }: PortionEstimatorProps) {
  const [sliderValue, setSliderValue] = useState([50]);
  const [estimating, setEstimating] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const multiplier = useMemo(() => {
    const val = sliderValue[0];
    const t = val / 100;
    return 0.05 + (5.0 - 0.05) * Math.pow(t, 1.8);
  }, [sliderValue]);

  const closestRef = useMemo(() => {
    const grams = multiplier * parseFloat(food.servingSize) || multiplier * 100;
    return REFERENCE_OBJECTS.reduce((prev, curr) => Math.abs(curr.grams - grams) < Math.abs(prev.grams - grams) ? curr : prev);
  }, [multiplier, food.servingSize]);

  const closestStop = useMemo(() => {
    return PORTION_STOPS.reduce((prev, curr) => Math.abs(curr.multiplier - multiplier) < Math.abs(prev.multiplier - multiplier) ? curr : prev);
  }, [multiplier]);

  const macros = useMemo(() => ({
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fats: Math.round(food.fats * multiplier * 10) / 10,
  }), [food, multiplier]);

  const visualScale = Math.max(0.3, Math.min(1.6, 0.3 + (multiplier / 5.0) * 1.3));

  const handleCameraEstimate = async (base64Image: string) => {
    setEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-portion', {
        body: { image: base64Image, foodName: food.name, servingSize: food.servingSize },
      });
      if (error) throw error;
      if (data?.multiplier) {
        const m = Math.max(0.05, Math.min(5.0, data.multiplier));
        const t = Math.pow((m - 0.05) / (5.0 - 0.05), 1 / 1.8);
        setSliderValue([Math.round(t * 100)]);
        toast.success(`הערכה: ~${data.estimatedGrams || Math.round(m * 100)} גר׳`);
      }
    } catch (err) {
      console.error('Portion estimation error:', err);
      toast.error('לא ניתן להעריך מנה. התאם ידנית.');
    } finally {
      setEstimating(false);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setCameraImage(base64);
      handleCameraEstimate(base64);
    };
    reader.readAsDataURL(file);
  };

  const [activeMealType, setActiveMealType] = useState<MealType>(mealType);

  const confirmPortion = () => {
    onConfirm({
      id: crypto.randomUUID(),
      foodItem: {
        ...food,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fats: macros.fats,
        servingSize: `${closestStop.label} (${multiplier.toFixed(1)}x)`,
      },
      quantity: 1,
      mealType: activeMealType,
      timestamp: new Date().toISOString(),
    });
    toast.success(`${food.name} נרשם — ${macros.calories} קק"ל`);
  };

  return (
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col"
    >
      <motion.div className="flex items-center gap-3 px-5 pt-6 pb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <motion.button onClick={onBack} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9, rotate: 10 }} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </motion.button>
        <div className="flex-1">
          <h2 className="text-[17px] font-bold font-display tracking-tight">גודל מנה</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{food.name}</p>
        </div>
        
        {/* Quick Meal Type Switcher */}
        <div className="flex bg-muted/40 p-1 rounded-xl gap-0.5 border border-border/10">
          {MEAL_TYPES.map(mt => (
            <motion.button
              key={mt.value}
              onClick={() => { setActiveMealType(mt.value); haptics.light(); }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all btn-premium ${
                activeMealType === mt.value 
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_hsla(var(--primary)/0.3)]' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="px-5 space-y-6 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Visual Food Display */}
        <motion.div className="nova-card p-6 flex flex-col items-center relative overflow-hidden" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <div className="relative flex items-end justify-center gap-6 h-40">
            <motion.div className="flex flex-col items-center gap-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <motion.div className="text-3xl" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }} animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}>
                {closestRef.icon}
              </motion.div>
              <span className="text-[9px] text-muted-foreground font-medium">{closestRef.name}</span>
            </motion.div>
            <motion.div className="flex flex-col items-center" animate={{ scale: visualScale }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
              <motion.div className="relative" style={{ perspective: '600px', transformStyle: 'preserve-3d' }}>
                <motion.div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 flex items-center justify-center shadow-lg"
                  style={{ transform: 'rotateX(20deg)', boxShadow: `0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)` }}
                  animate={{ boxShadow: [`0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)`, `0 ${12 * visualScale}px ${32 * visualScale}px -4px hsl(var(--primary) / 0.25)`, `0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)`] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  <motion.div
                    className="rounded-full bg-gradient-to-t from-primary/30 to-primary/10 border border-primary/20"
                    animate={{ width: `${Math.max(20, visualScale * 60)}px`, height: `${Math.max(12, visualScale * 36)}px` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
          <motion.div className="mt-4 text-center" key={closestStop.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-2xl">{closestStop.emoji}</span>
            <div className="text-[15px] font-bold font-display mt-1">{closestStop.label}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">{multiplier.toFixed(1)}× מנה</div>
          </motion.div>
        </motion.div>

        {/* Slider */}
        <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
            <span>🥄 כפית</span>
            <span>🫕 סיר</span>
          </div>
          <Slider value={sliderValue} onValueChange={setSliderValue} max={100} min={0} step={1} className="w-full" dir="ltr" />
          <div className="flex justify-between px-1">
            {PORTION_STOPS.filter((_, i) => i % 2 === 0).map((stop) => (
              <button key={stop.label} onClick={() => { const t = Math.pow((stop.multiplier - 0.05) / (5.0 - 0.05), 1 / 1.8); setSliderValue([Math.round(t * 100)]); }}
                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors active:scale-90">
                {stop.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Macros */}
        <motion.div className="nova-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">פירוט תזונתי</div>
          <motion.div className="text-center mb-4" key={macros.calories} initial={{ scale: 1.1, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <span className="text-[32px] font-black font-display tabular-nums text-primary">{macros.calories}</span>
            <span className="text-[13px] text-muted-foreground me-1">קק"ל</span>
          </motion.div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'חלבון', value: macros.protein, unit: 'גר׳', color: 'nova-protein' },
              { label: 'פחמימות', value: macros.carbs, unit: 'גר׳', color: 'nova-carbs' },
              { label: 'שומנים', value: macros.fats, unit: 'גר׳', color: 'nova-fats' },
            ].map((m) => (
              <motion.div key={m.label} className="text-center p-2.5 rounded-xl bg-muted/40" whileHover={{ scale: 1.03 }}>
                <motion.div className={`text-[18px] font-bold tabular-nums text-${m.color}`} key={m.value} initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                  {m.value}<span className="text-[11px]">{m.unit}</span>
                </motion.div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Camera */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Button variant="outline" className="w-full h-12 rounded-xl gap-2 text-[13px] font-medium relative overflow-hidden group" onClick={() => cameraRef.current?.click()} disabled={estimating}>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {estimating ? <><Loader2 className="w-4 h-4 animate-spin" /> AI מעריך מנה...</> : <><Camera className="w-4 h-4" /> 📸 צלם כדי להעריך מנה</>}
          </Button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">ה-AI מנתח את הצלחת שלך כדי להעריך גודל מנה</p>
        </motion.div>

        {/* Confirm */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Button 
            shimmer
            size="lg"
            className="w-full text-[15px] font-bold" 
            onClick={confirmPortion}
          >
            רשום {macros.calories} קק"ל — {closestStop.label}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
