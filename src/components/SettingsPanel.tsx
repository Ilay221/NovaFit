import { motion } from 'framer-motion';
import { X, Moon, Sun, Monitor, Palette, RotateCcw } from 'lucide-react';
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
  { value: 'green', label: 'Neon Green', color: '#22c55e' },
  { value: 'purple', label: 'Cyberpunk', color: '#8b5cf6' },
  { value: 'blue', label: 'Ocean', color: '#3b82f6' },
  { value: 'orange', label: 'Sunset', color: '#f97316' },
  { value: 'pink', label: 'Rose', color: '#ec4899' },
];

const MODES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'AMOLED Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export default function SettingsPanel({ theme, profile, onUpdateProfile, onClose }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background overflow-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-display">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Summary */}
        <div className="p-4 rounded-xl border bg-card">
          <h3 className="font-semibold font-display text-sm mb-3">Profile</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Name</div><div className="font-medium">{profile.name}</div>
            <div className="text-muted-foreground">Goal</div><div className="font-medium capitalize">{profile.goal} weight</div>
            <div className="text-muted-foreground">Daily Target</div><div className="font-medium">{profile.dailyCalorieTarget} kcal</div>
            <div className="text-muted-foreground">BMR / TDEE</div><div className="font-medium">{profile.bmr} / {profile.tdee}</div>
          </div>
        </div>

        {/* Theme Mode */}
        <div className="p-4 rounded-xl border bg-card">
          <h3 className="font-semibold font-display text-sm mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" /> Theme Mode
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <button key={m.value} onClick={() => theme.setMode(m.value)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  theme.mode === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                }`}
              >
                <m.icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div className="p-4 rounded-xl border bg-card">
          <h3 className="font-semibold font-display text-sm mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" /> Accent Color
          </h3>
          <div className="flex gap-3 flex-wrap">
            {ACCENTS.map(a => (
              <button key={a.value} onClick={() => theme.setAccent(a.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  theme.accent === a.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-xs font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <Button variant="outline" onClick={() => onUpdateProfile(null)} className="w-full gap-2">
          <RotateCcw className="w-4 h-4" /> Reset Profile & Start Over
        </Button>
      </div>
    </motion.div>
  );
}
