"use client";

/**
 * useGameAuthBridge — Reads auth from Realmkin's Web3Context and feeds it
 * to the Kingdom game. Players who connect their wallet on the main Realmkin
 * site are automatically authenticated in the game — no second login.
 *
 * Email auth remains separate and lives only in the game (via GameAuthProvider).
 */

import { useEffect, useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { supabase } from "@/lib/supabase";

interface GamePlayer {
  id: string;
  wallet_address: string | null;
  email: string | null;
  username: string | null;
  auth_method: "wallet" | "email";
  gem_balance: number;
  level: number;
  xp: number;
  wood: number;
  stone: number;
  iron: number;
  food: number;
  max_storage: number;
  builders_total: number;
  has_autominer: boolean;
  [key: string]: any;
}

export function useGameAuthBridge() {
  const { account, isConnected, isConnecting } = useWeb3();
  const [gamePlayer, setGamePlayer] = useState<GamePlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authSource, setAuthSource] = useState<"wallet" | "email" | null>(null);

  // Look up or create player by wallet address
  const lookupOrCreatePlayer = useCallback(async (walletAddress: string) => {
    try {
      // Check if player exists
      const { data: existing } = await supabase
        .from("players")
        .select("*")
        .eq("wallet_address", walletAddress)
        .single();

      if (existing) {
        setGamePlayer(existing);
        setAuthSource("wallet");
        return existing;
      }

      // Create new player automatically
      // They already proved wallet ownership to Realmkin
      const { data: newPlayer } = await supabase
        .from("players")
        .insert({
          wallet_address: walletAddress,
          username: `Hero_${walletAddress.slice(0, 6)}`,
          auth_method: "wallet",
        })
        .select()
        .single();

      if (newPlayer) {
        setGamePlayer(newPlayer);
        setAuthSource("wallet");
      }

      return newPlayer;
    } catch (err) {
      console.error("[GameAuthBridge] Player lookup/create failed:", err);
      return null;
    }
  }, []);

  // Check for existing Supabase session (email auth players)
  const checkEmailSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: player } = await supabase
          .from("players")
          .select("*")
          .eq("email", session.user.email)
          .single();

        if (player) {
          setGamePlayer(player);
          setAuthSource("email");
          return player;
        }
      }
    } catch (err) {
      console.error("[GameAuthBridge] Email session check failed:", err);
    }
    return null;
  }, []);

  // Main init effect
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      // PATH A: Wallet is connected via Realmkin's wallet adapter
      if (isConnected && account) {
        await lookupOrCreatePlayer(account);
        setIsLoading(false);
        return;
      }

      // PATH B: No wallet connected — check for existing Supabase session
      if (!isConnecting) {
        const emailPlayer = await checkEmailSession();
        if (emailPlayer) {
          setIsLoading(false);
          return;
        }
      }

      // PATH C: Not authenticated at all
      setGamePlayer(null);
      setAuthSource(null);
      setIsLoading(false);
    };

    initAuth();
  }, [isConnected, account, isConnecting, lookupOrCreatePlayer, checkEmailSession]);

  return { gamePlayer, isLoading, authSource };
}
