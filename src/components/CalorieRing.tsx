import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react'; // use Left arrow for RTL

interface CalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  /** 'saved' = green glow, 'overage' = orange/red, 'neutral' = default */
  bankingStatus?: 'saved' | 'overage' | 'neutral';
  /** The predicted layout for tomorrow based on today's consumption */
  tomorrowTarget?: number;
}

export default function CalorieRing({ consumed, target, size = 180, bankingStatus = 'neutral', tomorrowTarget }: CalorieRingProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeTarget = Number.isFinite(target) && target > 0 ? target : 0;
  const safeConsumed = Number.isFinite(consumed) && consumed > 0 ? consumed : 0;

  const isOver = safeTarget > 0 ? safeConsumed > safeTarget : safeConsumed > 0;
  const progress = safeTarget > 0 ? Math.min(safeConsumed / safeTarget, 1) : 0;
  const remaining = safeTarget - safeConsumed;
  const offset = circumference * (1 - progress);
  const center = size / 2;
  const percentage = Math.round(progress * 100);

  const [displayRemaining, setDisplayRemaining] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const startVal = displayRemaining;
    const endVal = isOver ? Math.abs(remaining) : remaining;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayRemaining(Math.round(startVal + (endVal - startVal) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, isOver]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <defs>
         <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={
              isOver ? "hsl(0 72% 51%)" :
              progress > 0.85 ? "hsl(25 95% 53%)" :
              bankingStatus === 'saved' ? "hsl(142 71% 45%)" :
              bankingStatus === 'overage' ? "hsl(25 95% 53%)" :
              "hsl(var(--primary))"
            } />
            <stop offset="100%" stopColor={
              isOver ? "hsl(0 72% 65%)" :
              progress > 0.85 ? "hsl(38 92% 50%)" :
              bankingStatus === 'saved' ? "hsl(142 71% 60%)" :
              bankingStatus === 'overage' ? "hsl(25 95% 65%)" :
              "hsl(var(--nova-glow) / 0.65)"
            } />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
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
          className={`text-[32px] font-bold font-display tracking-tight tabular-nums leading-none ${isOver ? 'text-[hsl(0_72%_51%)]' : ''}`}
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
        >
          {displayRemaining}
        </motion.span>
        <motion.span
          className={`text-[11px] font-medium mt-1 ${isOver ? 'text-[hsl(0_72%_51%)]' : 'text-muted-foreground'}`}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {isOver ? 'קק"ל מעל' : 'קק"ל נותרו'}
        </motion.span>
        <motion.div
          className="mt-2 px-2.5 py-[3px] rounded-full bg-muted text-[10px] font-semibold text-muted-foreground tabular-nums"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 20 }}
        >
          {percentage}%
        </motion.div>
        
        {/* Tomorrow's Projection Display */}
        {tomorrowTarget !== undefined && tomorrowTarget > 0 && (
          <motion.div
            className="absolute bottom-4 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <ArrowLeft className="w-3 h-3 text-white" />
            <span className="text-[10px] font-semibold text-white tracking-wide">
              מחר: {tomorrowTarget}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
