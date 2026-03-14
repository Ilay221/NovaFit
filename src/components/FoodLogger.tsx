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
  const [activeTab, setActiveTab] = useState<'search' | 'templates'>('search');
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [addedId, setAddedId] = useState<string | null>(null);
  const [portionFood, setPortionFood] = useState<FoodItem | null>(null);
  const results = searchFoods(query);
  const { templates, deleteTemplate } = useMealTemplates();

  const handleFoodClick = (food: FoodItem) => {
    haptics.light();
    setPortionFood(food);
  };

  const handlePortionConfirm = (entry: MealEntry) => {
    onAddMeal(entry);
    setPortionFood(null);
    setQuery('');
    haptics.success();
    toast.success('המאכל נרשם בהצלחה!');
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Add each item in the template as a separate meal entry
    template.items.forEach(item => {
      onAddMeal({
         id: crypto.randomUUID(),
         foodItem: item.foodItem,
         quantity: item.quantity,
         mealType: mealType, // Insert as the currently selected meal type, rather than the template's original type for flexibility
         timestamp: new Date().toISOString()
      });
    });
    
    haptics.success();
    toast.success(`תבנית "${template.name}" נוספה בהצלחה!`);
    onClose();
  };

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
        <h2 className="text-[17px] font-bold font-display tracking-tight">רישום אוכל</h2>
      </motion.div>

      <div className="px-5 space-y-4 flex-1 overflow-auto hide-scrollbar pb-8">
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

        {/* Search vs Templates Toggle */}
        <div className="flex bg-muted/50 p-1 rounded-xl">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'search' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            חיפוש
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'templates' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            תבניות שלי ({templates.length})
          </motion.button>
        </div>

        {activeTab === 'search' ? (
          <>
            {/* Search */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש מאכלים..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="ps-10 h-11 rounded-xl bg-muted/40 border-0 focus-visible:ring-1 text-[14px]"
                autoFocus
              />
            </motion.div>

            {/* Results */}
            <AnimatePresence mode="popLayout">
              <div className="space-y-1">
                {results.map((food, i) => (
                  <motion.div
                    key={food.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, x: -40 }}
                    transition={{ delay: i * 0.025, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    layout
                    whileHover={{ x: -4, backgroundColor: 'hsl(var(--muted) / 0.4)' }}
                    className={`flex items-center gap-3 p-3.5 rounded-xl transition-colors cursor-pointer group ${
                      addedId === food.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => handleFoodClick(food)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[14px]">{food.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{food.servingSize} · {food.calories} קק"ל</div>
                      <div className="flex gap-2.5 mt-1.5 text-[10px] font-medium">
                        <span className="text-nova-protein tabular-nums">ח {food.protein} גר׳</span>
                        <span className="text-nova-carbs tabular-nums">פ {food.carbs} גר׳</span>
                        <span className="text-nova-fats tabular-nums">ש {food.fats} גר׳</span>
                      </div>
                    </div>
                    <motion.div
                      className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ scale: 1.2, rotate: 90 }}
                    >
                      <Plus className="w-4 h-4 text-primary" />
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </>
        ) : (
          /* Templates List */
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {templates.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-10">
                  <Utensils className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>אין לך תבניות שמורות עדיין.</p>
                  <p className="text-xs mt-1">תוכל לשמור ארוחות מלאות בתור תבניות מהפאנל הראשי.</p>
                </div>
              ) : (
                templates.map((template, i) => {
                  const totalCal = template.items.reduce((acc, item) => acc + (item.foodItem.calories * item.quantity), 0);
                  const totalProtein = template.items.reduce((acc, item) => acc + (item.foodItem.protein * item.quantity), 0);
                  
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-muted/30 border border-border/50 rounded-xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleApplyTemplate(template.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-[15px]">{template.name}</h3>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); haptics.medium(); }}
                          className="text-xs text-destructive/80 hover:text-destructive p-1"
                        >
                          מחק
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mb-3 flex flex-wrap gap-1">
                        {template.items.map((item, idx) => (
                           <span key={idx} className="bg-background/80 px-1.5 py-0.5 rounded">
                             {item.quantity}x {item.foodItem.name}
                           </span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-[11px] font-medium border-t border-border/50 pt-2">
                         <span className="tabular-nums">{Math.round(totalCal)} קק"ל</span>
                         <span className="text-nova-protein tabular-nums">ח {Math.round(totalProtein)} גר׳</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
