# Kingdom Pixel Art Assets

## Generated Sprite Sheets

Your pixel art assets have been organized and combined into sprite sheets for efficient game loading.

## Folder Structure

```
public/assets/pixel-art/
├── buildings/          # Individual building images
├── units/              # Individual unit character images
├── terrain/            # Terrain tile images
├── resources/          # Resource icon images
└── sprite-sheets/      # Generated sprite sheets
    ├── buildings-sprites.png
    ├── buildings-metadata.json
    ├── units-sprites.png
    ├── units-metadata.json
    ├── terrain-sprites.png
    ├── terrain-metadata.json
    ├── resources-sprites.png
    ├── resources-metadata.json
    └── preview.html
```

## Usage in React/TypeScript

### 1. Import the Sprite Loader

```typescript
import { SpriteSheet } from '@/utils/sprite-sheet';

// Load sprite sheets
const buildingsSheet = SpriteSheet.load('/assets/pixel-art/sprite-sheets/buildings-sprites.png', 
                                         '/assets/pixel-art/sprite-sheets/buildings-metadata.json');

const unitsSheet = SpriteSheet.load('/assets/pixel-art/sprite-sheets/units-sprites.png', 
                                     '/assets/pixel-art/sprite-sheets/units-metadata.json');
```

### 2. Draw Sprites in Phaser

```typescript
// In your Phaser scene
function create() {
  // Load sprite sheet
  this.load.path = '/assets/pixel-art/sprite-sheets/';
  this.load.image('buildings', 'buildings-sprites.png');
  
  // Draw a building
  const townHall = buildingsSheet.getSprite('town_hall');
  this.add.image(400, 300, 'buildings')
    .setCrop(townHall.x, townHall.y, 64, 64);
}
```

### 3. Use in Three.js / React Three Fiber

```typescript
import { useSprite } from '@/hooks/useSprite';

function Building({ type, position }: { type: string; position: [number, number, number] }) {
  const sprite = useSprite('buildings', type);
  
  return (
    <sprite position={position} scale={[2, 2, 1]}>
      <spriteMaterial map={sprite} />
    </sprite>
  );
}
```

## Sprite Metadata Format

Each metadata JSON file contains:

```json
{
  "groupName": "buildings",
  "spriteSize": 64,
  "padding": 2,
  "columns": 8,
  "rows": 1,
  "sheetWidth": 530,
  "sheetHeight": 68,
  "totalSprites": 8,
  "sprites": [
    {
      "name": "town_hall",
      "index": 0,
      "column": 0,
      "row": 0,
      "x": 2,
      "y": 2
    }
    // ... more sprites
  ]
}
```

## Available Sprites

### Buildings (8 sprites)
- town_hall
- castle
- farm
- mine
- barracks
- marketplace
- house
- university

### Units (5 sprites)
- Villager
- soilder
- Archer
- knight
- wizard

### Terrain (5 sprites)
- grass
- water
- cobblestone
- dirt
- forrest

### Resources (5 sprites)
- gold=coin (gold)
- wheat
- wooden-log (wood)
- stone
- ore

## Preview

Open `public/assets/pixel-art/sprite-sheets/preview.html` in your browser to see all sprite sheets with individual previews.

## Regenerating Sprite Sheets

If you add new assets or regenerate existing ones:

```bash
cd tools
npm run generate
```

Or directly:

```bash
node tools/generate-sprite-sheets.js
```

## Adding New Assets

1. Add your image to the appropriate folder (e.g., `public/assets/pixel-art/buildings/`)
2. Update `tools/generate-sprite-sheets.js` to include the new file in the `ASSET_GROUPS` array
3. Run the generator again

## Tips

- All sprites are **64x64 pixels** (perfect for pixel art)
- **2px padding** between sprites prevents bleeding
- **Dark background** (#1a1a1a) matches the gold/black theme
- Sprite sheets are **PNG format** for transparency support
- Use `image-rendering: pixelated` in CSS to preserve crisp pixels
