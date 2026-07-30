// Türkiye'nin 81 ili. `slug` alanı hem API sorgusunda (sehir parametresi)
// hem de cache anahtarı olarak kullanılır — yalnızca ASCII küçük harf içerir.
// Koordinatlar il merkezlerinin yaklaşık değerleridir; konumdan şehir bulma
// (en yakın il merkezi) için kullanılır, harici servis gerektirmez.

export interface City {
  name: string;
  slug: string;
  lat: number;
  lon: number;
}

/** Türkçe karakterleri ASCII'ye indirger, arama ve API sorgusu için güvenli slug üretir. */
export function slugifyCity(input: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", Â: "a",
  };
  return input
    .trim()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

const DATA: [string, number, number][] = [
  ["Adana", 37.0, 35.32], ["Adıyaman", 37.76, 38.28], ["Afyonkarahisar", 38.76, 30.54],
  ["Ağrı", 39.72, 43.05], ["Aksaray", 38.37, 34.03], ["Amasya", 40.65, 35.83],
  ["Ankara", 39.93, 32.86], ["Antalya", 36.9, 30.7], ["Ardahan", 41.11, 42.7],
  ["Artvin", 41.18, 41.82], ["Aydın", 37.85, 27.84], ["Balıkesir", 39.65, 27.89],
  ["Bartın", 41.63, 32.34], ["Batman", 37.88, 41.13], ["Bayburt", 40.26, 40.22],
  ["Bilecik", 40.15, 29.98], ["Bingöl", 38.88, 40.5], ["Bitlis", 38.4, 42.11],
  ["Bolu", 40.74, 31.61], ["Burdur", 37.72, 30.29], ["Bursa", 40.19, 29.06],
  ["Çanakkale", 40.15, 26.41], ["Çankırı", 40.6, 33.62], ["Çorum", 40.55, 34.95],
  ["Denizli", 37.78, 29.09], ["Diyarbakır", 37.91, 40.24], ["Düzce", 40.84, 31.16],
  ["Edirne", 41.68, 26.56], ["Elazığ", 38.68, 39.22], ["Erzincan", 39.75, 39.49],
  ["Erzurum", 39.9, 41.27], ["Eskişehir", 39.78, 30.52], ["Gaziantep", 37.07, 37.38],
  ["Giresun", 40.91, 38.39], ["Gümüşhane", 40.46, 39.48], ["Hakkari", 37.57, 43.74],
  ["Hatay", 36.2, 36.16], ["Iğdır", 39.92, 44.05], ["Isparta", 37.76, 30.55],
  ["İstanbul", 41.01, 28.98], ["İzmir", 38.42, 27.13], ["Kahramanmaraş", 37.58, 36.93],
  ["Karabük", 41.2, 32.63], ["Karaman", 37.18, 33.22], ["Kars", 40.6, 43.1],
  ["Kastamonu", 41.38, 33.78], ["Kayseri", 38.72, 35.49], ["Kırıkkale", 39.85, 33.51],
  ["Kırklareli", 41.73, 27.22], ["Kırşehir", 39.15, 34.16], ["Kilis", 36.72, 37.12],
  ["Kocaeli", 40.85, 29.88], ["Konya", 37.87, 32.48], ["Kütahya", 39.42, 29.98],
  ["Malatya", 38.35, 38.31], ["Manisa", 38.61, 27.43], ["Mardin", 37.31, 40.74],
  ["Mersin", 36.81, 34.63], ["Muğla", 37.22, 28.36], ["Muş", 38.73, 41.49],
  ["Nevşehir", 38.62, 34.71], ["Niğde", 37.97, 34.68], ["Ordu", 40.98, 37.88],
  ["Osmaniye", 37.07, 36.25], ["Rize", 41.02, 40.52], ["Sakarya", 40.77, 30.4],
  ["Samsun", 41.29, 36.33], ["Siirt", 37.93, 41.94], ["Sinop", 42.03, 35.15],
  ["Sivas", 39.75, 37.02], ["Şanlıurfa", 37.16, 38.79], ["Şırnak", 37.52, 42.46],
  ["Tekirdağ", 40.98, 27.51], ["Tokat", 40.31, 36.55], ["Trabzon", 41.0, 39.72],
  ["Tunceli", 39.11, 39.55], ["Uşak", 38.68, 29.41], ["Van", 38.49, 43.38],
  ["Yalova", 40.65, 29.27], ["Yozgat", 39.82, 34.81], ["Zonguldak", 41.45, 31.79],
];

export const CITIES: City[] = DATA.map(([name, lat, lon]) => ({
  name,
  slug: slugifyCity(name),
  lat,
  lon,
}));

export const CITY_BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));

export function cityName(slug: string | null): string {
  if (!slug) return "";
  return CITY_BY_SLUG.get(slug)?.name ?? slug;
}

/** Verilen koordinata en yakın il merkezini döndürür. */
export function nearestCity(lat: number, lon: number): City {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = CITIES[0];
  let bestDist = Infinity;
  for (const c of CITIES) {
    const dx = (c.lon - lon) * cosLat;
    const dy = c.lat - lat;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}
