"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/utils/formatAddress";
// import AnimatedRoadmap from "@/components/AnimatedRoadmap";
import SocialLinks from "@/components/SocialLinks";
import React from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";
import NFTCarousel from "@/components/NFTCarousel";

export default function Home() {
  // Simplified flow toggle - set to false to re-enable full email auth
  const [useSimplifiedFlow] = useState(true);

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [showForm, setShowForm] = useState(false);
  
  // Discord link status
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const [discordConnecting, setDiscordConnecting] = useState(false);
  const [unifiedBalance, setUnifiedBalance] = useState<number | null>(null);
  const [discordUnlinking, setDiscordUnlinking] = useState(false);
  const [showDiscordMenu, setShowDiscordMenu] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const backgroundVideoRef = useRef<HTMLVideoElement | null>(null);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  // const [showRoadmap, setShowRoadmap] = useState(false);
  // const [showWhitepaper, setShowWhitepaper] = useState(false);

  // Simplified flow states
  const [isNewUser, setIsNewUser] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  const router = useRouter();
  const { login, signup, checkUsernameAvailability, getUserByWallet, user, userData } = useAuth();
  const {
    connectWallet,
    account: walletAddress,
    disconnectWallet,
    isConnected,
    isConnecting,
  } = useWeb3();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setShowForm(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video) return;

    const playVideo = () => {
      try {
        const maybePromise = video.play();
        if (maybePromise !== undefined) {
          maybePromise.catch(() => {
            /* Ignore autoplay restrictions */
          });
        }
      } catch {
        /* Ignore playback errors */
      }
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo();
      return;
    }

    video.addEventListener("loadeddata", playVideo);

    return () => {
      video.removeEventListener("loadeddata", playVideo);
    };
  }, []);


  useEffect(() => {
    if (!walletConnected) {
      setShowMobileActions(false);
      setShowDiscordMenu(false);
    }
  }, [walletConnected]);

  useEffect(() => {
    if (!showMobileActions) return;

    function handlePointer(event: MouseEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setShowMobileActions(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowMobileActions(false);
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMobileActions]);

  useEffect(() => {
    if (!discordLinked) {
      setShowDiscordMenu(false);
    }
  }, [discordLinked]);

  useEffect(() => {
    if (!isConnected) {
      setShowMobileActions(false);
    }
  }, [isConnected]);

  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "Staking", href: "#", icon: "/staking.png" },
      { label: "Game", href: "#", icon: "/game.png" },
      { label: "My NFT", href: "#", icon: "/flex-model.png" },
      { label: "Merches", href: "#", icon: "/merches.png" },
    ],
    []
  );

  const walletDisplayValue = useMemo(() => {
    const fb = userRewards ? userRewards.totalRealmkin : null;
    const uni = typeof unifiedBalance === "number" ? unifiedBalance : null;
    if (fb !== null && uni !== null) {
      return Math.max(fb, uni);
    }
    if (uni !== null) {
      return uni;
    }
    if (fb !== null) {
      return fb;
    }
    return 0;
  }, [userRewards, unifiedBalance]);

  const formattedWalletBalance = useMemo(
    () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
    [walletDisplayValue]
  );

  const handleDiscordConnect = useCallback(() => {
    if (discordLinked || discordConnecting) return;
    setDiscordConnecting(true);
    if (typeof window !== "undefined") {
      window.location.assign("/api/discord/login");
    }
  }, [discordLinked, discordConnecting]);

  const handleDiscordDisconnect = useCallback(async (): Promise<boolean> => {
    if (discordUnlinking) return false;
    try {
      setDiscordUnlinking(true);
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${gatekeeperBase}/api/link/discord`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      setDiscordLinked(false);
      setShowDiscordMenu(false);
      setShowMobileActions(false);
      try {
        localStorage.removeItem('realmkin_discord_linked');
      } catch {}
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setDiscordUnlinking(false);
    }
  }, [discordUnlinking, gatekeeperBase]);

  // Check if user exists in Firebase by wallet address
  const checkExistingUser = useCallback(
    async (address: string) => {
      try {
        setCheckingUser(true);
        console.log("🔍 Checking if user exists for wallet:", address);

        // Check Firebase wallet mapping first
        const existingUser = await getUserByWallet(address);
        
        if (existingUser) {
          console.log("✅ Existing user found:", existingUser.username);
          
          // Store user data in local storage for faster future logins
          localStorage.setItem(
            `realmkin_user_${address.toLowerCase()}`,
            JSON.stringify({
              address: address,
              username: existingUser.username,
              lastLogin: new Date().toISOString(),
              hasAccount: true,
            })
          );

          setIsNewUser(false);
          // User exists, show "ENTER THE REALM" button instead of username form
          return;
        }

        // Check localStorage for cached user data even if Firebase lookup failed
        const cachedUser = localStorage.getItem(`realmkin_user_${address.toLowerCase()}`);
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            if (userData.hasAccount && userData.username) {
              console.log("✅ Found cached user data, treating as existing user");
              setIsNewUser(false);
              return;
            }
          } catch (parseError) {
            console.error("Failed to parse cached user data:", parseError);
          }
        }

        // No existing user found
        console.log("👤 New user detected, will need to set username");

        // Clear any stale local storage data
        localStorage.removeItem(`realmkin_user_${address.toLowerCase()}`);

        setIsNewUser(true);
      } catch (error) {
        console.error("Error checking user:", error);
        
        // On error, check localStorage as fallback
        const cachedUser = localStorage.getItem(`realmkin_user_${address.toLowerCase()}`);
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            if (userData.hasAccount && userData.username) {
              console.log("✅ Found cached user data on error, treating as existing user");
              setIsNewUser(false);
              return;
            }
          } catch (parseError) {
            console.error("Failed to parse cached user data:", parseError);
          }
        }
        
        setIsNewUser(true);
      } finally {
        setCheckingUser(false);
      }
    },
    [getUserByWallet]
  );

  // Check if wallet is connected and handle user state
  useEffect(() => {
    console.log("🔍 Wallet address changed:", walletAddress);
    if (walletAddress) {
      console.log("✅ Wallet connected:", walletAddress);
      setWalletConnected(true);
      // Check if user already has a username associated with this wallet
      checkExistingUser(walletAddress);
    } else {
      console.log("❌ No wallet address");
      setWalletConnected(false);
      setIsNewUser(false);
    }
  }, [walletAddress, checkExistingUser]);

  // Handle wallet connection
  const handleWalletConnect = async () => {
    try {
      setLoading(true);
      setError("");
      console.log("🔗 Initiating wallet connection...");

      // Open the official wallet modal via adapter context
      if (setWalletModalVisible) {
        setWalletModalVisible(true);
      } else {
        // Fallback to Web3Context flow (which will show custom selector if needed)
        await connectWallet();
      }

      console.log("✅ Wallet connection completed");
    } catch (error: unknown) {
      console.error("❌ Wallet connection failed:", error);
      setError(
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle simplified signup with just username
  const handleSimplifiedSignup = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (usernameError) {
      setError("Please fix username errors");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create a temporary email based on wallet address for Firebase Auth
      const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
      const tempPassword = walletAddress; // Use wallet address as password

      // Sign up with temporary credentials and wallet address
      await signup(tempEmail, tempPassword, username, walletAddress);

      // Store user data in local storage for future logins
      localStorage.setItem(
        `realmkin_user_${walletAddress.toLowerCase()}`,
        JSON.stringify({
          address: walletAddress,
          username: username,
          lastLogin: new Date().toISOString(),
          hasAccount: true,
        })
      );

      console.log("✅ New user account created and stored");

      // Redirect to main page
      router.push("/");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle login for existing users
  const handleExistingUserLogin = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create a temporary email based on wallet address for Firebase Auth
      const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
      const tempPassword = walletAddress; // Use wallet address as password

      // Try to log in with temporary credentials
      await login(tempEmail, tempPassword);

      console.log("✅ Existing user logged in successfully");

      // Redirect to main page
      router.push("/");
    } catch (error: unknown) {
      console.error("Login failed for existing user:", error);
      
      // If login fails, try to recreate the account
      try {
        const cachedUser = localStorage.getItem(`realmkin_user_${walletAddress.toLowerCase()}`);
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          if (userData.username) {
            console.log("Attempting to recreate Firebase Auth account");
            const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
            const tempPassword = walletAddress;
            await signup(tempEmail, tempPassword, userData.username, walletAddress);
            console.log("✅ Recreated Firebase Auth account for existing user");
            router.push("/");
            return;
          }
        }
      } catch (signupError) {
        console.error("Failed to recreate account:", signupError);
      }
      
      setError(
        error instanceof Error ? error.message : "Failed to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const validateForm = () => {
    if (!email || !password) {
      setError("Email and password are required");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (isSignup) {
      if (!username) {
        setError("Username is required");
        return false;
      }

      if (username.length < 3) {
        setError("Username must be at least 3 characters long");
        return false;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError("Username can only contain letters, numbers, and underscores");
        return false;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }

      if (usernameError) {
        setError("Please choose a different username");
        return false;
      }
    }

    return true;
  };

  // Check username availability
  const handleUsernameChange = async (value: string) => {
    setUsername(value);
    setUsernameError("");

    if (value.length >= 3) {
      setUsernameChecking(true);
      try {
        const isAvailable = await checkUsernameAvailability(value);
        if (!isAvailable) {
          setUsernameError("Username is already taken");
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setUsernameChecking(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        await signup(email, password, username);
      } else {
        await login(email, password);
      }
      router.push("/");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : isSignup
          ? "Signup failed"
          : "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setError("");
    setUsernameError("");
  };

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden bg-[#865900]">
      {/* Background Video */}
      <video
        ref={backgroundVideoRef}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        loop
        muted
        playsInline
        style={{ objectFit: "cover" }}
      >
        <source src="/Loading-Screen.webm" type="video/webm" />
        <source src="/Loading-Screen.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#865900] opacity-80"></div>
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at center, rgba(236, 187, 27, 0.85) 0%, rgba(236, 187, 27, 0.65) 35%, rgba(134, 89, 0, 0.5) 70%, rgba(134, 89, 0, 0.9) 100%)",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#865900]/90 via-[#b47a0a]/75 to-[#6a4700]/85 mix-blend-multiply"></div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="home-aurora aurora-one"></div>
        <div className="home-aurora aurora-two"></div>
        <div className="home-aurora aurora-three"></div>
      </div>

      {/* Content Wrapper */}
      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative z-10 flex flex-row justify-between items-center gap-3 p-6 lg:p-8 text-black">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 animate-float">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-bold text-lg w-1/2 uppercase tracking-wider text-black" style={{ fontFamily: "var(--font-amnestia)" }}>
            THE REALMKIN
          </h1>
        </div>

        {isConnected && walletAddress && (
          <div className="w-auto flex-shrink-0">
            {/* Wallet row */}
            <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
              <div className="flex w-full md:w-auto items-center justify-end gap-2">
                {/* Mobile actions dropdown toggle now occupies primary header slot */}
                <div className="md:hidden">
                  <button
                    onClick={() => setShowMobileActions((v) => !v)}
                    className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
                    aria-expanded={showMobileActions}
                    aria-haspopup="true"
                  >

                    <span className={`text-xs transition-transform ${showMobileActions ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                </div>
              </div>

              {showMobileActions && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
                    onClick={() => setShowMobileActions(false)}
                  />
                  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                      ref={mobileActionsRef}
                      className="w-full max-w-sm rounded-3xl bg-[#101010] border border-[#2a2a2a] shadow-2xl overflow-hidden animate-fade-in-up"
                    >
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
                            <div className="text-lg font-semibold tracking-wide text-[#DA9C2F] uppercase">Realmkin</div>
                            
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMobileActions(false)}
                          className="text-[#DA9C2F] text-xl font-bold"
                          aria-label="Close menu"
                        >
                          ×
                        </button>
                      </div>

                      <nav className="px-4 py-3 space-y-1.5">
                        {mobileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setShowMobileActions(false)}
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
                        {userData?.admin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowMobileActions(false)}
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

                      <div className="px-5 py-4 border-t border-[#1f1f1f]">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            onClick={() => {
                              if (!discordLinked) {
                                handleDiscordConnect();
                                return;
                              }
                              setShowDiscordMenu(false);
                              handleDiscordDisconnect();
                            }}
                            disabled={discordConnecting || discordUnlinking}
                            className={`flex-1 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${discordLinked ? 'bg-[#DA9C2F] text-black border-[#DA9C2F] hover:bg-[#f0b94a]' : 'bg-[#0B0B09] text-[#DA9C2F] border-[#DA9C2F] hover:bg-[#1a1a1a]'}`}
                          >
                            <span>{discordLinked ? 'Disconnect Discord' : discordConnecting ? 'Connecting…' : 'Connect Discord'}</span>
                            <span className="text-xs opacity-70">{discordLinked ? 'Linked' : 'Secure'}</span>
                          </button>

                          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                            <div
                              className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${isConnected ? 'border-[#DA9C2F] bg-[#DA9C2F]' : 'border-[#DA9C2F] bg-[#0B0B09]'}`}
                              aria-hidden="true"
                            >
                              <div
                                className={`absolute top-1 h-8 w-8 rounded-full transition-all duration-300 ease-out ${isConnected ? 'right-1 bg-[#DA9C2F] border border-[#0B0B09]' : 'left-1 bg-[#0B0B09] border border-[#DA9C2F]'}`}
                              />
                            </div>
                            <button
                              onClick={() => {
                                setShowMobileActions(false);
                                if (isConnected) {
                                  disconnectWallet();
                                } else {
                                  connectWallet();
                                }
                              }}
                              disabled={isConnecting}
                              className={`basis-[70%] flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${isConnected ? 'bg-[#DA9C2F] text-black border-[#DA9C2F] hover:bg-[#f0b94a]' : 'bg-[#0B0B09] text-[#DA9C2F] border-[#DA9C2F] hover:bg-[#1a1a1a]'}`}
                            >
                              <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Connect Wallet'}</span>
                              <span className={`flex items-center gap-2 text-xs ${isConnected ? 'text-black' : 'text-[#DA9C2F]'}`}>
                                <Image src="/wallet.png" alt="Wallet connect" width={16} height={16} className="w-4 h-4" />
                                {isConnecting ? 'Loading…' : isConnected ? 'Synced' : 'Secure'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Desktop inline controls */}
              <div className="hidden md:flex items-center gap-3">
                <div className="bg-[#0B0B09] pl-3 pr-1 py-2 rounded-lg border border-[#404040] flex-initial min-w-[180px]">
                  <div className="text-[#DA9C2F] font-medium text-sm whitespace-nowrap flex items-center gap-2">
                    <Image
                      src="/wallet.jpeg"
                      alt="Wallet Logo"
                      width={16}
                      height={16}
                      className="w-6 h-6 object-contain"
                    />
                    <span>{formattedWalletBalance}</span>
                  </div>
                </div>

                {/* Discord Link Status / Connect Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (!discordLinked) {
                        handleDiscordConnect();
                        return;
                      }
                      // Toggle dropdown for linked state
                      setShowDiscordMenu((v) => !v);
                    }}
                    disabled={discordConnecting}
                    className={`flex items-center justify-between gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border ${discordLinked ? 'border-[#2E7D32] text-emerald-400' : 'border-[#404040] text-[#DA9C2F] hover:bg-[#1a1a1a]'} font-medium text-sm transition-colors whitespace-nowrap`}
                  >
                    {discordLinked ? (
                      <>
                        <span>DISCORD LINKED</span>
                        <span className="ml-1 text-xs opacity-80">▼</span>
                      </>
                    ) : (
                      <span>{discordConnecting ? 'CONNECTING…' : 'CONNECT DISCORD'}</span>
                    )}
                  </button>
                  {discordLinked && showDiscordMenu && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[#404040] bg-[#0B0B09] shadow-xl z-20 animate-fade-in">
                      <button
                        onClick={async () => {
                          const success = await handleDiscordDisconnect();
                          if (success) {
                            setShowDiscordMenu(false);
                          }
                        }}
                        className="block w-full text-left px-3 py-2 text-[#DA9C2F] hover:bg-[#1a1a1a] rounded-lg"
                      >
                        {discordUnlinking ? 'DISCONNECTING…' : 'Disconnect'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Admin Link */}
                {userData?.admin && (
                  <Link
                    href="/admin"
                    className="bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors text-center"
                  >
                    ADMIN
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-8 py-12 transition-opacity duration-300 ${showMobileActions ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="text-center text-black mb-10 space-y-3">
          <h2
            className="home-heading text-5xl sm:text-5xl lg:text-6xl font-extrabold tracking-[0.1em]"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            WELCOME TO
          </h2>
          <h3
            className="home-heading-delay text-5xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.1em]"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            THE REALM
          </h3>
          <p className="text-xl sm:text-xl font-medium">
            Own your power. Summon your WardenKin. Forge your legacy.
          </p>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-6xl mx-auto animate-fade-in-up px-4 sm:px-0">
          <div className="home-card max-w-2xl  bg-[#1b1205]/95 border border-black/40 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.4)] px-6 sm:px-10 py-10 text-left space-y-8">
            {/* NFT Carousel */}
            <NFTCarousel />
            
            <div className="space-y-4 text-[#f7dca1]">
              <p className="text-lg leading-relaxed font-semibold">
                Battle in The Void — a nonstop PvE arena. Train your warriors to Fight, Fuse, and Revive. Earn XP, Kill Coins, and ₥KIN. Level up, claim rewards, and rise on the leaderboard.
              </p>
              {walletConnected && !checkingUser ? (
                <div className="space-y-2">
                  {/* <h4
                    className="text-2xl font-bold text-[#f4c752]"
                    style={{ fontFamily: "var(--font-amnestia)" }}
                  >
                    WELCOME BACK
                  </h4>
                  <p className="text-sm text-[#f7dca1]">
                    Welcome back! You can now access The Realm.
                  </p> */}
                </div>
              ) : null}
            </div>

            {checkingUser && (
              <div className="space-y-3 text-[#f4c752]">
                <div className="animate-spin w-8 h-8 border-2 border-[#f4c752] border-t-transparent rounded-full mx-auto"></div>
                <p>Checking your account status...</p>
              </div>
            )}

            {!checkingUser && isNewUser && walletConnected && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Choose Username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`w-full bg-black/70 border-2 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-colors ${
                    usernameError
                      ? "border-red-500 focus:border-red-400"
                      : "border-[#f4c752]/60 focus:border-[#f4c752]"
                  }`}
                />
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                <button
                  onClick={handleSimplifiedSignup}
                  disabled={
                    loading ||
                    usernameChecking ||
                    !username.trim() ||
                    !!usernameError
                  }
                  className="w-full uppercase tracking-widest bg-[#DA9C2F] text-black font-bold py-3 rounded-xl border border-[#DA9C2F] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70"
                  style={{ fontFamily: "var(--font-amnestia)" }}
                >
                  {loading ? "CREATING ACCOUNT..." : "SUMMON WARDENKIN"}
                </button>
              </div>
            )}

            {!checkingUser && !isNewUser && (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    if (walletConnected) {
                      handleExistingUserLogin();
                    } else {
                      handleWalletConnect();
                      setIsNewUser(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full uppercase tracking-widest bg-[#DA9C2F] text-black font-bold py-4 rounded-xl border border-[#DA9C2F] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70"
                  style={{ fontFamily: "var(--font-amnestia)" }}
                >
                  {walletConnected ? (loading ? "LOADING..." : "SUMMON WARDENKIN") : loading ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
                {/* <button
                  className="w-full uppercase tracking-widest bg-black/80 text-[#DA9C2F] font-bold py-4 rounded-xl border border-[#DA9C2F] transition-colors duration-200 hover:bg-black"
                  style={{ fontFamily: "var(--font-amnestia)" }}
                  disabled
                >
                  ENTER THE VOID
                </button>
                <button
                  className="w-full uppercase tracking-widest bg-black/80 text-[#DA9C2F] font-bold py-4 rounded-xl border border-[#DA9C2F] transition-colors duration-200 hover:bg-black"
                  style={{ fontFamily: "var(--font-amnestia)" }}
                  disabled
                >
                  CLAIM REWARDS
                </button> */}
              </div>
            )}
          </div>
        </div>
      </main>

        {/* Footer - Social Links */}
        <footer className={`relative z-10 text-center p-6 lg:p-8 transition-opacity duration-300 ${showMobileActions ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <SocialLinks />
        </footer>

        {/* AnimatedRoadmap and AnimatedWhitepaper temporarily disabled */}
      </div>
      <style jsx>{`
        .home-aurora {
          position: absolute;
          width: 60vw;
          height: 60vw;
          min-width: 420px;
          min-height: 420px;
          filter: blur(120px);
          opacity: 0.3;
          border-radius: 50%;
          mix-blend-mode: screen;
          animation: auroraMove 16s ease-in-out infinite;
        }

        .aurora-one {
          background: radial-gradient(circle, rgba(255,212,121,0.55) 0%, rgba(134,89,0,0) 70%);
          top: -15%;
          left: -10%;
        }

        .aurora-two {
          background: radial-gradient(circle, rgba(255,242,191,0.5) 0%, rgba(134,89,0,0) 70%);
          bottom: -20%;
          right: -15%;
          animation-delay: 4s;
        }

        .aurora-three {
          background: radial-gradient(circle, rgba(255,175,64,0.45) 0%, rgba(134,89,0,0) 70%);
          top: 30%;
          right: -25%;
          animation-delay: 8s;
        }

        @keyframes auroraMove {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-5%, 6%, 0) scale(1.15);
          }
        }

        .home-heading {
          animation: headingReveal 1s ease-out forwards;
          opacity: 0;
        }

        .home-heading-delay {
          animation: headingReveal 1s ease-out forwards;
          animation-delay: 0.25s;
          opacity: 0;
        }

        @keyframes headingReveal {
          0% {
            opacity: 0;
            transform: translateY(12px);
            text-shadow: none;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            text-shadow: 0 0 24px rgba(255, 207, 92, 0.45);
          }
        }

        .home-card {
          position: relative;
          animation: cardGlow 6s ease-in-out infinite;
        }

        .home-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255, 221, 128, 0.2), rgba(255, 165, 0, 0.05));
          opacity: 0;
          pointer-events: none;
          animation: cardAura 6s ease-in-out infinite;
        }

        @keyframes cardGlow {
          0%, 100% {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          }
          50% {
            box-shadow: 0 35px 80px rgba(255, 196, 77, 0.35);
          }
        }

        @keyframes cardAura {
          0%, 100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.22;
          }
        }
      `}</style>
    </div>
  );
}
