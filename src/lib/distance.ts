// Distance in the merchant's words: blocks when close, walking minutes after (80 m a minute, the map's pace).
// Safe on the server (RadarMap's walkMin lives in a client file).
export const walkMinutes = (km: number) => Math.max(1, Math.round((km * 1000) / 80));
export const fromDoor = (km: number) => (km <= 0.25 ? "a block" : km <= 0.5 ? "two blocks" : km <= 0.9 ? "a few blocks" : km < 2 ? `a ${walkMinutes(km)} min walk` : `${km.toFixed(1)} km`);
