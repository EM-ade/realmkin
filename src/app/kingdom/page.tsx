'use client';

import dynamic from 'next/dynamic';

// Dynamically import the game component to avoid SSR issues with Phaser
const KingdomGame = dynamic(() => import('../../components/KingdomGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
        <p className="text-white text-xl">Initializing Kingdom...</p>
      </div>
    </div>
  )
});

export default function KingdomPage() {
  return <KingdomGame />;
}
