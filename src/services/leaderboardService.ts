import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { firebaseCache, createCacheKey } from "@/lib/firebaseCache";
import { GameType, LeaderboardEntry } from "@/types/leaderboard";

// Types for Firestore documents
interface LeaderboardMetadata {
  monthId: string;
  startDate: string;
  endDate: string;
  lastReset: Timestamp | FieldValue | null;
}

interface TotalScoreEntry {
  userId: string;
  username: string;
  totalScore: number;
  gamesPlayed: number;
  lastUpdated: Timestamp | FieldValue | null;
  breakdown: Record<string, number>; // Leaderboard points per game
  rawScores?: Record<string, number>; // Raw game scores (for display)
}

interface StreakEntry {
  userId: string;
  username: string;
  currentStreak: number;
  lastPlayed: string; // YYYY-MM-DD format
  longestStreak: number;
}

interface UserStats {
  totalGamesPlayed: number;
  lifetimeScore: number;
  bestMonthScore: number;
  currentMonthScore: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayed: string;
  gameBreakdown: Record<GameType, {
    played: number;
    avgScore: number;
    bestScore: number;
  }>;
}

interface MonthlyArchive {
  monthId: string;
  archivedAt: Timestamp | FieldValue | null;
  topScores: Array<{
    rank: number;
    userId: string;
    username: string;
    totalScore: number;
    gamesPlayed: number;
  }>;
  topStreaks: Array<{
    rank: number;
    userId: string;
    username: string;
    currentStreak: number;
    longestStreak: number;
  }>;
}

class LeaderboardService {
  private readonly COLLECTIONS = {
    METADATA: "leaderboards/current/metadata",
    TOTAL_SCORE: "leaderboards/current/totalScore",
    STREAK: "leaderboards/current/streak",
    ARCHIVE: "monthlyArchive",
    USER_STATS: "userStats",
  } as const;

