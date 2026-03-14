import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated floating orbs background.
 * Subtle, non-distracting, theme-aware (light vs dark).
 * Renders behind all content via fixed positioning + z-index.
 */

const orbs = [
  // Large, slow-moving orbs
  { size: 220, x: '12%', y: '8%',   dur: 22, delay: 0,   color: 'var(--orb-primary)' },
  { size: 180, x: '78%', y: '15%',  dur: 26, delay: 2,   color: 'var(--orb-secondary)' },
  { size: 260, x: '65%', y: '60%',  dur: 30, delay: 4,   color: 'var(--orb-accent)' },
  // Medium orbs
  { size: 140, x: '25%', y: '70%',  dur: 20, delay: 1,   color: 'var(--orb-primary)' },
  { size: 120, x: '85%', y: '80%',  dur: 24, delay: 3,   color: 'var(--orb-accent)' },
  // Small accent orbs
  { size: 80,  x: '45%', y: '35%',  dur: 18, delay: 5,   color: 'var(--orb-secondary)' },
  { size: 60,  x: '10%', y: '45%',  dur: 16, delay: 6,   color: 'var(--orb-accent)' },
];

function DynamicBackground() {
  return (
    <div className="dynamic-bg-container" aria-hidden="true">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="dynamic-bg-orb"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle at 30% 30%, ${orb.color}, transparent 70%)`,
          }}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.08, 0.95, 1.03, 1],
          }}
          transition={{
            duration: orb.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}

export default memo(DynamicBackground);
