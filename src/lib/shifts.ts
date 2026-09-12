// Utility for dynamic real-time shift detection (WITA / Asia/Makassar)

export interface ShiftInfo {
  id?: string;
  name: string;
  code?: string;
  startTime: string; // "07:00"
  endTime: string;   // "19:00"
}

export function getCurrentTimeMakassar(): { hour: number; minute: number; timeStr: string } {
  const now = new Date();
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeStr = timeFormatter.format(now); // e.g. "21:02" or "08:15"
  const [h, m] = timeStr.split(':').map(Number);
  return { hour: h, minute: m, timeStr };
}

export function isTimeInShift(timeStr: string, startTime: string, endTime: string): boolean {
  if (startTime < endTime) {
    // Normal day shift: 07:00 - 19:00
    return timeStr >= startTime && timeStr < endTime;
  } else {
    // Overnight shift crossing midnight: 19:00 - 07:00
    return timeStr >= startTime || timeStr < endTime;
  }
}

export function getRealtimeShift<T extends ShiftInfo>(shifts?: T[] | null): T | ShiftInfo {
  const { timeStr, hour } = getCurrentTimeMakassar();

  if (shifts && shifts.length > 0) {
    const matched = shifts.find(s => isTimeInShift(timeStr, s.startTime, s.endTime));
    if (matched) return matched;
  }

  // Fallback standard shifts for RS JEC ORBITA
  if (hour >= 7 && hour < 19) {
    return {
      name: 'Shift Pagi',
      code: 'PAGI',
      startTime: '07:00',
      endTime: '19:00',
    };
  } else {
    return {
      name: 'Shift Malam',
      code: 'MALAM',
      startTime: '19:00',
      endTime: '07:00',
    };
  }
}

export function getOppositeShift<T extends ShiftInfo>(currentShift: ShiftInfo | null | undefined, shifts: T[]): T | null {
  if (!shifts || shifts.length === 0) return null;
  if (!currentShift) return shifts[0];

  // Try finding a shift whose code or id is different
  const other = shifts.find(s => {
    if (currentShift.id && s.id) return s.id !== currentShift.id;
    if (currentShift.code && s.code) return s.code.toUpperCase() !== currentShift.code.toUpperCase();
    return s.name.toLowerCase() !== currentShift.name.toLowerCase();
  });

  return other || shifts[0];
}

export function resolveShiftForSchedule<T extends ShiftInfo>(
  schedule?: { patrolNumber?: number; startTime?: string; endTime?: string } | null,
  shifts?: T[] | null
): T | ShiftInfo {
  if (shifts && shifts.length > 0) {
    if (schedule?.patrolNumber !== undefined && schedule.patrolNumber !== null) {
      const targetCode = schedule.patrolNumber <= 4 ? 'PAGI' : 'MALAM';
      const byCode = shifts.find(s => s.code?.toUpperCase() === targetCode);
      if (byCode) return byCode;
    }
    if (schedule?.startTime && schedule?.endTime) {
      const byTime = shifts.find(s => isTimeInShift(schedule.startTime!, s.startTime, s.endTime));
      if (byTime) return byTime;
    }
    return getRealtimeShift(shifts);
  }

  return getRealtimeShift();
}

