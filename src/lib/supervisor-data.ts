// ============================================================
// SUPERVISOR DUMMY DATA
// Extended data for supervisor dashboard views
// ============================================================

import {
  type PatrolSession,
  type PatrolSessionFloor,
  type PatrolCheck,
  type Finding,
  type FindingCategory,
  type ACStatus,
  type LightStatus,
  floors,
  rooms,
  getRoomsByFloor,
  patrolSchedules,
  users,
  activeFindings,
} from './dummy-data';

// All patrol sessions for today (all officers)
export const todaySessions: (PatrolSession & { userName: string })[] = [
  { id: 'ts-1', userId: 'user-1', scheduleId: 'sched-1', shiftId: 'shift-3', patrolDate: '2026-07-08', patrolNumber: 1, status: 'completed', startedAt: '2026-07-08T00:05:00', completedAt: '2026-07-08T02:32:00', userName: 'Candra Wijaya' },
  { id: 'ts-2', userId: 'user-3', scheduleId: 'sched-2', shiftId: 'shift-3', patrolDate: '2026-07-08', patrolNumber: 2, status: 'completed', startedAt: '2026-07-08T03:08:00', completedAt: '2026-07-08T05:15:00', userName: 'Candra Wijaya' },
  { id: 'ts-3', userId: 'user-1', scheduleId: 'sched-3', shiftId: 'shift-1', patrolDate: '2026-07-08', patrolNumber: 3, status: 'completed', startedAt: '2026-07-08T06:05:00', completedAt: '2026-07-08T08:32:00', userName: 'Ahmad Fadillah' },
  { id: 'ts-4', userId: 'user-1', scheduleId: 'sched-4', shiftId: 'shift-1', patrolDate: '2026-07-08', patrolNumber: 4, status: 'completed', startedAt: '2026-07-08T09:10:00', completedAt: '2026-07-08T11:45:00', userName: 'Ahmad Fadillah' },
  { id: 'ts-5', userId: 'user-1', scheduleId: 'sched-5', shiftId: 'shift-1', patrolDate: '2026-07-08', patrolNumber: 5, status: 'completed', startedAt: '2026-07-08T12:08:00', completedAt: '2026-07-08T14:22:00', userName: 'Ahmad Fadillah' },
  { id: 'ts-6', userId: 'user-1', scheduleId: 'sched-6', shiftId: 'shift-1', patrolDate: '2026-07-08', patrolNumber: 6, status: 'in_progress', startedAt: '2026-07-08T15:12:00', userName: 'Ahmad Fadillah' },
  { id: 'ts-7', userId: 'user-2', scheduleId: 'sched-7', shiftId: 'shift-2', patrolDate: '2026-07-08', patrolNumber: 7, status: 'pending', userName: 'Budi Santoso' },
  { id: 'ts-8', userId: 'user-2', scheduleId: 'sched-8', shiftId: 'shift-2', patrolDate: '2026-07-08', patrolNumber: 8, status: 'pending', userName: 'Budi Santoso' },
];

// Detailed floor checks for session 6 (active)
export const session6Floors: (PatrolSessionFloor & { floorName: string; totalRooms: number; checkedRooms: number })[] = [
  { id: 'sf6-1', sessionId: 'ts-6', floorId: 'floor-sb', floorNameSnapshot: 'Semi Basement', floorName: 'Semi Basement', status: 'completed', qrValidated: true, qrScannedAt: '2026-07-08T15:42:00', startedAt: '2026-07-08T15:12:00', completedAt: '2026-07-08T15:42:00', totalRooms: 12, checkedRooms: 12 },
  { id: 'sf6-2', sessionId: 'ts-6', floorId: 'floor-1', floorNameSnapshot: 'Lantai 1', floorName: 'Lantai 1', status: 'in_progress', qrValidated: false, startedAt: '2026-07-08T15:45:00', totalRooms: 12, checkedRooms: 8 },
  { id: 'sf6-3', sessionId: 'ts-6', floorId: 'floor-2', floorNameSnapshot: 'Lantai 2', floorName: 'Lantai 2', status: 'pending', qrValidated: false, totalRooms: 10, checkedRooms: 0 },
  { id: 'sf6-4', sessionId: 'ts-6', floorId: 'floor-3', floorNameSnapshot: 'Lantai 3', floorName: 'Lantai 3', status: 'pending', qrValidated: false, totalRooms: 8, checkedRooms: 0 },
];

