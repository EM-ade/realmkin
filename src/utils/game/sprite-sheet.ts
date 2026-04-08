import Phaser from 'phaser';

export interface SpriteData {
  name: string;
  index: number;
  column: number;
  row: number;
  x: number;
  y: number;
}

export interface SpriteSheetMetadata {
  groupName: string;
  spriteSize: number;
  padding: number;
  columns: number;
  rows: number;
  sheetWidth: number;
  sheetHeight: number;
  totalSprites: number;
  sprites: SpriteData[];
}

export class SpriteSheet {
  private metadata: SpriteSheetMetadata | null = null;
  private textureKey: string;

  constructor(textureKey: string) {
    this.textureKey = textureKey;
  }

  static load(
    scene: Phaser.Scene,
    textureKey: string,
    texturePath: string,
    metadataPath: string
  ): SpriteSheet {
    scene.load.image(textureKey, texturePath);
    
    const spriteSheet = new SpriteSheet(textureKey);
    
    // Load metadata
    scene.load.json(`${textureKey}-metadata`, metadataPath);
    
    scene.events.once('ready', () => {
      const metadata = scene.cache.json.get(`${textureKey}-metadata`);
      if (metadata) {
        spriteSheet.metadata = metadata;
      }
    });
    
    return spriteSheet;
  }

  getSprite(name: string): SpriteData | null {
    if (!this.metadata) {
      console.warn(`Metadata not loaded for ${this.textureKey}`);
      return null;
    }
    
    const sprite = this.metadata.sprites.find((s) => s.name === name);
    return sprite || null;
  }

  getSpriteRect(name: string): Phaser.Geom.Rectangle | null {
    const sprite = this.getSprite(name);
    if (!sprite || !this.metadata) return null;
    
    return new Phaser.Geom.Rectangle(
      sprite.x,
      sprite.y,
      this.metadata.spriteSize,
      this.metadata.spriteSize
    );
  }

  drawSprite(
    scene: Phaser.Scene,
    name: string,
    x: number,
    y: number,
    scale: number = 1
  ): Phaser.GameObjects.Image | null {
    const rect = this.getSpriteRect(name);
    if (!rect || !this.metadata) return null;
    
    const image = scene.add.image(x, y, this.textureKey);
    image.setCrop(rect.x, rect.y, rect.width, rect.height);
    image.setScale(scale);
    
    return image;
  }

  getAllSprites(): SpriteData[] {
    return this.metadata?.sprites || [];
  }
}
