"use client";

import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/utils/formatAddress";

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
      <div className="min-h-screen bg-gradient-to-br from-[#2b1c3b] via-[#2b1c3b] to-[#2b1c3b] p-3 sm:p-6">
        <div className="border-6 border-[#d3b136] px-2 sm:px-6 py-0 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-3rem)]">
          <div className="text-white font-sans">
            {/* Header */}
            <header className="flex flex-col lg:flex-row justify-between items-center px-2 sm:px-6 py-4 space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-full overflow-hidden">
                  <Image
                    src="/realmkin-logo.png"
                    alt="Realmkin Logo"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1
                  className="text-2xl sm:text-4xl lg:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.2em] lg:tracking-[0.3em]"
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
                  className={`relative group border-2 font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 w-full sm:w-auto ${
                    isConnected
                      ? "border-yellow-400 bg-purple-800 hover:bg-purple-700 text-yellow-400 shadow-lg shadow-yellow-400/20"
                      : "border-yellow-400 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 text-yellow-400 shadow-lg shadow-purple-500/20"
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
                  className="relative group border-2 border-yellow-400 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-yellow-400 font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/20 w-full sm:w-auto"
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
              <div className="border-6 border-[#d3b136] p-4 sm:p-8 pt-6 sm:pt-10 mb-2">
                <h2
                  className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-6 sm:mb-10 tracking-wider text-center sm:text-left"
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
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                  <h3
                    className="text-xl sm:text-2xl font-bold pl-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    ACCOUNT
                  </h3>
                  <div className="relative mb-2">
                    <div
                      className="border-2 border-yellow-400 bg-gradient-to-r from-green-700 to-green-800 text-yellow-400 px-3 sm:px-4 py-2 font-bold text-xs sm:text-sm tracking-wider shadow-lg shadow-green-500/30 animate-pulse"
                      style={{
                        clipPath:
                          "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                      }}
                    >
                      <div
                        className="flex items-center space-x-2"
                        style={{ fontFamily: "var(--font-gothic-cg)" }}
                      >
                        <span className="text-green-300">●</span>
                        <span>ONLINE</span>
                        <span className="text-green-300">●</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-6 border-[#d3b136] p-4">
                  <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
                    <div className="coin-container w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64">
                      <div className="w-full h-full rounded-full overflow-hidden animate-spin-3d">
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
                      <div className="text-4xl sm:text-6xl lg:text-8xl font-bold mb-4">
                        50.024{" "}
                        <span className="text-lg sm:text-xl lg:text-2xl -ml-2 sm:-ml-4 text-gray-300">
                          $MKIN
                        </span>
                      </div>
                      <button className="bg-teal-400 hover:bg-teal-300 text-black font-bold py-3 sm:py-4 px-6 sm:px-8 text-lg sm:text-xl transition-colors w-full sm:w-auto">
                        CLAIM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT Section */}
              <div className="mb-4 sm:mb-6">
                <div
                  className="flex flex-col sm:flex-row justify-between items-center mb-2 space-y-2 sm:space-y-0"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold pl-2">
                    MY WARDEN KINS
                  </h3>
                  <span className="text-xl sm:text-2xl font-bold">3 KINS</span>
                </div>

                <div className="border-6 border-[#d3b136] py-3 px-1">
                  {/* Mobile: Horizontal Scroll */}
                  <div className="sm:hidden">
                    <div className="flex space-x-4 overflow-x-auto pb-4 px-2">
                      {/* NFT Card 1 - Mobile */}
                      <div className="border-6 border-[#d3b136] p-2 overflow-hidden flex-shrink-0 w-48">
                        <div className="border-2 border-[#d3b136] p-8 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                          <div className="text-4xl">🐰</div>
                        </div>
                        <div className="border-2 border-[#d3b136] text-center p-2">
                          <div className="text-white px-2 font-bold text-base mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-sm font-bold">POWER: 2000</div>
                          <div className="text-xs text-gray-400">OWNED</div>
                        </div>
                      </div>

                      {/* NFT Card 2 - Mobile */}
                      <div className="border-6 border-[#d3b136] p-2 overflow-hidden flex-shrink-0 w-48">
                        <div className="border-2 border-[#d3b136] p-8 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                          <div className="text-4xl">👹</div>
                        </div>
                        <div className="border-2 border-[#d3b136] text-center p-2">
                          <div className="text-white px-2 font-bold text-base mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-sm font-bold">POWER: 1840</div>
                          <div className="text-xs text-gray-400">OWNED</div>
                        </div>
                      </div>

                      {/* NFT Card 3 - Mobile */}
                      <div className="border-6 border-[#d3b136] p-2 overflow-hidden flex-shrink-0 w-48">
                        <div className="border-2 border-[#d3b136] p-8 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                          <div className="text-4xl">🐰</div>
                        </div>
                        <div className="border-2 border-[#d3b136] text-center p-2">
                          <div className="text-white px-2 font-bold text-base mb-1">
                            LEGENDARY
                          </div>
                          <div className="text-sm font-bold">POWER: 2100</div>
                          <div className="text-xs text-gray-400">OWNED</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tablet & Desktop: Grid Layout */}
                  <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-6 items-center justify-items-center">
                    {/* NFT Card 1 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-3 overflow-hidden w-full max-w-[200px]">
                      <div className="border-2 border-[#d3b136] p-8 lg:p-14 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                        <div className="text-4xl lg:text-6xl">🐰</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold">POWER: 2000</div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 1 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center aspect-square w-full max-w-[200px]">
                      <div className="flex flex-col space-y-3 items-center">
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                      </div>
                    </div>

                    {/* NFT Card 2 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-3 overflow-hidden w-full max-w-[200px]">
                      <div className="border-2 border-[#d3b136] p-8 lg:p-14 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                        <div className="text-4xl lg:text-6xl">👹</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold">POWER: 1840</div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 2 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center aspect-square w-full max-w-[200px]">
                      <div className="flex flex-col space-y-3 items-center">
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                        <div className="w-12 h-12 lg:w-24 lg:h-24 bg-[#d3b136] border-2 border-yellow-300"></div>
                      </div>
                    </div>

                    {/* NFT Card 3 - Desktop */}
                    <div className="border-6 border-[#d3b136] p-3 overflow-hidden w-full max-w-[200px]">
                      <div className="border-2 border-[#d3b136] p-8 lg:p-14 mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center">
                        <div className="text-4xl lg:text-6xl">🐰</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-base lg:text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold">POWER: 2100</div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-6 sm:mt-8 text-center">
                <h4
                  className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  OUR SOCIALS:
                </h4>

                

                {/* Desktop: Horizontal Layout */}
                <div className="hidden sm:flex justify-center space-x-6 lg:space-x-12 text-lg lg:text-xl">
                  <div className="bg-purple-800 border-2 border-yellow-400 rounded-lg py-3 px-6 hover:bg-purple-700 transition-colors">
                    <span className="font-bold text-yellow-400">DISCORD</span>
                  </div>
                  <div className="bg-purple-800 border-2 border-yellow-400 rounded-lg py-3 px-6 hover:bg-purple-700 transition-colors">
                    <span className="font-bold text-yellow-400">INSTAGRAM</span>
                  </div>
                  <div className="bg-purple-800 border-2 border-yellow-400 rounded-lg py-3 px-6 hover:bg-purple-700 transition-colors">
                    <span className="font-bold text-yellow-400">
                      TWITTER /X
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