// Room checks for Lantai 1 (detailed view)
export const lantai1Checks: PatrolCheck[] = getRoomsByFloor('floor-1').slice(0, 8).map((room, i) => ({
  id: `spv-chk-l1-${i}`,
  sessionFloorId: 'sf6-2',
  roomId: room.id,
  userId: 'user-1',
  roomNameSnapshot: room.name,
  roomCodeSnapshot: room.code,
  floorNameSnapshot: 'Lantai 1',
  roomOrderSnapshot: room.patrolOrder,
  acStatus: (room.hasAc ? (room.code === 'L1-04' ? 'off' : 'on') : 'not_available') as ACStatus,
  lightStatus: 'on' as LightStatus,
  condition: (room.code === 'L1-04' ? 'finding' : 'normal') as 'normal' | 'finding',
  remarks: room.code === 'L1-04' ? 'AC apotek mati, suhu ruangan panas' : undefined,
  checkedAt: `2026-07-08T15:${45 + i * 3}:00`,
  photoUrl: `/photos/patrol-6/l1-${room.code.toLowerCase()}.jpg`,
}));

// SB checks
export const sbChecks: PatrolCheck[] = getRoomsByFloor('floor-sb').map((room, i) => ({
  id: `spv-chk-sb-${i}`,
  sessionFloorId: 'sf6-1',
  roomId: room.id,
  userId: 'user-1',
  roomNameSnapshot: room.name,
  roomCodeSnapshot: room.code,
  floorNameSnapshot: 'Semi Basement',
  roomOrderSnapshot: room.patrolOrder,
  acStatus: (room.hasAc ? 'on' : 'not_available') as ACStatus,
  lightStatus: 'on' as LightStatus,
  condition: (room.code === 'SB-03' ? 'finding' : 'normal') as 'normal' | 'finding',
  remarks: room.code === 'SB-03' ? 'Suara genset tidak normal' : undefined,
  checkedAt: `2026-07-08T15:${12 + i * 2}:00`,
  photoUrl: `/photos/patrol-6/sb-${room.code.toLowerCase()}.jpg`,
}));

// All supervisor findings (extended)
export const allFindings: (Finding & { userName: string })[] = [
  {
    id: 'fnd-1', findingNumber: 'FND-20260708-001', checkId: 'spv-chk-sb-2',
    sessionId: 'ts-6', userId: 'user-1', floorId: 'floor-sb', roomId: 'room-sb-03',
    floorNameSnapshot: 'Semi Basement', roomNameSnapshot: 'Ruang Genset',
    category: 'fasilitas', description: 'Suara genset tidak normal, terdengar getaran berlebih pada bagian kiri mesin. Perlu pengecekan mekanik segera.',
    status: 'new', photoUrl: '/photos/findings/genset-01.jpg', createdAt: '2026-07-08T15:16:00',
    userName: 'Ahmad Fadillah',
  },
  {
    id: 'fnd-2', findingNumber: 'FND-20260708-002', checkId: 'spv-chk-l1-3',
    sessionId: 'ts-6', userId: 'user-1', floorId: 'floor-1', roomId: 'room-l1-04',
    floorNameSnapshot: 'Lantai 1', roomNameSnapshot: 'Apotek',
    category: 'ac', description: 'AC apotek mati total, suhu ruangan terasa panas. Obat-obatan memerlukan suhu terkontrol. Sudah dilaporkan ke teknisi.',
    status: 'in_progress', photoUrl: '/photos/findings/ac-apotek-01.jpg', createdAt: '2026-07-08T15:54:00',
    userName: 'Ahmad Fadillah',
  },
  {
    id: 'fnd-3', findingNumber: 'FND-20260707-003', checkId: 'hist-chk-1',
    sessionId: 'ts-3', userId: 'user-1', floorId: 'floor-2', roomId: 'room-l2-09',
    floorNameSnapshot: 'Lantai 2', roomNameSnapshot: 'Gudang Medis',
    category: 'akses_pintu', description: 'Pintu gudang medis tidak terkunci dengan baik. Kunci terlihat aus dan sulit dikunci.',
    status: 'resolved', photoUrl: '/photos/findings/pintu-gudang.jpg', createdAt: '2026-07-07T07:23:00',
    userName: 'Ahmad Fadillah',
  },
  {
    id: 'fnd-4', findingNumber: 'FND-20260706-004', checkId: 'hist-chk-2',
    sessionId: 'ts-2', userId: 'user-3', floorId: 'floor-1', roomId: 'room-l1-11',
    floorNameSnapshot: 'Lantai 1', roomNameSnapshot: 'Toilet Lt.1',
    category: 'kebersihan', description: 'Toilet lantai 1 ada genangan air di sekitar wastafel. Keran bocor perlu diperbaiki.',
    status: 'resolved', photoUrl: '/photos/findings/toilet-bocor.jpg', createdAt: '2026-07-06T09:15:00',
    userName: 'Candra Wijaya',
  },
];

