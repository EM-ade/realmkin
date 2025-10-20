"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

export default function DebugEnvPage() {
  const { user, userData } = useAuth();
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Collect all NEXT_PUBLIC_ env vars
    const vars: Record<string, string> = {};
    
    // Check specific env vars
    vars.NEXT_PUBLIC_ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS || 'UNDEFINED';
    vars.NODE_ENV = process.env.NODE_ENV || 'UNDEFINED';
    vars.NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'UNDEFINED';
    
    setEnvVars(vars);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-[#DA9C2F]">Environment Debug Page</h1>
        
        <div className="bg-[#1a1a1a] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-[#DA9C2F]">User Data</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>User ID:</strong> {user?.uid || 'Not logged in'}</div>
            <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
            <div><strong>Username:</strong> {userData?.username || 'N/A'}</div>
            <div><strong>Wallet Address:</strong> {userData?.walletAddress || 'N/A'}</div>
            <div><strong>Is Admin:</strong> {userData?.admin ? 'YES' : 'NO'}</div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-[#DA9C2F]">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            {Object.entries(envVars).map(([key, value]) => (
              <div key={key}>
                <strong>{key}:</strong> {value}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-[#DA9C2F]">Admin Check Logic</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>Admin Wallets (from env):</strong>
              <pre className="mt-2 p-2 bg-black rounded">
                {process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()).join('\n') || 'NONE'}
              </pre>
            </div>
            <div>
              <strong>User Wallet (lowercase):</strong>
              <pre className="mt-2 p-2 bg-black rounded">
                {userData?.walletAddress?.toLowerCase() || 'NONE'}
              </pre>
            </div>
            <div>
              <strong>Match Result:</strong> {
                userData?.walletAddress && process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim().toLowerCase()).includes(userData.walletAddress.toLowerCase())
                  ? '✅ MATCH'
                  : '❌ NO MATCH'
              }
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-400">
          <p>Check the browser console for detailed logs from AuthContext.</p>
        </div>
      </div>
    </div>
  );
}
