# Realmkin Game Scoring System

## Overview

This document outlines the scoring system for all Realmkin games. The system is designed to ensure balanced contribution from all games to the unified monthly leaderboard.

**Last Updated**: October 8, 2025

---

## Core Principles

1. **Balance**: All games contribute equally to the total score
2. **Skill Rewarding**: Better performance = higher scores
3. **Difficulty Scaling**: Harder difficulties yield higher points
4. **Fair Competition**: No single game dominates the leaderboard

---

## Scoring Formulas

### 2048

#### Base Calculation
```
Points = (Game Score ÷ 10) × Difficulty Multiplier
```

#### Difficulty Multipliers
- **Simple** (4×4 grid): `1.0×`
- **Intermediate** (5×5 grid): `1.3×`
- **Hard** (6×6 grid): `1.6×`

#### Examples
| Game Score | Difficulty    | Calculation           | Final Points |
|------------|---------------|-----------------------|--------------|
| 2,048      | Simple        | 2048 ÷ 10 × 1.0      | 204.8        |
| 2,048      | Intermediate  | 2048 ÷ 10 × 1.3      | 266.2        |
| 2,048      | Hard          | 2048 ÷ 10 × 1.6      | 327.7        |
| 4,096      | Simple        | 4096 ÷ 10 × 1.0      | 409.6        |
| 4,096      | Intermediate  | 4096 ÷ 10 × 1.3      | 532.5        |
| 8,192      | Hard          | 8192 ÷ 10 × 1.6      | 1,310.7      |

#### Scoring Trigger
- Points are submitted **only on game over**
- Only the **highest score** per session is recorded
- Score is rounded to nearest integer

#### Expected Range
- **Beginner**: 100-300 points per game
- **Intermediate**: 300-600 points per game
- **Advanced**: 600-1,500+ points per game

---

### Wordle

#### Base Points by Attempts
| Attempts | Base Points | Description        |
|----------|-------------|--------------------|
| 1        | 300         | Perfect (rare)     |
| 2        | 250         | Excellent          |
| 3        | 200         | Very Good          |
| 4        | 150         | Good               |
| 5        | 100         | Decent             |
| 6        | 50          | Just Made It       |
| Failed   | 0           | No Points          |

#### Difficulty Multipliers
- **Simple**: `1.0×`
- **Intermediate**: `1.5×`
- **Advanced**: `2.0×`

#### Bonuses
- **Daily Completion**: `+20 points` (for completing any daily puzzle)
- **Streak Bonus**: `+50 points` (for 3+ day streak)

#### Full Formula
```
Points = (Base Points × Difficulty Multiplier) + Daily Bonus + Streak Bonus
```

#### Examples
| Attempts | Difficulty    | Streak | Calculation                  | Final Points |
|----------|---------------|--------|------------------------------|--------------|
| 3        | Simple        | 0 days | (200 × 1.0) + 20            | 220          |
| 3        | Intermediate  | 0 days | (200 × 1.5) + 20            | 320          |
| 2        | Advanced      | 0 days | (250 × 2.0) + 20            | 520          |
| 1        | Advanced      | 5 days | (300 × 2.0) + 20 + 50       | 670          |
| 4        | Simple        | 3 days | (150 × 1.0) + 20 + 50       | 220          |
| 6        | Intermediate  | 0 days | (50 × 1.5) + 20             | 95           |
| Failed   | Any           | Any    | 0                            | 0            |

#### Scoring Trigger
- Points are submitted **only on successful completion** (win)
- Failed attempts give **0 points**
- One score per day per difficulty
- Score is rounded to nearest integer

#### Expected Range
- **Simple**: 70-370 points per game
- **Intermediate**: 95-495 points per game
- **Advanced**: 120-670 points per game

---

## Leaderboard System

### Total Score Leaderboard
- **Aggregates**: All points from all games
- **Resets**: Monthly (1st of each month, 00:00 UTC)
- **Display**: Top 100 players + current user's rank
- **Sorting**: Highest total score first

### Streak Leaderboard
- **Tracks**: Consecutive days with at least 1 game completed
- **Any Game Counts**: 2048, Wordle, or any future game
- **Resets**: If user misses a day (based on UTC timezone)
- **Display**: Top 100 players + current user's streak
- **Sorting**: Longest current streak first

---

## Score Balance Analysis

### Average Game Comparison
| Game   | Difficulty    | Avg Performance | Avg Points |
|--------|---------------|-----------------|------------|
| 2048   | Simple        | Score: 2,500    | ~250       |
| 2048   | Intermediate  | Score: 3,000    | ~390       |
| 2048   | Hard          | Score: 4,000    | ~640       |
| Wordle | Simple        | 4 attempts      | ~170       |
| Wordle | Intermediate  | 4 attempts      | ~245       |
| Wordle | Advanced      | 4 attempts      | ~320       |

### Balance Rationale
- **2048**: Higher variance, skill-based, time-intensive
- **Wordle**: Lower variance, daily limit, quick gameplay
- **Combined**: Both games contribute 40-50% to total score
- **Future Games**: Will follow similar point ranges (100-700 per session)

---

## Implementation Notes

### Code Location
```
src/lib/scoring.ts          - Scoring calculation functions
src/services/leaderboardService.ts - Score submission logic
```

### TypeScript Interfaces
```typescript
interface GameScore {
  userId: string;
  gameType: 'wordle' | '2048' | 'traitCrush' | 'wordBlast' | 'checkers' | 'poker';
  points: number;
  difficulty: 'simple' | 'intermediate' | 'hard' | 'advanced';
  timestamp: number;
  metadata?: {
    gameScore?: number;      // For 2048
    attempts?: number;        // For Wordle
    streak?: number;          // For streak bonus
  };
}
```

