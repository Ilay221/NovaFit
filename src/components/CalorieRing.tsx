import { motion } from 'framer-motion';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 180 }: CalorieRingProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const remaining = Math.max(target - consumed, 0);
  const offset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
        <motion.circle
          cx={center} cy={center} r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--nova-glow) / 0.4))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-display">{remaining}</span>
        <span className="text-xs text-muted-foreground">kcal left</span>
      </div>
    </div>
  );
}
