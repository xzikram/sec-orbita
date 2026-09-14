'use client';

import {
  cacheMasterPatrolData,
  getCachedFloors,
  getCachedRoomsByFloor,
  getCachedRoomById,
  CachedFloor,
  CachedRoom,
} from './db';
import { floors as fallbackFloors, getFloorById as getFallbackFloorById, getRoomsByFloor as getFallbackRoomsByFloor, getRoomById as getFallbackRoomById } from './dummy-data';

export interface PreDownloadResult {
  success: boolean;
  floorsCount: number;
  roomsCount: number;
  error?: string;
}

export const CATALOG_CACHE_VERSION = 'sec-patrol-v15-20260915';

/**
 * Downloads and caches all active floors, 133 rooms, and official QR tokens to IndexedDB.
 * Called automatically when security presses "Mulai Patroli" or starts a round.
 */
export async function downloadPatrolPackage(): Promise<PreDownloadResult> {
  try {
    // 1. Fetch floors with rooms & official QR tokens
    let floorsData: any[] = [];
    const floorsRes = await fetch('/api/floors', { cache: 'no-cache' }).catch(() => null);
    
    if (floorsRes && floorsRes.ok) {
      floorsData = await floorsRes.json();
    } else {
      // Offline fallback: Use comprehensive static catalog if offline at startup
      floorsData = fallbackFloors;
    }

    if (!Array.isArray(floorsData) || floorsData.length === 0) {
      floorsData = fallbackFloors;
    }

    // Ensure all floors have rooms attached (especially when using fallbackFloors where rooms is a separate array)
    const floorsWithRooms = floorsData.map((f: any) => {
      if (Array.isArray(f.rooms) && f.rooms.length > 0) return f;
      return {
        ...f,
        rooms: getFallbackRoomsByFloor(f.id),
      };
    });

    // 2. Cache floors and all rooms in IndexedDB
    const { floorsCount, roomsCount } = await cacheMasterPatrolData(floorsWithRooms);

    // 3. Pre-cache active patrol session & auth user for offline resilience
    try {
      const [sessionsRes, meRes] = await Promise.all([
        fetch('/api/patrol/sessions?personal=true').catch(() => null),
        fetch('/api/auth/me').catch(() => null),
      ]);

      let currentUserId: string | null = null;
      if (meRes && meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user) {
          currentUserId = meData.user.id || null;
          localStorage.setItem('cached-user', JSON.stringify(meData.user));
        }
      }

      if (sessionsRes && sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        if (Array.isArray(sessions)) {
          const active = sessions.find((s: any) => s.status === 'in_progress' && (!currentUserId || s.userId === currentUserId)) || null;
          if (active) {
            localStorage.setItem('cached-active-session', JSON.stringify(active));
          }
        }
      }
    } catch {
      // Non-critical if offline
    }

    // 4. Pre-cache all patrol pages and QR scan routes into browser CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open('sec-patrol-v15');
        const routesToPrecache = [
          '/security/dashboard',
          '/security/patrol',
          '/security/patrol/summary',
        ];

        floorsData.forEach((f: any) => {
          if (f.id) {
            routesToPrecache.push(`/security/patrol/floor/${f.id}`);
            routesToPrecache.push(`/security/patrol/floor/${f.id}/qr-scan`);
          }
          if (f.code) {
            routesToPrecache.push(`/security/patrol/floor/${f.code.toLowerCase()}`);
            routesToPrecache.push(`/security/patrol/floor/${f.code.toLowerCase()}/qr-scan`);
          }
          if (Array.isArray(f.rooms)) {
            // Pre-cache sample rooms so Next.js downloads the room page JS chunk into CacheStorage
            f.rooms.slice(0, 3).forEach((r: any) => {
              if (r.id) routesToPrecache.push(`/security/patrol/room/${r.id}`);
              if (r.code) routesToPrecache.push(`/security/patrol/room/${r.code.toLowerCase()}`);
            });
          }
        });

        // Preload in parallel without blocking startup
        Promise.allSettled(
          routesToPrecache.map(async (route) => {
            try {
              const res = await fetch(route);
              if (res.ok) {
                await cache.put(route, res);
              }
            } catch {}
          })
        ).catch(() => {});
      } catch (cacheErr) {
        console.warn('Pre-cache patrol routes notice:', cacheErr);
      }
    }

    // 5. Pre-warm QR Scanner chunk in background
    if (typeof window !== 'undefined') {
      try {
        import('html5-qrcode').catch(() => {});
      } catch {}
    }

    const nowIso = new Date().toISOString();
    localStorage.setItem('offline-patrol-cache-time', nowIso);
    localStorage.setItem('offline-patrol-start-time', nowIso);
    localStorage.setItem('patrol-catalog-version', CATALOG_CACHE_VERSION);
    if (typeof performance !== 'undefined') {
      localStorage.setItem('offline-patrol-perf-baseline', String(performance.now()));
    }

    return {
      success: true,
      floorsCount,
      roomsCount,
    };
  } catch (err: any) {
    console.warn('Pre-download patrol package notice:', err);
    // Even if fetch threw an error, populate from fallback catalog
    try {
      const floorsWithFallbackRooms = fallbackFloors.map((f: any) => ({
        ...f,
        rooms: getFallbackRoomsByFloor(f.id),
      }));
      const { floorsCount, roomsCount } = await cacheMasterPatrolData(floorsWithFallbackRooms);
      return { success: true, floorsCount, roomsCount };
    } catch {
      return {
        success: false,
        floorsCount: 0,
        roomsCount: 0,
        error: err?.message || 'Gagal menyiapkan data offline',
      };
    }
  }
}

/**
 * Ensures the device has the latest rooms and floors catalog.
 * If the device has an outdated catalog version, it re-downloads fresh data immediately.
 */
export async function ensureFreshPatrolCatalog(force: boolean = false): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const currentVer = localStorage.getItem('patrol-catalog-version');
    if (force || currentVer !== CATALOG_CACHE_VERSION) {
      console.log('[OfflineCache] Catalog version mismatch detected. Refreshing master catalog...');
      await downloadPatrolPackage();
    }
  } catch (err) {
    console.warn('[OfflineCache] ensureFreshPatrolCatalog notice:', err);
  }
}

/**
 * Resolves rooms for a floor with 3-tier resilience:
 * 1. IndexedDB master_rooms (dynamic from database)
 * 2. Active Session snapshot
 * 3. Static dummy-data catalog fallback
 */
export async function getResilientRoomsForFloor(floorIdOrCode: string): Promise<any[]> {
  try {
    // If client has stale catalog version in localStorage, ensure we refresh it
    if (typeof window !== 'undefined') {
      const currentVer = localStorage.getItem('patrol-catalog-version');
      if (currentVer !== CATALOG_CACHE_VERSION) {
        ensureFreshPatrolCatalog().catch(() => {});
      }
    }
    const cached = await getCachedRoomsByFloor(floorIdOrCode);
    if (cached && cached.length > 0) return cached;
  } catch {}

  // Fallback to static catalog
  return getFallbackRoomsByFloor(floorIdOrCode);
}

/**
 * Resolves room by ID with 2-tier resilience:
 * 1. IndexedDB master_rooms
 * 2. Static dummy-data catalog
 */
export async function getResilientRoomById(roomId: string): Promise<any | null> {
  try {
    const cached = await getCachedRoomById(roomId);
    if (cached) return cached;
  } catch {}

  return getFallbackRoomById(roomId);
}
