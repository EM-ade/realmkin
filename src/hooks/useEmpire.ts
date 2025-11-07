import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Empire } from '../types/kingdom';

// Default empires (these would be managed by admin)
const DEFAULT_EMPIRES: Empire[] = [
  {
    id: 'solana',
    name: 'Solana Empire',
    logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    color: '#00FFA3',
    boosts: {
      gold: 1.5,
      wood: 1.2,
      stone: 1.1,
      food: 1.3,
      buildSpeed: 1.3,
      raidDefense: 1.2
    },
    partner: 'Solana Foundation',
    active: true,
    fee: 2000,
    playerCount: 0,
    createdAt: Timestamp.now()
  },
  {
    id: 'ethereum',
    name: 'Ethereum Kingdom',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    color: '#627EEA',
    boosts: {
      gold: 1.3,
      wood: 1.4,
      stone: 1.5,
      food: 1.1,
      buildSpeed: 1.2,
      raidDefense: 1.4
    },
    partner: 'Ethereum Foundation',
    active: true,
    fee: 1500,
    playerCount: 0,
    createdAt: Timestamp.now()
  },
  {
    id: 'polygon',
    name: 'Polygon Realm',
    logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    color: '#8247E5',
    boosts: {
      gold: 1.4,
      wood: 1.3,
      stone: 1.2,
      food: 1.4,
      buildSpeed: 1.5,
      raidDefense: 1.1
    },
    partner: 'Polygon Labs',
    active: true,
    fee: 1000,
    playerCount: 0,
    createdAt: Timestamp.now()
  },
  {
    id: 'avalanche',
    name: 'Avalanche Fortress',
    logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
    color: '#E84142',
    boosts: {
      gold: 1.2,
      wood: 1.5,
      stone: 1.3,
      food: 1.2,
      buildSpeed: 1.1,
      raidDefense: 1.5
    },
    partner: 'Ava Labs',
    active: true,
    fee: 1200,
    playerCount: 0,
    createdAt: Timestamp.now()
  },
  {
    id: 'binance',
    name: 'Binance Dynasty',
    logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
    color: '#F3BA2F',
    boosts: {
      gold: 1.6,
      wood: 1.1,
      stone: 1.1,
      food: 1.1,
      buildSpeed: 1.2,
      raidDefense: 1.3
    },
    partner: 'Binance',
    active: true,
    fee: 1800,
    playerCount: 0,
    createdAt: Timestamp.now()
  }
];

export function useEmpire(walletAddress: string | undefined) {
  const [empires, setEmpires] = useState<Empire[]>(DEFAULT_EMPIRES);
  const [currentEmpire, setCurrentEmpire] = useState<Empire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load empires from Firestore
  useEffect(() => {
    const loadEmpires = async () => {
      try {
        const empiresRef = collection(db, 'empires');
        const snapshot = await getDocs(empiresRef);
        
        if (snapshot.empty) {
          // Initialize with default empires if none exist
          for (const empire of DEFAULT_EMPIRES) {
            await setDoc(doc(db, 'empires', empire.id), empire);
          }
          setEmpires(DEFAULT_EMPIRES);
        } else {
          const loadedEmpires = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as Empire[];
          setEmpires(loadedEmpires);
        }
      } catch (err) {
        console.error('Error loading empires:', err);
        // Use default empires as fallback
        setEmpires(DEFAULT_EMPIRES);
      }
      setLoading(false);
    };

    loadEmpires();
  }, []);

  // Load player's current empire
  useEffect(() => {
    const address = walletAddress || 'test-wallet';
    if (!address) {
      setCurrentEmpire(null);
      return;
    }

    const kingdomRef = doc(db, 'kingdoms', address);
    
    const unsubscribe = onSnapshot(
      kingdomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.empireId) {
            const empire = empires.find(e => e.id === data.empireId);
            setCurrentEmpire(empire || null);
          } else {
            setCurrentEmpire(null);
          }
        }
      },
      (err) => {
        console.error('Error fetching kingdom empire:', err);
        setError('Failed to load empire');
      }
    );

    return () => unsubscribe();
  }, [walletAddress, empires]);

  const pledgeToEmpire = async (empireId: string) => {
    const address = walletAddress || 'test-wallet';
    if (!address) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', address);
      const empireRef = doc(db, 'empires', empireId);
      
      // Update kingdom's empire
      await updateDoc(kingdomRef, {
        empireId,
        lastUpdated: serverTimestamp()
      });

      // Increment empire player count
      await updateDoc(empireRef, {
        playerCount: increment(1)
      });

      // If switching empires, decrement old empire's count
      if (currentEmpire && currentEmpire.id !== empireId) {
        const oldEmpireRef = doc(db, 'empires', currentEmpire.id);
        await updateDoc(oldEmpireRef, {
          playerCount: increment(-1)
        });
      }

      // Update local state
      const newEmpire = empires.find(e => e.id === empireId);
      if (newEmpire) {
        setCurrentEmpire(newEmpire);
      }
    } catch (err) {
      console.error('Error pledging to empire:', err);
      setError('Failed to pledge to empire');
    }
  };

  const leaveEmpire = async () => {
    const address = walletAddress || 'test-wallet';
    if (!address || !currentEmpire) return;

    try {
      const kingdomRef = doc(db, 'kingdoms', address);
      const empireRef = doc(db, 'empires', currentEmpire.id);
      
      // Remove empire from kingdom
      await updateDoc(kingdomRef, {
        empireId: null,
        lastUpdated: serverTimestamp()
      });

      // Decrement empire player count
      await updateDoc(empireRef, {
        playerCount: increment(-1)
      });

      setCurrentEmpire(null);
    } catch (err) {
      console.error('Error leaving empire:', err);
      setError('Failed to leave empire');
    }
  };

  const getEmpireBoosts = () => {
    if (!currentEmpire) {
      return {
        gold: 1,
        wood: 1,
        stone: 1,
        food: 1,
        buildSpeed: 1,
        raidDefense: 1
      };
    }
    return currentEmpire.boosts;
  };

  return {
    empires,
    currentEmpire,
    loading,
    error,
    pledgeToEmpire,
    leaveEmpire,
    getEmpireBoosts
  };
}
