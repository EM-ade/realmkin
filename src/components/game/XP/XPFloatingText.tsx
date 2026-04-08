import { useEffect } from "react";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import styles from "./XPFloatingText.module.css";
import { motion, AnimatePresence } from "framer-motion";

export function XPFloatingText() {
  const { recentGains, removeRecentGain } = useXPSystem();

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {recentGains.map((gain, index) => (
          <FloatingGain
            key={gain.uid}
            gain={gain}
            index={index}
            onComplete={() => removeRecentGain(gain.uid)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function FloatingGain({ gain, index, onComplete }: any) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className={styles.floatText}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: -20 - index * 30, scale: 1 }}
      exit={{ opacity: 0, y: -40 - index * 30, scale: 1.1 }}
      transition={{ duration: 0.5, ease: "easeOut", exit: { duration: 0.4 } }}
      style={{
        left: gain.x ? `${gain.x}px` : "50%",
        top: gain.y ? `${gain.y}px` : "20%",
        transformOrigin: "center center",
      }}
    >
      <div className={styles.xpAmount}>+{gain.xpAmount} XP</div>
      <div className={styles.displayName}>• {gain.displayName}</div>
    </motion.div>
  );
}
