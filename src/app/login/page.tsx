"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
// import AnimatedRoadmap from "@/components/AnimatedRoadmap";
import SocialLinks from "@/components/SocialLinks";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import React from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getAuth } from "firebase/auth";
import { rewardsService, UserRewards } from "@/services/rewardsService";

// Lazy load heavy background component with loading fallback
const LoginBackground = dynamic(() => import("@/components/LoginBackground"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050302]" />,
});

function LoginPageContent() {
  // Simplified flow toggle - set to false to re-enable full email auth
  const [useSimplifiedFlow] = useState(true);

  // Form state - consolidated
  const [formState, setFormState] = useState({
    isSignup: false,
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    error: "",
    usernameError: "",
  });

  // Async state - consolidated
  const [asyncState, setAsyncState] = useState({
    loading: false,
    usernameChecking: false,
    discordConnecting: false,
    discordUnlinking: false,
    checkingUser: false,
  });

  // UI state - consolidated
  const [uiState, setUiState] = useState({
    showForm: false,
    showMobileActions: false,
    showDiscordMenu: false,
  });

  // Discord link status
  const [discordLinked, setDiscordLinked] = useState<boolean>(false);
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
  const mobileActionsRef = useRef<HTMLDivElement | null>(null);
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  // const [showRoadmap, setShowRoadmap] = useState(false);
  // const [showWhitepaper, setShowWhitepaper] = useState(false);

  // Simplified flow states
  const [isNewUser, setIsNewUser] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  const router = useRouter();
  const {
    login,
    signup,
    checkUsernameAvailability,
    getUserByWallet,
    user,
    userData,
  } = useAuth();
  const {
    connectWallet,
    account: walletAddress,
    disconnectWallet,
    isConnected,
    isConnecting,
  } = useWeb3();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const searchParams = useSearchParams();

  // Determine safe redirect target (defaults to "/")
  const redirectTarget = useMemo(() => {
    const r = searchParams?.get("redirect") || "/";
    // Only allow internal absolute paths
    if (typeof r === "string" && r.startsWith("/")) return r;
    return "/";
  }, [searchParams]);

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(
      () => setUiState((prev) => ({ ...prev, showForm: true })),
      500,
    );
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!walletConnected) {
      setUiState((prev) => ({
        ...prev,
        showMobileActions: false,
        showDiscordMenu: false,
      }));
    }
  }, [walletConnected]);

  useEffect(() => {
    if (!uiState.showMobileActions) return;

    function handlePointer(event: MouseEvent) {
      if (!mobileActionsRef.current?.contains(event.target as Node)) {
        setUiState((prev) => ({ ...prev, showMobileActions: false }));
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUiState((prev) => ({ ...prev, showMobileActions: false }));
      }
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [uiState.showMobileActions]);

  useEffect(() => {
    if (!discordLinked) {
      setUiState((prev) => ({ ...prev, showDiscordMenu: false }));
    }
  }, [discordLinked]);

  useEffect(() => {
    if (!isConnected) {
      setUiState((prev) => ({ ...prev, showMobileActions: false }));
    }
  }, [isConnected]);

  // Prevent body scroll when username modal is open
  useEffect(() => {
    if (!asyncState.checkingUser && isNewUser && walletConnected) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [asyncState.checkingUser, isNewUser, walletConnected]);

  const mobileMenuItems = useMemo(
    () => [
      { label: "Home", href: "/", icon: "/dashboard.png" },
      { label: "Wallet", href: "/wallet", icon: "/wallet.png" },
      { label: "Staking", href: "/staking", icon: "/staking.png" },
      { label: "Game", href: "/game", icon: "/game.png" },
      { label: "My NFT", href: "/my-nft", icon: "/flex-model.png" },
      { label: "Merches", href: "/merches", icon: "/merches.png" },
    ],
    [],
  );

  const walletDisplayValue = useMemo(() => {
    return userRewards ? userRewards.totalRealmkin : 0;
  }, [userRewards]);

  const formattedWalletBalance = useMemo(
    () => `${rewardsService.formatMKIN(walletDisplayValue)} MKIN`,
    [walletDisplayValue],
  );

  const handleDiscordConnect = useCallback(() => {
    if (discordLinked || asyncState.discordConnecting) return;
    setAsyncState((prev) => ({ ...prev, discordConnecting: true }));
    if (typeof window !== "undefined") {
      window.location.assign("/api/discord/login");
    }
  }, [discordLinked, asyncState.discordConnecting]);

  const handleDiscordDisconnect = useCallback(async (): Promise<boolean> => {
    if (asyncState.discordUnlinking) return false;
    try {
      setAsyncState((prev) => ({ ...prev, discordUnlinking: true }));
      const auth = getAuth();
      if (!auth.currentUser) {
        return false;
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${gatekeeperBase}/api/link/discord`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      setDiscordLinked(false);
      setUiState((prev) => ({
        ...prev,
        showDiscordMenu: false,
        showMobileActions: false,
      }));
      try {
        localStorage.removeItem("realmkin_discord_linked");
      } catch {}
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setAsyncState((prev) => ({ ...prev, discordUnlinking: false }));
    }
  }, [asyncState.discordUnlinking, gatekeeperBase]);

  // Check if user exists in Firebase by wallet address (memoized)
  const checkExistingUser = useCallback(
    async (address: string) => {
      try {
        setAsyncState((prev) => ({ ...prev, checkingUser: true }));
        console.log("🔍 Checking if user exists for wallet:", address);

        // Check localStorage first for instant response
        const cachedUser = localStorage.getItem(
          `realmkin_user_${address.toLowerCase()}`,
        );
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            if (userData.hasAccount && userData.username) {
              console.log(
                "✅ Found cached user data, treating as existing user",
              );
              setIsNewUser(false);
              setAsyncState((prev) => ({ ...prev, checkingUser: false }));
              return;
            }
          } catch (parseError) {
            console.error("Failed to parse cached user data:", parseError);
          }
        }

        // Check Firebase wallet mapping
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
            }),
          );

          setIsNewUser(false);
          setAsyncState((prev) => ({ ...prev, checkingUser: false }));
          return;
        }

        // No existing user found
        console.log("👤 New user detected, will need to set username");
        localStorage.removeItem(`realmkin_user_${address.toLowerCase()}`);
        setIsNewUser(true);
      } catch (error) {
        console.error("Error checking user:", error);

        // On error, check localStorage as fallback
        const cachedUser = localStorage.getItem(
          `realmkin_user_${address.toLowerCase()}`,
        );
        if (cachedUser) {
          try {
            const userData = JSON.parse(cachedUser);
            if (userData.hasAccount && userData.username) {
              console.log(
                "✅ Found cached user data on error, treating as existing user",
              );
              setIsNewUser(false);
              setAsyncState((prev) => ({ ...prev, checkingUser: false }));
              return;
            }
          } catch (parseError) {
            console.error("Failed to parse cached user data:", parseError);
          }
        }

        setIsNewUser(true);
      } finally {
        setAsyncState((prev) => ({ ...prev, checkingUser: false }));
      }
    },
    [getUserByWallet],
  );

  // Check if wallet is connected and handle user state
  useEffect(() => {
    const redirectedWallet = searchParams?.get("wallet");
    const currentWallet = walletAddress || redirectedWallet;

    console.log("🔍 Wallet address changed:", currentWallet);
    if (currentWallet) {
      console.log("✅ Wallet connected:", currentWallet);
      setWalletConnected(true);
      // Check if user already has a username associated with this wallet
      checkExistingUser(currentWallet);
    } else {
      console.log("❌ No wallet address");
      setWalletConnected(false);
      setIsNewUser(false);
    }
  }, [walletAddress, searchParams, checkExistingUser]);

  // Handle wallet connection (memoized)
  const handleWalletConnect = useCallback(async () => {
    try {
      setAsyncState((prev) => ({ ...prev, loading: true }));
      setFormState((prev) => ({ ...prev, error: "" }));
      console.log("🔗 Initiating wallet connection...");

      // Open the official wallet modal via adapter context
      if (setWalletModalVisible) {
        await new Promise<void>((resolve) => {
          setWalletModalVisible(true);
          const timeout = setTimeout(resolve, 2000);
          const unsubscribe = () => {
            clearTimeout(timeout);
            resolve();
          };
          const interval = setInterval(() => {
            if (walletConnected) {
              clearInterval(interval);
              unsubscribe();
            }
          }, 250);
        });
      } else {
        // Fallback to Web3Context flow (which will show custom selector if needed)
        await connectWallet();
      }

      console.log("✅ Wallet connection completed");
    } catch (error: unknown) {
      console.error("❌ Wallet connection failed:", error);
      setFormState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to connect wallet",
      }));
    } finally {
      setAsyncState((prev) => ({ ...prev, loading: false }));
    }
  }, [setWalletModalVisible, walletConnected, connectWallet]);

  useEffect(() => {
    if (
      walletConnected &&
      !asyncState.checkingUser &&
      !isNewUser &&
      !asyncState.loading
    ) {
      console.log(
        "🚀 Existing wallet user detected, navigating",
        redirectTarget,
      );
      router.push(redirectTarget);
    }
  }, [
    walletConnected,
    asyncState.checkingUser,
    isNewUser,
    asyncState.loading,
    router,
    redirectTarget,
  ]);

  // Handle simplified signup with just username (memoized)
  const handleSimplifiedSignup = useCallback(async () => {
    const walletForSignup = walletAddress || searchParams?.get("wallet");
    if (!walletForSignup) {
      setFormState((prev) => ({
        ...prev,
        error: "Please connect your wallet first",
      }));
      return;
    }

    if (!formState.username.trim()) {
      setFormState((prev) => ({ ...prev, error: "Please enter a username" }));
      return;
    }

    if (formState.usernameError) {
      setFormState((prev) => ({
        ...prev,
        error: "Please fix username errors",
      }));
      return;
    }

    try {
      setAsyncState((prev) => ({ ...prev, loading: true }));
      setFormState((prev) => ({ ...prev, error: "" }));
      // Create a temporary email based on wallet address for Firebase Auth
      const tempEmail = `${walletForSignup.toLowerCase()}@wallet.realmkin.com`;
      const tempPassword = walletForSignup; // Use wallet address as password

      // Call the new API route to create the user
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formState.username,
          walletAddress: walletForSignup,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // After successful creation, log the user in to establish a session
      await login(tempEmail, tempPassword);

      // Store user data in local storage for future logins
      localStorage.setItem(
        `realmkin_user_${walletForSignup.toLowerCase()}`,
        JSON.stringify({
          address: walletForSignup,
          username: formState.username,
          lastLogin: new Date().toISOString(),
          hasAccount: true,
        }),
      );

      console.log("✅ New user account created and stored");

      // Redirect to intended page
      router.push(redirectTarget);
    } catch (error: unknown) {
      setFormState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to create account",
      }));
    } finally {
      setAsyncState((prev) => ({ ...prev, loading: false }));
    }
  }, [
    walletAddress,
    searchParams,
    formState.username,
    formState.usernameError,
    login,
    router,
    redirectTarget,
  ]);

  // Handle login for existing users (memoized)
  const handleExistingUserLogin = useCallback(async () => {
    if (!walletAddress) {
      setFormState((prev) => ({
        ...prev,
        error: "Please connect your wallet first",
      }));
      return;
    }

    try {
      setAsyncState((prev) => ({ ...prev, loading: true }));
      setFormState((prev) => ({ ...prev, error: "" }));

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
        const cachedUser = localStorage.getItem(
          `realmkin_user_${walletAddress.toLowerCase()}`,
        );
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          if (userData.username) {
            console.log("Attempting to recreate Firebase Auth account");
            const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
            const tempPassword = walletAddress;
            await signup(
              tempEmail,
              tempPassword,
              userData.username,
              walletAddress,
            );
            console.log("✅ Recreated Firebase Auth account for existing user");
            router.push(redirectTarget);
            return;
          }
        }
      } catch (signupError) {
        console.error("Failed to recreate account:", signupError);
      }

      setFormState((prev) => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : "Failed to log in. Please try again.",
      }));
    } finally {
      setAsyncState((prev) => ({ ...prev, loading: false }));
    }
  }, [walletAddress, login, signup, router, redirectTarget]);

  // Form validation
  const validateForm = () => {
    const {
      email,
      password,
      confirmPassword,
      username,
      isSignup,
      usernameError,
    } = formState;

    if (!email || !password) {
      setFormState((prev) => ({
        ...prev,
        error: "Email and password are required",
      }));
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setFormState((prev) => ({
        ...prev,
        error: "Please enter a valid email address",
      }));
      return false;
    }

    if (password.length < 6) {
      setFormState((prev) => ({
        ...prev,
        error: "Password must be at least 6 characters long",
      }));
      return false;
    }

    if (isSignup) {
      if (!username) {
        setFormState((prev) => ({ ...prev, error: "Username is required" }));
        return false;
      }

      if (username.length < 3) {
        setFormState((prev) => ({
          ...prev,
          error: "Username must be at least 3 characters long",
        }));
        return false;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setFormState((prev) => ({
          ...prev,
          error: "Username can only contain letters, numbers, and underscores",
        }));
        return false;
      }

      if (password !== confirmPassword) {
        setFormState((prev) => ({ ...prev, error: "Passwords do not match" }));
        return false;
      }

      if (usernameError) {
        setFormState((prev) => ({
          ...prev,
          error: "Please choose a different username",
        }));
        return false;
      }
    }

    return true;
  };

  // Check username availability
  const handleUsernameChange = async (value: string) => {
    setFormState((prev) => ({ ...prev, username: value, usernameError: "" }));

    if (value.length >= 3) {
      setAsyncState((prev) => ({ ...prev, usernameChecking: true }));
      try {
        const isAvailable = await checkUsernameAvailability(value);
        if (!isAvailable) {
          setFormState((prev) => ({
            ...prev,
            usernameError: "Username is already taken",
          }));
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setAsyncState((prev) => ({ ...prev, usernameChecking: false }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setAsyncState((prev) => ({ ...prev, loading: true }));
    setFormState((prev) => ({ ...prev, error: "" }));

    try {
      const { isSignup, email, password, username } = formState;
      if (isSignup) {
        await signup(email, password, username);
      } else {
        await login(email, password);
      }
      router.push(redirectTarget);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : formState.isSignup
            ? "Signup failed"
            : "Login failed";
      setFormState((prev) => ({ ...prev, error: errorMessage }));
    } finally {
      setAsyncState((prev) => ({ ...prev, loading: false }));
    }
  };

  const resetForm = () => {
    setFormState({
      isSignup: false,
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      error: "",
      usernameError: "",
    });
  };

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-hidden bg-black">
      {/* Mystical Background Animation */}
      {/* <LoginBackground /> */}

      {/* Golden overlay */}
      <div className="absolute inset-0 bg-[#865900] opacity-60 pointer-events-none"></div>
      <div
        className="absolute inset-0 mix-blend-screen pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(236, 187, 27, 0.5) 0%, rgba(236, 187, 27, 0.3) 35%, rgba(134, 89, 0, 0.2) 70%, rgba(134, 89, 0, 0.4) 100%)",
        }}
      ></div>

      {/* Mobile Header */}
      <header className="lg:hidden relative z-10 flex flex-row justify-between items-center gap-3 p-6 text-black">
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 animate-float">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={48}
              height={48}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <h1
            className="font-bold text-lg uppercase tracking-wider text-black"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            THE REALMKIN
          </h1>
        </div>

        {/* Mobile menu button - always visible */}
        <div className="w-auto flex-shrink-0">
          <button
            onClick={() =>
              setUiState((prev) => ({
                ...prev,
                showMobileActions: !prev.showMobileActions,
              }))
            }
            className="flex items-center gap-2 bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
            aria-expanded={uiState.showMobileActions}
            aria-haspopup="true"
          >
            <span
              className={`text-xs transition-transform ${uiState.showMobileActions ? "rotate-180" : ""}`}
            >
              ⋯
            </span>
          </button>
        </div>
      </header>

      {/* Desktop Navigation */}
      

      {/* Mobile Menu Modal */}
      {uiState.showMobileActions && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
            onClick={() =>
              setUiState((prev) => ({ ...prev, showMobileActions: false }))
            }
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
                      loading="lazy"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-semibold tracking-wide text-[#DA9C2F] uppercase">
                      Realmkin
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setUiState((prev) => ({
                      ...prev,
                      showMobileActions: false,
                    }))
                  }
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
                    onClick={() =>
                      setUiState((prev) => ({
                        ...prev,
                        showMobileActions: false,
                      }))
                    }
                    className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
                  >
                    <span className="flex h-10 w-10 items-center justify-center">
                      <Image
                        src={item.icon}
                        alt={`${item.label} icon`}
                        width={20}
                        height={20}
                        className="w-8 h-8 object-contain"
                        loading="lazy"
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
                    onClick={() =>
                      setUiState((prev) => ({
                        ...prev,
                        showMobileActions: false,
                      }))
                    }
                    className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-transparent hover:border-[#2E2E2E] hover:bg-[#161616] transition-colors"
                  >
                    <span className="flex h-10 w-10 items-center justify-center">
                      <Image
                        src="/dashboard.png"
                        alt="Admin icon"
                        width={20}
                        height={20}
                        className="w-8 h-8 object-contain"
                        loading="lazy"
                      />
                    </span>
                    <span className="text-sm font-medium tracking-wide text-[#DA9C2F]">
                      Admin
                    </span>
                  </Link>
                )}
              </nav>

              {isConnected && walletAddress && (
                <div className="px-5 py-4 border-t border-[#1f1f1f]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => {
                        if (!discordLinked) {
                          handleDiscordConnect();
                          return;
                        }
                        setUiState((prev) => ({
                          ...prev,
                          showDiscordMenu: false,
                        }));
                        handleDiscordDisconnect();
                      }}
                      disabled={
                        asyncState.discordConnecting ||
                        asyncState.discordUnlinking
                      }
                      className="flex-1 flex items-center justify-between gap-3 rounded-2xl border border-[#DA9C2F] bg-black px-4 py-3 text-sm font-medium text-[#DA9C2F] transition-colors hover:bg-[#1a1a1a] disabled:opacity-70"
                    >
                      <span>
                        {discordLinked
                          ? "Disconnect Discord"
                          : asyncState.discordConnecting
                            ? "Connecting…"
                            : "Connect Discord"}
                      </span>
                      <span className="text-xs text-[#DA9C2F] opacity-70">
                        {discordLinked ? "Linked" : "Secure"}
                      </span>
                    </button>

                    <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                      <div
                        className={`relative h-10 w-16 rounded-full border transition-all duration-300 ease-out ${isConnected ? "border-[#DA9C2F] bg-[#DA9C2F]" : "border-[#DA9C2F] bg-[#0B0B09]"}`}
                        aria-hidden="true"
                      >
                        <div
                          className={`absolute top-1 h-8 w-8 rounded-full border border-[#DA9C2F] bg-black transition-all duration-300 ease-out ${isConnected ? "right-1" : "left-1"}`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          setUiState((prev) => ({
                            ...prev,
                            showMobileActions: false,
                          }));
                          if (isConnected) {
                            disconnectWallet();
                          } else {
                            connectWallet();
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
                            loading="lazy"
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
              )}
            </div>
          </div>
        </>
      )}

      {/* Content Wrapper */}
      <div className="relative min-h-screen flex flex-col">
        {/* Aurora Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="home-aurora aurora-one"></div>
          <div className="home-aurora aurora-two"></div>
          <div className="home-aurora aurora-three"></div>
        </div>

        {/* Main Content */}
        <main
          className={`relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-12 xl:px-16 py-12 transition-opacity duration-300 ${uiState.showMobileActions ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          <div className="text-center text-black mb-12 space-y-3 max-w-3xl">
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
          <div className="w-full max-w-6xl mx-auto animate-fade-in-up px-4 lg:px-0">
            <div className="home-card grid gap-8 bg-[#1b1205]/95 border border-black/40 rounded-2xl shadow-[0_35px_80px_rgba(0,0,0,0.45)] px-6 lg:px-12 py-12 text-left">
              <div className="space-y-6 text-[#f7dca1] lg:pl-4">
                <p className="text-lg lg:text-xl leading-relaxed font-semibold">
                  Battle in The Void — a nonstop PvE arena. Train your warriors
                  to Fight, Fuse, and Revive. Earn XP, Kill Coins, and ₥KIN.
                  Level up, claim rewards, and rise on the leaderboard.
                </p>
                {walletConnected && !asyncState.checkingUser ? (
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

              {asyncState.checkingUser && (
                <div className="space-y-3">
                  <SkeletonLoader />
                  <p className="text-sm text-[#f7dca1] text-center">
                    Checking your account status...
                  </p>
                </div>
              )}

              {!asyncState.checkingUser && !isNewUser && (
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
                    disabled={asyncState.loading}
                    className="w-full uppercase tracking-widest bg-[#DA9C2F] text-black font-bold py-4 rounded-xl border border-[#DA9C2F] transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70"
                    style={{ fontFamily: "var(--font-amnestia)" }}
                  >
                    {walletConnected
                      ? asyncState.loading
                        ? "LOADING..."
                        : "SUMMON WARDENKIN"
                      : asyncState.loading
                        ? "CONNECTING..."
                        : "CONNECT WALLET"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer - Social Links */}
        <footer
          className={`relative z-10 text-center p-6 lg:p-8 transition-opacity duration-300 ${uiState.showMobileActions ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
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
          background: radial-gradient(
            circle,
            rgba(255, 212, 121, 0.55) 0%,
            rgba(134, 89, 0, 0) 70%
          );
          top: -15%;
          left: -10%;
        }

        .aurora-two {
          background: radial-gradient(
            circle,
            rgba(255, 242, 191, 0.5) 0%,
            rgba(134, 89, 0, 0) 70%
          );
          bottom: -20%;
          right: -15%;
          animation-delay: 4s;
        }

        .aurora-three {
          background: radial-gradient(
            circle,
            rgba(255, 175, 64, 0.45) 0%,
            rgba(134, 89, 0, 0) 70%
          );
          top: 30%;
          right: -25%;
          animation-delay: 8s;
        }

        @keyframes auroraMove {
          0%,
          100% {
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
          background: linear-gradient(
            135deg,
            rgba(255, 221, 128, 0.2),
            rgba(255, 165, 0, 0.05)
          );
          opacity: 0;
          pointer-events: none;
          animation: cardAura 6s ease-in-out infinite;
        }

        @keyframes cardGlow {
          0%,
          100% {
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.4);
          }
          50% {
            box-shadow: 0 35px 80px rgba(255, 196, 77, 0.35);
          }
        }

        @keyframes cardAura {
          0%,
          100% {
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-[#DA9C2F]">
          <div className="flex items-center gap-3 text-sm uppercase tracking-widest">
            <span className="h-4 w-4 rounded-full border-2 border-transparent border-t-[#DA9C2F] animate-spin" />
            Loading…
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
