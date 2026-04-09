import { useGameState } from "@/stores/gameStore";
import { useUIStore } from "@/stores/uiStore";
import { useSoundManager } from "@/audio/useSoundManager";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { usePowerLevel } from "@/hooks/game/usePowerLevel";
import styles from "./TopBar.module.css";
import { XPDisplay } from "./XPDisplay";
import { AutoPlayerIndicator } from "./AutoPlayerIndicator";
import { getPowerTier } from "@/game/config/powerFormula";
import { useIsMobile } from "@/hooks/useIsMobile";

// Resource type mapping for the top bar
type ResourceType = "wood" | "clay" | "iron" | "crop" | "gems";

interface ResourceDisplay {
  key: ResourceType;
  name: string;
  icon: string;
  materialIcon: string;
}

const RESOURCES: ResourceDisplay[] = [
  {
    key: "wood",
    name: "Wood",
    icon: "/assets/icons/wood.svg",
    materialIcon: "forest",
  },
  {
    key: "clay",
    name: "Clay",
    icon: "/assets/icons/clay.svg",
    materialIcon: "mountain_flag",
  },
  {
    key: "iron",
    name: "Iron",
    icon: "/assets/icons/iron.svg",
    materialIcon: "hardware",
  },
  {
    key: "crop",
    name: "Crop",
    icon: "/assets/icons/crop.svg",
    materialIcon: "agriculture",
  },
];

// Format large numbers with K suffix
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1) + "K";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// Compact format for mobile — shorter strings
function formatCompact(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 10000) return (num / 1000).toFixed(0) + "K";
  if (num >= 1000) return (num / 1000).toFixed(0) + "K";
  return num.toString();
}

export function TopBar({ onAudioSettings }: { onAudioSettings?: () => void }) {
  const store = useGameState();
  const { isMuted, toggleMute } = useSoundManager();
  const { openGemStore } = useUIStore();
  const { player } = useAuth();
  const { powerLevel } = usePowerLevel();
  const isMobile = useIsMobile();

  // Get game state values
  const resources = store.resources;
  const builderCount = store.getBuilderCount();
  const totalUnits = store.getTotalUnits();
  const maxArmySize = store.getMaxArmySize();

  const buildersFree = builderCount.total - builderCount.busy;

  // Profile data
  const username = player?.username || player?.walletAddress?.slice(0, 8) || "Hero";
  const tier = getPowerTier(powerLevel);
  const avatarUrl = player?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;

  const openProfile = () => {
    window.dispatchEvent(new CustomEvent("open-profile"));
  };

  return (
    <div
      className={`${styles.topBar} ${isMobile ? styles.topBarMobile : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >

      {/* Audio Settings Toggle — hidden on mobile, moved to profile panel */}
      {onAudioSettings && !isMobile && (
        <button
          onClick={() => {
            toggleMute();
          }}
          style={{
            pointerEvents: "auto",
            position: "absolute",
            right: "8px",
            top: "8px",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: isMuted ? "#ff6b6b" : "#fbbf24",
            border: "1px solid rgba(251,191,36,0.3)",
            padding: "6px 10px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            zIndex: 100,
          }}
          title={isMuted ? "Unmute all" : "Mute all"}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      )}

      <div className={styles.mainContainer}>
        {/* Left Section: Profile + Level */}
        <div
          className={styles.profileSection}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          {/* Clickable Profile Avatar */}
          <div
            className={styles.profileAvatar}
            onClick={openProfile}
            role="button"
            tabIndex={0}
            aria-label="Open profile"
            style={{ cursor: "pointer" }}
          >
            <img
              src={avatarUrl}
              alt={username}
              className={styles.profileAvatarImg}
              style={{ borderColor: tier.color }}
            />
            <span className={styles.profileAvatarTier}>{tier.icon}</span>
          </div>

          {/* Username + Level */}
          <div
            className={`${styles.profileNameArea} ${isMobile ? styles.profileNameAreaMobile : ""}`}
            onClick={openProfile}
            role="button"
            tabIndex={0}
            aria-label="Open profile"
            style={{ cursor: "pointer" }}
          >
            <span className={`${styles.profileName} ${isMobile ? styles.profileNameMobile : ""}`}>{username}</span>
            <XPDisplay />
          </div>

          <AutoPlayerIndicator />
        </div>

        {/* Center Section: Builders & Army */}
        <div className={`${styles.centerSection} ${isMobile ? styles.centerSectionMobile : ""}`}>
          <div className={`${styles.builderStatus} ${isMobile ? styles.builderStatusMobile : ""}`}>
            <span className="material-symbols-outlined">construction</span>
            <span className={styles.statusValue}>
              {buildersFree}/{builderCount.total}
            </span>
          </div>

          <div className={`${styles.armyStatus} ${isMobile ? styles.armyStatusMobile : ""}`}>
            <span className="material-symbols-outlined">swords</span>
            <span className={styles.statusValue}>
              {totalUnits}/{Math.floor(maxArmySize)}
            </span>
          </div>
        </div>

        {/* Right Section: Resources & Gems */}
        <div className={`${styles.resourcesSection} ${isMobile ? styles.resourcesSectionMobile : ""}`}>
          <div className={`${styles.resourcesGrid} ${isMobile ? styles.resourcesGridMobile : ""}`}>
            {RESOURCES.map((resource) => {
              const current = resources[resource.key];
              const cap = store.getWarehouseCapacity();
              const isFull = current >= cap;

              return (
                <div
                  key={resource.key}
                  className={`${styles.resourceWell} ${isMobile ? styles.resourceWellMobile : ""} ${isFull ? styles.wellFull : ""}`}
                >
                  <div className={`${styles.wellData} ${isMobile ? styles.wellDataMobile : ""}`}>
                    {!isMobile && (
                      <div className={styles.resRow}>
                        <span className={styles.resName}>{resource.name}</span>
                        {isFull && <span className={styles.fullTag}>FULL</span>}
                      </div>
                    )}
                    <span className={`${styles.resValue} ${isMobile ? styles.resValueMobile : ""}`}>
                      <img src={resource.icon} alt={resource.name} className={styles.resInlineIcon} />
                      {isMobile ? formatCompact(current) : formatNumber(current)}
                      {!isMobile && (
                        <span className={styles.resCap}>
                          {" "}
                          / {formatNumber(cap)}
                        </span>
                      )}
                    </span>
                  </div>
                  {!isMobile && (
                    <div className={styles.resIconBox}>
                      <img src={resource.icon} alt={resource.name} />
                    </div>
                  )}
                </div>
              );
            })}

            <div className={`${styles.resourceWell} ${styles.gemWell} ${isMobile ? styles.resourceWellMobile : ""}`}>
              <div className={`${styles.wellData} ${isMobile ? styles.wellDataMobile : ""}`}>
                {!isMobile && <span className={styles.resName}>Gems</span>}
                <span className={`${styles.resValue} ${isMobile ? styles.resValueMobile : ""}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: isMobile ? "14px" : undefined, marginRight: isMobile ? "2px" : undefined }}>diamond</span>
                  {isMobile ? formatCompact(resources.gems) : formatNumber(resources.gems)}
                </span>
              </div>
              {!isMobile && (
                <div className={styles.resIconBox}>
                  <span className="material-symbols-outlined">diamond</span>
                </div>
              )}
              <button className={styles.addGemSmall} onClick={openGemStore}>
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
