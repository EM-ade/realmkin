"use client";

import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/utils/formatAddress";
import SocialLinks from "@/components/SocialLinks";

export default function Home() {
  const { logout } = useAuth();
  const {
    account,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
  } = useWeb3();
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#2b1c3b] p-3 sm:p-6 lg:p-12 xl:px-20 2xl:px-20">
        <div className="border-6 border-[#d3b136] animate-pulse-glow px-2 sm:px-6 py-0 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-6rem)] xl:min-h-[calc(100vh-8rem)] 2xl:min-h-[calc(100vh-10rem)] max-w-7xl mx-auto">
          <div className="text-white font-sans">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-center px-2 sm:px-6 py-4 space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden animate-float">
                  <Image
                    src="/realmkin-logo.png"
                    alt="Realmkin Logo"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1
                  className="text-2xl sm:text-4xl lg:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.2em] lg:tracking-[0.3em] text-gradient"
                  style={{ fontFamily: "var(--font-hertical-sans)" }}
                >
                  REALMKIN
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                {/* Connect Wallet Button */}
                <button
                  onClick={isConnected ? disconnectWallet : connectWallet}
                  disabled={isConnecting}
                  className={`relative group border-2 border-[#d3b136] font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto btn-enhanced ${
                    isConnected
                      ? "bg-[#2b1c3b] hover:bg-purple-700 text-white shadow-lg shadow-yellow-400/20"
                      : "bg-[#2b1c3b] hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                  }`}
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div
                    className="flex items-center justify-center space-x-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    <span className="text-base sm:text-lg">
                      {isConnected ? "⚡" : "🔮"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold tracking-wide">
                      {isConnecting
                        ? "LINKING..."
                        : isConnected
                        ? "LINKED"
                        : "LINK WALLET"}
                    </span>
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="relative group border-2 border-[#d3b136] bg-[#2b1c3b] hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/20 w-full sm:w-auto btn-enhanced"
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div
                    className="flex items-center justify-center space-x-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    <span className="text-base sm:text-lg">⚔️</span>
                    <span className="text-xs sm:text-sm font-bold tracking-wide">
                      LOGOUT
                    </span>
                  </div>
                </button>
              </div>
            </header>

            <div className="px-2 sm:px-6 max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="border-6 border-[#d3b136] p-4 sm:p-8 pt-6 sm:pt-10 mb-2 card-hover">
                <h2
                  className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-6 sm:mb-10 tracking-wider text-center sm:text-left text-glow"
                  style={{ fontFamily: "var(--font-impact-regular)" }}
                >
                  WELCOME BACK
                </h2>
                <p
                  className="text-2xl sm:text-3xl lg:text-4xl mb-4 sm:mb-6 font-bold text-gray-300 tracking-wider text-center sm:text-left"
                  style={{ fontFamily: "var(--font-impact-regular)" }}
                >
                  {account ? formatAddress(account) : "0XA12.....BG43"}
                </p>
                <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto sm:mx-0 text-center sm:text-left">
                  &ldquo; INCREASE YOUR WEEKLY EARNINGS BY HOLDING MORE NFTS-
                  EACH WARDEN KIN BOOSTS YOUR $MKIN REWARD &rdquo;
                </p>
              </div>

              {/* Account Section */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-row sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <h3
                    className="text-lg sm:text-2xl font-bold pl-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    ACCOUNT
                  </h3>
                  <div className="relative mb-2">
                    <div className="bg-cyan-500 text-white px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm tracking-wider shadow-lg shadow-cyan-500/30 animate-pulse-glow-teal">
                      <div
                        className="flex items-center justify-center space-x-2"
                        style={{ fontFamily: "var(--font-gothic-cg)" }}
                      >
                        <span>ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-6 border-[#d3b136] p-4 card-hover">
                  <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
                    <div className="coin-container w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96">
                      <div className="w-full h-full rounded-full overflow-hidden animate-spin-3d shadow-2xl shadow-yellow-400/20">
                        <Image
                          src="/realmkin.png"
                          alt="Realmkin"
                          width={256}
                          height={256}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-4 text-gradient">
                        50.024{" "}
                        <span className="text-lg sm:text-xl lg:text-2xl -ml-2 sm:-ml-4 text-gray-300">
                          $MKIN
                        </span>
                      </div>
                      <button className="bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-lg sm:text-xl transition-all duration-300 w-full sm:w-auto btn-enhanced transform hover:scale-105 shadow-lg shadow-cyan-500/30">
                        CLAIM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT Section */}
              <div className="mb-4 sm:mb-6">
                <div
                  className="flex flex-row sm:flex-row justify-between items-center mb-2 sm:space-y-0"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  <h3 className="text-lg sm:text-2xl font-bold pl-2 text-glow">
                    MY WARDEN KINS
                  </h3>
                  <span className="text-lg sm:text-2xl font-bold text-gradient">
                    3 KINS
                  </span>
                </div>

                <div className="border-6 border-[#d3b136] p-4 card-hover">
                  {/* Mobile: Horizontal Scroll */}
                  <div className="sm:hidden">
                    <div className="flex space-x-4 overflow-x-auto pb-4 px-2">
                      {/* NFT Card 1 - Mobile */}
                      <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-2 overflow-hidden flex-shrink-0 w-40 h-auto card-hover">
                        <div className="border-2 border-[#d3b136] p-12 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <div className="text-4xl animate-float">🐰</div>
                        </div>
                        <div className="bg-[#2b1c3b] text-center p-2">
                          <div className="text-white px-2 font-bold text-sm mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-xs font-bold text-white">
                            POWER: 2000
                          </div>
                          <div className="text-[10px] text-gray-400">OWNED</div>
                        </div>
                      </div>

                      {/* NFT Card 2 - Mobile */}
                      <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-2 overflow-hidden flex-shrink-0 w-40 h-auto card-hover">
                        <div className="border-2 border-[#d3b136] p-12 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <div
                            className="text-4xl animate-float"
                            style={{ animationDelay: "0.5s" }}
                          >
                            👹
                          </div>
                        </div>
                        <div className="bg-[#2b1c3b] text-center p-2">
                          <div className="text-white px-2 font-bold text-sm mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-xs font-bold text-white">
                            POWER: 1840
                          </div>
                          <div className="text-[10px] text-gray-400">OWNED</div>
                        </div>
                      </div>

                      {/* NFT Card 3 - Mobile */}
                      <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-2 overflow-hidden flex-shrink-0 w-40 h-auto card-hover">
                        <div className="border-2 border-[#d3b136] p-12 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                          <div
                            className="text-4xl animate-float"
                            style={{ animationDelay: "1s" }}
                          >
                            🐰
                          </div>
                        </div>
                        <div className="bg-[#2b1c3b] text-center p-2">
                          <div className="text-white px-2 font-bold text-sm mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-xs font-bold text-white">
                            POWER: 2100
                          </div>
                          <div className="text-[10px] text-gray-400">OWNED</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tablet & Desktop: Grid Layout */}
                  <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 items-center justify-items-center gap-4">
                    {/* NFT Card 1 - Desktop */}
                    <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-4 overflow-hidden w-full max-w-[400px] card-hover">
                      <div className="border-2 border-[#d3b136] p-4 lg:p-14 mb-2 bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <div className="text-4xl lg:text-6xl animate-float">
                          🐰
                        </div>
                      </div>
                      <div className="bg-[#2b1c3b] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold text-white">
                          POWER: 2000
                        </div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 1 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center w-full max-w-[100px] card-hover">
                      <div className="flex flex-col space-y-3 items-center">
                        <div className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"></div>
                        <div
                          className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    </div>

                    {/* NFT Card 2 - Desktop */}
                    <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-4 overflow-hidden w-full max-w-[400px] card-hover">
                      <div className="border-2 border-[#d3b136] p-8 lg:p-14 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <div
                          className="text-4xl lg:text-6xl animate-float"
                          style={{ animationDelay: "0.5s" }}
                        >
                          👹
                        </div>
                      </div>
                      <div className="bg-[#2b1c3b] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold text-white">
                          POWER: 1840
                        </div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 2 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center w-full max-w-[100px] card-hover">
                      <div className="flex flex-col space-y-3 items-center">
                        <div
                          className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"
                          style={{ animationDelay: "0.6s" }}
                        ></div>
                        <div
                          className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"
                          style={{ animationDelay: "0.8s" }}
                        ></div>
                        <div
                          className="w-16 h-20 lg:w-20 lg:h-24 bg-[#d3b136] border-2 border-yellow-300 animate-pulse"
                          style={{ animationDelay: "1s" }}
                        ></div>
                      </div>
                    </div>

                    {/* NFT Card 3 - Desktop */}
                    <div className="border-4 border-[#d3b136] bg-[#2b1c3b] p-4 overflow-hidden w-full max-w-[400px] card-hover">
                      <div className="border-2 border-[#d3b136] p-8 lg:p-14 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <div
                          className="text-4xl lg:text-6xl animate-float"
                          style={{ animationDelay: "1s" }}
                        >
                          🐰
                        </div>
                      </div>
                      <div className="bg-[#2b1c3b] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold text-white">
                          POWER: 2100
                        </div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 sm:mt-8 text-center mystical-glow">
                <h4
                  className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-glow"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  OUR SOCIALS:
                </h4>
                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
