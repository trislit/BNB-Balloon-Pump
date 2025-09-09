'use client';

import { motion } from 'framer-motion';

interface BalloonProps {
  size: number; // 0-100 percentage
  isPopped: boolean;
}

export function Balloon({ size, isPopped }: BalloonProps) {
  const balloonSize = Math.max(50, Math.min(150, 50 + (size * 1.5)));
  
  // Enhanced color scheme with gradients
  const getBalloonColor = () => {
    if (isPopped) return '#ef4444';
    if (size > 80) return '#dc2626'; // Red for extreme risk
    if (size > 60) return '#ea580c'; // Orange for high risk  
    if (size > 40) return '#eab308'; // Yellow for medium risk
    if (size > 20) return '#22c55e'; // Green for low risk
    return '#3b82f6'; // Blue for very safe
  };
  
  const balloonColor = getBalloonColor();

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
        {/* Balloon body with gradient */}
        <div
          className="rounded-full border-4 border-white/30 shadow-2xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${balloonColor}, ${balloonColor}dd, ${balloonColor}aa)`,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Balloon shine */}
          <div
            className="absolute top-2 left-2 rounded-full bg-white/40 animate-pulse"
            style={{
              width: '25%',
              height: '25%',
            }}
          />
          
          {/* Additional shine effects */}
          <div
            className="absolute top-4 right-3 rounded-full bg-white/20"
            style={{
              width: '15%',
              height: '15%',
            }}
          />
          
          {/* Pressure lines when high risk */}
          {size > 70 && (
            <>
              <div className="absolute top-6 left-2 w-1 h-8 bg-white/50 rounded-full animate-pulse"></div>
              <div className="absolute top-10 right-2 w-1 h-6 bg-white/50 rounded-full animate-pulse"></div>
              <div className="absolute bottom-8 left-8 w-1 h-4 bg-white/50 rounded-full animate-pulse"></div>
            </>
          )}
        </div>
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
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className={`${
            size > 90 ? 'bg-red-600' : 'bg-red-500'
          } text-white px-3 py-2 rounded-lg text-sm font-bold animate-pulse shadow-lg`}>
            {size > 90 ? '🚨 CRITICAL!' : '⚠️ HIGH RISK!'}
          </div>
        </motion.div>
      )}
      
      {/* Medium risk indicator */}
      {size > 50 && size <= 70 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg">
            ⚡ MEDIUM RISK
          </div>
        </motion.div>
      )}
    </div>
  );
}
