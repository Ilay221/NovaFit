import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DetectedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
}

interface AIFoodConfirmationProps {
  foods: DetectedFood[];
  onConfirm: (selectedFoods: DetectedFood[]) => void;
  onCancel: () => void;
}

export default function AIFoodConfirmation({ foods, onConfirm, onCancel }: AIFoodConfirmationProps) {
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());

  const toggleFood = (index: number) => {
    setRemovedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const activeFoods = useMemo(() => foods.filter((_, i) => !removedIndices.has(i)), [foods, removedIndices]);

  const totals = useMemo(() => ({
    calories: activeFoods.reduce((s, f) => s + Math.round(f.calories), 0),
    protein: activeFoods.reduce((s, f) => s + Math.round(f.protein), 0),
    carbs: activeFoods.reduce((s, f) => s + Math.round(f.carbs), 0),
    fats: activeFoods.reduce((s, f) => s + Math.round(f.fats), 0),
  }), [activeFoods]);

  const buildSentence = () => {
    return foods.map((food, i) => {
      const isRemoved = removedIndices.has(i);
      return (
        <span key={i}>
          {i > 0 && (i === foods.length - 1 ? ' ו' : ', ')}
          <button
            onClick={() => toggleFood(i)}
            className={`inline font-semibold underline underline-offset-2 transition-all duration-200 ${
              isRemoved ? 'text-muted-foreground/40 line-through decoration-destructive/60' : 'text-primary hover:text-primary/80'
            }`}
          >
            {food.name}
          </button>
        </span>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="w-full max-w-md mx-4 mb-4 sm:mb-0 nova-card p-6 space-y-5 rounded-2xl shadow-2xl"
      >
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <p className="text-[15px] leading-relaxed font-medium">
            אכלת {buildSentence()}?
          </p>
          <p className="text-[11px] text-muted-foreground">
            לחץ על פריט כדי להסיר אותו
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={totals.calories}
            initial={{ opacity: 0.6, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="nova-card p-4 space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-muted-foreground font-medium uppercase tracking-wider">סה"כ</span>
              <motion.span key={totals.calories} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[22px] font-bold font-display tabular-nums">
                {totals.calories} <span className="text-[13px] font-normal text-muted-foreground">קק"ל</span>
              </motion.span>
            </div>
            <div className="flex gap-3 text-[11px] font-semibold">
              <span className="text-nova-protein tabular-nums px-2.5 py-1 rounded-lg bg-nova-protein/8 flex-1 text-center">ח {totals.protein} גר׳</span>
              <span className="text-nova-carbs tabular-nums px-2.5 py-1 rounded-lg bg-nova-carbs/8 flex-1 text-center">פ {totals.carbs} גר׳</span>
              <span className="text-nova-fats tabular-nums px-2.5 py-1 rounded-lg bg-nova-fats/8 flex-1 text-center">ש {totals.fats} גר׳</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-[13px] font-bold gap-2" onClick={onCancel}>
            <X className="w-4 h-4" /> ביטול
          </Button>
          <Button shimmer className="flex-1 h-12 rounded-xl text-[13px] font-bold gap-2" disabled={activeFoods.length === 0} onClick={() => onConfirm(activeFoods)}>
            <Check className="w-4 h-4" /> אישור
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
