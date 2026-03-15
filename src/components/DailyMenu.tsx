import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Loader2, Plus, Calendar, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealEntry, MealType, MEAL_LABELS, DailyMenuMeal } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDailyMenu } from '@/hooks/useDailyMenu';

interface DailyMenuProps {
  onClose: () => void;
  onAddMeal: (entry: MealEntry) => void;
  selectedDate: Date;
}

export default function DailyMenu({ onClose, onAddMeal, selectedDate }: DailyMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { menuPlan, saveMenu, clearMenu } = useDailyMenu(selectedDate);

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
                  חובה שהתפריט יהיה מותאם במדויק ליעדים שלי שבפרופיל (קלוריות ומאקרו) ביחד עם האוכל שאני אוהב (Favorite food) ויתחשב בהרגלים וברגישויות שלי. התפריט צריך להיות ריאלי ומגוון.
                  אנא החזר את התפריט בפורמט JSON הבא (ורק אותו, בתוך הערה של HTML בסוף התשובה):
                  <!--DAILY_MENU:{"date":"${format(selectedDate, 'yyyy-MM-dd')}","meals":{"breakfast":[{"name":"...","calories":0,"protein":0,"carbs":0,"fats":0,"servingSize":"..."}],"lunch":[],"dinner":[],"snack":[],"late_night":[]}}-->`
            }
          ]
        }),
      });

      if (!response.ok) throw new Error('Generation failed');
      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantSoFar = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.slice(6).trim();
            if (dataStr === '[DONE]') { streamDone = true; break; }
            try {
              const data = JSON.parse(dataStr);
              if (data.choices?.[0]?.delta?.content) {
                assistantSoFar += data.choices[0].delta.content;
              }
            } catch (e) {}
          }
        }
      }
      
      const match = assistantSoFar.match(/<!--DAILY_MENU:([\s\S]*?)-->/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        saveMenu(parsed);
        toast.success('התפריט נוצר ונשמר בהצלחה!');
      } else {
        toast.error('ה-AI לא הצליח לייצר את התפריט בפורמט הנדרש. נסה שוב.');
      }
    } catch (error) {
      console.error('Menu generation error:', error);
      toast.error('שגיאה ביצירת התפריט');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedDate, saveMenu]);

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
          <h2 className="text-xl font-bold font-display tracking-tight">תפריט יומי מותאם</h2>
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
              ה-AI שלנו יבנה לך תפריט מאוזן ומדויק שמתחשב בהעדפות, באהבות, ובמטרות התזונתיות שלך. התפריט פשוט וקל למעקב ומוצג בטבלה.
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
          <p className="text-sm font-medium animate-pulse">מרכיב את התפריט המושלם עבורך בהתאם להעדפותיך...</p>
        </div>
      )}

      {menuPlan && (
        <div className="space-y-8 pb-24">
          <div className="flex justify-between items-center mb-2 px-1">
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5"><Save className="w-4 h-4"/> תפריט שמור</p>
            <Button variant="ghost" size="sm" onClick={clearMenu} className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              צור מחדש
            </Button>
          </div>
          
          {Object.entries(menuPlan.meals).map(([type, items]) => (
             items.length > 0 && (
              <div key={type} className="space-y-3">
                <h3 className="text-[14px] font-bold text-primary font-display flex items-center gap-2">
                  <div className="w-1.5 h-4 rounded-full bg-primary" />
                  {MEAL_LABELS[type as MealType]}
                </h3>
                
                <div className="overflow-x-auto bg-muted/40 rounded-2xl border border-border/50 shadow-sm backdrop-blur-sm">
                  <table className="w-full text-right text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/60 border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/3">ארוחה</th>
                        <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">כמות</th>
                        <th className="px-4 py-3 font-semibold text-center tabular-nums">קק"ל</th>
                        <th className="px-4 py-3 font-semibold text-center tabular-nums text-nova-protein">חלבון</th>
                        <th className="px-4 py-3 font-semibold text-center tabular-nums text-nova-carbs">פחמ'</th>
                        <th className="px-4 py-3 font-semibold text-center tabular-nums text-nova-fats">שומן</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-[13px]">{item.name}</td>
                          <td className="px-4 py-3.5 text-muted-foreground text-[12px] text-center">{item.servingSize}</td>
                          <td className="px-4 py-3.5 tabular-nums font-bold text-center text-[13px]">{item.calories}</td>
                          <td className="px-4 py-3.5 tabular-nums text-center text-nova-protein text-[12px] font-medium">{item.protein}</td>
                          <td className="px-4 py-3.5 tabular-nums text-center text-nova-carbs text-[12px] font-medium">{item.carbs}</td>
                          <td className="px-4 py-3.5 tabular-nums text-center text-nova-fats text-[12px] font-medium">{item.fats}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}

          <div className="fixed bottom-8 left-5 right-5 z-20">
            <Button 
              onClick={applyToLog} 
              className="w-full h-14 rounded-2xl font-bold text-base gap-2 shadow-[0_10px_40px_-10px_rgba(var(--primary),0.5)] border border-primary/20 backdrop-blur-md bg-primary/95 hover:bg-primary transition-all hover:-translate-y-1"
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