  // Get current month ID (YYYY-MM format)
  private getCurrentMonthId(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  // Get UTC date string (YYYY-MM-DD format)
  private getUTCDateString(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
  }

  // Check if monthly reset is needed and perform it
  async checkAndPerformMonthlyReset(): Promise<void> {
    const currentMonthId = this.getCurrentMonthId();
    const metadataRef = doc(db, this.COLLECTIONS.METADATA, "info");
    
    try {
      const metadataDoc = await getDoc(metadataRef);
      
      if (!metadataDoc.exists()) {
        // First time setup
        await this.initializeLeaderboard(currentMonthId);
        return;
      }

      const metadata = metadataDoc.data() as LeaderboardMetadata;
      
      if (metadata.monthId !== currentMonthId) {
        // New month detected, perform reset
        await this.performMonthlyReset(metadata.monthId, currentMonthId);
      }
    } catch (error) {
      console.error("Error checking monthly reset:", error);
      throw error;
    }
  }

  // Initialize leaderboard for the first time
  private async initializeLeaderboard(monthId: string): Promise<void> {
    const metadataRef = doc(db, this.COLLECTIONS.METADATA, "info");
    const startDate = new Date(parseInt(monthId.split("-")[0]), parseInt(monthId.split("-")[1]) - 1, 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    await setDoc(metadataRef, {
      monthId,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      lastReset: serverTimestamp(),
    });
  }

  // Perform monthly reset and archive winners
  private async performMonthlyReset(lastMonthId: string, newMonthId: string): Promise<void> {
    const batch = writeBatch(db);

    try {
      // Get top 10 scores and streaks for archiving
      const [topScores, topStreaks] = await Promise.all([
        this.getTopEntries("totalScore", 10),
        this.getTopEntries("streak", 10),
      ]);

      // Archive the winners
      const archiveRef = doc(db, this.COLLECTIONS.ARCHIVE, lastMonthId);
      const archiveData: MonthlyArchive = {
        monthId: lastMonthId,
        archivedAt: serverTimestamp(),
        topScores: topScores.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          username: entry.username,
          totalScore: entry.value,
          gamesPlayed: entry.gamesPlayed || 0,
        })),
        topStreaks: topStreaks.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          username: entry.username,
          currentStreak: entry.value,
          longestStreak: 0, // Would need to track this separately
        })),
      };

      batch.set(archiveRef, archiveData);

      // Update metadata for new month
      const metadataRef = doc(db, this.COLLECTIONS.METADATA, "info");
      const startDate = new Date(parseInt(newMonthId.split("-")[0]), parseInt(newMonthId.split("-")[1]) - 1, 1);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      batch.update(metadataRef, {
        monthId: newMonthId,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        lastReset: serverTimestamp(),
      });

      await batch.commit();
      console.log(`Monthly reset completed: ${lastMonthId} → ${newMonthId}`);
    } catch (error) {
      console.error("Error performing monthly reset:", error);
      throw error;
    }
  }

  // Submit a score for a user (works with Firebase Auth or wallet-based users)
  // Only updates if the new score is higher than the existing score for that game
  async submitScore(
    userId: string,
    username: string,
    points: number,
    gameType: GameType,
    rawScore?: number // Optional: raw game score for display purposes
  ): Promise<void> {
    await this.checkAndPerformMonthlyReset();

    const scoreRef = doc(db, this.COLLECTIONS.TOTAL_SCORE, userId);
    
    try {
      const scoreDoc = await getDoc(scoreRef);
      
      if (scoreDoc.exists()) {
        // Check if this is a new high score for this game
        const currentData = scoreDoc.data() as TotalScoreEntry;
        const currentGameScore = currentData.breakdown[gameType] || 0;
        
        // Only update if new score is higher
        if (points > currentGameScore) {
          const scoreDifference = points - currentGameScore;
          const newBreakdown = { ...currentData.breakdown };
          newBreakdown[gameType] = points; // Replace with new high score
          
          const newRawScores = { ...(currentData.rawScores || {}) };
          if (rawScore !== undefined) {
            newRawScores[gameType] = rawScore; // Store raw game score
          }

          await updateDoc(scoreRef, {
            totalScore: currentData.totalScore + scoreDifference, // Add only the difference
            gamesPlayed: currentData.gamesPlayed + 1,
            lastUpdated: serverTimestamp(),
            breakdown: newBreakdown,
            rawScores: newRawScores,
          });
          
          console.log(`New high score for ${gameType}! ${currentGameScore} → ${points} (+${scoreDifference})`);
        } else {
          // Just increment games played, no score change
          await updateDoc(scoreRef, {
            gamesPlayed: currentData.gamesPlayed + 1,
            lastUpdated: serverTimestamp(),
          });
          
          console.log(`Score ${points} did not beat high score of ${currentGameScore} for ${gameType}`);
        }
      } else {
        // Create new score entry (first time playing)
        const newEntry: TotalScoreEntry = {
          userId,
          username,
          totalScore: points,
          gamesPlayed: 1,
          lastUpdated: serverTimestamp(),
          breakdown: { [gameType]: points },
          rawScores: rawScore !== undefined ? { [gameType]: rawScore } : {},
        };
        
        await setDoc(scoreRef, newEntry);
        console.log(`First score recorded for ${gameType}: ${points}`);
      }

      // Update user stats
      await this.updateUserStats(userId, points, gameType);
    } catch (error) {
      console.error("Error submitting score:", error);
      throw error;
    }
  }

  // Get user's score data
  async getUserScore(userId: string): Promise<TotalScoreEntry | null> {
    try {
      const scoreRef = doc(db, this.COLLECTIONS.TOTAL_SCORE, userId);
      const scoreDoc = await getDoc(scoreRef);
      
      if (scoreDoc.exists()) {
        return scoreDoc.data() as TotalScoreEntry;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user score:", error);
      return null;
    }
  }

  // Update user streak
  async updateStreak(userId: string, username: string): Promise<void> {
    await this.checkAndPerformMonthlyReset();

    const streakRef = doc(db, this.COLLECTIONS.STREAK, userId);
    const today = this.getUTCDateString();
    
    try {
      const streakDoc = await getDoc(streakRef);
      
      if (streakDoc.exists()) {
        const currentData = streakDoc.data() as StreakEntry;
        const lastPlayedDate = new Date(currentData.lastPlayed);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));

        let newStreak = currentData.currentStreak;
        
        if (daysDiff === 0) {
          // Same day, no change to streak
          return;
        } else if (daysDiff === 1) {
          // Next day, increment streak
          newStreak = currentData.currentStreak + 1;
        } else {
          // Missed day(s), reset streak
          newStreak = 1;
        }

        await updateDoc(streakRef, {
          currentStreak: newStreak,
          lastPlayed: today,
          longestStreak: Math.max(currentData.longestStreak, newStreak),
        });
      } else {
        // Create new streak entry
        const newEntry: StreakEntry = {
          userId,
          username,
          currentStreak: 1,
          lastPlayed: today,
          longestStreak: 1,
        };
        
        await setDoc(streakRef, newEntry);
      }
    } catch (error) {
      console.error("Error updating streak:", error);
      throw error;
    }
  }

  // Get leaderboard entries (with caching to reduce Firebase reads)
  async getLeaderboard(
    type: "totalScore" | "streak",
    limitCount: number = 100
  ): Promise<LeaderboardEntry[]> {
    const collectionName = type === "totalScore"
      ? this.COLLECTIONS.TOTAL_SCORE
      : this.COLLECTIONS.STREAK;

    const orderField = type === "totalScore" ? "totalScore" : "currentStreak";
    const cacheKey = createCacheKey(`leaderboard-${type}-${limitCount}`);

    // Try cache first
    const cached = firebaseCache.get<LeaderboardEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderField, "desc"),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);

      const entries = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          userId: data.userId,
          username: data.username,
          rank: index + 1,
          value: data[orderField],
          gamesPlayed: type === "totalScore" ? data.gamesPlayed : undefined,
          breakdown: type === "totalScore" ? data.breakdown : undefined,
          lastUpdated: data.lastUpdated?.toMillis() || data.lastPlayed,
        };
      });

      // Cache for 30 seconds
      firebaseCache.set(cacheKey, entries, 30000);

      return entries;
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      throw error;
    }
  }

  // Get top N entries (for archiving)
  private async getTopEntries(
    type: "totalScore" | "streak",
    count: number
  ): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard(type, count);
  }

