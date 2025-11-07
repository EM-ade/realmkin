import Phaser from 'phaser';
import { BuildingType, Resources } from '../../types/kingdom';

export class UIScene extends Phaser.Scene {
  private resourceTexts: Map<keyof Resources, Phaser.GameObjects.Text>;
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private empireDisplay: Phaser.GameObjects.Container | null = null;
  private selectedBuildingType: BuildingType | null = null;

  constructor() {
    super({ key: 'UIScene' });
    this.resourceTexts = new Map();
  }

  create() {
    // Create resource display
    this.createResourceDisplay();
    
    // Create building menu
    this.createBuildingMenu();
    
    // Create empire display
    this.createEmpireDisplay();
    
    // Listen for events from main game scene
    this.setupEventListeners();
  }

  private createResourceDisplay() {
    const resources: (keyof Resources)[] = ['gold', 'wood', 'stone', 'food'];
    const colors = {
      gold: '#FFD700',
      wood: '#8B4513',
      stone: '#808080',
      food: '#90EE90'
    };
    
    const container = this.add.container(10, 10);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 250, 120, 10);
    container.add(bg);
    
    // Resource texts
    resources.forEach((resource, index) => {
      const icon = this.add.text(15, 15 + index * 25, this.getResourceIcon(resource), {
        fontSize: '20px',
        color: colors[resource]
      });
      
      const text = this.add.text(45, 15 + index * 25, `${resource}: 0`, {
        fontSize: '18px',
        color: '#ffffff'
      });
      
      this.resourceTexts.set(resource, text);
      container.add([icon, text]);
    });
    
