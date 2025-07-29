"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/"); // Redirect to main page after successful login
    } catch (error: unknown) {
      setError("Invalid email or password. Please try again.");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 sm:px-6">
      {/* REALMKIN Title */}
      <div className="text-center mb-8 sm:mb-12">
        <h1
          className="text-white text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 sm:mb-6"
          style={{
            fontFamily: "var(--font-amnestia)",
            transform: "scaleX(1.2)",
            transformOrigin: "center",
          }}
        >
          REALMKIN
        </h1>
        <h2 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal font-sans">
          Holders Login
        </h2>
      </div>

      {/* Login Form Container */}
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <div className="bg-[#141414] border border-[#3b3b3b] rounded-2xl sm:rounded-3xl p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-6 sm:space-y-8">
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

            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl transition-colors font-sans"
            >
              {loading ? "Logging In..." : "Log In"}
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