// DEPRECATED: Real-time subscriptions removed to reduce Firebase reads
  // Use getLeaderboard() with client-side polling instead
  // subscribeToLeaderboard(
  //   type: "totalScore" | "streak",
  //   limitCount: number = 100,
  //   callback: (entries: LeaderboardEntry[]) => void
  // ): Unsubscribe {
  //   const collectionName = type === "totalScore"
  //     ? this.COLLECTIONS.TOTAL_SCORE
  //     : this.COLLECTIONS.STREAK;

  //   const orderField = type === "totalScore" ? "totalScore" : "currentStreak";

  //   const q = query(
  //     collection(db, collectionName),
  //     orderBy(orderField, "desc"),
  //     limit(limitCount)
  //   );

  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
  //       const data = doc.data();

  //       if (type === "totalScore") {
  //         const scoreData = data as TotalScoreEntry;
  //         return {
  //           userId: scoreData.userId,
  //           username: scoreData.username,
  //           rank: index + 1,
  //           value: scoreData.totalScore,
  //           gamesPlayed: scoreData.gamesPlayed,
  //           breakdown: scoreData.breakdown,
  //         };
  //       } else {
  //         const streakData = data as StreakEntry;
  //         return {
  //           userId: streakData.userId,
  //           username: streakData.username,
  //           rank: index + 1,
  //           value: streakData.currentStreak,
  //           valueLabel: `${streakData.currentStreak} days`,
  //         };
  //       }
  //     });

  //     callback(entries);
  //   });

  //   return unsubscribe;
  // }

  // Placeholder to avoid breaking changes - returns undefined
  subscribeToLeaderboard = () => {
    console.warn("subscribeToLeaderboard is deprecated. Use getLeaderboard() with polling instead.");
    return undefined as any;
  }

  // Get user's rank in leaderboard
  async getUserRank(userId: string, type: "totalScore" | "streak"): Promise<number | null> {
    const entries = await this.getLeaderboard(type, 1000); // Get more entries to find user
    const userEntry = entries.find(entry => entry.userId === userId);
    return userEntry?.rank || null;
  }

  // Get archived monthly winners
  async getMonthlyArchive(monthId: string): Promise<MonthlyArchive | null> {
    try {
      const archiveRef = doc(db, this.COLLECTIONS.ARCHIVE, monthId);
      const archiveDoc = await getDoc(archiveRef);
      
      if (archiveDoc.exists()) {
        return archiveDoc.data() as MonthlyArchive;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting monthly archive:", error);
      throw error;
    }
  }

  // Update user statistics
  private async updateUserStats(
    userId: string,
    points: number,
    gameType: GameType
  ): Promise<void> {
    const statsRef = doc(db, this.COLLECTIONS.USER_STATS, userId);
    
    try {
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as UserStats;
        const gameStats = currentStats.gameBreakdown[gameType] || {
          played: 0,
          avgScore: 0,
          bestScore: 0,
        };

        const newGameStats = {
          played: gameStats.played + 1,
          avgScore: Math.round((gameStats.avgScore * gameStats.played + points) / (gameStats.played + 1)),
          bestScore: Math.max(gameStats.bestScore, points),
        };

        await updateDoc(statsRef, {
          totalGamesPlayed: currentStats.totalGamesPlayed + 1,
          lifetimeScore: currentStats.lifetimeScore + points,
          currentMonthScore: currentStats.currentMonthScore + points,
          bestMonthScore: Math.max(currentStats.bestMonthScore, currentStats.currentMonthScore + points),
          lastPlayed: this.getUTCDateString(),
          [`gameBreakdown.${gameType}`]: newGameStats,
        });
      } else {
        // Create new stats
        const newStats: UserStats = {
          totalGamesPlayed: 1,
          lifetimeScore: points,
          bestMonthScore: points,
          currentMonthScore: points,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayed: this.getUTCDateString(),
          gameBreakdown: {
            [gameType]: {
              played: 1,
              avgScore: points,
              bestScore: points,
            },
          } as Record<GameType, { played: number; avgScore: number; bestScore: number }>,
        };
        
        await setDoc(statsRef, newStats);
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
      throw error;
    }
  }

  // Get leaderboard metadata
  async getMetadata(): Promise<LeaderboardMetadata | null> {
    try {
      const metadataRef = doc(db, this.COLLECTIONS.METADATA, "info");
      const metadataDoc = await getDoc(metadataRef);
      
      if (metadataDoc.exists()) {
        return metadataDoc.data() as LeaderboardMetadata;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting metadata:", error);
      throw error;
    }
  }
}

export const leaderboardService = new LeaderboardService();

// Mining/Staking Leaderboard Functions
export async function fetchMiningLeaderboard(
  type: "rewards" | "staked" = "rewards", 
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    const gatekeeperUrl = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";
    const response = await fetch(`${gatekeeperUrl}/api/leaderboard/mining?type=${type}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch mining leaderboard: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.leaderboard) {
      throw new Error("Invalid leaderboard response");
    }
    
    return data.leaderboard.map((entry: any): LeaderboardEntry => ({
      userId: entry.userId,
      username: entry.username,
      rank: entry.rank,
      value: entry.value,
      valueLabel: entry.valueLabel,
      avatarUrl: entry.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${entry.username}`,
      gamesPlayed: undefined, // Not applicable for mining
      breakdown: entry.breakdown,
      lastUpdated: Date.now()
    }));
    
  } catch (error) {
    console.error("Failed to fetch mining leaderboard:", error);
    // Return empty array on error
    return [];
  }
}

