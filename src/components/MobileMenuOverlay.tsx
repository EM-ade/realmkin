import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface MenuItem {
  label: string;
  href: string;
  icon: string;
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

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handlePointer(event: MouseEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          ref={mobileActionsRef}
          className="w-full max-w-sm rounded-3xl bg-[#101010] border border-[#2a2a2a] shadow-2xl overflow-hidden animate-fade-in-up"
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
          <nav className="px-4 py-3 space-y-1.5">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
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
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
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
              </Link>
            )}
          </nav>

          {/* Actions (Discord + Wallet) */}
          {isConnected && account && (
            <div className="px-5 py-4 border-t border-[#1f1f1f]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => {
                    if (!discordLinked && onDiscordConnect) {
                      onDiscordConnect();
                      return;
                    }
                    if (onDiscordDisconnect) {
                      onDiscordDisconnect();
                    }
                  }}
                  disabled={discordConnecting || discordUnlinking}
                  className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-black px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#1a1a1a] disabled:opacity-70"
                >
                  <span>
                    {discordLinked
                      ? "Disconnect Discord"
                      : discordConnecting
                      ? "Connecting…"
                      : "Connect Discord"}
                  </span>
                  <span className="text-xs text-[#DA9C2F] opacity-70">
                    {discordLinked ? "Linked" : "Secure"}
                  </span>
                </button>

                <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                  <div
                    className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${
                      isConnected
                        ? "border-[#DA9C2F] bg-[#DA9C2F]"
                        : "border-[#DA9C2F] bg-[#0B0B09]"
                    }`}
                    aria-hidden="true"
                  >
                    <div
                      className={`absolute top-1 h-8 w-8 rounded-full border border-[#DA9C2F] bg-black transition-all duration-300 ease-out ${
                        isConnected ? "right-1" : "left-1"
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      if (isConnected && onDisconnectWallet) {
                        onDisconnectWallet();
                      } else if (onConnectWallet) {
                        onConnectWallet();
                      }
                    }}
                    disabled={isConnecting}
                    className="basis-[70%] flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-[#0B0B09] px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#151515] disabled:opacity-70"
                  >
                    <span>
                      {isConnected
                        ? "Connected"
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
                      {isConnecting ? "Loading…" : isConnected ? "Synced" : "Secure"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
