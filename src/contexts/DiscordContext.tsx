"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import toast from "react-hot-toast";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseClient"; // Fixed import path
import { useWeb3 } from "./Web3Context"; // Import Web3 context

interface DiscordContextType {
  discordLinked: boolean;
  discordConnecting: boolean;
  discordUnlinking: boolean;
  connectDiscord: (user: { uid: string; getIdToken: () => Promise<string> }) => Promise<void>;
  disconnectDiscord: (user: { uid: string; getIdToken: () => Promise<string> }, gatekeeperBase: string) => Promise<void>;
  checkDiscordStatus: (userId: string, gatekeeperBase: string) => Promise<void>;
}

const DiscordContext = createContext<DiscordContextType | undefined>(undefined);

export const useDiscord = () => {
  const context = useContext(DiscordContext);
  if (!context) {
    throw new Error("useDiscord must be used within DiscordProvider");
  }
  return context;
};

interface DiscordProviderProps {
  children: ReactNode;
}

export const DiscordProvider = ({ children }: DiscordProviderProps) => {
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const { account: walletAddress } = useWeb3(); // Get wallet address directly from Web3 context

  const connectDiscord = useCallback(
    async (user: { uid: string; getIdToken: () => Promise<string> }) => {
      if (!user?.uid) {
        toast.error("Please sign in first");
        return;
      }
      setDiscordConnecting(true);
      try {
        // Get Firebase ID token
        const token = await user.getIdToken();
        console.log("🔐 Got Firebase ID token for Discord link");
        
        // Use wallet address directly from Web3 context
        console.log("💳 Wallet address for Discord link (from Web3 context):", walletAddress);
        
        // Build login URL with token and wallet
        const loginUrl = `/api/discord/login?token=${encodeURIComponent(token)}${walletAddress ? `&wallet=${encodeURIComponent(walletAddress)}` : ''}`;
        
        // Open in popup instead of full redirect
        const popup = window.open(
          loginUrl,
          'discord-oauth',
          'width=500,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          toast.error("Popup blocked! Please allow popups for this site.");
          setDiscordConnecting(false);
          return;
        }
        
        // Listen for success message from popup
        const messageHandler = (event: MessageEvent) => {
          // Verify origin for security
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'discord-oauth-success') {
            console.log("✅ Discord OAuth successful!");
            setDiscordLinked(true);
            setDiscordConnecting(false);
            toast.success("Discord connected successfully!");
            popup.close();
            window.removeEventListener('message', messageHandler);
          } else if (event.data.type === 'discord-oauth-error') {
            console.error("❌ Discord OAuth failed:", event.data.error);
            setDiscordConnecting(false);
            toast.error(event.data.error || "Failed to connect Discord");
            popup.close();
            window.removeEventListener('message', messageHandler);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Check if popup was closed by user
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setDiscordConnecting(false);
          }
        }, 500);
        
      } catch (error) {
        toast.error("Failed to get authentication token");
        console.error("Discord connect error:", error);
        setDiscordConnecting(false);
      }
    },
    [walletAddress]
  );

  const disconnectDiscord = useCallback(
    async (user: { uid: string; getIdToken: () => Promise<string> }, gatekeeperBase: string) => {
      if (!user?.uid) return;
      setDiscordUnlinking(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${gatekeeperBase}/api/link/discord`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to disconnect (${response.status})`);
        }
        setDiscordLinked(false);
        toast.success("Discord disconnected");
      } catch (error) {
        toast.error("Failed to disconnect Discord");
        console.error("Discord disconnect error:", error);
      } finally {
        setDiscordUnlinking(false);
      }
    },
    []
  );

  const checkDiscordStatus = useCallback(
    async (userId: string, gatekeeperBase: string) => {
      try {
        const response = await fetch(`${gatekeeperBase}/api/discord/status/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setDiscordLinked(data.linked || false);
        }
      } catch (error) {
        console.error("Error checking Discord status:", error);
      }
    },
    []
  );

  return (
    <DiscordContext.Provider
      value={{
        discordLinked,
        discordConnecting,
        discordUnlinking,
        connectDiscord,
        disconnectDiscord,
        checkDiscordStatus,
      }}
    >
      {children}
    </DiscordContext.Provider>
  );
};