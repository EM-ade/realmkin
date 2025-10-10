# Trait Crush Game - Implementation Guide

## Overview

Trait Crush is a match-3 puzzle game adapted from the classic Candy Crush mechanics, integrated into the Realmkin gaming platform. Players swap adjacent trait tiles to create matches of 3 or more, earning points and creating combos.

**Status**: ✅ Fully Implemented  
**Date**: October 10, 2025

---

## Game Mechanics

### Core Gameplay

1. **Board**: 9×9 grid of trait tiles
2. **Traits**: 6 different types (Strength, Wisdom, Agility, Vitality, Spirit, Fortune)
3. **Objective**: Match 3 or more adjacent traits to clear them and score points
4. **Swapping**: Click two adjacent tiles to swap them
5. **Combos**: Chain reactions when matches create new matches automatically

### Trait Types

| Trait     | Emoji | Color  |
|-----------|-------|--------|
| Strength  | 💪    | Red    |
| Wisdom    | 🧠    | Blue   |
| Agility   | ⚡    | Green  |
| Vitality  | ❤️    | Orange |
| Spirit    | ✨    | Purple |
| Fortune   | 🍀    | Yellow |

### Game Flow

1. Player selects a tile (highlighted with golden ring)
2. Player selects an adjacent tile to swap
3. If swap creates a match of 3+, tiles are crushed
4. Tiles slide down to fill empty spaces
5. New tiles generate at the top
6. Process repeats automatically until no more matches
7. Player can continue making moves or end the game

---

## Scoring System

### Formula
```
Points = (Game Score ÷ 5) × Difficulty Multiplier + Combo Bonus
```

### Difficulty Multipliers
- **Novice** (Simple): 1.0×
- **Adept** (Intermediate): 1.3×
- **Master** (Hard): 1.6×

### Point Values
- **3-Match**: 30 points
- **Combo Multiplier**: Points × combo count
- **Combo Bonus**: +15 points per combo (for leaderboard)

### Examples
- Score 1,000 on Novice = 200 leaderboard points
- Score 1,500 on Adept with 5 combos = 465 leaderboard points
- Score 2,000 on Master with 10 combos = 790 leaderboard points

---

## File Structure

```
src/app/game/trait-crush/
├── page.tsx                      # Next.js page component
├── GameTraitCrushClient.tsx      # Main game client component
└── trait-crush-animations.css    # Game-specific animations

src/lib/
└── scoring.ts                    # Updated with calculateTraitCrushPoints()

public/
└── (trait icons - optional)      # Can add custom trait images
```

---

## Key Features

### ✅ Implemented

1. **Core Match-3 Mechanics**
   - Tile swapping with adjacency validation
   - Horizontal and vertical match detection
   - Automatic tile crushing and sliding
   - New tile generation

2. **Combo System**
   - Automatic chain reaction detection
   - Combo counter and bonus points
   - Visual feedback for combos

3. **Difficulty Levels**
   - Three difficulty options
   - Different multipliers for scoring
   - Easy difficulty switching

4. **Score Tracking**
   - Real-time score display
   - Move counter
   - Combo tracker

5. **Leaderboard Integration**
   - Automatic score submission on game end
   - Streak tracking
   - Points calculated per difficulty

6. **UI/UX**
   - Realmkin-themed design
   - Smooth animations
   - Modal stats display
   - Responsive layout

7. **Game Controls**
   - New Game button
   - End Game button
   - Stats modal
   - Difficulty selector

---

## Technical Implementation

### State Management

```typescript
interface GameState {
  board: Tile[][];        // 9×9 grid of tiles
  score: number;          // Current game score
  moves: number;          // Number of moves made
  combos: number;         // Number of combos achieved
  difficulty: Difficulty; // Current difficulty
  gameOver: boolean;      // Game ended flag
  isProcessing: boolean;  // Processing matches flag
}
```

### Core Algorithms

#### 1. Match Detection
```typescript
// Checks horizontal and vertical lines for 3+ matches
// Returns new board with matched tiles marked as "blank"
checkAndCrushMatches(board: Tile[][]): { newBoard, matchCount }
```

#### 2. Tile Sliding
```typescript
// Slides tiles down to fill blank spaces
// Processes column by column from bottom to top
slideTraits(board: Tile[][]): Tile[][]
```

#### 3. Tile Generation
```typescript
// Generates new random traits at top row
// Only fills blank spaces
generateNewTraits(board: Tile[][]): Tile[][]
```

#### 4. Move Validation
```typescript
// Validates if a swap creates at least one match
// Prevents invalid moves
isValidMove(board: Tile[][]): boolean
```

---

## Game Loop

```
1. Player swaps two tiles
   ↓
2. Validate move creates match
   ↓
3. Mark matched tiles as blank
   ↓
4. Calculate points (30 × matches × combo)
   ↓
5. Slide tiles down
   ↓
6. Generate new tiles at top
   ↓
7. Check for new matches
   ↓
8. If matches exist, repeat from step 3
   ↓
9. If no matches, wait for next player move
```

---

## Integration Points

### Leaderboard Service

```typescript
// Submit score when game ends
await leaderboardService.submitScore(
  user.uid,
  userData.username,
  points,
  "traitCrush"
);

// Update player streak
await leaderboardService.updateStreak(
  user.uid,
  userData.username
);
```