// Fetch top 3 miners specifically
export async function fetchTop3Miners(type: "rewards" | "staked" = "rewards"): Promise<LeaderboardEntry[]> {
  try {
    const gatekeeperUrl = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";
    const response = await fetch(`${gatekeeperUrl}/api/leaderboard/mining/top3?type=${type}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top 3 miners: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.top3) {
      throw new Error("Invalid top 3 response");
    }
    
    return data.top3.map((entry: any): LeaderboardEntry => ({
      userId: entry.userId,
      username: entry.username,
      rank: entry.rank,
      value: entry.value,
      valueLabel: entry.valueLabel,
      avatarUrl: entry.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${entry.username}`,
      gamesPlayed: undefined,
      breakdown: entry.breakdown,
      lastUpdated: Date.now()
    }));
    
  } catch (error) {
    console.error("Failed to fetch top 3 miners:", error);
    // Return empty array on error
    return [];
  }
}

export async function fetchTop10Miners(type: "rewards" | "staked" = "rewards"): Promise<LeaderboardEntry[]> {
  try {
    const gatekeeperUrl = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bmvu.onrender.com";
    const response = await fetch(`${gatekeeperUrl}/api/leaderboard/mining/top10?type=${type}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch top 10 miners: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.top10) {
      throw new Error("Invalid top 10 response");
    }
    
    return data.top10.map((entry: any): LeaderboardEntry => ({
      userId: entry.userId,
      username: entry.username,
      rank: entry.rank,
      value: entry.value,
      valueLabel: entry.valueLabel,
      avatarUrl: entry.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${entry.username}`,
      gamesPlayed: undefined,
      breakdown: entry.breakdown,
      lastUpdated: Date.now()
    }));
    
  } catch (error) {
    console.error("Failed to fetch top 10 miners:", error);
    // Return empty array on error
    return [];
  }
}

