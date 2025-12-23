"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  group?: string;
}

interface MobileMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  isAdmin?: boolean;
  isConnected?: boolean;
  account?: string | null;
  isConnecting?: boolean;
  discordLinked?: boolean;
  discordConnecting?: boolean;
  discordUnlinking?: boolean;
  onDiscordConnect?: () => void;
  onDiscordDisconnect?: () => void;
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
}

export default function MobileMenuOverlay({
  isOpen,
  onClose,
  menuItems,
  isAdmin = false,
  isConnected = false,
  account = null,
  isConnecting = false,
  discordLinked = false,
  discordConnecting = false,
  discordUnlinking = false,
  onDiscordConnect,
  onDiscordDisconnect,
  onConnectWallet,
  onDisconnectWallet,
}: MobileMenuOverlayProps) {
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close on click outside - simplified
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isOpen) {
      previousOverflowRef.current = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";
      return () => {
        if (previousOverflowRef.current !== null) {
          document.body.style.overflow = previousOverflowRef.current;
        } else {
          document.body.style.removeProperty("overflow");
        }
      };
    }

    if (previousOverflowRef.current !== null) {
      document.body.style.overflow = previousOverflowRef.current;
      previousOverflowRef.current = null;
    } else {
      document.body.style.removeProperty("overflow");
    }
  }, [isOpen]);

  if (!mounted || typeof document === "undefined") return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Menu Content */}
          <motion.div
            ref={mobileActionsRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-3xl bg-[#0F0F0E] border border-[#DA9C2F]/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1f1f1f] flex items-center justify-center">
                  <Image
                    src="/realmkin-logo.png"
                    alt="Realmkin"
                    width={36}
                    height={36}
                    className="w-9 h-9 object-contain"
                  />
                </div>
                <div className="text-left">
                  <div className="text-lg font-semibold tracking-wide text-[#DA9C2F] uppercase">
                    Realmkin
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#DA9C2F] text-xl font-bold"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-4 py-3 space-y-1.5 overflow-y-auto max-h-[60vh]">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors text-left"
                >
                  <span className="flex h-10 w-10 items-center justify-center">
                    <Image
                      src={item.icon}
                      alt={`${item.label} icon`}
                      width={20}
                      height={20}
                      className="w-8 h-8 object-contain"
                    />
                  </span>
                  <span className="text-sm font-medium tracking-wide text-[#DA9C2F]">
                    {item.label}
                  </span>
                </button>
              ))}

              {isAdmin && (
                <button
                  onClick={() => {
                    router.push("/admin");
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors text-left mt-2 border-t border-[#1f1f1f] pt-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center">
                    <Image
                      src="/dashboard.png"
                      alt="Admin icon"
                      width={20}
                      height={20}
                      className="w-8 h-8 object-contain"
                    />
                  </span>
                  <span className="text-sm font-medium tracking-wide text-[#DA9C2F]">
                    Admin
                  </span>
                </button>
              )}
            </nav>

            {/* Actions (Discord + Wallet) */}
            <div className="px-5 py-4 border-t border-[#1f1f1f]">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (!discordLinked && onDiscordConnect) {
                      onDiscordConnect();
                    } else if (discordLinked && onDiscordDisconnect) {
                      onDiscordDisconnect();
                    }
                  }}
                  disabled={discordConnecting || discordUnlinking}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F]/30 bg-black/40 px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#1a1a1a] disabled:opacity-70"
                >
                  <span>
                    {discordLinked
                      ? "Disconnect Discord"
                      : discordConnecting
                      ? "Connecting…"
                      : discordUnlinking
                      ? "Disconnecting…"
                      : "Connect Discord"}
                  </span>
                  <span className="text-xs text-[#DA9C2F] opacity-70">
                    {discordLinked ? "Linked" : "Secure"}
                  </span>
                </button>

                <div className="flex items-center justify-between gap-3 w-full">
                  {isConnected && (
                    <div
                      className="relative h-10 w-16 rounded-full border border-[#DA9C2F] bg-[#DA9C2F] transition-all duration-300 ease-out"
                      aria-hidden="true"
                    >
                      <div className="absolute top-1 right-1 h-8 w-8 rounded-full border border-[#DA9C2F] bg-black transition-all duration-300 ease-out" />
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (isConnected && onDisconnectWallet) {
                        onDisconnectWallet();
                      } else if (!isConnected && onConnectWallet) {
                        onConnectWallet();
                      }
                      onClose();
                    }}
                    disabled={isConnecting}
                    className={`flex-1 flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-[#0B0B09] px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#151515] disabled:opacity-70 ${
                      !isConnected ? "w-full" : ""
                    }`}
                  >
                    <span>
                      {isConnected
                        ? "Disconnect Wallet"
                        : isConnecting
                        ? "Connecting…"
                        : "Connect Wallet"}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-[#DA9C2F]">
                      <Image
                        src="/wallet.png"
                        alt="Wallet connect"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                      {isConnecting
                        ? "Loading…"
                        : isConnected
                        ? "Synced"
                        : "Secure"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
