"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import AnimatedRoadmap from "@/components/AnimatedRoadmap";
import AnimatedWhitepaper from "@/components/AnimatedWhitepaper";
import SocialLinks from "@/components/SocialLinks";

export default function LoginPage() {
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
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);

  // Simplified flow states
  const [isNewUser, setIsNewUser] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);

  const router = useRouter();
  const { login, signup, checkUsernameAvailability, getUserByWallet } = useAuth();
  const { connectWallet, account: walletAddress } = useWeb3();

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setShowForm(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Debug: Check for Phantom wallet on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("🔍 Checking for wallets...");
      console.log(
        "Phantom available:",
        !!(window as unknown as { phantom?: { solana?: unknown } }).phantom
          ?.solana
      );
    }
  }, []);

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
      await connectWallet();
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-50"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 lg:p-8">
        {/* Logo and Title */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full overflow-hidden animate-float">
            <Image
              src="/realmkin-logo.png"
              alt="Realmkin Logo"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <h1
            className="text-[#d3b136] text-2xl lg:text-4xl font-bold tracking-wider"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            THE REALMKIN
          </h1>
        </div>

        {/* Auth Buttons - Hidden in simplified flow */}
        {!useSimplifiedFlow && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsSignup(true);
                resetForm();
              }}
              className={`px-6 py-2 lg:px-8 lg:py-3 border-2 border-[#d3b136] font-bold text-sm lg:text-base transition-all duration-300 ${
                isSignup
                  ? "bg-[#d3b136] text-black"
                  : "text-[#d3b136] hover:bg-[#d3b136] hover:text-black"
              }`}
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              SIGN UP
            </button>
            <button
              onClick={() => {
                setIsSignup(false);
                resetForm();
              }}
              className={`px-6 py-2 lg:px-8 lg:py-3 border-2 border-[#d3b136] font-bold text-sm lg:text-base transition-all duration-300 ${
                !isSignup
                  ? "bg-[#d3b136] text-black"
                  : "text-[#d3b136] hover:bg-[#d3b136] hover:text-black"
              }`}
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              LOGIN
            </button>
          </div>
        )}

        {/* Simplified Flow - Connect Wallet Button */}
        {useSimplifiedFlow && !walletConnected && (
          <div>
            <button
              onClick={handleWalletConnect}
              disabled={loading}
              className="px-6 py-3 bg-[#d3b136] hover:bg-[#b8941f] disabled:bg-[#8a6b15] text-black font-bold rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105"
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              {loading ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          </div>
        )}

        {/* Simplified Flow - Connected Status */}
        {useSimplifiedFlow && walletConnected && (
          <div className="text-[#d3b136] font-bold text-sm">
            <span style={{ fontFamily: "var(--font-amnestia)" }}>
              WALLET CONNECTED
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-8 py-12">
        {/* Welcome Title */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12">
          <h2
            className="text-[#d3b136] text-4xl sm:text-6xl lg:text-8xl xl:text-9xl font-bold tracking-wider mb-4 animate-float"
            style={{
              fontFamily: "var(--font-amnestia)",
              textShadow: "0 0 20px rgba(211, 177, 54, 0.5)",
            }}
          >
            WELCOME
          </h2>
        </div>

        {/* Main Content Container */}
        <div className="w-full max-w-6xl mx-auto animate-fade-in-up px-4 sm:px-0">
          <div className="border-2 sm:border-4 border-[#d3b136] bg-black bg-opacity-80 backdrop-blur-sm min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] p-4 sm:p-8 lg:p-12 animate-golden-glow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 h-full">
              {/* Left Side - Marketing Content & Documentation */}
              <div className="flex flex-col justify-center space-y-6">
                <div className="text-center lg:text-left">
                  {/* Marketing Copy */}
                  <div className="space-y-6 text-gray-300">
                    <p
                      className="text-[#d3b136] text-xl lg:text-2xl font-bold italic"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      Welcome to The Realm
                    </p>

                    <p className="text-lg leading-relaxed font-medium">
                      Own your power. Summon your WardenKin. Shape the forgotten
                      into your legacy.
                    </p>

                    <p className="text-base leading-relaxed">
                      Battle in The Void — a nonstop PvE arena where your NFT
                      warriors fight, fuse, and revive to earn XP, Kill Coins,
                      and ₥KIN. Level up, claim rewards, and dominate the
                      leaderboard.
                    </p>

                    <p
                      className="text-[#d3b136] text-lg lg:text-xl font-bold italic text-center lg:text-left"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      Summon. Fight. Conquer
                    </p>

                    {/* Bonus Info */}
                    <div className="bg-[#d3b136] bg-opacity-10 border border-[#d3b136] border-opacity-30 p-4 rounded-lg">
                      <p className="text-white text-sm font-semibold">
                        🎁 New holders receive ₥200 bonus per NFT upon first
                        login!
                      </p>
                    </div>

                    {/* Documentation Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <button
                          className="bg-transparent border-2 border-[#d3b136] text-[#d3b136] hover:bg-[#d3b136] hover:text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105"
                          style={{ fontFamily: "var(--font-amnestia)" }}
                          onClick={() => setShowWhitepaper(true)}
                        >
                          📄 WHITEPAPER
                        </button>
                        {/* <button
                          className="bg-transparent border border-[#d3b136] border-opacity-50 text-[#d3b136] text-opacity-75 hover:border-opacity-100 hover:text-opacity-100 font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                          style={{ fontFamily: "var(--font-amnestia)" }}
                          onClick={downloadWhitepaperPDF}
                        >
                          ⬇️ DOWNLOAD PDF
                        </button> */}
                      </div>
                      <button
                        className="flex-1 bg-transparent border-2 border-[#d3b136] text-[#d3b136] hover:bg-[#d3b136] hover:text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105"
                        style={{ fontFamily: "var(--font-amnestia)" }}
                        onClick={() => setShowRoadmap(true)}
                      >
                        🗺️ ROADMAP
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Authentication Form */}
              <div className="flex flex-col justify-center">
                <div
                  className={`transition-all duration-700 transform ${
                    showForm
                      ? "translate-x-0 opacity-100 animate-slide-in-right"
                      : "translate-x-8 opacity-0"
                  }`}
                >
                  <div className="bg-black bg-opacity-60 border-2 border-[#d3b136] border-opacity-50 rounded-lg p-6 lg:p-8">
                    <h4
                      className="text-[#d3b136] text-xl lg:text-2xl font-bold text-center mb-6"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      {useSimplifiedFlow
                        ? walletConnected
                          ? checkingUser
                            ? "CHECKING ACCOUNT..."
                            : isNewUser
                            ? "SET USERNAME"
                            : "WELCOME BACK"
                          : "CONNECT WALLET"
                        : isSignup
                        ? "CREATE ACCOUNT"
                        : "HOLDER LOGIN"}
                    </h4>

                    {/* Simplified Flow Form */}
                    {useSimplifiedFlow ? (
                      <div className="space-y-4">
                        {!walletConnected ? (
                          // Show connect wallet instructions
                          <div className="text-center">
                            <p className="text-gray-300 mb-4">
                              Connect your wallet to access The Realm
                            </p>
                            <button
                              onClick={handleWalletConnect}
                              disabled={loading}
                              className="w-full bg-[#d3b136] hover:bg-[#b8941f] disabled:bg-[#8a6b15] text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105 shadow-lg shadow-[#d3b136]/30"
                              style={{ fontFamily: "var(--font-amnestia)" }}
                            >
                              {loading ? "CONNECTING..." : "CONNECT WALLET"}
                            </button>
                          </div>
                        ) : checkingUser ? (
                          // Show checking state
                          <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-[#d3b136] border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-300 mb-4">
                              Checking your account status...
                            </p>
                          </div>
                        ) : isNewUser ? (
                          // Show username input for new users
                          <div>
                            <div className="mb-4">
                              <input
                                type="text"
                                placeholder="Choose Username"
                                value={username}
                                onChange={(e) =>
                                  handleUsernameChange(e.target.value)
                                }
                                required
                                className={`w-full bg-black border-2 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-colors ${
                                  usernameError
                                    ? "border-red-500 focus:border-red-400"
                                    : "border-[#d3b136] border-opacity-50 focus:border-[#d3b136]"
                                }`}
                              />
                              {usernameChecking && (
                                <p className="text-yellow-400 text-sm mt-1">
                                  Checking availability...
                                </p>
                              )}
                              {usernameError && (
                                <p className="text-red-400 text-sm mt-1">
                                  {usernameError}
                                </p>
                              )}
                              {username.length >= 3 &&
                                !usernameError &&
                                !usernameChecking && (
                                  <p className="text-green-400 text-sm mt-1">
                                    Username available!
                                  </p>
                                )}
                            </div>

                            {error && (
                              <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-3 mb-4">
                                {error}
                              </div>
                            )}

                            <button
                              onClick={handleSimplifiedSignup}
                              disabled={
                                loading ||
                                usernameChecking ||
                                !username.trim() ||
                                !!usernameError
                              }
                              className="w-full bg-[#d3b136] hover:bg-[#b8941f] disabled:bg-[#8a6b15] text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105 shadow-lg shadow-[#d3b136]/30"
                              style={{ fontFamily: "var(--font-amnestia)" }}
                            >
                              {loading
                                ? "CREATING ACCOUNT..."
                                : "ENTER THE REALM"}
                            </button>
                          </div>
                        ) : (
                          // Returning user - direct access
                          <div className="text-center">
                            <p className="text-gray-300 mb-4">
                              Welcome back! You can now access The Realm.
                            </p>
                            <button
                              onClick={handleExistingUserLogin}
                              disabled={loading}
                              className="w-full bg-[#d3b136] hover:bg-[#b8941f] disabled:bg-[#8a6b15] text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105 shadow-lg shadow-[#d3b136]/30"
                              style={{ fontFamily: "var(--font-amnestia)" }}
                            >
                              {loading ? "LOGGING IN..." : "ENTER THE REALM"}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Full Email Authentication Form (commented out but preserved)
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Input (Signup only) */}
                        {isSignup && (
                          <div>
                            <input
                              type="text"
                              placeholder="Username"
                              value={username}
                              onChange={(e) =>
                                handleUsernameChange(e.target.value)
                              }
                              required
                              className={`w-full bg-black border-2 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none transition-colors ${
                                usernameError
                                  ? "border-red-500 focus:border-red-400"
                                  : "border-[#d3b136] border-opacity-50 focus:border-[#d3b136]"
                              }`}
                            />
                            {usernameChecking && (
                              <p className="text-yellow-400 text-sm mt-1">
                                Checking availability...
                              </p>
                            )}
                            {usernameError && (
                              <p className="text-red-400 text-sm mt-1">
                                {usernameError}
                              </p>
                            )}
                            {username.length >= 3 &&
                              !usernameError &&
                              !usernameChecking && (
                                <p className="text-green-400 text-sm mt-1">
                                  Username available!
                                </p>
                              )}
                          </div>
                        )}

                        {/* Email Input */}
                        <div>
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-black border-2 border-[#d3b136] border-opacity-50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#d3b136] transition-colors"
                          />
                        </div>

                        {/* Password Input */}
                        <div>
                          <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-black border-2 border-[#d3b136] border-opacity-50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#d3b136] transition-colors"
                          />
                        </div>

                        {/* Confirm Password Input (Signup only) */}
                        {isSignup && (
                          <div>
                            <input
                              type="password"
                              placeholder="Confirm Password"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              required
                              className="w-full bg-black border-2 border-[#d3b136] border-opacity-50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-[#d3b136] transition-colors"
                            />
                          </div>
                        )}

                        {/* Error Message */}
                        {error && (
                          <div className="text-red-400 text-sm text-center bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-3">
                            {error}
                          </div>
                        )}

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={loading || (isSignup && usernameChecking)}
                          className="w-full bg-[#d3b136] hover:bg-[#b8941f] disabled:bg-[#8a6b15] text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105 shadow-lg shadow-[#d3b136]/30"
                          style={{ fontFamily: "var(--font-amnestia)" }}
                        >
                          {loading
                            ? isSignup
                              ? "CREATING ACCOUNT..."
                              : "LOGGING IN..."
                            : isSignup
                            ? "CREATE ACCOUNT"
                            : "LOGIN"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Social Links */}
      <footer className="relative z-10 text-center p-4 sm:p-6 lg:p-8">
        <h4
          className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#d3b136]"
          style={{ fontFamily: "var(--font-amnestia)" }}
        >
          OUR SOCIALS:
        </h4>
        <SocialLinks />
      </footer>

      {/* Animated Roadmap Modal */}
      <AnimatedRoadmap
        isOpen={showRoadmap}
        onClose={() => setShowRoadmap(false)}
      />

      {/* Animated Whitepaper Modal */}
      <AnimatedWhitepaper
        isOpen={showWhitepaper}
        onClose={() => setShowWhitepaper(false)}
      />
    </div>
  );
}
