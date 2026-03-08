import { motion } from 'framer-motion';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, current, target, color, unit = 'g' }: MacroBarProps) {
  const progress = Math.min(current / target, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[13px]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold tabular-nums" style={{ color }}>{current}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">/ {target}{unit}</span>
        </div>
      </div>
      <div className="h-[6px] rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  );
}
