/**
 * Client-Side System Settings Helper
 * Reads and caches operational settings configured by Admin in /admin/settings.
 */

export const SETTINGS_CACHE_KEY = 'app-system-settings';

export const DEFAULT_SETTINGS: Record<string, string> = {
  hospital_name: 'RS Mata JEC ORBITA',
  patrol_interval: '3',
  late_tolerance: '15',
  require_photo: 'true',
  compression_quality: '80',
  watermark_timestamp: 'true',
  block_gallery: 'false',
  require_qr: 'true',
  gps_validation: 'false',
  notif_late: 'true',
  notif_finding: 'true',
};

export function getCachedSettings(): Record<string, string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function fetchAndCacheSettings(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      const merged = { ...DEFAULT_SETTINGS, ...data };
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {}
  return getCachedSettings();
}
