import Phaser from "phaser";
import { useGameState } from "@/stores/gameStore";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    useGameState.getState().setCurrentScene("MainMenu");

    const isMobile = width < 768;
    const titleFontSize = isMobile ? "48px" : "84px";
    const subtitleFontSize = isMobile ? "20px" : "32px";

    // Title
    const title = this.add.text(width / 2, height / 3, "KINGDOM", {
      fontSize: titleFontSize,
      fontFamily: "Bangers, cursive, Arial Black",
      color: "#FFD700",
      stroke: "#000000",
      strokeThickness: isMobile ? 6 : 10,
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(
      width / 2,
      title.y + (isMobile ? 40 : 70),
      "SOVEREIGN",
      {
        fontSize: subtitleFontSize,
        fontFamily: "Bangers, cursive, Arial Black",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: isMobile ? 3 : 5,
      },
    );
    subtitle.setOrigin(0.5);

    // Instructions
    const instructions = this.add.text(
      width / 2,
      height - 60,
      "Build your village • Train your army • Conquer your enemies",
      {
        fontSize: "16px",
        fontFamily: "Manrope, sans-serif",
        fontStyle: "bold",
        color: "#d7ccc8",
        stroke: "#000000",
        strokeThickness: 3,
      },
    );
    instructions.setOrigin(0.5);

    // Watch for scene changes from React space (after login)
    const unsubscribe = useGameState.subscribe((state) => {
      if (state.currentScene === "Village") {
        unsubscribe();
        this.scene.start("VillageScene");
      }
    });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
    });
  }
}