### Scoring Service

```typescript
// Calculate leaderboard points
const points = calculateTraitCrushPoints(
  gameState.score,      // Raw game score
  gameState.difficulty, // Difficulty level
  gameState.combos      // Number of combos
);
```

---

## UI Components

### Header Bar
- Game title
- Difficulty selector (3 buttons)
- Stats button

### Score Panel
- Score display
- Moves counter
- Combos counter

### Game Board
- 9×9 grid of trait tiles
- Click to select/swap
- Visual feedback for selection
- Smooth animations

### Controls
- New Game button (resets board)
- End Game button (submits score)

### Stats Modal
- Final score
- Moves made
- Combos achieved
- Play Again button

---

## Animations

### CSS Animations
- `trait-crush`: Tile disappearing effect
- `trait-slide-down`: Tiles falling animation
- `trait-pop-in`: New tiles appearing
- `trait-shake`: Invalid move feedback
- `trait-glow`: Selected tile highlight
- `combo-pulse`: Combo achievement effect

### Framer Motion
- Modal entrance/exit
- Button hover effects
- Tile interactions

---

## Styling

### Color Scheme
- Background: `#050302` (dark)
- Primary: `#DA9C2F` (gold)
- Accent: `#F4C752` (bright gold)
- Borders: `#DA9C2F/20` (translucent gold)
- Cards: `#0B0B09/80` (dark with opacity)

### Trait Colors
- Strength: Red (`bg-red-500`)
- Wisdom: Blue (`bg-blue-500`)
- Agility: Green (`bg-green-500`)
- Vitality: Orange (`bg-orange-500`)
- Spirit: Purple (`bg-purple-500`)
- Fortune: Yellow (`bg-yellow-500`)

---

## Future Enhancements

### Potential Features

1. **Power-Ups**
   - Special tiles from 4+ matches
   - Striped traits (clear row/column)
   - Wrapped traits (clear area)
   - Color bombs (clear all of one type)

2. **Objectives Mode**
   - Clear X traits in Y moves
   - Reach target score
   - Time-limited challenges

3. **Daily Challenges**
   - Special board configurations
   - Bonus rewards
   - Streak tracking

4. **Achievements**
   - High combo achievements
   - Score milestones
   - Perfect game bonuses

5. **Visual Enhancements**
   - Particle effects
   - Better animations
   - Custom trait icons/images
   - Sound effects

6. **Multiplayer**
   - Head-to-head matches
   - Leaderboard tournaments
   - Real-time battles

---

## Testing Checklist

### Functionality
- ✅ Tiles swap correctly
- ✅ Matches detected (horizontal/vertical)
- ✅ Tiles crush and disappear
- ✅ Tiles slide down properly
- ✅ New tiles generate at top
- ✅ Combos detected and counted
- ✅ Score calculated correctly
- ✅ Invalid moves rejected
- ✅ Difficulty changes work
- ✅ Game over submits score

### UI/UX
- ✅ Responsive on mobile
- ✅ Animations smooth
- ✅ Buttons functional
- ✅ Modal opens/closes
- ✅ Stats display correctly
- ✅ Visual feedback clear

### Integration
- ✅ Leaderboard submission works
- ✅ Streak updates
- ✅ Points calculated correctly
- ✅ Auth context integrated

---

## Known Issues

None currently identified.

---

## Performance Considerations

1. **Board Processing**: Uses `useRef` to prevent race conditions during match processing
2. **Animation Delays**: Staggered delays for smooth visual flow
3. **State Updates**: Batched updates to minimize re-renders
4. **Memory**: Board recreated on new game to prevent memory leaks

---

## Comparison to Original Candy Crush

### Adapted from Original
- 9×9 board (same size)
- Match-3 mechanics (identical)
- Tile swapping (same logic)
- Gravity/sliding (same algorithm)
- Combo detection (same approach)

### Realmkin Customizations
- Trait theme instead of candies
- Emoji-based tiles (simpler graphics)
- Integrated leaderboard
- Difficulty system
- Realmkin UI styling
- No power-ups (simplified)
- No level progression (endless mode)

---

## Code Quality

### Best Practices
- TypeScript for type safety
- React hooks for state management
- Functional components
- Memoization for performance
- Clean separation of concerns
- Comprehensive comments

### Accessibility
- Semantic HTML
- ARIA labels on buttons
- Keyboard navigation support
- Clear visual feedback
- High contrast colors

---

## Deployment Notes

### Requirements
- Next.js 14+
- React 18+
- Framer Motion
- Firebase (for leaderboard)
- Tailwind CSS

### Environment
- Works in development and production
- No server-side dependencies
- Client-side only game logic
- Firebase for score persistence

---

## Maintenance

### Regular Updates
- Monitor leaderboard scores for balance
- Adjust scoring formula if needed
- Add new traits/features as requested
- Fix bugs as reported

### Monitoring
- Track average scores per difficulty
- Monitor combo frequency
- Check for exploit patterns
- Review user feedback

---

## Credits

**Original Candy Crush Mechanics**: Adapted from classic match-3 game  
**Implementation**: Realmkin Development Team  
**Design**: Realmkin UI/UX Standards  
**Date**: October 2025

---

**End of Document**
