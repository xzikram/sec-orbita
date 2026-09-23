/**
 * Client-Side Resilient Error Reporter
 * Captures runtime errors, stores them locally when offline,
 * and flushes them to /api/system/error-logs once connection is re-established.
 */

export interface SystemErrorPayload {
  message: string;
  stack?: string | null;
  digest?: string | null;
  url?: string;
  userId?: string | null;
  userName?: string | null;
  employeeId?: string | null;
  role?: string | null;
  details?: Record<string, unknown> | null;
}

const STORAGE_KEY = 'queued_system_errors';

export async function reportClientError(payload: SystemErrorPayload): Promise<void> {
  if (typeof window === 'undefined') return;

  const msg = String(payload.message || '');
  // Ignore expected network drop / ServiceWorker update failures (false alarms)
  if (
    msg.includes('ServiceWorker') ||
    msg.includes('/sw.js') ||
    msg.includes('ResizeObserver') ||
    (msg.includes('Failed to fetch') && !navigator.onLine) ||
    (msg.includes('NetworkError') && !navigator.onLine)
  ) {
    return;
  }

  // Read cached user info if available
  let userId = payload.userId;
  let userName = payload.userName;
  let employeeId = payload.employeeId;
  let role = payload.role;

  if (!userId) {
    try {
      const cached = localStorage.getItem('cached-user');
      if (cached) {
        const u = JSON.parse(cached);
        userId = u.id;
        userName = u.name;
        employeeId = u.employeeId;
        role = u.role;
      }
    } catch {}
  }

  const url = payload.url || window.location.href;
  const errorObj = {
    message: String(payload.message || 'Unknown Error').slice(0, 2000),
    stack: payload.stack || null,
    digest: payload.digest || null,
    url: String(url).slice(0, 1000),
    userId,
    userName,
    employeeId,
    role,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  // 1. Try immediate dispatch if online
  if (navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('/api/system/error-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorObj),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        return;
      }
    } catch {
      // Network failed or offline, fall through to offline storage
    }
  }

  // 2. Queue in localStorage for offline resilience
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    if (list.length >= 50) list.shift();
    list.push(errorObj);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export async function flushQueuedSystemErrors(): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const list: any[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return 0;

    let flushed = 0;
    const remaining: any[] = [];
    for (const item of list) {
      try {
        const res = await fetch('/api/system/error-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) flushed++;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    return flushed;
  } catch {
    return 0;
  }
}
