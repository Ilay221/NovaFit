import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Loader2, Check, Plus, Utensils, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealEntry, MealType, MEAL_LABELS, DailyMenuPlan, DailyMenuMeal } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DailyMenuProps {
  onClose: () => void;
  onAddMeal: (entry: MealEntry) => void;
  selectedDate: Date;
}

export default function DailyMenu({ onClose, onAddMeal, selectedDate }: DailyMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [menuPlan, setMenuPlan] = useState<DailyMenuPlan | null>(null);

  const generateMenu = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `צור לי תפריט יומי מומלץ לתאריך ${format(selectedDate, 'yyyy-MM-dd')}.
                  אנא החזר את התפריט בפורמט JSON הבא (ורק אותו, בתוך הערה של HTML):
                  <!--DAILY_MENU:{"date":"${format(selectedDate, 'yyyy-MM-dd')}","meals":{"breakfast":[{"name":"...","calories":0,"protein":0,"carbs":0,"fats":0,"servingSize":"..."}],"lunch":[],"dinner":[],"snack":[],"late_night":[]}}-->
                  התפריט צריך להיות מאוזן ומותאם ליעדים שלי שבפרופיל.`
            }
          ]
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const text = await response.text();
      // Since it's a stream or full response, we need to extract the tag. 
      // Simplified for now: if it's a stream, we'd need parsing like NutritionCoach.
      // But for a dedicated generation tool, we might want a non-streaming endpoint or wait for completion.
      // For now, let's assume we can find the tag in the final text.
      
      const match = text.match(/<!--DAILY_MENU:([\s\S]*?)-->/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        setMenuPlan(parsed);
        toast.success('התפריט נוצר בהצלחה!');
      } else {
        // Fallback or retry
        toast.error('לא הצלחתי ליצור תפריט בפורמט הנדרש. נסה שוב.');
      }
    } catch (error) {
      console.error('Menu generation error:', error);
      toast.error('שגיאה ביצירת התפריט');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedDate]);

  const applyToLog = () => {
    if (!menuPlan) return;

    let count = 0;
    Object.entries(menuPlan.meals).forEach(([type, items]) => {
      items.forEach((item: DailyMenuMeal) => {
        const entry: MealEntry = {
          id: crypto.randomUUID(),
          foodItem: {
            id: crypto.randomUUID(),
            name: item.name,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fats: item.fats,
            servingSize: item.servingSize,
            category: 'תפריט יומי',
          },
          quantity: 1,
          mealType: type as MealType,
          timestamp: new Date().toISOString(),
        };
        onAddMeal(entry);
        count++;
      });
    });

    toast.success(`${count} פריטים נוספו ליומן!`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 glass-screen flex flex-col p-5 overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6 pt-safe">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <ArrowRight className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-bold font-display tracking-tight">תפריט יומי</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Calendar className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-semibold text-primary tabular-nums">{format(selectedDate, 'dd/MM/yyyy')}</span>
        </div>
      </div>

      {!menuPlan && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl nova-gradient flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold">צור תפריט מותאם אישית</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
              ה-AI שלנו יבנה לך תפריט מאוזן המבוסס על היעדים, המאקרו וההעדפות שלך.
            </p>
          </div>
          <Button 
            onClick={generateMenu} 
            shimmer 
            className="h-14 px-10 rounded-2xl font-bold text-base gap-2 shadow-xl hover:scale-105 transition-transform"
          >
            <Sparkles className="w-5 h-5" />
            צור תפריט עכשיו
          </Button>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm font-medium animate-pulse">בונה לך את התפריט המושלם...</p>
        </div>
      )}

      {menuPlan && (
        <div className="space-y-6 pb-24">
          {Object.entries(menuPlan.meals).map(([type, items]) => (
             items.length > 0 && (
              <div key={type} className="space-y-3">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  {MEAL_LABELS[type as MealType]}
                </h3>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="nova-card p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-[14px]">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.servingSize} · {item.calories} קק"ל</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="px-2 py-0.5 rounded-md bg-nova-protein/10 text-nova-protein text-[10px] font-bold">ח {item.protein}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          ))}

          <div className="fixed bottom-8 left-5 right-5 z-20">
            <Button 
              onClick={applyToLog} 
              className="w-full h-14 rounded-2xl font-bold text-base gap-2 shadow-2xl"
              shimmer
            >
              <Plus className="w-5 h-5" />
              הוסף את כל התפריט ליומן
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
