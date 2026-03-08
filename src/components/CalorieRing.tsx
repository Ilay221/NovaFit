import { motion } from 'framer-motion';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 200 }: CalorieRingProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);
  const offset = circumference * (1 - progress);
  const center = size / 2;
  const percentage = Math.round(progress * 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ background: `radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)` }}
      />
      
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--nova-glow) / 0.7)" />
          </linearGradient>
        </defs>
        {/* Progress arc */}
        <motion.circle
          cx={center} cy={center} r={radius}
          stroke="url(#ringGradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-bold font-display tracking-tight"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          {remaining}
        </motion.span>
        <span className="text-xs text-muted-foreground font-medium mt-0.5">kcal remaining</span>
        <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
          {percentage}%
        </div>
      </div>
    </div>
  );
}
