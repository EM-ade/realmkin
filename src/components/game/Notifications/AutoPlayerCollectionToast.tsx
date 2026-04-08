// src/components/game/Notifications/AutoPlayerCollectionToast.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AutoPlayerCollectionResult } from "@/game/autoplayer/AutoPlayerManager";

interface ToastProps {
  collection: AutoPlayerCollectionResult | null;
}

export function AutoPlayerCollectionToast({ collection }: ToastProps) {
  return (
    <AnimatePresence>
      {collection && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          style={{
            position: "absolute",
            left: "1rem",
            top: "80px",
            background: "rgba(26, 18, 11, 0.9)",
            border: "1px solid #8c6a2e",
            borderLeft: "4px solid #d4a017",
            borderRadius: "4px",
            padding: "1rem",
            color: "#f1deb3",
            fontFamily: "Inter",
            zIndex: 40,
            boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div
            style={{ fontWeight: "bold", fontSize: "0.9rem", color: "#ffaa00" }}
          >
            ⚙️ Autominer Collected
          </div>
          <div style={{ fontSize: "0.8rem", display: "flex", gap: "0.5rem" }}>
            {collection.wood > 0 && <span>🪵 {collection.wood}</span>}
            {collection.stone > 0 && <span>𪨧 {collection.stone}</span>}
            {collection.iron > 0 && <span>⛏️ {collection.iron}</span>}
            {collection.food > 0 && <span>🌾 {collection.food}</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
