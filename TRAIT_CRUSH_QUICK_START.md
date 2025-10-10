# Trait Crush - Quick Start Guide

## 🎮 Game Overview

Trait Crush is a match-3 puzzle game where you swap adjacent trait tiles to create matches of 3 or more. The game features:
- 9×9 game board
- 6 different trait types
- Combo system for chain reactions
- 3 difficulty levels
- Leaderboard integration

---

## 🚀 How to Play

### Basic Controls
1. **Click a tile** to select it (shows golden ring)
2. **Click an adjacent tile** to swap
3. **Match 3+ traits** to crush them and score points
4. **Create combos** for bonus points
5. **Click "End Game"** when done to submit score

### Difficulty Levels
- **Novice**: 1.0× multiplier (beginner friendly)
- **Adept**: 1.3× multiplier (intermediate)
- **Master**: 1.6× multiplier (expert)

---

## 📁 File Locations

```
src/app/game/trait-crush/
├── page.tsx                      # Entry point
├── GameTraitCrushClient.tsx      # Main game logic (600+ lines)
└── trait-crush-animations.css    # Animations

src/lib/scoring.ts                # Updated scoring function
GAME_SCORING.md                   # Updated documentation
```

---

## 🎯 Scoring

### In-Game Score
- **3-Match**: 30 points
- **Combo**: Points × combo multiplier

### Leaderboard Points
```
Points = (Game Score ÷ 5) × Difficulty Multiplier + (Combos × 15)
```

**Examples:**
- 1,000 score on Novice = 200 points
- 1,500 score on Adept + 5 combos = 465 points
- 2,000 score on Master + 10 combos = 790 points

---

## 🔧 Key Features

### ✅ Implemented
- [x] Core match-3 mechanics
- [x] Tile swapping with validation
- [x] Automatic combo detection
- [x] Score tracking (score, moves, combos)
- [x] 3 difficulty levels
- [x] Leaderboard integration
- [x] Streak tracking
- [x] Stats modal
- [x] Responsive design
- [x] Smooth animations
- [x] Realmkin UI theme

### 🎨 Visual Design
- Emoji-based trait tiles
- Golden Realmkin color scheme
- Smooth CSS animations
- Framer Motion effects
- Responsive grid layout

---

## 🎲 Game Mechanics

### Traits
| Trait    | Icon | Color  |
|----------|------|--------|
| Strength | 💪   | Red    |
| Wisdom   | 🧠   | Blue   |
| Agility  | ⚡   | Green  |
| Vitality | ❤️   | Orange |
| Spirit   | ✨   | Purple |
| Fortune  | 🍀   | Yellow |

### Match Detection
- Checks horizontal rows for 3+ matches
- Checks vertical columns for 3+ matches
- Marks matched tiles as "blank"
- Processes automatically

### Tile Physics
1. Matched tiles disappear
2. Tiles above slide down
3. New tiles generate at top
4. Process repeats if new matches form

---

## 💻 Technical Details

### State Management
```typescript
interface GameState {
  board: Tile[][];        // 9×9 grid
  score: number;          // Current score
  moves: number;          // Move count
  combos: number;         // Combo count
  difficulty: Difficulty; // Current difficulty
  gameOver: boolean;      // Game status
  isProcessing: boolean;  // Processing flag
}
```

### Core Functions
- `checkAndCrushMatches()` - Detects and removes matches
- `slideTraits()` - Applies gravity to tiles
- `generateNewTraits()` - Creates new tiles
- `isValidMove()` - Validates swaps
- `handleTileSwap()` - Processes player moves

---

## 🔌 Integration

### Leaderboard
```typescript
// Submits score when game ends
await leaderboardService.submitScore(
  user.uid,
  userData.username,
  points,
  "traitCrush"
);
```

### Scoring
```typescript
// Calculates leaderboard points
const points = calculateTraitCrushPoints(
  gameState.score,
  gameState.difficulty,
  gameState.combos
);
```

---

## 🎨 Customization Options

### Easy Changes
1. **Board Size**: Change `BOARD_SIZE` constant
2. **Trait Types**: Modify `TRAITS` array
3. **Colors**: Update `TRAIT_COLORS` object
4. **Emojis**: Change `TRAIT_EMOJIS` object
5. **Scoring**: Adjust multipliers in `scoring.ts`

### Advanced Changes
1. Add power-ups (4+ matches)
2. Add objectives/goals
3. Add time limits
4. Add special tiles
5. Add sound effects

---

## 🐛 Troubleshooting

### Common Issues

**Tiles not swapping?**
- Ensure tiles are adjacent (not diagonal)
- Check if move creates a match
- Wait for processing to complete

**Score not submitting?**
- Click "End Game" button
- Ensure user is logged in
- Check Firebase connection

**Animations laggy?**
- Reduce animation delays
- Simplify CSS transitions
- Check device performance

---

## 📊 Balance Testing

### Expected Scores
- **Beginner**: 500-1,500 game score
- **Intermediate**: 1,000-2,500 game score
- **Advanced**: 1,500-3,500 game score

### Leaderboard Points
- **Novice**: 150-300 points/session
- **Adept**: 200-450 points/session
- **Master**: 250-500 points/session

---

## 🚀 Next Steps

### To Test
1. Navigate to `/game/trait-crush`
2. Select difficulty
3. Play a few games
4. Check leaderboard submission
5. Verify scoring calculations

### To Enhance
1. Add custom trait images
2. Implement power-ups
3. Add sound effects
4. Create daily challenges
5. Add achievements

---

## 📝 Code Snippets

### Add New Trait
```typescript
// In GameTraitCrushClient.tsx
const TRAITS = [
  "Strength", "Wisdom", "Agility", 
  "Vitality", "Spirit", "Fortune",
  "Courage" // New trait
];

const TRAIT_EMOJIS: Record<string, string> = {
  // ... existing traits
  Courage: "🦁",
};

const TRAIT_COLORS: Record<string, string> = {
  // ... existing traits
  Courage: "bg-amber-500",
};
```

### Adjust Scoring
```typescript
// In scoring.ts
const basePoints = score / 5; // Change divisor for different point ranges
const comboBonus = combos * 15; // Change multiplier for combo value
```

---

## 🎯 Success Metrics

### Gameplay
- Average session length: 5-10 minutes
- Average score: 1,000-2,000
- Average combos: 3-8 per game
- Average moves: 20-50

### Technical
- Load time: < 2 seconds
- Animation FPS: 60fps
- No memory leaks
- No crash bugs

---

## 📚 Resources

- **Full Documentation**: `TRAIT_CRUSH_IMPLEMENTATION.md`
- **Scoring Details**: `GAME_SCORING.md`
- **Source Code**: `src/app/game/trait-crush/`
- **Candy Crush Reference**: `candy-crush/` directory

---

## ✅ Checklist

Before deployment:
- [ ] Test all difficulty levels
- [ ] Verify leaderboard submission
- [ ] Check responsive design
- [ ] Test on mobile devices
- [ ] Verify animations work
- [ ] Test score calculations
- [ ] Check for console errors
- [ ] Verify auth integration
- [ ] Test new game flow
- [ ] Test end game flow

---

**Ready to play!** 🎮

Navigate to: `/game/trait-crush`
