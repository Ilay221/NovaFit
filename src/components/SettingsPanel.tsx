import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Monitor, Palette, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccentColor, ThemeMode, UserProfile } from '@/lib/types';

interface SettingsPanelProps {
  theme: {
    mode: ThemeMode;
    setMode: (m: ThemeMode) => void;
    accent: AccentColor;
    setAccent: (a: AccentColor) => void;
  };
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile | null) => void;
  onClose: () => void;
}

const ACCENTS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'green', label: 'Emerald', color: 'hsl(157 72% 40%)' },
  { value: 'purple', label: 'Violet', color: 'hsl(271 68% 55%)' },
  { value: 'blue', label: 'Ocean', color: 'hsl(217 91% 60%)' },
  { value: 'orange', label: 'Sunset', color: 'hsl(25 95% 53%)' },
  { value: 'pink', label: 'Rose', color: 'hsl(340 82% 52%)' },
];

const MODES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export default function SettingsPanel({ theme, profile, onUpdateProfile, onClose }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background overflow-auto"
    >
      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[20px] font-bold font-display tracking-tight">Settings</h2>
        </div>

        {/* Profile */}
        <div className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4">Profile</h3>
          <div className="space-y-3">
            {[
              { label: 'Name', value: profile.name },
              { label: 'Goal', value: `${profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)} weight` },
              { label: 'Daily Target', value: `${profile.dailyCalorieTarget} kcal` },
              { label: 'BMR / TDEE', value: `${profile.bmr} / ${profile.tdee}` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
            Appearance
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <button key={m.value} onClick={() => theme.setMode(m.value)}
                className={`p-3.5 rounded-xl text-center transition-all duration-200 active:scale-[0.97] ${
                  theme.mode === m.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <m.icon className="w-4 h-4 mx-auto mb-1.5" />
                <div className="text-[11px] font-semibold">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent */}
        <div className="nova-card p-5">
          <h3 className="font-semibold font-display text-[13px] text-muted-foreground uppercase tracking-[0.08em] mb-4 flex items-center gap-2">
            Accent Color
          </h3>
          <div className="flex gap-3 flex-wrap">
            {ACCENTS.map(a => (
              <button key={a.value} onClick={() => theme.setAccent(a.value)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-[0.97] ${
                  theme.accent === a.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-[12px] font-semibold">{a.label}</span>
                {theme.accent === a.value && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={() => onUpdateProfile(null)} className="w-full gap-2 h-[48px] rounded-xl font-medium active:scale-[0.98] transition-transform text-[13px]">
          <RotateCcw className="w-4 h-4" /> Reset Profile
        </Button>
      </div>
    </motion.div>
  );
}
