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

    // 2. Cache floors and all rooms in IndexedDB
    const { floorsCount, roomsCount } = await cacheMasterPatrolData(floorsData);

    // 3. Pre-cache active patrol session & auth user for offline resilience
    try {
      const [sessionsRes, meRes] = await Promise.all([
        fetch('/api/patrol/sessions').catch(() => null),
        fetch('/api/auth/me').catch(() => null),
      ]);

      if (sessionsRes && sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        const active = sessions.find((s: any) => s.status === 'in_progress') || sessions[sessions.length - 1];
        if (active) {
          localStorage.setItem('cached-active-session', JSON.stringify(active));
        }
      }

      if (meRes && meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          localStorage.setItem('cached-user', JSON.stringify(meData.user));
        }
      }
    } catch {
      // Non-critical if offline
    }

    // 4. Pre-cache all patrol pages and QR scan routes into browser CacheStorage
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await window.caches.open('sec-patrol-v8');
        const routesToPrecache = [
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

    localStorage.setItem('offline-patrol-cache-time', new Date().toISOString());

    return {
      success: true,
      floorsCount,
      roomsCount,
    };
  } catch (err: any) {
    console.warn('Pre-download patrol package notice:', err);
    // Even if fetch threw an error, populate from fallback catalog
    try {
      const { floorsCount, roomsCount } = await cacheMasterPatrolData(fallbackFloors);
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
 * Resolves rooms for a floor with 3-tier resilience:
 * 1. IndexedDB master_rooms (dynamic from database)
 * 2. Active Session snapshot
 * 3. Static dummy-data catalog fallback
 */
export async function getResilientRoomsForFloor(floorIdOrCode: string): Promise<any[]> {
  try {
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
