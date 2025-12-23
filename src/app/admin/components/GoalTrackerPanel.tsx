"use client";

import { useState, useEffect } from "react";
import { getGoal, updateGoal, type Goal } from "@/services/goalService";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function GoalTrackerPanel() {
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [current, setCurrent] = useState(0);
  const [target, setTarget] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fetch goal on mount
  useEffect(() => {
    fetchGoal();
  }, []);

  async function fetchGoal() {
    try {
      const data = await getGoal();
      setGoal(data);
      setCurrent(data.current);
      setTarget(data.target);
      setIsCompleted(data.isCompleted);
    } catch (error) {
      console.error("Failed to fetch goal:", error);
      toast.error("Failed to load goal data");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    if (current < 0 || target <= 0) {
      toast.error("Invalid values");
      return;
    }

    if (current > target) {
      toast.error("Current cannot exceed target");
      return;
    }

    setUpdating(true);
    try {
      const idToken = await user.getIdToken();
      const updated = await updateGoal(current, target, isCompleted, idToken);
      setGoal(updated);
      toast.success("Goal updated successfully!");
    } catch (error: any) {
      console.error("Failed to update goal:", error);
      toast.error(error.message || "Failed to update goal");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DA9C2F]"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center p-12 text-white/60">
        Failed to load goal data
      </div>
    );
  }

  const progress = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Goal Status Card */}
      <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-[#DA9C2F]/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-[#DA9C2F]">{goal.title}</h3>
            <p className="text-white/60 text-sm mt-1">{goal.description}</p>
          </div>
          <div
            className={`px-4 py-2 rounded-lg ${
              isCompleted
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {isCompleted ? "✓ Completed" : "In Progress"}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>Progress</span>
            <span className="text-[#DA9C2F] font-bold">
              {current} / {target} ({progress.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full h-4 bg-[#DA9C2F]/10 rounded-full overflow-hidden border border-[#DA9C2F]/20">
            <div
              className="h-full bg-gradient-to-r from-[#DA9C2F] to-[#F4C752] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Last Updated */}
        <p className="text-xs text-white/40">
          Last updated:{" "}
          {new Date(
            goal.updatedAt?.seconds * 1000 || Date.now()
          ).toLocaleString()}
        </p>
      </div>

      {/* Edit Form */}
      <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-[#DA9C2F]/20">
        <h4 className="text-lg font-bold text-white mb-4">Update Goal</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Current Progress */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Current Progress
            </label>
            <input
              type="number"
              min="0"
              max={target}
              value={current}
              onChange={(e) => setCurrent(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-black/40 border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
            />
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Target
            </label>
            <input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(parseInt(e.target.value) || 100)}
              className="w-full px-4 py-2 bg-black/40 border border-[#DA9C2F]/30 rounded-lg text-white focus:outline-none focus:border-[#DA9C2F]"
            />
          </div>
        </div>

        {/* Completion Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-5 h-5 rounded border-[#DA9C2F]/30 bg-black/40 text-[#DA9C2F] focus:ring-[#DA9C2F] focus:ring-offset-0"
            />
            <span className="text-white/80 font-medium">Mark as Completed</span>
          </label>
          <p className="text-xs text-white/40 mt-1 ml-8">
            {isCompleted
              ? "Staking rewards are active"
              : "Staking rewards will activate when completed"}
          </p>
        </div>

        {/* Update Button */}
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="w-full px-6 py-3 bg-[#DA9C2F] hover:bg-[#F4C752] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updating ? "Updating..." : "Update Goal"}
        </button>
      </div>
    </div>
  );
}
