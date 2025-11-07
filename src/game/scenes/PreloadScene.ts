import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: 'Loading Kingdom Assets...',
      style: {
        font: '20px monospace',
        color: '#ffffff'
      }
    });
    loadingText.setOrigin(0.5, 0.5);
    
    const percentText = this.make.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        font: '18px monospace',
        color: '#ffffff'
      }
    });
    percentText.setOrigin(0.5, 0.5);
    
    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Add error handling for failed loads
    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load:', file.src);
    });

    // Load isometric tiles with proper settings to avoid black edges
    this.load.setPath('/kingdom-assets/');
    
    // Load terrain tiles - using spritesheet to properly handle transparency
    this.load.spritesheet('terrain-tiles', 'IsometricTRPGAssetPack/Assets/Isometric_MedievalFantasy_Tiles.png', {
      frameWidth: 64,
      frameHeight: 64,
      spacing: 0,
      margin: 0
    });
    
    // Load buildings from Free Sample
    this.load.image('house', 'Free Sample/Medieval Town - Free Sample-2-House.png');
    this.load.image('crate-0', 'Free Sample/Medieval Town - Free Sample-0-Crate-0.png');
    this.load.image('crate-1', 'Free Sample/Medieval Town - Free Sample-1-Crate-1.png');
    this.load.image('trolley', 'Free Sample/Medieval Town - Free Sample-3-Trolley.png');
    this.load.image('rock', 'Free Sample/Medieval Town - Free Sample-4-Rock.png');
    this.load.image('grass-0', 'Free Sample/Medieval Town - Free Sample-6-Grass-0.png');
    this.load.image('grass-1', 'Free Sample/Medieval Town - Free Sample-7-Grass-1.png');
    
    // Load entities
    this.load.spritesheet('entities', 'IsometricTRPGAssetPack/Assets/IsometricTRPGAssetPack_Entities.png', {
      frameWidth: 64,
      frameHeight: 64,
      spacing: 0,
      margin: 0
    });
    
    // Load UI elements
    this.load.image('ui-elements', 'IsometricTRPGAssetPack/Assets/IsometricTRPGAssetPack_UI.png');
    
    // Load Tiny Swords assets if available
    this.load.spritesheet('tilemap-flat', 'TinySwordsComplete/Tilemap_Flat copy.png', {
      frameWidth: 64,
      frameHeight: 64,
      spacing: 0,
      margin: 0
    });

    // Set default texture filter to prevent black edges
    this.textures.on('addtexture', (texture: Phaser.Textures.Texture) => {
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }

  create() {
    // Process loaded textures to remove black edges
    this.processTexturesForTransparency();
    
    // Start the main game scene
    this.scene.start('MainGameScene');
    this.scene.start('UIScene');
  }

  private processTexturesForTransparency() {
    // Get all loaded textures
    const textureNames = ['terrain-tiles', 'entities', 'tilemap-flat'];
    
    textureNames.forEach(textureName => {
      if (this.textures.exists(textureName)) {
        const texture = this.textures.get(textureName);
        
        // Set texture to use premultiplied alpha to avoid black edges
        if (texture.source && texture.source[0]) {
          const source = texture.source[0];
          if (source.glTexture && source.renderer.type === Phaser.WEBGL) {
            const renderer = source.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
            const gl = renderer.gl;
            gl.bindTexture(gl.TEXTURE_2D, source.glTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            // Enable premultiplied alpha
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
          }
        }
      }
    });
  }
}
