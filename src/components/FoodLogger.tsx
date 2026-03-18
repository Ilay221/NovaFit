import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, ArrowRight, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchFoods } from '@/lib/food-database';
import { FoodItem, MealEntry, MealType, MEAL_TYPES } from '@/lib/types';
import PortionEstimator from './PortionEstimator';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';
import { useMealTemplates } from '@/hooks/useMealTemplates';

interface FoodLoggerProps {
  onAddMeal: (entry: MealEntry) => void;
  onClose: () => void;
}



export default function FoodLogger({ onAddMeal, onClose }: FoodLoggerProps) {
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const { templates, loading, deleteTemplate } = useMealTemplates();

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Add each item in the template as a separate meal entry
    template.items.forEach(item => {
      onAddMeal({
         id: crypto.randomUUID(),
         foodItem: item.foodItem,
         quantity: item.quantity,
         mealType: mealType, // Insert as the currently selected meal type
         timestamp: new Date().toISOString()
      });
    });
    
    haptics.success();
    toast.success(`תבנית "${template.name}" נוספה בהצלחה!`);
    onClose();
  };

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-background/90 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <motion.div
        className="flex items-center gap-3 px-5 pt-6 pb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9, rotate: 10 }}
          className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </motion.button>
        <h2 className="text-[17px] font-bold font-display tracking-tight">התבניות שלי</h2>
      </motion.div>

      <div className="px-5 space-y-5 flex-1 overflow-auto hide-scrollbar pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
             <p className="text-sm text-muted-foreground animate-pulse">טוען תבניות...</p>
          </div>
        ) : (
          <>
            {/* Meal type pills */}
        <motion.div
          className="flex gap-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {MEAL_TYPES.map((mt, i) => (
            <motion.button
              key={mt.value}
              onClick={() => setMealType(mt.value)}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-300 btn-premium ${
                mealType === mt.value
                  ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsla(var(--primary)/0.3)]'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {mt.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Templates List */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-12 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Utensils className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-semibold">אין לך תבניות שמורות עדיין</p>
                <p className="text-xs opacity-70 mt-1 max-w-[200px]">
                  תוכל לשמור ארוחות מלאות בתור תבניות מהמסך הראשי
                </p>
              </div>
            ) : (
              templates.map((template, i) => {
                const totalCal = template.items.reduce((acc, item) => acc + (item.foodItem.calories * item.quantity), 0);
                const totalProtein = template.items.reduce((acc, item) => acc + (item.foodItem.protein * item.quantity), 0);
                
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                    whileHover={{ scale: 1.01, backgroundColor: 'hsl(var(--muted)/0.5)' }}
                    className="bg-muted/30 border border-border/50 rounded-2xl p-4 cursor-pointer transition-all duration-300 group"
                    onClick={() => handleApplyTemplate(template.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-[15px] group-hover:text-primary transition-colors">{template.name}</h3>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); haptics.medium(); }}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive p-1 transition-colors"
                      >
                        מחק
                      </button>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-4 flex flex-wrap gap-1.5">
                      {template.items.map((item, idx) => (
                         <span key={idx} className="bg-background/80 px-2 py-1 rounded-lg border border-border/30">
                           {item.quantity}x {item.foodItem.name}
                         </span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-[11px] font-bold border-t border-border/20 pt-3">
                       <span className="tabular-nums flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                         {Math.round(totalCal)} קק"ל
                       </span>
                       <span className="text-nova-protein tabular-nums">ח {Math.round(totalProtein)} גר׳ חלבון</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </AnimatePresence>
      </>
    )}
  </div>
</motion.div>
  );
}
