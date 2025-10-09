"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { leaderboardService } from "@/services/leaderboardService";
import { LeaderboardEntry } from "@/types/leaderboard";

interface MonthlyArchive {
  monthId: string;
  archivedAt: any;
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

export default function AdminLeaderboardPage() {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const [currentLeaderboard, setCurrentLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentStreaks, setCurrentStreaks] = useState<LeaderboardEntry[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<string>("");
  const [archiveData, setArchiveData] = useState<MonthlyArchive | null>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "archive">("current");

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !userData?.admin) {
      router.push("/");
    }
  }, [userData, loading, router]);

  // Load current leaderboard
  useEffect(() => {
    const loadCurrentData = async () => {
      setIsLoadingCurrent(true);
      try {
        const [scores, streaks] = await Promise.all([
          leaderboardService.getLeaderboard("totalScore", 100),
          leaderboardService.getLeaderboard("streak", 100),
        ]);
        setCurrentLeaderboard(scores);
        setCurrentStreaks(streaks);
      } catch (error) {
        console.error("Failed to load current leaderboard:", error);
      } finally {
        setIsLoadingCurrent(false);
      }
    };

    if (userData?.admin) {
      loadCurrentData();
    }
  }, [userData]);

  // Load archive when selected
  useEffect(() => {
    const loadArchive = async () => {
      if (!selectedArchive) {
        setArchiveData(null);
        return;
      }

      setIsLoadingArchive(true);
      try {
        const data = await leaderboardService.getMonthlyArchive(selectedArchive);
        setArchiveData(data);
      } catch (error) {
        console.error("Failed to load archive:", error);
        setArchiveData(null);
      } finally {
        setIsLoadingArchive(false);
      }
    };

    loadArchive();
  }, [selectedArchive]);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    
    for (let i = 1; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      options.push(monthId);
    }
    
    return options;
  }, []);

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrent = () => {
    const data = currentLeaderboard.map(entry => ({
      rank: entry.rank,
      username: entry.username,
      totalScore: entry.value,
      gamesPlayed: entry.gamesPlayed || 0,
    }));
    exportToCSV(data, `leaderboard-current-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleExportArchive = () => {
    if (!archiveData) return;
    exportToCSV(archiveData.topScores, `leaderboard-${selectedArchive}.csv`);
  };

  const handleManualReset = async () => {
    if (!confirm("Are you sure you want to manually reset the leaderboard? This will archive current winners and start a new month.")) {
      return;
    }

    try {
      await leaderboardService.checkAndPerformMonthlyReset();
      alert("Leaderboard reset successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Failed to reset leaderboard:", error);
      alert("Failed to reset leaderboard. Check console for details.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050302]">
        <div className="text-[#DA9C2F]">Loading...</div>
      </div>
    );
  }

  if (!userData?.admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050302] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-[0.3em] text-[#F4C752]">
              Leaderboard Admin
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.28em] text-white/60">
              Manage monthly winners and archives
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-lg border border-[#DA9C2F]/40 bg-[#0B0B09] px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10"
            >
              ← Admin Home
            </Link>
            <Link
              href="/game"
              className="rounded-lg border border-[#DA9C2F]/40 bg-[#0B0B09] px-4 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#DA9C2F] transition hover:bg-[#DA9C2F]/10"
            >
              View Leaderboard
            </Link>
          </div>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab("current")}
            className={`rounded-lg px-6 py-2 text-sm font-semibold uppercase tracking-[0.28em] transition ${
              activeTab === "current"
                ? "bg-[#DA9C2F] text-[#050302]"
                : "border border-[#DA9C2F]/40 text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className={`rounded-lg px-6 py-2 text-sm font-semibold uppercase tracking-[0.28em] transition ${
              activeTab === "archive"
                ? "bg-[#DA9C2F] text-[#050302]"
                : "border border-[#DA9C2F]/40 text-[#DA9C2F] hover:bg-[#DA9C2F]/10"
            }`}
          >
            Archives
          </button>
        </div>

        {/* Current Month Tab */}
        {activeTab === "current" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">Total Players</p>
                <p className="mt-2 text-3xl font-bold text-[#F4C752]">{currentLeaderboard.length}</p>
              </div>
              <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">Total Games</p>
                <p className="mt-2 text-3xl font-bold text-[#F4C752]">
                  {currentLeaderboard.reduce((sum, e) => sum + (e.gamesPlayed || 0), 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
                <p className="text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">Top Score</p>
                <p className="mt-2 text-3xl font-bold text-[#F4C752]">
                  {currentLeaderboard[0]?.value.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportCurrent}
                className="rounded-lg bg-[#DA9C2F] px-6 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#050302] transition hover:bg-[#C4A962]"
              >
                Export to CSV
              </button>
              <button
                onClick={handleManualReset}
                className="rounded-lg border border-red-500/40 bg-red-900/20 px-6 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-red-400 transition hover:bg-red-900/40"
              >
                Manual Reset
              </button>
            </div>

            {/* Current Leaderboard */}
            <div className="rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
              <h2 className="mb-4 text-xl font-bold uppercase tracking-[0.28em] text-[#F4C752]">
                Top 100 Players
              </h2>
              {isLoadingCurrent ? (
                <div className="py-8 text-center text-white/60">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#DA9C2F]/20 text-left text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">
                        <th className="pb-3">Rank</th>
                        <th className="pb-3">Username</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Games</th>
                        <th className="pb-3">Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLeaderboard.slice(0, 100).map((entry) => (
                        <tr
                          key={entry.userId}
                          className="border-b border-[#DA9C2F]/10 text-sm text-white/80"
                        >
                          <td className="py-3 font-semibold text-[#F4C752]">#{entry.rank}</td>
                          <td className="py-3">{entry.username}</td>
                          <td className="py-3 font-bold text-[#DA9C2F]">{entry.value.toLocaleString()}</td>
                          <td className="py-3">{entry.gamesPlayed || 0}</td>
                          <td className="py-3 text-xs text-white/60">
                            {entry.breakdown
                              ? Object.entries(entry.breakdown)
                                  .map(([game, score]) => `${game}: ${score}`)
                                  .join(", ")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Archive Tab */}
        {activeTab === "archive" && (
          <div className="space-y-6">
            {/* Month Selector */}
            <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
              <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.28em] text-[#DA9C2F]">
                Select Month
              </label>
              <select
                value={selectedArchive}
                onChange={(e) => setSelectedArchive(e.target.value)}
                className="w-full rounded-lg border border-[#DA9C2F]/40 bg-[#050302] px-4 py-2 text-white focus:border-[#DA9C2F] focus:outline-none"
              >
                <option value="">-- Select a month --</option>
                {monthOptions.map((monthId) => (
                  <option key={monthId} value={monthId}>
                    {new Date(monthId + "-01").toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Archive Data */}
            {selectedArchive && (
              <>
                {isLoadingArchive ? (
                  <div className="py-8 text-center text-white/60">Loading archive...</div>
                ) : archiveData ? (
                  <div className="space-y-6">
                    {/* Export Button */}
                    <button
                      onClick={handleExportArchive}
                      className="rounded-lg bg-[#DA9C2F] px-6 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-[#050302] transition hover:bg-[#C4A962]"
                    >
                      Export to CSV
                    </button>

                    {/* Top Scores */}
                    <div className="rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
                      <h2 className="mb-4 text-xl font-bold uppercase tracking-[0.28em] text-[#F4C752]">
                        Top 10 Scores
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#DA9C2F]/20 text-left text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">
                              <th className="pb-3">Rank</th>
                              <th className="pb-3">Username</th>
                              <th className="pb-3">Score</th>
                              <th className="pb-3">Games</th>
                            </tr>
                          </thead>
                          <tbody>
                            {archiveData.topScores.map((entry) => (
                              <tr
                                key={entry.userId}
                                className="border-b border-[#DA9C2F]/10 text-sm text-white/80"
                              >
                                <td className="py-3 font-semibold text-[#F4C752]">
                                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                </td>
                                <td className="py-3">{entry.username}</td>
                                <td className="py-3 font-bold text-[#DA9C2F]">{entry.totalScore.toLocaleString()}</td>
                                <td className="py-3">{entry.gamesPlayed}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Top Streaks */}
                    <div className="rounded-3xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-6">
                      <h2 className="mb-4 text-xl font-bold uppercase tracking-[0.28em] text-[#F4C752]">
                        Top 10 Streaks
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#DA9C2F]/20 text-left text-xs uppercase tracking-[0.32em] text-[#DA9C2F]/70">
                              <th className="pb-3">Rank</th>
                              <th className="pb-3">Username</th>
                              <th className="pb-3">Streak</th>
                            </tr>
                          </thead>
                          <tbody>
                            {archiveData.topStreaks.map((entry) => (
                              <tr
                                key={entry.userId}
                                className="border-b border-[#DA9C2F]/10 text-sm text-white/80"
                              >
                                <td className="py-3 font-semibold text-[#F4C752]">
                                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                </td>
                                <td className="py-3">{entry.username}</td>
                                <td className="py-3 font-bold text-[#DA9C2F]">{entry.currentStreak} days 🔥</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/80 p-8 text-center">
                    <p className="text-white/60">No archive data found for this month.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