/**
 * Fetch top secondary market buyers (users with most NFTs from secondary market)
 * Data is cached for 6 hours to reduce Firebase reads
 */
export async function fetchTopSecondaryMarketBuyers(limit: number = 3): Promise<
 Array<{
 rank: number;
 username: string;
 nftCount: number;
 avatarUrl?: string;
 }>
 > {
 const baseUrl =
 process.env.NEXT_PUBLIC_GATEKEEPER_BASE ||
 "https://gatekeeper-bmvu.onrender.com";

 try {
 const response = await fetch(
 `${baseUrl}/api/leaderboard/secondary-market?limit=${limit}`
 );

 if (!response.ok) {
 console.error("[Leaderboard] Failed to fetch secondary market leaderboard:", response.statusText);
 return [];
 }

 const data = await response.json();

 if (!data.leaderboard || !Array.isArray(data.leaderboard)) {
 console.error("[Leaderboard] Invalid leaderboard data:", data);
 return [];
 }

 console.log(`[Leaderboard] Successfully fetched ${data.leaderboard.length} entries (cached, 6h TTL)`);
 return data.leaderboard;
 } catch (error) {
 console.error("[Leaderboard] Error fetching secondary market leaderboard:", error);
 return [];
 }
 }

/**
 * Interface for secondary sale cache data
 */
interface SecondarySaleCacheData {
  walletAddress?: string;
  salesCount?: number;
  hasSecondarySale?: boolean;
  lastCheckedAt?: any;
  lastPurchaseTime?: any;
}

/**
 * Fetch secondary market leaderboard directly from Firestore
 * Returns users who have purchased from the secondary market, sorted by total purchases
 *
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of leaderboard entries with user info and purchase counts
 *
 * @example
 * ```typescript
 * const leaderboard = await fetchSecondaryMarketLeaderboard(50);
 * // Returns: [
 * //   { rank: 1, username: "JohnDoe", walletAddress: "8w1d...", totalPurchased: 15, avatarUrl?: string },
 * //   ...
 * // ]
 * ```
 */
export async function fetchSecondaryMarketLeaderboard(
  limit: number = 50
): Promise<
  Array<{
    rank: number;
    username: string;
    walletAddress: string;
    totalPurchased: number;
    avatarUrl?: string;
  }>
