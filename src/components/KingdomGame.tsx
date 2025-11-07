'use client';

import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config/gameConfig';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Kingdom, Empire, Resources } from '../types/kingdom';
import { useKingdom } from '../hooks/useKingdom';
import { useEmpire } from '../hooks/useEmpire';

export default function KingdomGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [showEmpireSelect, setShowEmpireSelect] = useState(false);
  
  // For testing: use a mock wallet address if no wallet is connected
  const testWallet = 'test-wallet-' + Math.random().toString(36).substring(7);
  const walletAddress = publicKey?.toString() || testWallet;
  
  const { kingdom, loading: kingdomLoading, updateResources } = useKingdom(walletAddress);
  const { empires, currentEmpire, pledgeToEmpire } = useEmpire(walletAddress);

  useEffect(() => {
    if (!gameRef.current || phaserGame.current) return;

    // Initialize Phaser game
    const config = {
      ...gameConfig,
      parent: gameRef.current,
      callbacks: {
        postBoot: (game: Phaser.Game) => {
          // Game is ready
          setIsLoading(false);
          
          // Set up resource update timer
          const uiScene = game.scene.getScene('UIScene');
          if (uiScene && kingdom) {
            uiScene.events.emit('updateResources', kingdom.resources);
            
            if (currentEmpire) {
              uiScene.events.emit('updateEmpire', {
                name: currentEmpire.name,
                boosts: currentEmpire.boosts
              });
            }
          }
        }
      }
    };

    phaserGame.current = new Phaser.Game(config);

    return () => {
      if (phaserGame.current) {
        phaserGame.current.destroy(true);
        phaserGame.current = null;
      }
    };
  }, []);

  // Update UI when kingdom data changes
  useEffect(() => {
    if (phaserGame.current && kingdom) {
      const uiScene = phaserGame.current.scene.getScene('UIScene');
      if (uiScene) {
        uiScene.events.emit('updateResources', kingdom.resources);
      }
    }
  }, [kingdom?.resources]);

  // Update UI when empire changes
  useEffect(() => {
    if (phaserGame.current && currentEmpire) {
      const uiScene = phaserGame.current.scene.getScene('UIScene');
      if (uiScene) {
        uiScene.events.emit('updateEmpire', {
          name: currentEmpire.name,
          boosts: currentEmpire.boosts
        });
      }
    }
  }, [currentEmpire]);

  const handleEmpireSelect = async (empireId: string) => {
    await pledgeToEmpire(empireId);
    setShowEmpireSelect(false);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Wallet Connection */}
      <div className="absolute top-4 right-4 z-50">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>

      {/* Empire Selection Button */}
      {
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setShowEmpireSelect(!showEmpireSelect)}
            className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg shadow-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
          >
            {currentEmpire ? `Empire: ${currentEmpire.name}` : 'Choose Empire'}
          </button>
        </div>
      }

      {/* Empire Selection Modal */}
      {showEmpireSelect && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Choose Your Empire</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empires.map((empire) => (
                <div
                  key={empire.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-all cursor-pointer border-2 border-transparent hover:border-yellow-500"
                  onClick={() => handleEmpireSelect(empire.id)}
                  style={{ borderColor: currentEmpire?.id === empire.id ? empire.color : '' }}
                >
                  <div className="flex items-center mb-3">
                    <img src={empire.logo} alt={empire.name} className="w-12 h-12 rounded-full mr-3" />
                    <h3 className="text-xl font-bold text-white">{empire.name}</h3>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p className="mb-2 font-semibold text-green-400">Boosts:</p>
                    {empire.boosts.gold > 1 && <p>💰 Gold: x{empire.boosts.gold}</p>}
                    {empire.boosts.wood > 1 && <p>🪵 Wood: x{empire.boosts.wood}</p>}
                    {empire.boosts.stone > 1 && <p>🪨 Stone: x{empire.boosts.stone}</p>}
                    {empire.boosts.food > 1 && <p>🌾 Food: x{empire.boosts.food}</p>}
                    {empire.boosts.buildSpeed > 1 && <p>🏗️ Build Speed: x{empire.boosts.buildSpeed}</p>}
                    {empire.boosts.raidDefense > 1 && <p>🛡️ Defense: x{empire.boosts.raidDefense}</p>}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    {empire.playerCount} players
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowEmpireSelect(false)}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/90 z-30 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-white text-xl">Loading Kingdom...</p>
          </div>
        </div>
      )}

      {/* Game Instructions - Show briefly then hide */}
      {false && (
        <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-white mb-4">Kingdom Builder</h1>
            <p className="text-gray-300 mb-6">
              Testing mode - no wallet required!
            </p>
            <div className="text-left text-gray-400 text-sm">
              <p className="mb-2">🎮 Controls:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Left click to select tiles</li>
                <li>Right click + drag to pan</li>
                <li>Mouse wheel to zoom</li>
                <li>WASD or Arrow keys to move camera</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Phaser Game Container */}
      <div 
        id="game-container" 
        ref={gameRef} 
        className="w-full h-full"
        style={{ cursor: isLoading ? 'wait' : 'default' }}
      />

      {/* Bottom Status Bar */}
      {kingdom && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm">Kingdom: <span className="font-bold">{kingdom.name}</span></span>
            <span className="text-sm">Level: <span className="font-bold">{kingdom.level}</span></span>
            <span className="text-sm">Power: <span className="font-bold">{kingdom.power}</span></span>
          </div>
          <div className="text-xs text-gray-400">
            Position: ({kingdom.position.x}, {kingdom.position.y})
          </div>
        </div>
      )}
    </div>
  );
}
