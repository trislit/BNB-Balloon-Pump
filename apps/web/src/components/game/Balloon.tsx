'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface BalloonProps {
  size: number; // 0-100 percentage
  isPopped: boolean;
  riskLevel?: string;
  onClick?: () => void;
  disabled?: boolean;
  isPumping?: boolean;
}

export function Balloon({ size, isPopped, riskLevel, onClick, disabled = false, isPumping: externalIsPumping = false }: BalloonProps) {
  const [pumpCount, setPumpCount] = useState(0);
  const [lastSize, setLastSize] = useState(size);
  
  // Balloon can now grow beyond 100% - up to 200% (2000+ pressure)
  const balloonSize = Math.max(50, Math.min(250, 50 + (size * 1.0)));
  
  // Detect when balloon size changes (pump happened)
  useEffect(() => {
    if (size > lastSize) {
      // Balloon was pumped - increment counter
      setPumpCount(prev => prev + 1);
    }
    setLastSize(size);
  }, [size, lastSize]);
  
  // Enhanced color scheme with gradients based on pressure
  const getBalloonColor = () => {
    if (isPopped) return '#ef4444';
    
    // Enhanced size-based logic for new pressure ranges
    if (size > 150) return '#dc2626'; // Red for 150%+ (1500+ pressure)
    if (size > 120) return '#ea580c'; // Orange for 120%+ (1200+ pressure)
    if (size > 100) return '#f59e0b'; // Amber for 100%+ (1000+ pressure)
    if (size > 80) return '#eab308';  // Yellow for 80%+ (800+ pressure)
    if (size > 60) return '#84cc16';  // Lime for 60%+ (600+ pressure)
    if (size > 40) return '#22c55e';  // Green for 40%+ (400+ pressure)
    if (size > 20) return '#10b981';  // Emerald for 20%+ (200+ pressure)
    return '#3b82f6'; // Blue for low pressure
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
    <div className="flex flex-col items-center space-y-4">
      {/* Bike Pump */}
      <div className="relative">
        <motion.div
          className="flex items-center space-x-4"
          animate={externalIsPumping ? {
            x: [0, -5, 0],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{
            duration: 0.3,
            ease: "easeInOut"
          }}
        >
          {/* Pump Handle */}
          <motion.div
            className="w-8 h-12 bg-gray-600 rounded-lg relative"
            animate={externalIsPumping ? {
              scaleY: [1, 0.8, 1]
            } : {}}
            transition={{
              duration: 0.2,
              ease: "easeInOut"
            }}
          >
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-gray-500 rounded"></div>
            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-gray-700 rounded"></div>
          </motion.div>
          
          {/* Pump Body */}
          <div className="w-12 h-8 bg-gray-500 rounded-lg relative">
            <div className="absolute top-1 left-1 w-10 h-6 bg-gray-400 rounded"></div>
            <div className="absolute top-2 left-2 w-8 h-4 bg-gray-300 rounded"></div>
          </div>
          
          {/* Air Hose */}
          <div className="w-16 h-2 bg-gray-400 rounded-full relative">
            <motion.div
              className="absolute inset-0 bg-blue-300 rounded-full"
              animate={externalIsPumping ? {
                scaleX: [0, 1, 0]
              } : {}}
              transition={{
                duration: 0.3,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>
      
      {/* Clickable Balloon */}
      <motion.div
        animate={{
          // Gentle floating animation when not pumping
          scale: externalIsPumping ? 1 : [1, 1.02, 1],
          y: externalIsPumping ? 0 : [0, -3, 0],
          // Dynamic inflation animation when pumping
          scaleY: externalIsPumping ? [1, 1.15, 0.9, 1.05, 1] : 1,
          scaleX: externalIsPumping ? [1, 0.85, 1.1, 0.95, 1] : 1,
          // Add rotation for more realistic effect
          rotate: externalIsPumping ? [0, 2, -1, 1, 0] : 0,
        }}
        transition={{
          duration: externalIsPumping ? 1.2 : 3,
          repeat: externalIsPumping ? 0 : Infinity,
          ease: externalIsPumping ? "easeInOut" : "easeInOut"
        }}
        className={`relative ${onClick && !disabled ? 'cursor-pointer hover:scale-110 transition-transform duration-200' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          width: `${balloonSize}px`,
          height: `${balloonSize * 1.2}px`,
        }}
        onClick={onClick && !disabled ? onClick : undefined}
        whileHover={onClick && !disabled ? { scale: 1.05 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
      >
        {/* Balloon Body */}
        <motion.div
          className="w-full h-full rounded-full relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${balloonColor}, ${balloonColor}dd, ${balloonColor}aa)`,
            width: '100%',
            height: '100%',
          }}
          animate={externalIsPumping ? {
            // Dramatic inflation effect
            scale: [1, 1.2, 0.95, 1.1, 1],
            scaleY: [1, 1.3, 0.9, 1.15, 1],
            scaleX: [1, 0.8, 1.2, 0.9, 1],
            // Add breathing effect
            borderRadius: ['50%', '45%', '55%', '50%', '50%'],
          } : {}}
          transition={{
            duration: 1.2,
            ease: "easeInOut"
          }}
        >
          {/* Shine effects */}
          <motion.div
            className="absolute top-2 left-2 rounded-full bg-white/40"
            style={{
              width: '25%',
              height: '25%',
            }}
            animate={externalIsPumping ? {
              scale: [1, 1.5, 0.8, 1.2, 1],
              opacity: [0.4, 0.8, 0.3, 0.6, 0.4],
            } : {
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{
              duration: externalIsPumping ? 1.2 : 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Additional shine effects */}
          <motion.div
            className="absolute top-4 right-3 rounded-full bg-white/20"
            style={{
              width: '15%',
              height: '15%',
            }}
            animate={externalIsPumping ? {
              scale: [1, 1.3, 0.9, 1.1, 1],
              opacity: [0.2, 0.5, 0.1, 0.3, 0.2],
            } : {
              scale: [1, 1.05, 1],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: externalIsPumping ? 1.2 : 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Air intake effect during pumping */}
          {externalIsPumping && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-blue-300/50"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: [0.8, 1.1, 1],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.div>

        {/* Balloon Details */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-2xl font-bold text-white/80 drop-shadow-lg">
            🎈
          </div>
        </div>
      </motion.div>

      {/* String */}
      <motion.div
        className="mx-auto bg-gray-600"
        style={{
          width: '3px',
          height: '40px',
        }}
        animate={externalIsPumping ? {
          // String sways more during pumping
          rotate: [0, 3, -2, 1, 0],
          scaleY: [1, 1.1, 0.95, 1.05, 1],
        } : {
          // Gentle sway when not pumping
          rotate: [0, 1, -1, 0],
        }}
        transition={{
          duration: externalIsPumping ? 1.2 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Size indicator */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-black/50 text-white px-2 py-1 rounded text-xs font-mono">
          {size.toFixed(1)}%
        </div>
      </div>

      {/* Click indicator */}
      {onClick && !disabled && !externalIsPumping && (
        <div className="text-xs text-gray-400 animate-pulse">
          🎈 Click to pump 1%
        </div>
      )}
      
      {/* Cooldown indicator */}
      {externalIsPumping && (
        <div className="text-xs text-blue-400 animate-pulse">
          ⏳ Pumping... Please wait
        </div>
      )}
      
      {/* Pump counter */}
      {pumpCount > 0 && (
        <div className="text-xs text-blue-400 font-mono">
          Pumps: {pumpCount}
        </div>
      )}

      {/* Risk level indicator */}
      {riskLevel === 'EXTREME' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg">
            ⚠️ EXTREME RISK
          </div>
        </motion.div>
      )}
      
      {riskLevel === 'VERY HIGH' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg">
            🔥 VERY HIGH RISK
          </div>
        </motion.div>
      )}
      
      {riskLevel === 'HIGH' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-12 left-1/2 transform -translate-x-1/2"
        >
          <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg">
            ⚡ HIGH RISK
          </div>
        </motion.div>
      )}
      
      {riskLevel === 'MEDIUM' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
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