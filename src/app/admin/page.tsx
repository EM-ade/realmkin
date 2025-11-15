"use client";

import { useState } from "react";
import UserManagementDashboard from "@/components/UserManagementDashboard";
import ContractManagementPanel from "@/components/ContractManagementPanel";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Link from "next/link";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState<"users" | "contracts" | "leaderboard">("users");
  const [showContractsPanel, setShowContractsPanel] = useState(false);

  const tabs = [
    { id: "users", label: "👥 Users", icon: "👥" },
    { id: "contracts", label: "📋 Contracts", icon: "📋" },
    { id: "leaderboard", label: "🏆 Leaderboard", icon: "🏆" },
  ];

  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-[#080806] relative overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-gradient-to-b from-[#050302]/95 to-[#050302]/80 backdrop-blur-md border-b border-[#DA9C2F]/10 p-4 md:p-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-widest gold-gradient-text">
                  ADMIN DASHBOARD
                </h1>
                <p className="text-white/60 text-sm mt-1">Manage users, contracts, and leaderboards</p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg border border-[#DA9C2F]/30 text-[#DA9C2F] font-medium hover:bg-[#DA9C2F]/10 transition-colors text-sm"
              >
                ← Back to Home
              </Link>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="border-b border-[#DA9C2F]/10 bg-[#0f0f0f]/50 sticky top-[80px] z-30">
            <div className="max-w-7xl mx-auto px-4 md:px-6 flex overflow-x-auto gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 font-semibold text-sm md:text-base whitespace-nowrap transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-[#DA9C2F] text-[#DA9C2F]"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="card premium-card interactive-element p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#DA9C2F] mb-1">User Management</h2>
                      <p className="text-white/60 text-sm">Search, view, and manage user accounts</p>
                    </div>
                  </div>
                  <UserManagementDashboard />
                </div>
              </div>
            )}

            {/* Contracts Tab */}
            {activeTab === "contracts" && (
              <div className="space-y-4">
                <div className="card premium-card interactive-element p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#DA9C2F] mb-1">Contract Bonuses</h2>
                      <p className="text-white/60 text-sm">Configure NFT collections and mining bonuses</p>
                    </div>
                    <button
                      onClick={() => setShowContractsPanel(true)}
                      className="px-6 py-2 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors text-sm whitespace-nowrap"
                    >
                      + Add/Edit Contract
                    </button>
                  </div>
                  <div className="bg-[#0f0f0f] rounded-lg p-6 text-center text-white/60">
                    <p className="mb-4">📋 Contract management panel</p>
                    <button
                      onClick={() => setShowContractsPanel(true)}
                      className="px-4 py-2 border border-[#DA9C2F]/30 text-[#DA9C2F] rounded-lg hover:bg-[#DA9C2F]/10 transition-colors text-sm"
                    >
                      Open Manager
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === "leaderboard" && (
              <div className="space-y-4">
                <div className="card premium-card interactive-element p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#DA9C2F] mb-1">Leaderboard Management</h2>
                      <p className="text-white/60 text-sm">View rankings, manage winners, and export data</p>
                    </div>
                    <Link
                      href="/admin/leaderboard"
                      className="px-6 py-2 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors text-sm whitespace-nowrap"
                    >
                      Open Leaderboard
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#DA9C2F]/20">
                      <p className="text-white/60 text-sm mb-2">Current Month</p>
                      <p className="text-2xl font-bold text-[#DA9C2F]">Top 100</p>
                      <p className="text-white/40 text-xs mt-1">Active players</p>
                    </div>
                    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#DA9C2F]/20">
                      <p className="text-white/60 text-sm mb-2">Features</p>
                      <ul className="text-sm text-white/60 space-y-1">
                        <li>• View rankings</li>
                        <li>• Export CSV</li>
                        <li>• Manual reset</li>
                      </ul>
                    </div>
                    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#DA9C2F]/20">
                      <p className="text-white/60 text-sm mb-2">Actions</p>
                      <Link
                        href="/admin/leaderboard"
                        className="block px-3 py-2 bg-[#DA9C2F]/20 text-[#DA9C2F] rounded text-sm text-center hover:bg-[#DA9C2F]/30 transition-colors"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Modal: Contract Bonuses Manager */}
          <ContractManagementPanel
            isVisible={showContractsPanel}
            onClose={() => setShowContractsPanel(false)}
          />
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default AdminPage;
