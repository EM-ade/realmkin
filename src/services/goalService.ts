const GATEKEEPER_URL =
  process.env.NEXT_PUBLIC_GATEKEEPER_URL || "https://gatekeeper-bot.fly.dev";

export interface Goal {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  isCompleted: boolean;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
}

/**
 * Fetch the NFT launch goal
 */
export async function getGoal(): Promise<Goal> {
  const res = await fetch(`${GATEKEEPER_URL}/api/goal`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch goal");
  }

  return res.json();
}

/**
 * Check if goal is completed
 */
export async function getGoalStatus(): Promise<{ isCompleted: boolean }> {
  const res = await fetch(`${GATEKEEPER_URL}/api/goal/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch goal status");
  }

  return res.json();
}

/**
 * Update the goal (admin only)
 */
export async function updateGoal(
  current: number,
  target: number,
  isCompleted: boolean,
  idToken: string
): Promise<Goal> {
  const res = await fetch(`${GATEKEEPER_URL}/api/goal`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ current, target, isCompleted }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update goal");
  }

  return res.json();
}
