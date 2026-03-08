import { motion } from 'framer-motion';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 180 }: CalorieRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);
  const offset = circumference * (1 - progress);
  const center = size / 2;
  const percentage = Math.round(progress * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--nova-glow) / 0.65)" />
          </linearGradient>
        </defs>
        {/* Progress arc */}
        <motion.circle
          cx={center} cy={center} r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[32px] font-bold font-display tracking-tight tabular-nums leading-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {remaining}
        </motion.span>
        <span className="text-[11px] text-muted-foreground font-medium mt-1">kcal left</span>
        <div className="mt-2 px-2.5 py-[3px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground tabular-nums">
          {percentage}%
        </div>
      </div>
    </div>
  );
}
