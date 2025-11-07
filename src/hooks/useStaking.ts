import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Your game token mint address (replace with actual)
const COIN_TOKEN_MINT = new PublicKey('11111111111111111111111111111111'); // Replace with actual token mint
const STAKING_VAULT = new PublicKey('11111111111111111111111111111111'); // Replace with actual vault

interface StakingData {
  stakedAmount: number;
  lastRewardClaim: number;
  totalRewards: number;
  apy: number;
}

export function useStaking(walletAddress: string | undefined) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [stakingData, setStakingData] = useState<StakingData>({
    stakedAmount: 0,
    lastRewardClaim: Date.now(),
    totalRewards: 0,
    apy: 120 // 120% APY
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load staking data from Firestore
  useEffect(() => {
    if (!walletAddress) return;

    const stakingRef = doc(db, 'staking', walletAddress);
    
    const unsubscribe = onSnapshot(
      stakingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setStakingData({
            stakedAmount: data.stakedAmount || 0,
            lastRewardClaim: data.lastRewardClaim?.toMillis() || Date.now(),
            totalRewards: data.totalRewards || 0,
            apy: data.apy || 120
          });
        }
      },
      (err) => {
        console.error('Error fetching staking data:', err);
        setError('Failed to load staking data');
      }
    );

    return () => unsubscribe();
  }, [walletAddress]);

  const stake = async (amount: number) => {
    if (!publicKey || !walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        COIN_TOKEN_MINT,
        publicKey
      );

      const vaultTokenAccount = await getAssociatedTokenAddress(
        COIN_TOKEN_MINT,
        STAKING_VAULT
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        userTokenAccount,
        vaultTokenAccount,
        publicKey,
        amount * 1e9, // Convert to token decimals (assuming 9)
        [],
        TOKEN_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Update Firestore
      const stakingRef = doc(db, 'staking', walletAddress);
      await updateDoc(stakingRef, {
        stakedAmount: stakingData.stakedAmount + amount,
        lastUpdated: serverTimestamp()
      });

      setStakingData(prev => ({
        ...prev,
        stakedAmount: prev.stakedAmount + amount
      }));

    } catch (err) {
      console.error('Error staking:', err);
      setError('Failed to stake tokens');
    } finally {
      setLoading(false);
    }
  };

  const unstake = async (amount: number) => {
    if (!publicKey || !walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would interact with a smart contract
      // For now, we'll simulate it with Firestore
      
      if (amount > stakingData.stakedAmount) {
        throw new Error('Insufficient staked amount');
      }

      // Update Firestore
      const stakingRef = doc(db, 'staking', walletAddress);
      await updateDoc(stakingRef, {
        stakedAmount: stakingData.stakedAmount - amount,
        lastUpdated: serverTimestamp()
      });

      setStakingData(prev => ({
        ...prev,
        stakedAmount: prev.stakedAmount - amount
      }));

    } catch (err) {
      console.error('Error unstaking:', err);
      setError('Failed to unstake tokens');
    } finally {
      setLoading(false);
    }
  };

  const claimRewards = async () => {
    if (!publicKey || !walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate rewards
      const now = Date.now();
      const timeSinceLastClaim = (now - stakingData.lastRewardClaim) / 1000 / 60 / 60 / 24; // Days
      const yearlyReward = stakingData.stakedAmount * (stakingData.apy / 100);
      const dailyReward = yearlyReward / 365;
      const rewards = dailyReward * timeSinceLastClaim;

      if (rewards <= 0) {
        setError('No rewards to claim');
        return;
      }

      // Update Firestore
      const stakingRef = doc(db, 'staking', walletAddress);
      await updateDoc(stakingRef, {
        lastRewardClaim: serverTimestamp(),
        totalRewards: stakingData.totalRewards + rewards,
        lastUpdated: serverTimestamp()
      });

      setStakingData(prev => ({
        ...prev,
        lastRewardClaim: now,
        totalRewards: prev.totalRewards + rewards
      }));

      // In a real implementation, this would mint/transfer tokens to the user

    } catch (err) {
      console.error('Error claiming rewards:', err);
      setError('Failed to claim rewards');
    } finally {
      setLoading(false);
    }
  };

  const calculatePendingRewards = () => {
    const now = Date.now();
    const timeSinceLastClaim = (now - stakingData.lastRewardClaim) / 1000 / 60 / 60 / 24; // Days
    const yearlyReward = stakingData.stakedAmount * (stakingData.apy / 100);
    const dailyReward = yearlyReward / 365;
    return dailyReward * timeSinceLastClaim;
  };

  return {
    stakingData,
    loading,
    error,
    stake,
    unstake,
    claimRewards,
    pendingRewards: calculatePendingRewards()
  };
}
