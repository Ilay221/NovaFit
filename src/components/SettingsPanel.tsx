import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowRight, Moon, Sun, Monitor, RotateCcw, Check, LogOut, Sparkles, Calendar, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AccentColor, ThemeMode, UserProfile, WeightEntry } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';
import ProfileEditor from '@/components/ProfileEditor';
import NFPEditor from '@/components/NFPEditor';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';

interface SettingsPanelProps {
  theme: {
    mode: ThemeMode;
    setMode: (m: ThemeMode) => void;
    accent: AccentColor;
    setAccent: (a: AccentColor) => void;
  };
  profile: UserProfile;
  weightHistory: WeightEntry[];
  onUpdateProfile: (p: UserProfile | null) => void;
  onClose: () => void;
}

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'green', label: 'אמרלד', color: 'hsl(157 72% 40%)' },
  { value: 'purple', label: 'סגול', color: 'hsl(271 68% 55%)' },
  { value: 'blue', label: 'אוקיינוס', color: 'hsl(217 91% 60%)' },
  { value: 'orange', label: 'שקיעה', color: 'hsl(25 95% 53%)' },
  { value: 'pink', label: 'ורד', color: 'hsl(340 82% 52%)' },
  { value: 'teal', label: 'טיל', color: 'hsl(174 72% 40%)' },
  { value: 'red', label: 'רובי', color: 'hsl(0 72% 51%)' },
  { value: 'amber', label: 'ענבר', color: 'hsl(38 92% 50%)' },
  { value: 'indigo', label: 'אינדיגו', color: 'hsl(239 84% 67%)' },
];

const MODES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'בהיר' },
  { value: 'dark', icon: Moon, label: 'כהה' },
  { value: 'system', icon: Monitor, label: 'מערכת' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const } },
};

