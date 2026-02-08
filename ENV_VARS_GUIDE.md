# Environment Variables Guide

## Service URLs

### `NEXT_PUBLIC_DISCORD_BOT_URL`
**Purpose:** Discord bot operations (linking, verification, status checks)  
**Used for:**
- Discord OAuth flow (`/api/discord/*`)
- Discord linking/unlinking
- Discord status checks
- NFT verification via Discord bot

**Example:**
```env
NEXT_PUBLIC_DISCORD_BOT_URL=https://p01--gatekeeper--5wsyj7zr259c.code.run
```

---

### `NEXT_PUBLIC_GATEKEEPER_BASE`
**Purpose:** Backend API operations (staking, revenue, leaderboard, goals)  
**Used for:**
- Staking operations (stake, unstake, claim rewards)
- Revenue distribution
- Leaderboard data
- Goal tracking
- Withdrawal operations
- MKIN token transfers

**Example:**
```env
NEXT_PUBLIC_GATEKEEPER_BASE=https://backend-api-production-url.com
```

---

## Priority/Fallback Behavior

Most Discord operations follow this priority:
1. `NEXT_PUBLIC_DISCORD_BOT_URL` (preferred)
2. `NEXT_PUBLIC_GATEKEEPER_BASE` (fallback for backward compatibility)
3. Hardcoded default (last resort)

Most backend operations use:
1. `NEXT_PUBLIC_GATEKEEPER_BASE` (preferred)
2. Hardcoded default (fallback)

---

## Migration Notes

Previously, both Discord and backend operations used `NEXT_PUBLIC_GATEKEEPER_BASE`. We've now separated them to allow independent deployment of:
- Discord bot service (Northflank/Fly.io)
- Backend API service (different host)

For existing deployments, if you only set `NEXT_PUBLIC_GATEKEEPER_BASE`, Discord operations will continue to work as a fallback.
