"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const router = useRouter();
  const { login, signup, checkUsernameAvailability } = useAuth();

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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 sm:px-6">
      {/* REALMKIN Title */}
      <div className="text-center mb-8 sm:mb-12">
        <h1
          className="text-white text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-wide mb-4 sm:mb-6 animate-float"
          style={{
            fontFamily: "var(--font-amnestia)",
            transform: "scaleX(1.2)",
            transformOrigin: "center",
          }}
        >
          THE REALMKIN
        </h1>
        <h2 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal font-sans text-glow">
          {isSignup ? "Join the Realm" : "Holders Login"}
        </h2>
      </div>

      {/* Login/Signup Form Container */}
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        {/* Toggle Buttons */}
        <div className="flex mb-6 bg-[#141414] border border-[#3b3b3b] rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              if (isSignup) {
                setIsSignup(false);
                resetForm();
              }
            }}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
              !isSignup
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isSignup) {
                setIsSignup(true);
                resetForm();
              }
            }}
            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
              isSignup
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            SIGN UP
          </button>
        </div>

        <div className="bg-[#141414] border border-[#3b3b3b] rounded-2xl sm:rounded-3xl p-6 sm:p-8 card-hover animate-pulse-glow">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Username Input (Signup only) */}
            {isSignup && (
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  className={`w-full bg-[#222222] border rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 text-white text-lg sm:text-xl placeholder-gray-400 focus:outline-none transition-colors font-sans ${
                    usernameError
                      ? "border-red-500 focus:border-red-500"
                      : "border-[#3b3b3b] focus:border-blue-500"
                  }`}
                />
                {usernameChecking && (
                  <p className="text-yellow-400 text-sm mt-2">
                    Checking availability...
                  </p>
                )}
                {usernameError && (
                  <p className="text-red-400 text-sm mt-2">{usernameError}</p>
                )}
                {username.length >= 3 &&
                  !usernameError &&
                  !usernameChecking && (
                    <p className="text-green-400 text-sm mt-2">
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
                className="w-full bg-[#222222] border border-[#3b3b3b] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 text-white text-lg sm:text-xl placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-sans"
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
                className="w-full bg-[#222222] border border-[#3b3b3b] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 text-white text-lg sm:text-xl placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-sans"
              />
            </div>

            {/* Confirm Password Input (Signup only) */}
            {isSignup && (
              <div>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#222222] border border-[#3b3b3b] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-4 sm:py-5 text-white text-lg sm:text-xl placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors font-sans"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (isSignup && usernameChecking)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl transition-all duration-300 font-sans btn-enhanced transform hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              {loading
                ? isSignup
                  ? "Creating Account..."
                  : "Logging In..."
                : isSignup
                ? "Create Account"
                : "Log In"}
            </button>
          </form>
        </div>
      </div>

      {/* Official Link */}
      <div className="mt-8 sm:mt-12 text-center">
        <p className="text-white text-lg sm:text-xl lg:text-2xl font-normal font-sans">
          Official Link
        </p>
      </div>
    </div>
  );
}
