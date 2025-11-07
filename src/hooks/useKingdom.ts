import { useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Kingdom, Resources, Building } from '../types/kingdom';

export function useKingdom(walletAddress: string | undefined) {
  const [kingdom, setKingdom] = useState<Kingdom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always use a wallet address (either real or test)
    const address = walletAddress || 'test-wallet';
    if (!address) {
      setKingdom(null);
      setLoading(false);
      return;
    }

    const kingdomRef = doc(db, 'kingdoms', address);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      kingdomRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          setKingdom(snapshot.data() as Kingdom);
        } else {
          // Create new kingdom for new player
          const newKingdom: Kingdom = {
            id: address,
            name: `Kingdom of ${address.slice(0, 4)}...${address.slice(-4)}`,
            position: {
              x: Math.floor(Math.random() * 100),
              y: Math.floor(Math.random() * 100)
            },
            resources: {
              gold: 1000,
              wood: 500,
              stone: 500,
              food: 500
            },
            buildings: [],
            level: 1,
            power: 100,
            lastUpdated: Timestamp.now()
          };

          try {
            await setDoc(kingdomRef, newKingdom);
            setKingdom(newKingdom);
          } catch (err) {
            console.error('Error creating kingdom:', err);
            setError('Failed to create kingdom');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching kingdom:', err);
        setError('Failed to load kingdom');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [walletAddress]);

  const updateResources = async (resources: Partial<Resources>) => {
    if (!walletAddress || !kingdom) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', walletAddress);
      const newResources = {
        gold: resources.gold ?? kingdom.resources.gold,
        wood: resources.wood ?? kingdom.resources.wood,
        stone: resources.stone ?? kingdom.resources.stone,
        food: resources.food ?? kingdom.resources.food
      };

      await updateDoc(kingdomRef, {
        resources: newResources,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating resources:', err);
      setError('Failed to update resources');
    }
  };

  const addBuilding = async (building: Building) => {
    if (!walletAddress || !kingdom) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', walletAddress);
      const updatedBuildings = [...kingdom.buildings, building];

      await updateDoc(kingdomRef, {
        buildings: updatedBuildings,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error adding building:', err);
      setError('Failed to add building');
    }
  };

  const removeBuilding = async (buildingId: string) => {
    if (!walletAddress || !kingdom) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', walletAddress);
      const updatedBuildings = kingdom.buildings.filter(b => b.id !== buildingId);

      await updateDoc(kingdomRef, {
        buildings: updatedBuildings,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error removing building:', err);
      setError('Failed to remove building');
    }
  };

  const upgradeBuilding = async (buildingId: string) => {
    if (!walletAddress || !kingdom) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', walletAddress);
      const updatedBuildings = kingdom.buildings.map(b => 
        b.id === buildingId 
          ? { ...b, level: b.level + 1 }
          : b
      );

      await updateDoc(kingdomRef, {
        buildings: updatedBuildings,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error upgrading building:', err);
      setError('Failed to upgrade building');
    }
  };

  const updateKingdomName = async (name: string) => {
    if (!walletAddress) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', walletAddress);
      await updateDoc(kingdomRef, {
        name,
        lastUpdated: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating kingdom name:', err);
      setError('Failed to update kingdom name');
    }
  };

  return {
    kingdom,
    loading,
    error,
    updateResources,
    addBuilding,
    removeBuilding,
    upgradeBuilding,
    updateKingdomName
  };
}
