import { useState, useEffect } from 'react';
import { PROJECTS, ProjectConfig } from '@/config/projects.config';

export interface Booster {
    id: string;
    name: string;
    type: 'Realmkin' | 'Customized' | 'Miner';
    boostPercent: number;
    imageUrl: string;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    amountMined: number; // In SOL
}

export interface MiningData {
    stakingRate: number; // SOL per second
    unclaimedRewards: number; // SOL
    totalStaked: number; // Project Token (e.g., MKIN)
    weeklyMined: number; // SOL
    boosters: Booster[];
    leaderboard: LeaderboardEntry[];
    project: ProjectConfig;
}

export function useMiningData(selectedProjectId: string = 'realmkin') {
    const project = PROJECTS.find(p => p.id === selectedProjectId) || PROJECTS[0];

    // Mock data state
    const [data, setData] = useState<MiningData>({
        stakingRate: project.staking.baseRate,
        unclaimedRewards: 0.0045, // Initial mock SOL
        totalStaked: 10000,
        weeklyMined: 1.5, // SOL
        boosters: [
            {
                id: '1',
                name: `${project.name} #1`,
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
            { rank: 1, username: 'UserA', amountMined: 0.52 },
            { rank: 2, username: 'UserB', amountMined: 0.48 },
            { rank: 3, username: 'UserC', amountMined: 0.41 },
        ],
        project
    });

    // Update data when project changes
    useEffect(() => {
        const newProject = PROJECTS.find(p => p.id === selectedProjectId) || PROJECTS[0];
        setData(prev => ({
            ...prev,
            project: newProject,
            stakingRate: newProject.staking.baseRate,
            // Reset or fetch new data for the project here
        }));
    }, [selectedProjectId]);

    // Effect to simulate live mining (incrementing SOL rewards)
    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => ({
                ...prev,
                unclaimedRewards: prev.unclaimedRewards + (prev.stakingRate * 10) // Fast forward for demo
            }));
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return data;
}