### Rounding Rules
- All final scores are rounded using `Math.round()`
- No decimal points in leaderboard display
- Internal calculations may use decimals for accuracy

---

## Future Games

### Trait Crush ✅ (Implemented)

#### Base Calculation
```
Points = (Game Score ÷ 5) × Difficulty Multiplier + Combo Bonus
```

#### Difficulty Multipliers & Time Limits
- **Simple** (Novice): `1.0×` | **3 minutes** (180 seconds)
- **Intermediate** (Adept): `1.3×` | **2 minutes** (120 seconds)
- **Hard** (Master): `1.6×` | **1.5 minutes** (90 seconds)

#### Combo Bonus
- **Per Combo**: `+15 points`
- Combos occur when multiple matches happen in sequence

#### Game End Conditions
- **Time runs out** (auto-submit score)
- **Player clicks "End Game"** (manual submit)

#### Examples
| Game Score | Difficulty    | Combos | Calculation                    | Final Points |
|------------|---------------|--------|--------------------------------|--------------|
| 1,000      | Simple        | 0      | 1000 ÷ 5 × 1.0 + 0            | 200          |
| 1,500      | Intermediate  | 5      | 1500 ÷ 5 × 1.3 + (5 × 15)     | 465          |
| 2,000      | Hard          | 10     | 2000 ÷ 5 × 1.6 + (10 × 15)    | 790          |

#### Scoring Trigger
- Points submitted when time expires OR player ends game
- Score based on total matches and combos achieved
- Higher difficulty = less time but higher multiplier

#### Expected Range
- **Novice** (3 min): 150-300 points per session
- **Adept** (2 min): 200-450 points per session
- **Master** (90 sec): 250-500 points per session

### Word Blast (Phase III)
**Estimated Range**: 100-400 points per session
- Points per word found
- Bonus for longer words
- Time-based multiplier

### Checkers (Phase IV)
**Estimated Range**: 200-600 points per match
- Win/loss based
- Difficulty based on AI level
- Bonus for perfect games

### Poker (Phase IV)
**Estimated Range**: Variable (100-1,000+ per session)
- Tournament-based scoring
- Buy-in tier multipliers
- Placement rewards

---

## Anti-Cheat Measures

### Rate Limiting
- Maximum 100 score submissions per user per day
- Cooldown between submissions (5 seconds)

### Validation
- Server-side score validation
- Score must be within reasonable bounds
- Timestamp verification

### Suspicious Activity
- Scores significantly above average flagged for review
- Multiple rapid submissions blocked
- Admin dashboard shows anomalies

---

## Monthly Reset

### Reset Schedule
- **Frequency**: Monthly
- **Date**: 1st of each month
- **Time**: 00:00 UTC
- **Method**: Client-side detection (no Cloud Functions)

### Reset Process
1. First user action of new month triggers check
2. Top 10 scores archived to `monthlyArchive/{YYYY-MM}`
3. Top 10 streaks archived
4. Metadata updated with new month ID
5. New leaderboard entries created on first game

### Archive Format
```typescript
{
  monthId: "2025-10",
  archivedAt: timestamp,
  topScores: [
    { rank: 1, userId, username, totalScore, gamesPlayed },
    // ... top 10
  ],
  topStreaks: [
    { rank: 1, userId, username, currentStreak, longestStreak },
    // ... top 10
  ]
}
```

---

## Admin Dashboard

### Access
- Route: `/admin/leaderboard`
- Requires: `userData.admin === true`

### Features
- View current month leaderboard
- View archived months (dropdown)
- Export winners to CSV
- Manual reset (emergency)
- Stats overview

---

## Testing Scenarios

### 2048 Test Cases
```typescript
// Simple difficulty
calculate2048Points(2048, 'simple')    // Expected: 205
calculate2048Points(4096, 'simple')    // Expected: 410
calculate2048Points(8192, 'simple')    // Expected: 819

// Intermediate difficulty
calculate2048Points(2048, 'intermediate')  // Expected: 266
calculate2048Points(4096, 'intermediate')  // Expected: 533

// Hard difficulty
calculate2048Points(2048, 'hard')      // Expected: 328
calculate2048Points(8192, 'hard')      // Expected: 1311
```

### Wordle Test Cases
```typescript
// Simple, no streak
calculateWordlePoints(1, 'simple', 0)      // Expected: 320
calculateWordlePoints(3, 'simple', 0)      // Expected: 220
calculateWordlePoints(6, 'simple', 0)      // Expected: 70

// Advanced, with streak
calculateWordlePoints(1, 'advanced', 5)    // Expected: 670
calculateWordlePoints(2, 'advanced', 3)    // Expected: 570
calculateWordlePoints(4, 'advanced', 0)    // Expected: 320
```

---

## Changelog

### Version 1.0 (October 2025)
- Initial scoring system
- 2048 and Wordle formulas
- Monthly leaderboard structure
- Balanced point ranges

### Future Versions
- v1.1: Trait Crush scoring
- v1.2: Word Blast scoring
- v1.3: Checkers & Poker scoring
- v2.0: Seasonal tournaments

---

## Contact

For questions or suggestions about the scoring system:
- Review this document first
- Check implementation in `src/lib/scoring.ts`
- Consult admin dashboard for live stats
- Test changes in development environment before deploying

---

**End of Document**
