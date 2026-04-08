# Pause Revenue Distribution Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Temporarily disable the automatic monthly revenue distribution scheduled job to prevent it from running until further notice.

**Architecture:** The revenue distribution system uses a node-cron scheduler in `server.js` that runs on the 27th of every month at 12:00 PM WAT. We'll disable it by adding an early return guard clause and commenting out the cron schedule, preserving the code for easy reactivation later.

**Tech Stack:** Node.js, node-cron, Express.js, Firebase Admin SDK

---

### Task 1: Disable Automatic Revenue Distribution in server.js

**Files:**
- Modify: `backend-api/server.js:647-711`

**Step 1: Add guard clause at the top of setupAutomaticRevenueDistribution function**

Open `backend-api/server.js` and modify the function:

```javascript
/**
 * Setup automatic monthly revenue distribution
 * Runs on the 27th of every month at 12:00 PM WAT (Nigerian time)
 * 
 * ⚠️ PAUSED: Temporarily disabled as of 2026-02-27
 * To re-enable: Remove the early return and uncomment the cron.schedule block
 */
async function setupAutomaticRevenueDistribution() {
  // ⚠️ PAUSED: Early return to prevent scheduler from running
  console.log("⏸️  [API] Automatic revenue distribution is currently PAUSED. Skipping setup.");
  return;
  
  /* ORIGINAL CODE BELOW - DO NOT DELETE, JUST COMMENTED OUT FOR PAUSE
  console.log("[API] Setting up automatic revenue distribution (27th of every month at 12:00 PM WAT)...");

  try {
    // Schedule cron job: 27th of every month at 12:00 PM WAT
    // Cron format: minute hour day-of-month month day-of-week
    // 0 12 27 * * = At 12:00 PM on day 27 of every month
    cron.schedule('0 12 27 * *', async () => {
      try {
        console.log("⏰ [API] Automatic monthly revenue distribution triggered");

        // Import revenue distribution service
        const revenueModule = await import("./routes/revenue-distribution.js");

        // Call the allocation endpoint internally
        const db = admin.firestore();
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const distributionId = `revenue_dist_${year}_${month}`;

        console.log(`💰 [API] Starting revenue distribution: ${distributionId}`);

        // Note: This would need the actual allocation logic
        // For now, log that manual trigger is still recommended
        console.log("⚠️  [API] Automatic revenue distribution scheduled");
        console.log("💡 [API] For safety, please use the manual script for now:");
        console.log("    node scripts/run-production-revenue-distribution.js");

        // Send Discord notification
        try {
          const { sendDiscordAlert } = await import("./utils/discordAlerts.js");
          await sendDiscordAlert(
            `📅 Monthly Revenue Distribution Reminder\\n` +
            `• Date: ${distributionId}\\n` +
            `• Please run manual distribution script\\n` +
            `• Command: node scripts/run-production-revenue-distribution.js\\n` +
            `• Time: ${new Date().toISOString()}`,
            "info"
          );
        } catch (alertError) {
          console.warn("[API] Failed to send Discord alert:", alertError.message);
        }
      } catch (error) {
        console.error("❌ [API] Automatic revenue distribution check failed:", error.message);

        // Send Discord notification on failure
        try {
          const { sendDiscordAlert } = await import("./utils/discordAlerts.js");
          await sendDiscordAlert(
            `❌ Revenue Distribution Reminder FAILED\\n` +
            `• Error: ${error.message}\\n` +
            `• Time: ${new Date().toISOString()}`,
            "error"
          );
        } catch (alertError) {
          console.warn("[API] Failed to send Discord alert:", alertError.message);
        }
      }
    }, {
      scheduled: true,
      timezone: "Africa/Lagos" // Nigerian time (WAT - UTC+1)
    });

    console.log("✅ [API] Automatic revenue distribution reminder initialized");
    console.log("📅 [API] Next reminder: 27th of next month at 12:00 PM WAT");
  } catch (error) {
    console.error("[API] Failed to initialize revenue distribution reminder:", error.message);
  }
  */
}
```

**Step 2: Verify syntax is valid**

Run: `cd backend-api && node -c server.js`
Expected: `Syntax OK`

**Step 3: Commit**

```bash
cd backend-api
git add server.js
git commit -m "chore: pause automatic revenue distribution scheduler"
```

---

### Task 2: Verify Server Starts Without Errors

**Files:**
- Test: `backend-api/server.js`

**Step 1: Start the server in development mode**

Run: `cd backend-api && npm run dev`

**Step 2: Check console output**

Expected: Log message showing "⏸️ [API] Automatic revenue distribution is currently PAUSED. Skipping setup."

The server should start normally without the cron scheduler being initialized.

**Step 3: Stop the server**

Press `Ctrl+C` to stop the server after verifying the log message.

---

### Task 3: Document the Pause

**Files:**
- Create: `backend-api/docs/pause-revenue-distribution-2026-02-27.md`

**Step 1: Create documentation file**

