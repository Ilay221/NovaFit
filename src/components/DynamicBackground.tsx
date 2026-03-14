import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Animated floating orbs background.
 * Dramatic, beautiful, theme-aware (light vs dark).
 * Renders behind all content via fixed positioning + z-index.
 */

const orbs = [
  // Large primary orbs - very visible
  { size: 350, x: '5%',  y: '0%',   dur: 25, delay: 0,   lightColor: 'hsla(157, 80%, 55%, 0.25)', darkColor: 'hsla(157, 72%, 40%, 0.20)' },
  { size: 300, x: '70%', y: '5%',   dur: 30, delay: 2,   lightColor: 'hsla(217, 91%, 60%, 0.22)', darkColor: 'hsla(217, 91%, 50%, 0.18)' },
  { size: 400, x: '55%', y: '55%',  dur: 35, delay: 4,   lightColor: 'hsla(270, 70%, 60%, 0.18)', darkColor: 'hsla(270, 60%, 45%, 0.15)' },
  // Medium accent orbs
  { size: 250, x: '15%', y: '65%',  dur: 22, delay: 1,   lightColor: 'hsla(340, 80%, 60%, 0.15)', darkColor: 'hsla(340, 70%, 45%, 0.12)' },
  { size: 200, x: '85%', y: '75%',  dur: 28, delay: 3,   lightColor: 'hsla(157, 80%, 50%, 0.20)', darkColor: 'hsla(157, 72%, 40%, 0.16)' },
  // Smaller complementary orbs
  { size: 180, x: '40%', y: '25%',  dur: 20, delay: 5,   lightColor: 'hsla(38, 90%, 55%, 0.18)',  darkColor: 'hsla(38, 80%, 45%, 0.14)' },
  { size: 150, x: '0%',  y: '40%',  dur: 18, delay: 6,   lightColor: 'hsla(217, 91%, 65%, 0.20)', darkColor: 'hsla(217, 91%, 45%, 0.15)' },
  { size: 320, x: '25%', y: '35%',  dur: 28, delay: 1.5, lightColor: 'hsla(270, 80%, 60%, 0.25)', darkColor: 'hsla(270, 70%, 50%, 0.22)' },
];

function DynamicBackground() {
  return (
    <div
      className="dynamic-bg-container"
      aria-hidden="true"
    >
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="dynamic-bg-orb"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
          }}
          data-light-color={orb.lightColor}
          data-dark-color={orb.darkColor}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -35, 20, -15, 0],
            scale: [1, 1.12, 0.92, 1.06, 1],
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
