import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Monitor, RotateCcw, Check, LogOut, Sparkles, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AccentColor, ThemeMode, UserProfile, WeightEntry } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { calculateAdaptiveTargets } from '@/lib/adaptive-engine';

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
  { value: 'green', label: 'Emerald', color: 'hsl(157 72% 40%)' },
  { value: 'purple', label: 'Violet', color: 'hsl(271 68% 55%)' },
  { value: 'blue', label: 'Ocean', color: 'hsl(217 91% 60%)' },
  { value: 'orange', label: 'Sunset', color: 'hsl(25 95% 53%)' },
  { value: 'pink', label: 'Rose', color: 'hsl(340 82% 52%)' },
  { value: 'teal', label: 'Teal', color: 'hsl(174 72% 40%)' },
  { value: 'red', label: 'Ruby', color: 'hsl(0 72% 51%)' },
  { value: 'amber', label: 'Amber', color: 'hsl(38 92% 50%)' },
  { value: 'indigo', label: 'Indigo', color: 'hsl(239 84% 67%)' },
];

const MODES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
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
  const { signOut } = useAuth();
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const currentTargetDate = profile.targetDate ? parseISO(profile.targetDate) : null;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newTargetDate = date.toISOString().slice(0, 10);
      const updatedProfile = {
        ...profile,
        targetDate: newTargetDate,
      };
      
      // Recalculate adaptive targets with the new date
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
    // When clearing target date, recalculate with standard targets (no timeline)
    const updatedProfile = {
      ...profile,
      targetDate: null,
    };
    
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
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background overflow-auto"
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
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <h2 className="text-[20px] font-bold font-display tracking-tight">Settings</h2>
        </motion.div>

        {/* Profile */}
        <motion.div variants={itemVariants} className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4">Profile</h3>
          <div className="space-y-3">
            {[
              { label: 'Name', value: profile.name },
              { label: 'Goal', value: `${profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)} weight` },
              { label: 'Daily Target', value: `${profile.dailyCalorieTarget} kcal` },
              { label: 'BMR / TDEE', value: `${profile.bmr} / ${profile.tdee}` },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="flex justify-between items-center py-1"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium tabular-nums">{item.value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Target Date */}
        {profile.goal !== 'maintain' && (
          <motion.div variants={itemVariants} className="nova-card p-5">
            <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Target Date
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Set a deadline to reach your goal weight. Your daily calorie target will adjust automatically.
            </p>
            <div className="flex gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal h-11 rounded-xl",
                      !currentTargetDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {currentTargetDate ? format(currentTargetDate, "PPP") : <span>Pick a target date</span>}
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
            Appearance
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

        {/* Accent Color */}
        <motion.div variants={itemVariants} className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> App Color
          </h3>
          <div className="grid grid-cols-3 gap-2.5">
            {ACCENTS.map((a, i) => (
              <motion.button
                key={a.value}
                onClick={() => theme.setAccent(a.value)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.93 }}
                className={`relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all duration-300 ${
                  theme.accent === a.value
                    ? 'bg-foreground text-background shadow-lg'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <motion.div
                  className="w-6 h-6 rounded-full shadow-sm"
                  style={{ backgroundColor: a.color }}
                  animate={theme.accent === a.value ? {
                    boxShadow: [`0 0 0px ${a.color}40`, `0 0 12px ${a.color}60`, `0 0 0px ${a.color}40`],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[10px] font-semibold">{a.label}</span>
                {theme.accent === a.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={() => onUpdateProfile(null)}
            className="w-full gap-2 h-[48px] rounded-xl font-medium active:scale-[0.98] transition-transform text-[13px]"
          >
            <RotateCcw className="w-4 h-4" /> Reset Profile
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-2 h-[48px] rounded-xl font-medium active:scale-[0.98] transition-transform text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
