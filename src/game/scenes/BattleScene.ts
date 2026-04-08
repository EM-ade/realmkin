import Phaser from "phaser";
import { getUnitStats, getCombatModifier } from "@/game/config/units";
import { SCENARIOS } from "@/game/config/scenarios";
import { useGameState } from "@/stores/gameStore";
import type { UnitType, BattleResult } from "@/stores/gameStore";

// ── Combat engine ─────────────────────────────────────────────────────────────
interface ArmySide {
  units: { type: string; count: number; hp: number }[];
}

function resolveRound(
  attackers: ArmySide,
  defenders: ArmySide,
  log: { text: string; color: string }[],
  roundNum: number,
): void {
  log.push({ text: `── Round ${roundNum} ──`, color: "#D4AF37" });

  attackers.units.forEach((att) => {
    if (att.count <= 0) return;
    const stats = getUnitStats(att.type, 1);
    const target = defenders.units.find((d) => d.count > 0);
    if (!target) return;
    const mod = getCombatModifier(att.type, target.type);
    const dmg = Math.floor(stats.attack * att.count * mod);
    const targetStats = getUnitStats(target.type, 1);
    const casualties = Math.min(target.count, Math.floor(dmg / Math.max(1, targetStats.health)));
    target.count -= casualties;
    if (casualties > 0)
      log.push({ text: `  ⚔ ${att.type}×${att.count} → ${casualties} ${target.type} killed`, color: "#88ccff" });
  });

  defenders.units.forEach((def) => {
    if (def.count <= 0) return;
    const stats = getUnitStats(def.type, 1);
    const target = attackers.units.find((a) => a.count > 0);
    if (!target) return;
    const mod = getCombatModifier(def.type, target.type);
    const dmg = Math.floor(stats.attack * def.count * mod);
    const targetStats = getUnitStats(target.type, 1);
    const casualties = Math.min(target.count, Math.floor(dmg / Math.max(1, targetStats.health)));
    target.count -= casualties;
    if (casualties > 0)
      log.push({ text: `  💀 Enemy ${def.type}×${def.count} → ${casualties} ${target.type} killed`, color: "#ff8888" });
  });
}

function runCombat(
  playerUnits: { type: string; count: number }[],
  enemyUnits: { type: string; count: number }[],
  wallBonus: number,
  towerBonus: number,
): { log: { text: string; color: string }[]; playerSurvivors: ArmySide; enemySurvivors: ArmySide } {
  const log: { text: string; color: string }[] = [];

  const player: ArmySide = {
    units: playerUnits.map((u) => ({ ...u, hp: getUnitStats(u.type, 1).health * u.count })),
  };
  const enemy: ArmySide = {
    units: enemyUnits.map((u) => ({ ...u, hp: getUnitStats(u.type, 1).health * u.count })),
  };

  if (wallBonus > 0)
    log.push({ text: `🧱 Walls provide +${wallBonus} defense`, color: "#aaaaff" });
  if (towerBonus > 0)
    log.push({ text: `🗼 Towers deal +${towerBonus} ranged damage/round`, color: "#aaaaff" });

  const MAX_ROUNDS = 10;
  for (let r = 1; r <= MAX_ROUNDS; r++) {
    if (towerBonus > 0) {
      const t = enemy.units.find((u) => u.count > 0);
      if (t) {
        const stats = getUnitStats(t.type, 1);
        const cas = Math.min(t.count, Math.floor(towerBonus / Math.max(1, stats.health)));
        t.count -= cas;
        if (cas > 0)
          log.push({ text: `  🗼 Towers → ${cas} ${t.type} killed`, color: "#ffcc66" });
      }
    }

    resolveRound(player, enemy, log, r);

    const playerAlive = player.units.reduce((s, u) => s + u.count, 0);
    const enemyAlive = enemy.units.reduce((s, u) => s + u.count, 0);
    if (playerAlive <= 0 || enemyAlive <= 0) break;
  }

  return { log, playerSurvivors: player, enemySurvivors: enemy };
}

