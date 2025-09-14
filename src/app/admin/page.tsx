"use client";

import { useState } from "react";
import UserManagementDashboard from "@/components/UserManagementDashboard";
import ContractManagementPanel from "@/components/ContractManagementPanel";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Link from "next/link";

const AdminPage = () => {
  const [showContractsPanel, setShowContractsPanel] = useState(false);

  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-[#080806] p-3 sm:p-4 md:p-6 lg:p-8 xl:px-16 2xl:px-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-widest gold-gradient-text"
                style={{ fontFamily: "var(--font-hertical-sans)" }}
              >
                ADMIN DASHBOARD
              </h1>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="bg-[#0B0B09] px-3 py-2 rounded-lg border border-[#404040] text-[#DA9C2F] font-medium text-sm hover:bg-[#1a1a1a] transition-colors"
                >
                  Home
                </Link>
                <button
                  onClick={() => setShowContractsPanel(true)}
                  className="bg-[#DA9C2F] text-black px-3 py-2 rounded-lg font-semibold text-sm hover:bg-[#C4A962] transition-colors"
                >
                  Manage Contract Bonuses
                </button>
              </div>
            </header>

            {/* Grid Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contracts Overview Card */}
              <section className="card premium-card interactive-element">
                <h2 className="text-label mb-2">CONTRACT BONUSES</h2>
                <p className="text-sm text-[#C4A962] mb-3">
                  Configure contracts that boost weekly mining and award one-time/new-purchase bonuses.
                </p>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 mb-4">
                  <li>Add contract address and collection name</li>
                  <li>Set per-NFT Weekly Mining increase (MKIN)</li>
                  <li>Set Welcome Bonus (first-time or new-purchase)</li>
                  <li>Activate/Deactivate collections anytime</li>
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowContractsPanel(true)}
                    className="btn-primary text-sm"
                  >
                    Open Bonuses Manager
                  </button>
                </div>
              </section>

              {/* User Management Card */}
              <section className="card premium-card interactive-element">
                <h2 className="text-label mb-2">USER MANAGEMENT</h2>
                <p className="text-sm text-[#C4A962] mb-3">
                  Review user accounts, roles, and balances.
                </p>
                <div className="mt-4">
                  <UserManagementDashboard />
                </div>
              </section>
            </div>
          </div>

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
