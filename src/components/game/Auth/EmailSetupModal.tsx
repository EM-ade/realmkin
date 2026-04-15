// src/components/game/Auth/EmailSetupModal.tsx
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import styles from "./EmailSetupModal.module.css";

interface EmailSetupModalProps {
  onClose: () => void;
}

export function EmailSetupModal({ onClose }: EmailSetupModalProps) {
  const { player } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error: funcError } = await supabase.functions.invoke(
        "set-player-email",
        {
          body: { email, playerId: player.id },
        },
      );

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      // Force a reload of the player data in the game store to get the new email
      // For this immediate flow, we can just call onClose which routes to Village
      onClose();
    } catch (err: any) {
      console.error("Email setup error:", err);
      setError(err.message || "Failed to save email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Secure Your Realm</h2>
          <p className={styles.description}>
            A valid email is required to recover your account and receive
            important kingdom updates.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lord@realmkin.com"
              className={styles.input}
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.errorText}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading || !email}
          >
            {isLoading ? "Securing..." : "Enter Realm"}
          </button>
        </form>
      </div>
    </div>
  );
}
