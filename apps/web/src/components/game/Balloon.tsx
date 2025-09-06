'use client';

import { motion } from 'framer-motion';

interface BalloonProps {
  size: number; // 0-100 percentage
  isPopped: boolean;
}

export function Balloon({ size, isPopped }: BalloonProps) {
  const balloonSize = Math.max(50, Math.min(150, 50 + (size * 1.5)));
  const balloonColor = isPopped ? '#ef4444' : size > 80 ? '#f59e0b' : size > 60 ? '#eab308' : '#10b981';

  if (isPopped) {
    return (
      <div className="relative">
        {/* Popped balloon pieces */}
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 0, opacity: 0, rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="text-6xl"
        >
          💥
        </motion.div>

        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos(i * 45 * Math.PI / 180) * 100,
              y: Math.sin(i * 45 * Math.PI / 180) * 100,
            }}
            transition={{ duration: 1, delay: i * 0.1 }}
            className="absolute text-2xl"
            style={{
              left: '50%',
              top: '50%',
            }}
          >
            🎈
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Balloon */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          y: [0, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
        style={{
          width: `${balloonSize}px`,
          height: `${balloonSize * 1.2}px`,
        }}
      >
        {/* Balloon body */}
        <div
          className="rounded-full border-4 border-white/20 shadow-lg"
          style={{
            backgroundColor: balloonColor,
            width: '100%',
            height: '100%',
          }}
        />

        {/* Balloon shine */}
        <div
          className="absolute top-2 left-2 rounded-full bg-white/30"
          style={{
            width: '20%',
            height: '20%',
          }}
        />
      </motion.div>

      {/* String */}
      <div
        className="mx-auto bg-gray-600"
        style={{
          width: '3px',
          height: '40px',
        }}
      />

      {/* Size indicator */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
          {size.toFixed(1)}%
        </div>
      </div>

      {/* Risk indicator */}
      {size > 70 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
            HIGH RISK!
          </div>
        </motion.div>
      )}
    </div>
  );
}
