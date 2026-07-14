'use client';

import { saveOfflineCheck, saveOfflineFinding } from './db';

export interface RoomCheckPayload {
  sessionFloorId: string;
  roomId: string;
  acStatus: 'on' | 'off' | 'not_available';
  lightStatus: 'on' | 'off';
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

// Unified client to route check submissions to API (online) or IndexedDB (offline)
export async function submitRoomCheck(payload: RoomCheckPayload): Promise<{ success: boolean; mode: 'online' | 'offline'; error?: string }> {
  const isOnline = typeof window !== 'undefined' && navigator.onLine;

  if (!isOnline) {
    // Save to IndexedDB
    try {
      await saveOfflineCheck({
        id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...payload,
        checkedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline' };
    } catch (err) {
      return { success: false, mode: 'offline', error: err instanceof Error ? err.message : 'Gagal menyimpan lokal' };
    }
  }

  // Attempt API post
  try {
    const res = await fetch('/api/patrol/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, mode: 'online' };
    }

    const data = await res.json();
    throw new Error(data.error || 'API response error');
  } catch (error) {
    // Fallback to offline store
    try {
      await saveOfflineCheck({
        id: `check-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...payload,
        checkedAt: new Date().toISOString(),
      });
      return { success: true, mode: 'offline' };
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

  try {
    const res = await fetch('/api/findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, mode: 'online' };
    }

    const data = await res.json();
    throw new Error(data.error || 'API response error');
  } catch (error) {
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
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/patrol/sessions?date=${today}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.find((s: { status: string }) => s.status === 'in_progress') || data[data.length - 1] || null;
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
