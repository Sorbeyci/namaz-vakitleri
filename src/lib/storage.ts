// localStorage erişimi tek noktadan; kota/erişim hataları sessizce yutulur.

export const KEYS = {
  city: "namaz:city",
  recentCities: "namaz:recentCities",
  theme: "namaz:theme",
  accent: "namaz:accent",
  citySource: "namaz:citySource",
  logs: "namaz:logs",
  installDismissed: "namaz:installDismissed",
  settings: "namaz:settings",
  times: (slug: string) => `namaz:times:${slug}`,
};

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessiz
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sessiz
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // sessiz
  }
}