// Finding updates timeline
export interface FindingUpdate {
  id: string;
  findingId: string;
  userId: string;
  userName: string;
  action: 'created' | 'status_change' | 'comment' | 'photo_added';
  oldStatus?: string;
  newStatus?: string;
  comment?: string;
  createdAt: string;
}

export const findingUpdates: FindingUpdate[] = [
  { id: 'fu-1', findingId: 'fnd-2', userId: 'user-1', userName: 'Ahmad Fadillah', action: 'created', createdAt: '2026-07-08T15:54:00' },
  { id: 'fu-2', findingId: 'fnd-2', userId: 'user-4', userName: 'Dimas Prasetyo', action: 'status_change', oldStatus: 'new', newStatus: 'in_progress', createdAt: '2026-07-08T16:10:00' },
  { id: 'fu-3', findingId: 'fnd-2', userId: 'user-4', userName: 'Dimas Prasetyo', action: 'comment', comment: 'Sudah koordinasi dengan tim maintenance. Teknisi AC akan datang hari ini pukul 17:00.', createdAt: '2026-07-08T16:12:00' },
  { id: 'fu-4', findingId: 'fnd-1', userId: 'user-1', userName: 'Ahmad Fadillah', action: 'created', createdAt: '2026-07-08T15:16:00' },
];

// Photo gallery data
export interface GalleryPhoto {
  id: string;
  sessionId: string;
  patrolNumber: number;
  floorName: string;
  roomName: string;
  roomCode: string;
  officerName: string;
  takenAt: string;
  acStatus: string;
  lightStatus: string;
  condition: string;
  url: string;
  thumbnailUrl: string;
}

export const galleryPhotos: GalleryPhoto[] = [
  ...getRoomsByFloor('floor-sb').map((room, i) => ({
    id: `gp-sb-${i}`, sessionId: 'ts-6', patrolNumber: 6,
    floorName: 'Semi Basement', roomName: room.name, roomCode: room.code,
    officerName: 'Ahmad Fadillah', takenAt: `2026-07-08T15:${12 + i * 2}:00`,
    acStatus: room.hasAc ? 'ON' : '-', lightStatus: 'ON',
    condition: room.code === 'SB-03' ? 'Temuan' : 'Normal',
    url: `/photos/patrol-6/${room.code.toLowerCase()}.jpg`,
    thumbnailUrl: `/photos/patrol-6/thumb-${room.code.toLowerCase()}.jpg`,
  })),
  ...getRoomsByFloor('floor-1').slice(0, 8).map((room, i) => ({
    id: `gp-l1-${i}`, sessionId: 'ts-6', patrolNumber: 6,
    floorName: 'Lantai 1', roomName: room.name, roomCode: room.code,
    officerName: 'Ahmad Fadillah', takenAt: `2026-07-08T15:${45 + i * 3}:00`,
    acStatus: room.hasAc ? (room.code === 'L1-04' ? 'OFF' : 'ON') : '-', lightStatus: 'ON',
    condition: room.code === 'L1-04' ? 'Temuan' : 'Normal',
    url: `/photos/patrol-6/${room.code.toLowerCase()}.jpg`,
    thumbnailUrl: `/photos/patrol-6/thumb-${room.code.toLowerCase()}.jpg`,
  })),
];

// Stats summary
export const todayStats = {
  totalSessions: 8,
  completedSessions: 5,
  activeSessions: 1,
  pendingSessions: 2,
  lateSessions: 0,
  totalRoomsToday: 42 * 5, // 5 completed sessions * 42 rooms
  checkedRooms: 42 * 5 + 20, // plus 20 from active session
  totalFindings: allFindings.length,
  newFindings: allFindings.filter(f => f.status === 'new').length,
  activeFindings: allFindings.filter(f => f.status === 'in_progress').length,
  resolvedFindings: allFindings.filter(f => f.status === 'resolved').length,
  officers: [
    { name: 'Ahmad Fadillah', id: 'SEC-001', shift: 'Pagi', patrols: 4, status: 'active' },
    { name: 'Budi Santoso', id: 'SEC-002', shift: 'Siang', patrols: 0, status: 'scheduled' },
    { name: 'Candra Wijaya', id: 'SEC-003', shift: 'Malam', patrols: 2, status: 'off-duty' },
  ],
};
