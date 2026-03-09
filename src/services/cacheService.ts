// src/services/cacheService.ts

export const cacheService = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return null;

      const cachedData = JSON.parse(item);
      // Basic check for expiration, can be made more robust
      if (cachedData.expiry && new Date().getTime() > cachedData.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return cachedData.value;

    } catch (error) {
      console.error(`Error getting item ${key} from localStorage`, error);
      return null;
    }
  },

  set<T>(key: string, value: T, ttl: number = 24 * 60 * 60 * 1000): void { // Default TTL: 24 hours
    try {
      const expiry = new Date().getTime() + ttl;
      const item = {
        value,
        expiry,
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage`, error);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage`, error);
    }
  }
};
