"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MagicalButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "primary" | "secondary";
}

export const MagicalButton = ({
  children,
  onClick,
  disabled,
  className = "",
  type = "primary"
}: MagicalButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className} ${
        type === "primary"
          ? "bg-[#DA9C2F] text-black font-semibold"
          : "bg-[#0B0B09] border border-[#404040] text-white"
      } px-6 py-3 rounded-lg text-sm uppercase tracking-wider`}
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      {/* Ripple effect */}
      <motion.span
        className="absolute inset-0 bg-white/20 rounded-full"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#DA9C2F]/20 to-[#FFD700]/20 rounded-lg"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Particle burst on click */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        whileTap={{
          opacity: [0, 1, 0],
          transition: { duration: 0.3 }
        }}
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#FFD700] rounded-full"
            initial={{ x: "50%", y: "50%", scale: 0 }}
            whileTap={{
              x: `calc(50% + ${Math.cos((i * 45 * Math.PI) / 180) * 20}px)`,
              y: `calc(50% + ${Math.sin((i * 45 * Math.PI) / 180) * 20}px)`,
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              transition: { duration: 0.5 }
            }}
          />
        ))}
      </motion.div>

      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

interface MagicalCardProps {
  children: ReactNode;
  className?: string;
}

export const MagicalCard = ({ children, className = "" }: MagicalCardProps) => {
  return (
    <motion.div
      className={`relative bg-[#0B0B09] border border-[#404040] rounded-xl p-6 overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -5,
        transition: { duration: 0.2 }
      }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
    >
      {/* Magical border glow */}
      <motion.div
        className="absolute inset-0 border border-transparent rounded-xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{
          opacity: 1,
          borderColor: "#DA9C2F",
          boxShadow: "0 0 20px rgba(218, 156, 47, 0.3)",
          transition: { duration: 0.3 }
        }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#DA9C2F]/10 to-transparent pointer-events-none"
        initial={{ x: "-100%" }}
        whileHover={{
          x: "100%",
          transition: { duration: 1, ease: "easeInOut" }
        }}
      />
      
      {/* Mystical glyph */}
      <motion.div
        className="absolute top-2 right-2 text-[#DA9C2F] opacity-0 pointer-events-none"
        initial={{ scale: 0, rotate: 0 }}
        whileHover={{
          opacity: 1,
          scale: 1,
          rotate: 360,
          transition: { duration: 0.5, ease: "easeOut" }
        }}
      >
        ✦
      </motion.div>

      {children}
    </motion.div>
  );
};

export const EtherealParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-br from-[#DA9C2F] to-[#FFD700] rounded-full blur-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export const ConstellationBackground = () => {
  const constellations = [
    { points: [[20, 20], [40, 30], [60, 20], [80, 40]] },
    { points: [[10, 60], [30, 70], [50, 50], [70, 80]] },
    { points: [[40, 10], [60, 25], [80, 15]] },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none">
      {constellations.map((constellation, index) => (
        <svg
          key={index}
          className="absolute w-full h-full"
          viewBox="0 0 100 100"
        >
          {constellation.points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point[0]}
              cy={point[1]}
              r="0.3"
              fill="#DA9C2F"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.3, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: index * 2 + i * 0.5,
                ease: "easeInOut",
              }}
            />
          ))}
          {constellation.points.slice(0, -1).map((point, i) => (
            <motion.line
              key={i}
              x1={point[0]}
              y1={point[1]}
              x2={constellation.points[i + 1][0]}
              y2={constellation.points[i + 1][1]}
              stroke="#DA9C2F"
              strokeWidth="0.1"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.2, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                delay: index * 2 + i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </svg>
      ))}
    </div>
  );
};

export const MagicalLoading = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 border-2 border-[#DA9C2F] border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute inset-2 border-2 border-[#FFD700] border-b-transparent rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-2 h-2 bg-[#DA9C2F] rounded-full" />
        </motion.div>

        {/* Orbiting particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#FFD700] rounded-full"
            style={{
              left: "50%",
              top: "50%",
            }}
            animate={{
              x: `calc(-50% + ${Math.cos((i * 90 * Math.PI) / 180) * 12}px)`,
              y: `calc(-50% + ${Math.sin((i * 90 * Math.PI) / 180) * 12}px)`,
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.1,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};