// ── BattleScene ───────────────────────────────────────────────────────────────
export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }

  create(data: { waveIndex: number; scenarioId: number }): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#06060f");

    const store = useGameState.getState();
    const scenario = SCENARIOS.find((s) => s.id === (data?.scenarioId ?? store.currentScenario));
    const waveIndex = data?.waveIndex ?? 0;
    const wave = scenario?.enemyWaves?.[waveIndex];

    if (!wave) {
      this.scene.start("VillageScene");
      return;
    }

    // ── Compute bonuses ───────────────────────────────────────────────────────
    const walls = store.buildings.filter((b) => b.type === "wall" && !b.damaged);
    const towers = store.buildings.filter((b) => b.type === "tower" && !b.damaged);
    const wallBonus = walls.reduce((s, w) => s + w.level * 5, 0);
    const towerBonus = towers.reduce((s, t) => s + t.level * 10, 0);

    // ── Run combat ────────────────────────────────────────────────────────────
    const playerArmy = store.units.map((u) => ({ type: u.type, count: u.count }));
    const enemyArmy = wave.units.map((u) => ({ type: u.type, count: u.count }));

    const { log, playerSurvivors, enemySurvivors } = runCombat(
      playerArmy, enemyArmy, wallBonus, towerBonus,
    );

    const enemyAlive = enemySurvivors.units.reduce((s, u) => s + u.count, 0);
    const won = enemyAlive <= 0;

    // ── Casualties ────────────────────────────────────────────────────────────
    const playerCasualties: Record<UnitType, number> = { militia: 0, swordsman: 0, archer: 0, cavalry: 0 };
    store.units.forEach((u) => {
      const survivor = playerSurvivors.units.find((s) => s.type === u.type);
      playerCasualties[u.type as UnitType] = u.count - (survivor?.count ?? 0);
    });
    const enemyCasualties: Record<string, number> = {};
    wave.units.forEach((u) => {
      const survivor = enemySurvivors.units.find((s) => s.type === u.type);
      enemyCasualties[u.type] = u.count - (survivor?.count ?? 0);
    });

    // Winner gains loot, loser loses some resources
    const lootWon = won ? {
      wood: Math.floor(store.resources.wood * 0.15) + 50,
      clay: Math.floor(store.resources.clay * 0.15) + 50,
      iron: Math.floor(store.resources.iron * 0.15) + 25,
      crop: Math.floor(store.resources.crop * 0.15) + 50,
    } : {};
    const lootLost = !won ? {
      wood: Math.floor(store.resources.wood * 0.1),
      clay: Math.floor(store.resources.clay * 0.1),
      iron: Math.floor(store.resources.iron * 0.1),
      crop: Math.floor(store.resources.crop * 0.1),
    } : {};
    const nonWallBuildings = store.buildings.filter((b) => b.type !== "wall" && b.type !== "tower" && !b.damaged);
    const damagedBuildingId = !won && nonWallBuildings.length > 0
      ? nonWallBuildings[Math.floor(Math.random() * nonWallBuildings.length)].id
      : undefined;

    const result: BattleResult = { won, playerCasualties, enemyCasualties, lootWon, lootLost, damagedBuildingId, log: log.map(l => l.text) };
    store.applyBattleResult(result);
    store.save();

    // ── Draw scene ────────────────────────────────────────────────────────────
    this.drawBackground(width, height);
    this.drawScenarioTitle(width, scenario?.name ?? "Battle", waveIndex + 1);
    this.drawBattleLog(width, height, log);
    this.drawResultBanner(width, height, won);
    this.drawReturnButton(width, height);

    // Animate armies marching in
    this.spawnArmies(width, height, store.units, wave.units, playerSurvivors, enemySurvivors, won);
  }

  // ── Background ────────────────────────────────────────────────────────────
  private drawBackground(width: number, height: number): void {
    const g = this.add.graphics();

    // Sky gradient
    g.fillGradientStyle(0x0a0a2a, 0x0a0a2a, 0x1a0a0a, 0x1a0a0a, 1);
    g.fillRect(0, 0, width, height);

    // Ground plane
    g.fillGradientStyle(0x1a1a0a, 0x1a1a0a, 0x0a0a05, 0x0a0a05, 1);
    g.fillRect(0, height * 0.62, width, height * 0.38);

    // Horizon glow
    g.fillStyle(0x331100, 0.3);
    g.fillRect(0, height * 0.58, width, 40);

    // Ground line
    g.lineStyle(2, 0x553311, 0.8);
    g.lineBetween(0, height * 0.63, width, height * 0.63);

    // Stars
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height * 0.55;
      const alpha = Math.random() * 0.7 + 0.1;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(sx, sy, Math.random() < 0.1 ? 2 : 1);
    }

    // Battle dust clouds on ground
    for (let i = 0; i < 8; i++) {
      const dx = (width / 8) * i + Math.random() * 40;
      const dy = height * 0.63 + Math.random() * 30;
      g.fillStyle(0x4a3a2a, 0.15 + Math.random() * 0.1);
      g.fillEllipse(dx, dy, 80 + Math.random() * 60, 20 + Math.random() * 10);
    }

    // Center divider line
    g.lineStyle(1, 0x553311, 0.4);
    g.lineBetween(width / 2, height * 0.1, width / 2, height * 0.63);
  }

  // ── Scenario title ────────────────────────────────────────────────────────
  private drawScenarioTitle(width: number, scenarioName: string, wave: number): void {
    this.add.text(width / 2, 18, `${scenarioName} — Wave ${wave}`, {
      fontSize: "13px", fontFamily: "Arial", color: "#aaaaaa",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(10);
  }

  // ── Army spawning with march-in animation ─────────────────────────────────
  private spawnArmies(
    width: number,
    height: number,
    playerUnits: { type: string; count: number }[],
    enemyWaveUnits: { type: string; count: number }[],
    playerSurvivors: ArmySide,
    enemySurvivors: ArmySide,
    _won: boolean,
  ): void {
    const groundY = height * 0.62;
    const sprSize = 88;
    const colW = 96;
    const rowH = 100;

    // ── Player side ──────────────────────────────────────────────────────────
    const playerCenterX = width * 0.22;

    this.add.text(playerCenterX, groundY - 220, "Your Army", {
      fontSize: "16px", fontFamily: "Arial", color: "#88ccff",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    playerUnits.forEach((u, i) => {
      const texKey = `unit-${u.type}-t1`;
      const survivor = playerSurvivors.units.find((s) => s.type === u.type);
      const alive = survivor?.count ?? 0;
      const ci = i % 3, ri = Math.floor(i / 3);
      const targetX = playerCenterX + (ci - 1) * colW;
      const targetY = groundY - 60 - ri * rowH;
      const startX = -sprSize;

      if (!this.textures.exists(texKey)) return;

      const spr = this.add.image(startX, targetY, texKey)
        .setDisplaySize(sprSize, sprSize)
        .setOrigin(0.5, 1)
        .setDepth(20 + i);

      if (alive === 0) {
        spr.setTint(0x444444).setAlpha(0.5);
      }

      // March in from left
      this.tweens.add({
        targets: spr,
        x: targetX,
        duration: 600,
        delay: i * 120,
        ease: "Power2.easeOut",
        onComplete: () => {
          // Idle bob
          if (alive > 0) {
            this.tweens.add({
              targets: spr,
              y: targetY - 4,
              duration: 800 + i * 100,
              yoyo: true, repeat: -1,
              ease: "Sine.easeInOut",
            });
          }
        },
      });

      // Count badge
      const badge = this.add.text(targetX + 28, targetY - sprSize + 4, `${alive}/${u.count}`, {
        fontSize: "11px", fontFamily: "Arial",
        color: alive > 0 ? "#88ff88" : "#ff4444",
        stroke: "#000", strokeThickness: 3,
        backgroundColor: "#000000aa",
        padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(30).setAlpha(0);

      this.tweens.add({
        targets: badge,
        alpha: 1,
        duration: 300,
        delay: i * 120 + 500,
      });

      // Unit name label
      this.add.text(targetX, targetY + 4, u.type, {
        fontSize: "9px", fontFamily: "Arial", color: "#aaaaaa",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(30).setAlpha(0.8);
    });

    if (playerUnits.length === 0) {
      this.add.text(playerCenterX, groundY - 80, "No units\ndeployed!", {
        fontSize: "14px", fontFamily: "Arial", color: "#ff6666",
        align: "center", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10);
    }

    // ── VS ──────────────────────────────────────────────────────────────────
    const vsText = this.add.text(width / 2, groundY - 100, "VS", {
      fontSize: "36px", fontFamily: "Arial", color: "#D4AF37",
      stroke: "#000", strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: vsText, alpha: 1, duration: 400, delay: 500 });

    // ── Enemy side ───────────────────────────────────────────────────────────
    const enemyCenterX = width * 0.78;

    this.add.text(enemyCenterX, groundY - 220, "Enemy Forces", {
      fontSize: "16px", fontFamily: "Arial", color: "#ff8888",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    enemyWaveUnits.forEach((u, i) => {
      const texKey = `unit-enemy-${u.type}`;
      const fallback = `unit-${u.type}-t1`;
      const key = this.textures.exists(texKey) ? texKey : (this.textures.exists(fallback) ? fallback : null);
      const survivor = enemySurvivors.units.find((s) => s.type === u.type);
      const alive = survivor?.count ?? 0;
      const ci = i % 3, ri = Math.floor(i / 3);
      const targetX = enemyCenterX + (ci - 1) * colW;
      const targetY = groundY - 60 - ri * rowH;
      const startX = width + sprSize;

      if (!key) return;

      const spr = this.add.image(startX, targetY, key)
        .setDisplaySize(sprSize, sprSize)
        .setOrigin(0.5, 1)
        .setFlipX(true)
        .setDepth(20 + i);

      if (alive === 0) {
        spr.setTint(0x444444).setAlpha(0.5);
      }

      // March in from right
      this.tweens.add({
        targets: spr,
        x: targetX,
        duration: 600,
        delay: i * 120,
        ease: "Power2.easeOut",
        onComplete: () => {
          if (alive > 0) {
            this.tweens.add({
              targets: spr,
              y: targetY - 4,
              duration: 900 + i * 80,
              yoyo: true, repeat: -1,
              ease: "Sine.easeInOut",
            });
          }
        },
      });

      // Count badge
      const badge = this.add.text(targetX - 28, targetY - sprSize + 4, `${alive}/${u.count}`, {
        fontSize: "11px", fontFamily: "Arial",
        color: alive > 0 ? "#ff8888" : "#888888",
        stroke: "#000", strokeThickness: 3,
        backgroundColor: "#000000aa",
        padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(30).setAlpha(0);

      this.tweens.add({
        targets: badge,
        alpha: 1,
        duration: 300,
        delay: i * 120 + 500,
      });

      this.add.text(targetX, targetY + 4, u.type, {
        fontSize: "9px", fontFamily: "Arial", color: "#ffaaaa",
        stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(30).setAlpha(0.8);
    });
  }

  // ── Battle log ────────────────────────────────────────────────────────────
  private drawBattleLog(
    width: number,
    height: number,
    log: { text: string; color: string }[],
  ): void {
    const logW = Math.min(width * 0.42, 380);
    const logH = height * 0.30;
    const lx = width / 2 - logW / 2;
    const ly = height * 0.64;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(lx, ly, logW, logH, 8);
    bg.lineStyle(1, 0x443322, 1);
    bg.strokeRoundedRect(lx, ly, logW, logH, 8);
    bg.setDepth(10);

    this.add.text(lx + logW / 2, ly + 8, "⚔ Battle Log", {
      fontSize: "12px", fontFamily: "Arial", color: "#D4AF37",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(11);

    const lineH = 14;
    const maxLines = Math.floor((logH - 28) / lineH);
    const shown = log.slice(-maxLines);
    shown.forEach((entry, i) => {
      this.add.text(lx + 8, ly + 26 + i * lineH, entry.text, {
        fontSize: "10px", fontFamily: "Arial", color: entry.color,
        wordWrap: { width: logW - 16 },
      }).setDepth(11);
    });
  }

  // ── Result banner ─────────────────────────────────────────────────────────
  private drawResultBanner(width: number, _height: number, won: boolean): void {
    const bw = Math.min(width * 0.5, 440), bh = 90;
    const bx = width / 2 - bw / 2, by = 38;

    const bg = this.add.graphics().setDepth(15);
    bg.fillStyle(won ? 0x0a2a0a : 0x2a0a0a, 0.95);
    bg.fillRoundedRect(bx, by, bw, bh, 10);
    bg.lineStyle(3, won ? 0x44ff44 : 0xff4444, 1);
    bg.strokeRoundedRect(bx, by, bw, bh, 10);

    const icon = won ? "🏆" : "💀";
    const title = won ? "Victory!" : "Defeat!";
    const titleColor = won ? "#FFD700" : "#ff6666";

    this.add.text(width / 2, by + 22, `${icon} ${title}`, {
      fontSize: "28px", fontFamily: "Arial", color: titleColor,
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(16);

    // Sub-message
    const store = useGameState.getState();
    const result = store.lastBattleResult;
    let sub = "";
    if (won) {
      const loot = result?.lootWon ?? {};
      const casText = Object.entries(result?.playerCasualties ?? {})
        .filter(([, v]) => v > 0)
        .map(([t, v]) => `-${v} ${t}`).join("  ") || "No losses!";
      const lootText = Object.entries(loot).some(([, v]) => (v ?? 0) > 0)
        ? ` + ${loot.wood ?? 0}W ${loot.clay ?? 0}C ${loot.iron ?? 0}I ${loot.crop ?? 0}F`
        : "";
      sub = casText + lootText;
    } else {
      const loot = result?.lootLost ?? {};
      sub = `Lost: ${loot.wood ?? 0}W  ${loot.clay ?? 0}C  ${loot.iron ?? 0}I  ${loot.crop ?? 0}F`;
    }

    this.add.text(width / 2, by + 58, sub, {
      fontSize: "12px", fontFamily: "Arial",
      color: won ? "#88ff88" : "#ffaaaa",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(16);

    // Animate in
    bg.setAlpha(0);
    this.tweens.add({ targets: bg, alpha: 1, duration: 500, delay: 800 });
  }

  // ── Return button ─────────────────────────────────────────────────────────
  private drawReturnButton(width: number, height: number): void {
    const bW = 220, bH = 42;
    const bx = width / 2 - bW / 2;
    const by = height - bH - 16;

    const bbg = this.add.graphics().setDepth(20);
    const draw = (lit: boolean) => {
      bbg.clear();
      bbg.fillStyle(lit ? 0x2a4a6a : 0x1a2a3a, 1);
      bbg.fillRoundedRect(bx, by, bW, bH, 10);
      bbg.lineStyle(2, lit ? 0x88aaff : 0x334455, 1);
      bbg.strokeRoundedRect(bx, by, bW, bH, 10);
    };
    draw(false);

    this.add.text(width / 2, by + bH / 2, "🏰 Return to Village", {
      fontSize: "16px", fontFamily: "Arial", color: "#fff",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);

    const zone = this.add.zone(bx, by, bW, bH)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on("pointerover", () => draw(true));
    zone.on("pointerout", () => draw(false));
    zone.on("pointerdown", () => this.scene.start("VillageScene"));

    // Pulse the button gently after delay
    this.time.delayedCall(1200, () => {
      this.tweens.add({
        targets: zone,
        scaleX: 1.03, scaleY: 1.03,
        duration: 600,
        yoyo: true, repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }
}
