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
    
    const assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 40,
      text: '',
      style: {
        font: '14px monospace',
        color: '#aaaaaa'
      }
    });
    assetText.setOrigin(0.5, 0.5);
    
    // Update progress bar
    this.load.on('progress', (value: number) => {
      percentText.setText(Math.floor(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('fileprogress', (file: any) => {
      assetText.setText('Loading: ' + file.key);
    });
    
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    // Add error handling
    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load asset:', file.key, file.src);
    });

    // Load tile assets
    this.load.setPath('/assets/tiles/');
    
    // Load main tile spritesheets
    this.load.spritesheet('grass-tiles', 'grass_tiles.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    this.load.spritesheet('ice-tiles', 'ice-tiles.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    this.load.spritesheet('sand-tiles', 'sand-tiles.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    // Load Tiny Swords tilemap
    this.load.spritesheet('tilemap-flat', 'tinyswords/Tilemap_Flat.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    // Load water animation
    this.load.spritesheet('water', 'tinyswords/Water.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    
    // Load decorations
    this.load.image('tree1', 'tinyswords/deco/Tree1.png');
    this.load.image('tree2', 'tinyswords/deco/Tree2.png');
    this.load.image('tree3', 'tinyswords/deco/Tree3.png');
    this.load.image('rock1', 'tinyswords/deco/Rock1.png');
    this.load.image('rock2', 'tinyswords/deco/Rock2.png');
    
    // Load building assets from kingdom-assets if they exist
    this.load.setPath('/kingdom-assets/');
    
    // Try to load building sprites
    this.load.image('house', 'Free Sample/Medieval Town - Free Sample-2-House.png');
    this.load.image('crate-0', 'Free Sample/Medieval Town - Free Sample-0-Crate-0.png');
    
    // Reset path
    this.load.setPath('/');
  }

  create() {
    console.log('Assets loaded successfully!');
    
    // Start the main game scene
    this.scene.start('MainGameScene');
    this.scene.start('UIScene');
  }
}
