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
      <div className="min-h-screen bg-gradient-to-br from-[#2b1c3b] via-[#2b1c3b] to-[#2b1c3b] p-6">
        <div className="border-6 border-[#d3b136] px-6 py-0 min-h-[calc(100vh-3rem)]">
          <div className="text-white font-sans">
            {/* Header */}
            <header className="flex justify-between items-center px-6">
              <div className="flex items-center space-x-2 py-0">
                <div className="w-32 h-32 rounded-full overflow-hidden">
                  <Image
                    src="/realmkin-logo.png"
                    alt="Realmkin Logo"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1
                  className="text-6xl font-bold tracking-[0.3em]"
                  style={{ fontFamily: "var(--font-hertical-sans)" }}
                >
                  REALMKIN
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                {/* Connect Wallet Button */}
                <button
                  onClick={isConnected ? disconnectWallet : connectWallet}
                  disabled={isConnecting}
                  className={`relative group border-2 font-bold py-2 px-4 transition-all duration-300 transform hover:scale-105 ${
                    isConnected
                      ? "border-yellow-400 bg-purple-800 hover:bg-purple-700 text-yellow-400 shadow-lg shadow-yellow-400/20"
                      : "border-yellow-400 bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 text-yellow-400 shadow-lg shadow-purple-500/20"
                  }`}
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div className="flex items-center space-x-2" style={{ fontFamily: "var(--font-gothic-cg)" }}>
                    <span className="text-lg">{isConnected ? "⚡" : "�"}</span>
                    <span className="text-sm font-bold tracking-wide">
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
                  className="relative group border-2 border-yellow-400 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-yellow-400 font-bold py-2 px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-red-500/20"
                  style={{
                    clipPath:
                      "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  }}
                >
                  <div className="flex items-center space-x-2" style={{ fontFamily: "var(--font-gothic-cg)" }}>
                    <span className="text-lg">⚔️</span>
                    <span className="text-sm font-bold tracking-wide">
                      LOGOUT
                    </span>
                  </div>
                </button>
              </div>
            </header>

            <div className="px-6 max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="border-6 border-[#d3b136] p-8 pt-10 mb-2 ">
                <h2
                  className="text-8xl font-bold mb-8"
                  style={{ fontFamily: "var(--font-impact-regular)" }}
                >
                  WELCOME BACK
                </h2>
                <p
                  className="text-4xl mb-4 font-bold text-gray-300"
                  style={{ fontFamily: "var(--font-impact-regular)" }}
                >
                  {account ? formatAddress(account) : "0XA12.....BG43"}
                </p>
                <p className="text-lg text-gray-300 max-w-2xl">
                  " INCREASE YOUR WEEKLY EARNINGS BY HOLDING MORE NFTS- EACH
                  WARDEN KIN BOOSTS YOUR $MKIN REWARD "
                </p>
              </div>

              {/* Account Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <h3
                    className="text-2xl font-bold pl-2"
                    style={{ fontFamily: "var(--font-gothic-cg)" }}
                  >
                    ACCOUNT
                  </h3>
                  <div className="relative mb-2">
                    <div
                      className="border-2 border-yellow-400 bg-gradient-to-r from-green-700 to-green-800 text-yellow-400 px-4 py-2 font-bold text-sm tracking-wider shadow-lg shadow-green-500/30 animate-pulse"
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

                <div className="border-6 border-[#d3b136] p-4 ">
                  <div className="flex items-center space-x-8">
                    <div className="coin-container w-[16rem] h-[16rem]">
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
                    <div className="flex-1">
                      <div className="text-8xl font-bold mb-4">
                        50.024{" "}
                        <span className="text-2xl -ml-4 text-gray-300">
                          $MKIN
                        </span>
                      </div>
                      <button className="bg-teal-400 hover:bg-teal-300 text-black font-bold py-4 px-8  text-xl transition-colors">
                        CLAIM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NFT Section */}
              <div className="mb-6">
                <div
                  className="flex justify-between items-center mb-2"
                  style={{ fontFamily: "var(--font-gothic-cg)" }}
                >
                  <h3 className="text-2xl font-bold pl-2">MY WARDEN KINS</h3>
                  <span className="text-2xl font-bold">3 KINS</span>
                </div>

                <div className="border-6 border-[#d3b136] p-4">
                  <div className="grid grid-cols-5 gap-4">
                    {/* NFT Card 1 */}
                    <div className="border-6 border-[#d3b136] p-2 overflow-hidden bg-gray-800">
                      <div className="border-2 border-[#d3b136] mb-2 aspect-square bg-gradient-to-br from-blue-400 to-yellow-400 p-4 flex items-center justify-center">
                        <div className="text-6xl">🐰</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold">POWER: 2000</div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 1 */}
                    <div className="border-6 w-30 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center">
                      <div className="flex flex-col space-y-4">
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                      </div>
                    </div>

                    {/* NFT Card 2 */}
                    <div className="border-6 border-[#d3b136] p-2 overflow-hidden bg-gray-800">
                      <div className="border-2 border-[#d3b136] mb-2 aspect-square bg-gradient-to-br from-red-500 to-purple-600 p-4 flex items-center justify-center">
                        <div className="text-6xl">👹</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-lg mb-1">
                          LEGENDARY
                        </div>
                        <div className="text-sm font-bold">POWER: 1840</div>
                        <div className="text-xs text-gray-400">OWNED</div>
                      </div>
                    </div>

                    {/* Empty Slot 2 */}
                    <div className="border-6 w-30 border-[#d3b136] p-2 bg-gray-800 flex flex-col justify-center items-center">
                      <div className="flex flex-col space-y-4">
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                        <div className="w-24 h-24 bg-[#d3b136]"></div>
                      </div>
                    </div>

                    {/* NFT Card 3 */}
                    <div className="border-6 border-[#d3b136] p-2 overflow-hidden bg-gray-800">
                      <div className="border-2 border-[#d3b136] mb-2 aspect-square bg-gradient-to-br from-gray-300 to-white p-4 flex items-center justify-center">
                        <div className="text-6xl">🐰</div>
                      </div>
                      <div className="border-2 border-[#d3b136] text-center p-2">
                        <div className="text-white px-2 font-bold text-lg mb-1">
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
              <div className="mt-8 text-center">
                <h4 className="text-2xl font-bold mb-4">OUR SOCIALS:</h4>
                <div className="flex justify-center space-x-12 text-xl">
                  <div>
                    <span className="font-bold">DISCORD:</span>
                  </div>
                  <div>
                    <span className="font-bold">INSTAGRAM:</span>
                  </div>
                  <div>
                    <span className="font-bold">TWITTER /X:</span>
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
