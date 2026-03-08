import { motion } from 'framer-motion';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
  icon?: string;
}

export default function MacroBar({ label, current, target, color, unit = 'g', icon }: MacroBarProps) {
  const progress = Math.min(current / target, 1);
  const percentage = Math.round(progress * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-sm">{icon}</span>}
          <span className="font-semibold text-sm">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color }}>{current}</span>
          <span className="text-xs text-muted-foreground">/ {target}{unit}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted/80 overflow-hidden relative">
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
            style={{ backgroundSize: '200% 100%' }} />
        </motion.div>
      </div>
    </div>
  );
}
