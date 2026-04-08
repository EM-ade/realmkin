// src/components/game/TopBar/AutoPlayerIndicator.tsx
import React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { useGameState } from "@/stores/gameStore";

export function AutoPlayerIndicator() {
  const { player } = useAuth();

  const hasAutominer = player?.hasAutominer;

  if (!hasAutominer) return null;

  return (
    <div
      title="Autominer Active"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a120b",
        border: "1px solid #8c6a2e",
        borderRadius: "50%",
        width: "32px",
        height: "32px",
        marginLeft: "0.5rem",
        boxShadow: "0 0 5px rgba(212, 160, 23, 0.4)",
      }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ fontSize: "1.2rem", display: "flex" }}
      >
        ⚙️
      </motion.div>
    </div>
  );
}
