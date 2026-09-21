'use client';

import { saveOfflineCheck, saveOfflineFinding } from './db';

export interface RoomCheckPayload {
  sessionFloorId: string;
  roomId: string;
  roomCode?: string;
  floorId?: string;
  floorCode?: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
  checklistValues?: Record<string, string>;
  condition: 'normal' | 'finding';
  remarks?: string;
  photoBase64: string;
}

export interface FindingPayload {
  checkId?: string;
  sessionId?: string;
  floorId?: string;
  roomId?: string;
  floorNameSnapshot: string;
  roomNameSnapshot: string;
  category: string;
  description: string;
}

// Fast ping probe to verify true server reachability (not just cellular/Wi-Fi radio status)
export async function checkServerReachable(timeoutMs = 1000): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('/api/ping', { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

// Unified client to route check submissions to API (online) or IndexedDB (offline)
export async function submitRoomCheck(payload: RoomCheckPayload): Promise<{ success: boolean; mode: 'online' | 'offline'; error?: string; checkId?: string }> {
  const isOnline = typeof window !== 'undefined' && navigator.onLine;

  // If browser reports offline, go straight to IndexedDB instantly
  if (!isOnline) {
    try {
      const offlineId = `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await saveOfflineCheck({
        id: offlineId,
        ...payload,
        checkedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline', checkId: offlineId };
    } catch (err) {
      return { success: false, mode: 'offline', error: err instanceof Error ? err.message : 'Gagal menyimpan lokal' };
    }
  }

  // Fast-timeout (1.2s) - If server is unreachable in building dead zones, fall back to offline storage with ZERO perceptible lag
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch('/api/patrol/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => null);
      return { success: true, mode: 'online', checkId: data?.id };
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'API response error');
  } catch (error) {
    clearTimeout(timeoutId);
    // Wi-Fi handover, packet drop, or timeout: Fallback to offline store instantly
    try {
      const offlineId = `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await saveOfflineCheck({
        id: offlineId,
        ...payload,
        checkedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline', checkId: offlineId };
    } catch (err) {
      return { success: false, mode: 'offline', error: 'Gagal menyimpan data ke local storage.' };
    }
  }
}

export async function submitFinding(payload: FindingPayload): Promise<{ success: boolean; mode: 'online' | 'offline'; error?: string }> {
  const isOnline = typeof window !== 'undefined' && navigator.onLine;

  if (!isOnline) {
    try {
      await saveOfflineFinding({
        id: `find-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...payload,
        createdAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline' };
    } catch (err) {
      return { success: false, mode: 'offline', error: err instanceof Error ? err.message : 'Gagal menyimpan lokal' };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch('/api/findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, mode: 'online' };
    }

    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'API response error');
  } catch (error) {
    clearTimeout(timeoutId);
    try {
      await saveOfflineFinding({
        id: `find-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...payload,
        createdAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline' };
    } catch (err) {
      return { success: false, mode: 'offline', error: 'Gagal menyimpan data ke local storage.' };
    }
  }
}


export async function fetchActiveSession() {
  try {
    let currentUserId: string | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('cached-user') || '{}');
        currentUserId = u.id || null;
      } catch {}
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date());
    const res = await fetch(`/api/patrol/sessions?date=${today}&personal=true`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data.find((s: { status: string; userId?: string }) => s.status === 'in_progress' && (!currentUserId || s.userId === currentUserId))
      || null;
  } catch {
    return null;
  }
}

export async function fetchDashboardStats() {
  try {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
