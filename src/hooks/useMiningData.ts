import { useState, useEffect } from 'react';

export interface Booster {
    id: string;
    name: string;
    type: 'Realmkin' | 'Customized' | 'Miner';
    boostPercent: number;
    imageUrl: string; // Placeholder for now
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    amountMined: number;
}

export interface MiningData {
    stakingRate: number; // MKIN per second
    unclaimedRewards: number;
    totalStaked: number;
    weeklyMined: number;
    boosters: Booster[];
    leaderboard: LeaderboardEntry[];
}

export function useMiningData() {
    // Hardcoded base values
    const BASE_RATE = 0.00005; // MKIN/s
    const INITIAL_REWARDS = 1.2450;

    const [data, setData] = useState<MiningData>({
        stakingRate: BASE_RATE,
        unclaimedRewards: INITIAL_REWARDS,
        totalStaked: 10000,
        weeklyMined: 150.5,
        boosters: [
            {
                id: '1',
                name: 'Realmkin #1',
                type: 'Realmkin',
                boostPercent: 5,
                imageUrl: '/placeholder-booster.png'
            },
            {
                id: '2',
                name: 'Miner #4',
                type: 'Miner',
                boostPercent: 20,
                imageUrl: '/placeholder-booster.png'
            }
        ],
        leaderboard: [
            { rank: 1, username: 'UserA', amountMined: 5.2 },
            { rank: 2, username: 'UserB', amountMined: 4.8 },
            { rank: 3, username: 'UserC', amountMined: 4.1 },
        ]
    });

    // Effect to simulate live mining (incrementing rewards)
    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => ({
                ...prev,
                unclaimedRewards: prev.unclaimedRewards + (prev.stakingRate / 10) // Update every 100ms
            }));
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return data;
}