export default function SettingsPanel({ theme, profile, weightHistory, onUpdateProfile, onClose }: SettingsPanelProps) {
  const { signOut, user } = useAuth();
  const { requestPermission, subscribeToPush, sendLocalNotification } = useNotifications();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [testPending, setTestPending] = useState(false);

  const currentTargetDate = profile.targetDate ? parseISO(profile.targetDate) : null;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newTargetDate = date.toISOString().slice(0, 10);
      const updatedProfile = { ...profile, targetDate: newTargetDate };
      const adaptive = calculateAdaptiveTargets(updatedProfile, weightHistory);
      onUpdateProfile({
        ...updatedProfile,
        dailyCalorieTarget: adaptive.dailyCalorieTarget,
        proteinTarget: adaptive.proteinTarget,
        carbsTarget: adaptive.carbsTarget,
        fatsTarget: adaptive.fatsTarget,
      });
    }
    setDatePickerOpen(false);
  };

  const handleClearTargetDate = () => {
    const updatedProfile = { ...profile, targetDate: null };
    const adaptive = calculateAdaptiveTargets(updatedProfile, weightHistory);
    onUpdateProfile({
      ...updatedProfile,
      dailyCalorieTarget: adaptive.dailyCalorieTarget,
      proteinTarget: adaptive.proteinTarget,
      carbsTarget: adaptive.carbsTarget,
      fatsTarget: adaptive.fatsTarget,
    });
  };

  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 glass-screen overflow-auto"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-lg mx-auto px-5 py-8 space-y-6"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.button>
          <h2 className="text-[20px] font-bold font-display tracking-tight">הגדרות</h2>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ProfileEditor profile={profile} weightHistory={weightHistory} onUpdateProfile={onUpdateProfile} />
        </motion.div>

        <motion.div variants={itemVariants}>
          <NFPEditor profile={profile} onUpdateProfile={onUpdateProfile} />
        </motion.div>

        {/* Target Date */}
        {profile.goal !== 'maintain' && (
          <motion.div variants={itemVariants} className="nova-card p-5">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" /> תאריך יעד
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              הגדר דד-ליין להגיע למשקל היעד. יעד הקלוריות היומי יתעדכן אוטומטית.
            </p>
            <div className="flex gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-start font-normal h-11 rounded-xl",
                      !currentTargetDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="me-2 h-4 w-4" />
                    {currentTargetDate ? format(currentTargetDate, "PPP") : <span>בחר תאריך יעד</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={currentTargetDate ?? undefined}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < addDays(new Date(), 7)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {currentTargetDate && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClearTargetDate}
                    className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Theme Mode */}
        <motion.div variants={itemVariants} className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4">
            מראה
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <motion.button
                key={m.value}
                onClick={() => theme.setMode(m.value)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className={`p-3.5 rounded-xl text-center transition-all duration-300 ${
                  theme.mode === m.value
                    ? 'bg-foreground text-background shadow-lg'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <m.icon className="w-4 h-4 mx-auto mb-1.5" />
                <div className="text-[11px] font-semibold">{m.label}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
        
        {/* Push Notifications */}
        <motion.div variants={itemVariants} className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-primary" /> התראות
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium font-display">התראות דחיפה</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">תזכורות לשתיית מים, ארוחות וסיכום יומי</p>
            </div>
            <button
              onClick={async () => {
                const granted = await requestPermission();
                if (granted) {
                  await subscribeToPush();
                }
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[12px] font-bold transition-all btn-premium",
                Notification.permission === 'granted'
                  ? "bg-primary/10 text-primary border border-primary/20 pointer-events-none"
                  : "bg-primary text-primary-foreground shadow-[0_0_15px_hsla(var(--primary)/0.3)]"
              )}
            >
              {Notification.permission === 'granted' ? 'מופעל ✓' : 'הפעל'}
            </button>
          </div>

          {Notification.permission === 'granted' && (
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium font-display">בדיקת התראה</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">שלח הודעה בעוד 15 שניות</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={testPending}
                onClick={async () => {
                  setTestPending(true);
                  if (!user) return;
                  
                  toast.info('שולח בקשה לשרת... ההתראה תישלח בעוד 15 שניות');
                  
                  // Call the Edge Function
                  const { data, error } = await supabase.functions.invoke('send-push', {
                    body: {
                      user_id: user.id,
                      title: 'בדיקת NovaFit מהשרת! 🚀',
                      body: 'זהו מבחן מוצלח - ההתראה נשלחה מהשרת ועובדת גם כשהאפליקציה סגורה!',
                      delay_ms: 15000
                    }
                  });

                  if (error) {
                    console.error('Edge Function error:', error);
                    // Fallback to local if server fails (e.g. no keys)
                    setTimeout(() => {
                      sendLocalNotification('בדיקת NovaFit (מקומי)! 🚀', {
                        body: 'השרת לא הגיב, אבל ההתראות המקומיות עובדות.',
                      });
                      setTestPending(false);
                    }, 15000);
                  } else {
                    setTestPending(false);
                  }
                }}
                className="rounded-xl px-4 h-9 text-[11px]"
              >
                {testPending ? 'ממתין...' : 'בדוק עכשיו'}
              </Button>
            </div>
          )}
          {Notification.permission === 'denied' && (
            <p className="text-[10px] text-destructive mt-3 bg-destructive/10 p-2 rounded-lg border border-destructive/20">
              ההתראות חסומות בדפדפן. כדי להפעיל אותן, עליך לשנות את ההגדרות בדפדפן שלך.
            </p>
          )}
        </motion.div>


        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={() => onUpdateProfile(null)}
            className="w-full gap-2 h-[48px] rounded-xl font-medium active:scale-[0.98] transition-transform text-[13px]"
          >
            <RotateCcw className="w-4 h-4" /> איפוס פרופיל
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-2 h-[48px] rounded-xl font-medium active:scale-[0.98] transition-transform text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <LogOut className="w-4 h-4" /> התנתקות
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
