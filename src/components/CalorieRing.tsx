import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
}

export default function CalorieRing({ consumed, target, size = 180 }: CalorieRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const isOver = consumed > target;
  const progress = Math.min(consumed / target, 1);
  const remaining = target - consumed; // can be negative
  const offset = circumference * (1 - progress);
  const center = size / 2;
  const percentage = Math.round(progress * 100);

  // Animated counter
  const [displayRemaining, setDisplayRemaining] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const startVal = displayRemaining;
    const endVal = remaining;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayRemaining(Math.round(startVal + (endVal - startVal) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [remaining]);

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
            <stop offset="0%" stopColor={isOver ? "hsl(0 72% 51%)" : "hsl(var(--primary))"} />
            <stop offset="100%" stopColor={isOver ? "hsl(0 72% 65%)" : "hsl(var(--nova-glow) / 0.65)"} />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Progress arc with glow */}
        <motion.circle
          cx={center} cy={center} r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: isOver ? 0 : offset }}
          transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1] }}
          filter="url(#ringGlow)"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[32px] font-bold font-display tracking-tight tabular-nums leading-none"
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          {displayRemaining}
        </motion.span>
        <motion.span
          className="text-[11px] text-muted-foreground font-medium mt-1"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          kcal left
        </motion.span>
        <motion.div
          className="mt-2 px-2.5 py-[3px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground tabular-nums"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 20 }}
        >
          {percentage}%
        </motion.div>
      </div>
    </div>
  );
}