    container.setDepth(100000);
  }

  private getResourceIcon(resource: keyof Resources): string {
    const icons = {
      gold: '💰',
      wood: '🪵',
      stone: '🪨',
      food: '🌾'
    };
    return icons[resource];
  }

  private createBuildingMenu() {
    const container = this.add.container(10, 150);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 250, 300, 10);
    container.add(bg);
    
    // Title
    const title = this.add.text(125, 15, 'Buildings', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0);
    container.add(title);
    
    // Building buttons
    const buildings = [
      { type: BuildingType.TOWN_HALL, name: 'Town Hall', icon: '🏛️' },
      { type: BuildingType.FARM, name: 'Farm', icon: '🌾' },
      { type: BuildingType.MINE, name: 'Mine', icon: '⛏️' },
      { type: BuildingType.LUMBER_MILL, name: 'Lumber Mill', icon: '🪓' },
      { type: BuildingType.BARRACKS, name: 'Barracks', icon: '⚔️' },
      { type: BuildingType.WALL, name: 'Wall', icon: '🧱' },
      { type: BuildingType.TOWER, name: 'Tower', icon: '🏰' },
      { type: BuildingType.MARKET, name: 'Market', icon: '🏪' }
    ];
    
    buildings.forEach((building, index) => {
      const y = 50 + index * 30;
      
      const button = this.add.rectangle(125, y, 220, 25, 0x333333);
      button.setInteractive();
      button.setStrokeStyle(2, 0x666666);
      
      const icon = this.add.text(20, y, building.icon, {
        fontSize: '18px'
      });
      icon.setOrigin(0, 0.5);
      
      const text = this.add.text(50, y, building.name, {
        fontSize: '16px',
        color: '#ffffff'
      });
      text.setOrigin(0, 0.5);
      
      button.on('pointerover', () => {
        button.setFillStyle(0x555555);
      });
      
      button.on('pointerout', () => {
        button.setFillStyle(0x333333);
      });
      
      button.on('pointerdown', () => {
        this.selectBuilding(building.type);
      });
      
      container.add([button, icon, text]);
    });
    
    container.setDepth(100000);
    this.buildMenu = container;
  }

  private createEmpireDisplay() {
    const container = this.add.container(this.scale.width - 260, 10);
    
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 250, 100, 10);
    container.add(bg);
    
    // Title
    const title = this.add.text(125, 15, 'Empire', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5, 0);
    container.add(title);
    
    // Empire name
    const empireName = this.add.text(125, 45, 'No Empire', {
      fontSize: '18px',
      color: '#999999'
    });
    empireName.setOrigin(0.5, 0);
    empireName.setName('empireName');
    container.add(empireName);
    
    // Boosts display
    const boosts = this.add.text(125, 70, '', {
      fontSize: '14px',
      color: '#00ff00'
    });
    boosts.setOrigin(0.5, 0);
    boosts.setName('boosts');
    container.add(boosts);
    
    container.setDepth(100000);
    this.empireDisplay = container;
  }

  private selectBuilding(type: BuildingType) {
    this.selectedBuildingType = type;
    
    // Notify main game scene
    const mainScene = this.scene.get('MainGameScene');
    mainScene.events.emit('buildingSelected', type);
    
    // Visual feedback
    this.showToast(`Selected: ${type.replace('_', ' ').toUpperCase()}`);
  }

  private setupEventListeners() {
    const mainScene = this.scene.get('MainGameScene');
    
    // Listen for tile selection
    mainScene.events.on('tileSelected', (position: { x: number, y: number }) => {
      if (this.selectedBuildingType) {
        // Place building at selected tile
        mainScene.events.emit('placeBuilding', {
          type: this.selectedBuildingType,
          position
        });
        
        // Clear selection
        this.selectedBuildingType = null;
        this.showToast('Building placed!');
      }
    });
    
    // Listen for resource updates
    this.events.on('updateResources', (resources: Resources) => {
      this.updateResourceDisplay(resources);
    });
    
    // Listen for empire updates
    this.events.on('updateEmpire', (empire: { name: string, boosts: any }) => {
      this.updateEmpireDisplay(empire);
    });
  }

  private updateResourceDisplay(resources: Resources) {
    Object.entries(resources).forEach(([key, value]) => {
      const text = this.resourceTexts.get(key as keyof Resources);
      if (text) {
        text.setText(`${key}: ${Math.floor(value)}`);
      }
    });
  }

  private updateEmpireDisplay(empire: { name: string, boosts: any }) {
    if (!this.empireDisplay) return;
    
    const nameText = this.empireDisplay.getByName('empireName') as Phaser.GameObjects.Text;
    const boostsText = this.empireDisplay.getByName('boosts') as Phaser.GameObjects.Text;
    
    if (nameText) {
      nameText.setText(empire.name);
      nameText.setColor('#FFD700');
    }
    
    if (boostsText && empire.boosts) {
      const boostStrings: string[] = [];
      if (empire.boosts.gold > 1) boostStrings.push(`Gold x${empire.boosts.gold}`);
      if (empire.boosts.wood > 1) boostStrings.push(`Wood x${empire.boosts.wood}`);
      if (empire.boosts.stone > 1) boostStrings.push(`Stone x${empire.boosts.stone}`);
      if (empire.boosts.food > 1) boostStrings.push(`Food x${empire.boosts.food}`);
      
      boostsText.setText(boostStrings.join(' | '));
    }
  }

  private showToast(message: string) {
    const toast = this.add.container(this.scale.width / 2, this.scale.height - 100);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-100, -20, 200, 40, 10);
    
    const text = this.add.text(0, 0, message, {
      fontSize: '16px',
      color: '#ffffff'
    });
    text.setOrigin(0.5, 0.5);
    
    toast.add([bg, text]);
    toast.setDepth(200000);
    toast.setAlpha(0);
    
    // Fade in and out
    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 300,
      yoyo: true,
      hold: 1000,
      onComplete: () => toast.destroy()
    });
  }

  update() {
    // Update UI positions on resize
    if (this.empireDisplay) {
      this.empireDisplay.x = this.scale.width - 260;
    }
  }
}
