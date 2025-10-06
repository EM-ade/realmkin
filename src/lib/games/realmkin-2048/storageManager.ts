type StorageLike = {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
};

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

function getBestScoreKey(size: number): string {
  return `realmkin-2048-best-score-${size}x${size}`;
}

function getGameStateKey(size: number): string {
  return `realmkin-2048-game-state-${size}x${size}`;
}

function resolveStorage(): StorageLike {
  if (typeof window === "undefined") {
    return new MemoryStorage();
  }

  try {
    const storage = window.localStorage;
    const testKey = "realmkin-2048-test";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch (error) {
    return new MemoryStorage();
  }
}

export class StorageManager {
  private storage: StorageLike;
  private size: number;

  constructor(size: number = 4) {
    this.storage = resolveStorage();
    this.size = size;
  }

  getBestScore(): number {
    const value = this.storage.getItem(getBestScoreKey(this.size));
    return value ? Number(value) : 0;
  }

  setBestScore(score: number): void {
    this.storage.setItem(getBestScoreKey(this.size), String(score));
  }

  getGameState<T>(deserialize: (json: string) => T): T | null {
    const stateJSON = this.storage.getItem(getGameStateKey(this.size));
    if (!stateJSON) {
      return null;
    }

    try {
      return deserialize(stateJSON);
    } catch (error) {
      this.clearGameState();
      return null;
    }
  }

  setGameState(state: unknown, serialize: (value: unknown) => string = JSON.stringify): void {
    try {
      const payload = serialize(state);
      this.storage.setItem(getGameStateKey(this.size), payload);
    } catch (error) {
      // If serialization fails, wipe the stored value to avoid corrupted state
      this.clearGameState();
    }
  }

  clearGameState(): void {
    this.storage.removeItem(getGameStateKey(this.size));
  }
}
