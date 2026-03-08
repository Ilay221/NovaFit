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
  const isOver = current > target;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-[13px]">{label}</span>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color }}
            key={current}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {current}
          </motion.span>
          <span className="text-[11px] text-muted-foreground tabular-nums">/ {target}{unit}</span>
        </div>
      </div>
      <div className="h-[6px] rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className="h-full rounded-full relative"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 1.1, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Shimmer overlay on the bar */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)`,
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ duration: 2, delay: 1, repeat: Infinity, repeatDelay: 3 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
