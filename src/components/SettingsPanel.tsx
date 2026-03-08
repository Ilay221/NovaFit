import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun, Monitor, Palette, RotateCcw } from 'lucide-react';
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
  { value: 'green', label: 'Emerald', color: '#34d399' },
  { value: 'purple', label: 'Violet', color: '#a78bfa' },
  { value: 'blue', label: 'Ocean', color: '#3b82f6' },
  { value: 'orange', label: 'Sunset', color: '#fb923c' },
  { value: 'pink', label: 'Rose', color: '#f472b6' },
];

const MODES: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'Auto' },
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
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold font-display">Settings</h2>
        </div>

        {/* Profile */}
        <div className="nova-card p-5">
          <h3 className="font-bold font-display text-sm mb-4">Profile</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              { label: 'Name', value: profile.name },
              { label: 'Goal', value: `${profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1)} weight` },
              { label: 'Daily Target', value: `${profile.dailyCalorieTarget} kcal` },
              { label: 'BMR / TDEE', value: `${profile.bmr} / ${profile.tdee}` },
            ].map(item => (
              <div key={item.label} className="contents">
                <div className="text-muted-foreground">{item.label}</div>
                <div className="font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="nova-card p-5">
          <h3 className="font-bold font-display text-sm mb-4 flex items-center gap-2">
            <Moon className="w-4 h-4 text-primary" /> Appearance
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => (
              <button key={m.value} onClick={() => theme.setMode(m.value)}
                className={`p-3.5 rounded-2xl text-center transition-all duration-200 active:scale-95 ${
                  theme.mode === m.value
                    ? 'bg-primary/10 ring-2 ring-primary/30'
                    : 'bg-muted/40 hover:bg-muted/60'
                }`}
              >
                <m.icon className="w-5 h-5 mx-auto mb-1.5" />
                <div className="text-xs font-semibold">{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Accent */}
        <div className="nova-card p-5">
          <h3 className="font-bold font-display text-sm mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" /> Accent Color
          </h3>
          <div className="flex gap-3 flex-wrap">
            {ACCENTS.map(a => (
              <button key={a.value} onClick={() => theme.setAccent(a.value)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-200 active:scale-95 ${
                  theme.accent === a.value
                    ? 'bg-primary/10 ring-2 ring-primary/30'
                    : 'bg-muted/40 hover:bg-muted/60'
                }`}
              >
                <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: a.color }} />
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button variant="outline" onClick={() => onUpdateProfile(null)} className="w-full gap-2 h-12 rounded-2xl font-semibold active:scale-[0.98] transition-transform">
          <RotateCcw className="w-4 h-4" /> Reset Profile
        </Button>
      </div>
    </motion.div>
  );
}