```markdown
# Revenue Distribution Pause - 2026-02-27

## Status: ⏸️ PAUSED

The automatic monthly revenue distribution scheduler has been temporarily disabled.

## What Was Paused

- **File:** `backend-api/server.js`
- **Function:** `setupAutomaticRevenueDistribution()`
- **Schedule:** 27th of every month at 12:00 PM WAT (Africa/Lagos timezone)

## Reason for Pause

[Add reason here]

## Manual Distribution (If Needed)

While the automatic scheduler is paused, you can still run revenue distribution manually:

```bash
node scripts/run-production-revenue-distribution.js
```

## How to Re-enable

When ready to resume automatic revenue distribution:

### Option A: Quick Re-enable

1. Open `backend-api/server.js`
2. Find the `setupAutomaticRevenueDistribution()` function
3. Remove the early return lines:
   ```javascript
   // ⚠️ PAUSED: Early return to prevent scheduler from running
   console.log("⏸️  [API] Automatic revenue distribution is currently PAUSED. Skipping setup.");
   return;
   ```
4. Uncomment the original cron.schedule block (remove `/*` and `*/` wrapper)
5. Restart the server: `npm run dev` or `npm start`

### Option B: Clean Re-enable via Git

1. Find the commit before the pause:
   ```bash
   git log --oneline -10
   ```
2. Restore the file:
   ```bash
   git checkout <commit-before-pause> -- backend-api/server.js
   ```
3. Restart the server

## Verification After Re-enable

1. Start the server
2. Look for log: "✅ [API] Automatic revenue distribution reminder initialized"
3. Check that next reminder date is shown
4. On the 27th, verify the cron job triggers at 12:00 PM WAT

## Rollback

If issues occur, the pause can be quickly reverted:

```bash
git revert HEAD
# Restart server
```

---

**Paused by:** [Your name]
**Date:** 2026-02-27
**Approved by:** [If applicable]
```

**Step 2: Commit the documentation**

```bash
cd backend-api
git add docs/pause-revenue-distribution-2026-02-27.md
git commit -m "docs: add revenue distribution pause documentation"
```

---

### Task 4: Optional - Disable Force-Claim Scheduler Too

**Note:** Only complete this task if you also want to pause the weekly force-claim feature.

**Files:**
- Modify: `backend-api/server.js:720-760` (approximate location of setupAutomaticForceClaim)

**Step 1: Check if force-claim should also be paused**

The force-claim service is related to revenue distribution. Decide if it should also be paused.

**Step 2: If yes, apply the same pattern**

```javascript
async function setupAutomaticForceClaim() {
  // ⚠️ PAUSED: Early return to prevent scheduler from running
  console.log("⏸️  [API] Automatic force-claim is currently PAUSED. Skipping setup.");
  return;
  
  /* ORIGINAL CODE BELOW... */
}
```

**Step 3: Commit**

```bash
cd backend-api
git add server.js
git commit -m "chore: pause automatic force-claim scheduler"
```

---

### Task 5: Verify Pause is Active

**Files:**
- Verify: Server logs, Firestore

**Step 1: Start the server**

Run: `cd backend-api && npm run dev`

**Step 2: Check console output for pause confirmation**

Expected logs:
- "⏸️ [API] Automatic revenue distribution is currently PAUSED. Skipping setup."
- Should NOT see: "✅ [API] Automatic revenue distribution reminder initialized"

**Step 3: Document verification**

Add verification timestamp to the documentation file.

**Step 4: Monitor on next 27th**

On the 27th of the month, verify:
- No automatic distribution runs at 12:00 PM WAT
- No Discord notifications are sent
- No revenue_dist_* documents are created automatically

---

## Summary of Changes

| File | Change | Status |
|------|--------|--------|
| `backend-api/server.js` | Added early return guard in setupAutomaticRevenueDistribution | ✅ |
| `backend-api/docs/pause-revenue-distribution-2026-02-27.md` | Created pause documentation | ✅ |
| Server Verification | Confirmed pause is active | ✅ |

## Rollback Plan

If issues occur, immediately rollback:

```bash
cd backend-api
git revert HEAD~2
npm restart
```

---

## How to Re-enable Revenue Distribution

When ready to resume automatic revenue distribution:

### Option A: Quick Re-enable (Recommended)

1. Open `backend-api/server.js`
2. Find the `setupAutomaticRevenueDistribution()` function
3. Remove the early return lines:
   ```javascript
   // ⏸️ PAUSED: Early return to prevent scheduler from running
   console.log("⏸️  [API] Automatic revenue distribution is currently PAUSED. Skipping setup.");
   return;
   ```
4. Uncomment the original cron.schedule block (remove the comment wrapper)
5. Restart the server: `npm run dev` or `npm start`

### Option B: Clean Re-enable via Git

1. Find the commit before the pause:
   ```bash
   git log --oneline -10
   ```
2. Restore the file:
   ```bash
   git checkout <commit-before-pause> -- backend-api/server.js
   ```
3. Restart the server

### Verification After Re-enable

1. Start the server
2. Look for log: "✅ [API] Automatic revenue distribution reminder initialized"
3. Verify next reminder date is displayed
4. On the 27th, confirm the cron job triggers at 12:00 PM WAT
5. Check Firestore for new `revenue_dist_*` documents
