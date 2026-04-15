// ──────────────────────────────────────────────────────────────────────────────
// AudioSettingsPanel — Medieval-styled audio settings UI
// ──────────────────────────────────────────────────────────────────────────────
import { useSoundManager } from './useSoundManager';

interface AudioSettingsPanelProps {
  onClose: () => void;
}

export function AudioSettingsPanel({ onClose }: AudioSettingsPanelProps) {
  const {
    isMuted,
    toggleMute,
    musicVolume,
    sfxVolume,
    uiVolume,
    setMusicVolume,
    setSfxVolume,
    setUiVolume,
  } = useSoundManager();

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-amber-950 to-stone-900 rounded-xl p-6 w-80 border-2 border-amber-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-amber-200 text-lg font-bold tracking-wide">
            Audio Settings
          </h2>
          <button
            onClick={onClose}
            className="text-amber-400 hover:text-amber-200 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Master Mute */}
        <button
          onClick={toggleMute}
          className={`w-full mb-5 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${
            isMuted
              ? 'bg-red-900/60 text-red-300 hover:bg-red-800/60 border border-red-700/50'
              : 'bg-amber-800/60 text-amber-200 hover:bg-amber-700/60 border border-amber-600/50'
          }`}
        >
          {isMuted ? '🔇  Unmute All' : '🔊  Mute All'}
        </button>

        {/* Music Volume */}
        <VolumeSlider
          label="🎵  Music"
          value={musicVolume}
          onChange={setMusicVolume}
          disabled={isMuted}
        />

        {/* SFX Volume */}
        <VolumeSlider
          label="⚔️  Sound Effects"
          value={sfxVolume}
          onChange={setSfxVolume}
          disabled={isMuted}
        />

        {/* UI Volume */}
        <VolumeSlider
          label="🔘  UI Sounds"
          value={uiVolume}
          onChange={setUiVolume}
          disabled={isMuted}
        />

        {/* Test Button */}
        <div className="mt-5 pt-4 border-t border-amber-800/40">
          <TestButton />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VolumeSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (vol: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="text-amber-300/80 text-sm flex justify-between mb-1">
        <span>{label}</span>
        <span className="text-amber-400 font-mono text-xs">
          {Math.round(value * 100)}%
        </span>
      </label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={disabled ? 0 : value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-amber-900/50 rounded-lg appearance-none cursor-pointer
                   accent-amber-500 disabled:opacity-30 disabled:cursor-not-allowed
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:cursor-pointer
                   [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-900/50
                   [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:bg-amber-400 [&::-moz-range-thumb]:cursor-pointer
                   [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}

function TestButton() {
  const { play } = useSoundManager();

  return (
    <button
      onClick={() => play('button_click')}
      className="w-full py-2 px-4 rounded-lg bg-stone-800/60 hover:bg-stone-700/60
                 text-amber-400/80 hover:text-amber-300 text-sm transition-colors
                 border border-amber-900/30"
    >
      ▶  Test Sound
    </button>
  );
}
