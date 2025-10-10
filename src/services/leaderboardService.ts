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
  where,
  serverTimestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GameType, Difficulty, LeaderboardEntry } from "@/types/leaderboard";

// Types for Firestore documents
interface LeaderboardMetadata {
  monthId: string;
  startDate: string;
  endDate: string;
  lastReset: any; // serverTimestamp
}

interface TotalScoreEntry {
  userId: string;
  username: string;
  totalScore: number;
  gamesPlayed: number;
  lastUpdated: any; // serverTimestamp
  breakdown: Record<string, number>;
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
  archivedAt: any; // serverTimestamp
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
    gameType: GameType
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

          await updateDoc(scoreRef, {
            totalScore: currentData.totalScore + scoreDifference, // Add only the difference
            gamesPlayed: currentData.gamesPlayed + 1,
            lastUpdated: serverTimestamp(),
            breakdown: newBreakdown,
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

  // Get leaderboard entries
  async getLeaderboard(
    type: "totalScore" | "streak",
    limitCount: number = 100
  ): Promise<LeaderboardEntry[]> {
    const collectionName = type === "totalScore" 
      ? this.COLLECTIONS.TOTAL_SCORE 
      : this.COLLECTIONS.STREAK;
    
    const orderField = type === "totalScore" ? "totalScore" : "currentStreak";
    
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderField, "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc, index) => {
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

  // Subscribe to real-time leaderboard updates
  subscribeToLeaderboard(
    type: "totalScore" | "streak",
    limitCount: number = 100,
    callback: (entries: LeaderboardEntry[]) => void
  ): Unsubscribe {
    const collectionName = type === "totalScore" 
      ? this.COLLECTIONS.TOTAL_SCORE 
      : this.COLLECTIONS.STREAK;
    
    const orderField = type === "totalScore" ? "totalScore" : "currentStreak";
    
    const q = query(
      collection(db, collectionName),
      orderBy(orderField, "desc"),
      limit(limitCount)
    );
    
    return onSnapshot(q, (snapshot) => {
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
      
      callback(entries);
    });
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
          } as Record<GameType, any>,
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
export default leaderboardService;