> {
  // Add caching to prevent excessive reads (5-minute cache)
  const cacheKey = createCacheKey(`secondary-market-${limit}`);
  const cached = firebaseCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Step 1: Query all secondarySaleCache entries
    const cacheSnapshot = await getDocs(collection(db, "secondarySaleCache"));

    if (cacheSnapshot.empty) {
      console.log("[Secondary Market Leaderboard] No cache data available");
      return [];
    }

    // Step 2: Filter for users with sales and sort by salesCount descending
    const sortedBuyers = cacheSnapshot.docs
      .map((doc) => {
        const data = doc.data() as SecondarySaleCacheData;
        return {
          id: doc.id,
          walletAddress: data.walletAddress || doc.id,
          salesCount: data.salesCount || 0,
        };
      })
      .filter((buyer) => buyer.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, limit);

    if (sortedBuyers.length === 0) {
      console.log("[Secondary Market Leaderboard] No users with secondary market purchases");
      return [];
    }

    console.log(
      `[Secondary Market Leaderboard] Found ${sortedBuyers.length} buyers, fetching user data...`
    );

    // Step 3: Batch lookup user IDs from wallets collection (primary source)
    const walletAddresses = sortedBuyers.map((buyer) => buyer.walletAddress.toLowerCase());
    const walletLookup = new Map<
      string,
      { userId: string; username?: string; source: string }
    >();

    // Fetch wallets in batches (Firestore limit: 500 per batch)
    const BATCH_SIZE = 500;
    for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
      const batch = walletAddresses.slice(i, i + BATCH_SIZE);
      const walletDocs = await Promise.all(
        batch.map((addr) =>
          getDoc(doc(db, "wallets", addr))
        )
      );

      walletDocs.forEach((doc, idx) => {
        if (doc.exists()) {
          const data = doc.data();
          const originalAddress = batch[idx];
          walletLookup.set(originalAddress, {
            userId: data.uid || data.userId,
            username: data.username,
            source: "wallets",
          });
        }
      });
    }

    console.log(
      `[Secondary Market Leaderboard] Found ${walletLookup.size} users in wallets collection`
    );

    // Step 4: For wallets not found, check userRewards (fallback)
    const notFoundWallets = walletAddresses.filter(
      (addr) => !walletLookup.has(addr)
    );

    if (notFoundWallets.length > 0) {
      console.log(
        `[Secondary Market Leaderboard] Checking userRewards for ${notFoundWallets.length} remaining wallets...`
      );

      // Query userRewards for all missing wallets
      const userRewardsSnapshot = await getDocs(
        collection(db, "userRewards")
      );

      userRewardsSnapshot.forEach((doc) => {
        const data = doc.data();
        const walletAddr = data.walletAddress?.toLowerCase();
        if (walletAddr && notFoundWallets.includes(walletAddr)) {
          walletLookup.set(walletAddr, {
            userId: doc.id,
            source: "userRewards",
          });
        }
      });

      console.log(
        `[Secondary Market Leaderboard] Found ${walletLookup.size} total users after userRewards check`
      );
    }

    // Step 5: Batch get user profiles for all found userIds
    const userIds = Array.from(
      new Set(
        Array.from(walletLookup.values())
          .map((data) => data.userId)
          .filter((id) => id)
      )
    );

    console.log(
      `[Secondary Market Leaderboard] Fetching ${userIds.length} user profiles...`
    );

    const userProfiles = new Map<
      string,
      { username: string; avatarUrl?: string }
    >();

    if (userIds.length > 0) {
      // Batch get user documents
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchIds = userIds.slice(i, i + BATCH_SIZE);
        const userDocs = await Promise.all(
          batchIds.map((id) => getDoc(doc(db, "users", id)))
        );

        userDocs.forEach((doc, idx) => {
          if (doc.exists()) {
            const data = doc.data();
            userProfiles.set(batchIds[idx], {
              username: data.username || data.email?.split("@")[0] || `User${batchIds[idx].slice(-4)}`,
              avatarUrl: data.avatarUrl,
            });
          }
        });
      }
    }

    console.log(
      `[Secondary Market Leaderboard] Fetched ${userProfiles.size} user profiles`
    );

    // Step 6: Build final leaderboard
    const leaderboard = sortedBuyers.map((cacheData, index) => {
      const walletAddress = cacheData.walletAddress;
      const walletData = walletLookup.get(walletAddress.toLowerCase());

      let userId = walletData?.userId || null;
      let username = `User ${walletAddress.slice(0, 6)}`;
      let avatarUrl: string | undefined = undefined;

      // Get username from wallet lookup
      if (walletData?.username) {
        username = walletData.username;
      }

      // Get full profile data if userId found
      if (userId) {
        const profile = userProfiles.get(userId);
        if (profile) {
          username = profile.username || username;
          avatarUrl = profile.avatarUrl;
        }
      }

      return {
        rank: index + 1,
        userId: userId || walletAddress,
        username,
        walletAddress,
        totalPurchased: cacheData.salesCount,
        avatarUrl,
      };
    });

    console.log(
      `[Secondary Market Leaderboard] Successfully built leaderboard with ${leaderboard.length} entries`
    );

    // Cache for 5 minutes (300 seconds) - this is expensive to compute
    firebaseCache.set(cacheKey, leaderboard, 300000);

    return leaderboard;
  } catch (error) {
    console.error(
      "[Secondary Market Leaderboard] Error fetching leaderboard:",
      error
    );
    return [];
  }
}

export default leaderboardService;
