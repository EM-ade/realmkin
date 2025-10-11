# Trait Crush Animation Overhaul Plan

## Problem Statement
Current implementation has noticeable lag between match detection and visual feedback. Animations feel disconnected and slow.

## Root Causes
1. **Sequential setTimeout delays** (~1.3s per combo)
2. **Batch state updates** causing visual jumps
3. **Mixed animation approaches** (CSS + Framer Motion)
4. **No swap animation** - instant position changes

## Solution Architecture

### 1. Tile Data Structure
```typescript
interface Tile {
  id: string;
  trait: TraitType;
  gridPosition: { row: number; col: number };
  visualPosition: { x: number; y: number };
  state: 'idle' | 'swapping' | 'matched' | 'falling' | 'entering';
  isNew?: boolean;
  isCrushing?: boolean;
}
```

### 2. Animation Phases (Sequential, Event-Driven)

#### Phase 1: Swap Animation (200ms)
- User clicks two adjacent tiles
- Tiles smoothly swap positions using Framer Motion
- `onAnimationComplete` → trigger match check

#### Phase 2: Match Detection (instant)
- Check for 3+ matches
- Mark matched tiles with `state: 'matched'`
- Trigger crush animation

#### Phase 3: Crush Animation (300ms)
- Matched tiles scale(1 → 1.2 → 0) + fade out
- `onAnimationComplete` → remove tiles, trigger collapse

#### Phase 4: Collapse Animation (400ms)
- Tiles above gaps fall down
- Use Framer Motion `layout` prop
- `onAnimationComplete` → trigger refill

#### Phase 5: Refill Animation (300ms)
- New tiles spawn from above grid
- Drop into empty positions
- `onAnimationComplete` → check for new matches (cascade)

### 3. Key Technical Changes

#### A. Absolute Positioning System
```tsx
<motion.div
  style={{
    position: 'absolute',
    left: `${tile.gridPosition.col * tileSize}px`,
    top: `${tile.gridPosition.row * tileSize}px`,
  }}
  layout
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
/>
```

#### B. Animation State Machine
```typescript
type AnimationPhase = 
  | 'idle'
  | 'swapping'
  | 'checking'
  | 'crushing'
  | 'collapsing'
  | 'refilling';

const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
```

#### C. Event-Driven Flow
```typescript
// No more setTimeout chains!
const handleSwapComplete = () => {
  setAnimationPhase('checking');
  checkForMatches();
};

const handleCrushComplete = () => {
  setAnimationPhase('collapsing');
  collapseTiles();
};

const handleCollapseComplete = () => {
  setAnimationPhase('refilling');
  refillBoard();
};

const handleRefillComplete = () => {
  if (hasMatches()) {
    setAnimationPhase('crushing'); // Cascade
  } else {
    setAnimationPhase('idle');
  }
};
```

### 4. Framer Motion Configuration

```tsx
<AnimatePresence mode="popLayout">
  {tiles.map(tile => (
    <motion.button
      key={tile.id}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: tile.state === 'matched' ? [1, 1.2, 0] : 1,
        opacity: tile.state === 'matched' ? 0 : 1,
        x: tile.visualPosition.x,
        y: tile.visualPosition.y,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        layout: { duration: 0.4, ease: "easeInOut" },
        scale: { duration: 0.3 },
        opacity: { duration: 0.3 },
      }}
      onAnimationComplete={handleTileAnimationComplete}
    />
  ))}
</AnimatePresence>
```

### 5. Performance Optimizations

- Use `transform` instead of `top/left` for GPU acceleration
- Batch state updates with `useTransition` (React 18)
- Memoize tile components with `React.memo`
- Use `will-change: transform` for animating elements

### 6. Timeline (Optimized)

| Phase | Duration | Trigger |
|-------|----------|---------|
| Swap | 200ms | User click |
| Match Check | 0ms | onSwapComplete |
| Crush | 300ms | Match found |
| Collapse | 400ms | onCrushComplete |
| Refill | 300ms | onCollapseComplete |
| **Total** | **1.2s** | **vs 1.5s current** |

### 7. Implementation Steps

1. ✅ Add `gridPosition` to Tile interface
2. ✅ Convert grid to absolute positioning
3. ✅ Implement swap animation with Framer Motion
4. ✅ Add animation state machine
5. ✅ Replace setTimeout with onAnimationComplete
6. ✅ Implement crush → collapse → refill chain
7. ✅ Add cascade detection
8. ✅ Test and tune timing

## Expected Results

- ✅ **Smooth swaps**: Tiles glide to new positions
- ✅ **Instant feedback**: No lag between action and reaction
- ✅ **Natural cascades**: Combos flow seamlessly
- ✅ **Responsive feel**: Game feels snappy and polished
- ✅ **Visual clarity**: Players can track what's happening

## Fallback Plan

If absolute positioning causes layout issues:
- Keep grid layout
- Use Framer Motion `layout` prop exclusively
- Reduce animation durations to 150-250ms
- Ensure `layoutId` is unique and stable
