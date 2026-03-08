import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ArrowLeft, Camera, Hand, Smartphone, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { FoodItem, MealEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortionEstimatorProps {
  food: FoodItem;
  mealType: MealEntry['mealType'];
  onConfirm: (entry: MealEntry) => void;
  onBack: () => void;
}

// Reference objects for visual scale comparison
const REFERENCE_OBJECTS = [
  { name: 'Golf Ball', icon: '⛳', grams: 30, scale: 0.3 },
  { name: 'Fist', icon: '✊', grams: 120, scale: 0.6 },
  { name: 'Smartphone', icon: '📱', grams: 200, scale: 0.75 },
  { name: 'Full Plate', icon: '🍽️', grams: 400, scale: 1.0 },
];

// Portion presets from tiny to huge
const PORTION_STOPS = [
  { label: '1 tsp', multiplier: 0.05, emoji: '🥄' },
  { label: '1 tbsp', multiplier: 0.1, emoji: '🥄' },
  { label: '¼ cup', multiplier: 0.25, emoji: '🥣' },
  { label: '½ cup', multiplier: 0.5, emoji: '🥣' },
  { label: '1 cup', multiplier: 1.0, emoji: '🍚' },
  { label: '1.5 cups', multiplier: 1.5, emoji: '🍚' },
  { label: '2 cups', multiplier: 2.0, emoji: '🥘' },
  { label: 'Full bowl', multiplier: 3.0, emoji: '🍲' },
  { label: 'Full pot', multiplier: 5.0, emoji: '🫕' },
];

export default function PortionEstimator({ food, mealType, onConfirm, onBack }: PortionEstimatorProps) {
  const [sliderValue, setSliderValue] = useState([50]); // 0-100
  const [cameraMode, setCameraMode] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Map slider 0-100 to multiplier range (0.05 to 5.0)
  const multiplier = useMemo(() => {
    const val = sliderValue[0];
    // Logarithmic scale for better control at small portions
    const t = val / 100;
    return 0.05 + (5.0 - 0.05) * Math.pow(t, 1.8);
  }, [sliderValue]);

  // Find closest reference object
  const closestRef = useMemo(() => {
    const grams = multiplier * parseFloat(food.servingSize) || multiplier * 100;
    return REFERENCE_OBJECTS.reduce((prev, curr) =>
      Math.abs(curr.grams - grams) < Math.abs(prev.grams - grams) ? curr : prev
    );
  }, [multiplier, food.servingSize]);

  // Find closest portion stop
  const closestStop = useMemo(() => {
    return PORTION_STOPS.reduce((prev, curr) =>
      Math.abs(curr.multiplier - multiplier) < Math.abs(prev.multiplier - multiplier) ? curr : prev
    );
  }, [multiplier]);

  // Real-time macro calculation
  const macros = useMemo(() => ({
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fats: Math.round(food.fats * multiplier * 10) / 10,
  }), [food, multiplier]);

  // Food visual scale (clamped 0.3 to 1.6 for visual)
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
        // Reverse the logarithmic mapping to set slider
        const t = Math.pow((m - 0.05) / (5.0 - 0.05), 1 / 1.8);
        setSliderValue([Math.round(t * 100)]);
        toast.success(`Estimated: ~${data.estimatedGrams || Math.round(m * 100)}g`);
      }
    } catch (err) {
      console.error('Portion estimation error:', err);
      toast.error('Could not estimate portion. Adjust manually.');
    } finally {
      setEstimating(false);
      setCameraMode(false);
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
      mealType,
      timestamp: new Date().toISOString(),
    });
    toast.success(`${food.name} logged — ${macros.calories} kcal`);
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 px-5 pt-6 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9, rotate: -10 }}
          className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <div>
          <h2 className="text-[17px] font-bold font-display tracking-tight">Portion Size</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{food.name}</p>
        </div>
      </motion.div>

      <div className="px-5 space-y-6 flex-1 overflow-auto hide-scrollbar pb-8">
        {/* Visual Food Display */}
        <motion.div
          className="nova-card p-6 flex flex-col items-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

          {/* Food visual with scale animation */}
          <div className="relative flex items-end justify-center gap-6 h-40">
            {/* Reference object */}
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="text-3xl"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
                animate={{ y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              >
                {closestRef.icon}
              </motion.div>
              <span className="text-[9px] text-muted-foreground font-medium">{closestRef.name}</span>
            </motion.div>

            {/* Food representation */}
            <motion.div
              className="flex flex-col items-center"
              animate={{ scale: visualScale }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.div
                className="relative"
                style={{
                  perspective: '600px',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* 3D perspective plate */}
                <motion.div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 flex items-center justify-center shadow-lg"
                  style={{
                    transform: 'rotateX(20deg)',
                    boxShadow: `0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)`,
                  }}
                  animate={{
                    boxShadow: [
                      `0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)`,
                      `0 ${12 * visualScale}px ${32 * visualScale}px -4px hsl(var(--primary) / 0.25)`,
                      `0 ${8 * visualScale}px ${24 * visualScale}px -4px hsl(var(--primary) / 0.15)`,
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                >
                  {/* Food mound */}
                  <motion.div
                    className="rounded-full bg-gradient-to-t from-primary/30 to-primary/10 border border-primary/20"
                    animate={{
                      width: `${Math.max(20, visualScale * 60)}px`,
                      height: `${Math.max(12, visualScale * 36)}px`,
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    style={{
                      borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                    }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>

          {/* Portion label */}
          <motion.div
            className="mt-4 text-center"
            key={closestStop.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-2xl">{closestStop.emoji}</span>
            <div className="text-[15px] font-bold font-display mt-1">{closestStop.label}</div>
            <div className="text-[11px] text-muted-foreground tabular-nums">{multiplier.toFixed(1)}× serving</div>
          </motion.div>
        </motion.div>

        {/* Interactive Slider */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
            <span>🥄 Spoon</span>
            <span>🫕 Pot</span>
          </div>
          <Slider
            value={sliderValue}
            onValueChange={setSliderValue}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
          {/* Portion stop dots */}
          <div className="flex justify-between px-1">
            {PORTION_STOPS.filter((_, i) => i % 2 === 0).map((stop, i) => (
              <button
                key={stop.label}
                onClick={() => {
                  const t = Math.pow((stop.multiplier - 0.05) / (5.0 - 0.05), 1 / 1.8);
                  setSliderValue([Math.round(t * 100)]);
                }}
                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors active:scale-90"
              >
                {stop.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Real-time Macros Display */}
        <motion.div
          className="nova-card p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">
            Nutritional Breakdown
          </div>

          {/* Calories - prominent */}
          <motion.div
            className="text-center mb-4"
            key={macros.calories}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className="text-[32px] font-black font-display tabular-nums text-primary">{macros.calories}</span>
            <span className="text-[13px] text-muted-foreground ml-1">kcal</span>
          </motion.div>

          {/* Macro bars */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Protein', value: macros.protein, unit: 'g', color: 'nova-protein' },
              { label: 'Carbs', value: macros.carbs, unit: 'g', color: 'nova-carbs' },
              { label: 'Fats', value: macros.fats, unit: 'g', color: 'nova-fats' },
            ].map((m) => (
              <motion.div
                key={m.label}
                className="text-center p-2.5 rounded-xl bg-muted/40"
                whileHover={{ scale: 1.03 }}
              >
                <motion.div
                  className={`text-[18px] font-bold tabular-nums text-${m.color}`}
                  key={m.value}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {m.value}
                  <span className="text-[11px]">{m.unit}</span>
                </motion.div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Camera Estimation Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl gap-2 text-[13px] font-medium relative overflow-hidden group"
            onClick={() => cameraRef.current?.click()}
            disabled={estimating}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {estimating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI Estimating Portion...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                📸 Snap Photo to Estimate Portion
              </>
            )}
          </Button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            AI analyzes your plate to estimate the portion size
          </p>
        </motion.div>

        {/* Confirm Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Button
            className="w-full h-14 rounded-2xl text-[15px] font-bold relative overflow-hidden group active:scale-[0.97] transition-transform"
            onClick={confirmPortion}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            />
            <span className="relative z-10">
              Log {macros.calories} kcal — {closestStop.label}
            </span>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
