// ============================================================
// ADMIN DUMMY DATA
// Data for admin panel CRUD pages
// ============================================================

export interface AdminUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'security' | 'supervisor' | 'admin';
  shiftId: string;
  shiftName: string;
  isActive: boolean;
  createdAt: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  address: string;
  totalFloors: number;
  totalRooms: number;
  isActive: boolean;
}

export interface AdminFloor {
  id: string;
  buildingId: string;
  buildingName: string;
  name: string;
  code: string;
  level: number;
  totalRooms: number;
  qrCode: string;
  isActive: boolean;
}

export interface AdminRoom {
  id: string;
  floorId: string;
  floorName: string;
  name: string;
  code: string;
  patrolOrder: number;
  hasAc: boolean;
  hasLight: boolean;
  photoGuide: string;
  isActive: boolean;
}

export interface AdminSchedule {
  id: string;
  patrolNumber: number;
  startTime: string;
  endTime: string;
  shiftId: string;
  shiftName: string;
  isActive: boolean;
}

export interface AdminShift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface QRConfig {
  id: string;
  floorId: string;
  floorName: string;
  floorCode: string;
  qrValue: string;
  generatedAt: string;
  lastPrinted: string | null;
}

// Users
export const adminUsers: AdminUser[] = [
  { id: 'u1', employeeId: 'SEC-001', name: 'Ahmad Fadillah', email: 'ahmad@jec.co.id', role: 'security', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true, createdAt: '2026-01-15' },
  { id: 'u2', employeeId: 'SEC-002', name: 'Budi Santoso', email: 'budi@jec.co.id', role: 'security', shiftId: 's2', shiftName: 'Shift Siang', isActive: true, createdAt: '2026-01-15' },
  { id: 'u3', employeeId: 'SEC-003', name: 'Candra Wijaya', email: 'candra@jec.co.id', role: 'security', shiftId: 's3', shiftName: 'Shift Malam', isActive: true, createdAt: '2026-02-01' },
  { id: 'u4', employeeId: 'SPV-001', name: 'Dimas Prasetyo', email: 'dimas@jec.co.id', role: 'supervisor', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true, createdAt: '2026-01-10' },
  { id: 'u5', employeeId: 'ADM-001', name: 'Eka Putri', email: 'eka@jec.co.id', role: 'admin', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true, createdAt: '2026-01-10' },
];

// Building
export const adminBuildings: Building[] = [
  { id: 'b1', name: 'RS Mata JEC ORBITA', code: 'JEC-ORB', address: 'Jl. Raya Orbita No. 1, Jakarta', totalFloors: 4, totalRooms: 42, isActive: true },
];

// Floors
// Floors (All 12 Floors of RS Mata JEC ORBITA)
export const adminFloors: AdminFloor[] = [
  { id: 'floor-sb', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Semi Basement', code: 'SB', level: -1, totalRooms: 15, qrCode: 'JEC-ORB-SB-1785290309537-R4ZC', isActive: true },
  { id: 'floor-1', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 1', code: 'L1', level: 1, totalRooms: 16, qrCode: 'JEC-ORB-L1-1785290309542-8Z4K', isActive: true },
  { id: 'floor-2', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai P2', code: 'P2', level: 2, totalRooms: 5, qrCode: 'JEC-ORB-P2-1785290309546-TWEO', isActive: true },
  { id: 'floor-3', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai P3', code: 'P3', level: 3, totalRooms: 5, qrCode: 'JEC-ORB-P3-1785290309549-P2CR', isActive: true },
  { id: 'floor-4', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai P4', code: 'P4', level: 4, totalRooms: 5, qrCode: 'JEC-ORB-P4-1785290309552-ZUMY', isActive: true },
  { id: 'floor-5', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 5', code: 'L5', level: 5, totalRooms: 10, qrCode: 'JEC-ORB-L5-1785290309555-6X2J', isActive: true },
  { id: 'floor-6', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 6', code: 'L6', level: 6, totalRooms: 12, qrCode: 'JEC-ORB-L6-1785290309559-6YRH', isActive: true },
  { id: 'floor-7', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 7', code: 'L7', level: 7, totalRooms: 10, qrCode: 'JEC-ORB-L7-1785290309562-B2S5', isActive: true },
  { id: 'floor-8', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 8', code: 'L8', level: 8, totalRooms: 8, qrCode: 'JEC-ORB-L8-1785290309565-QK16', isActive: true },
  { id: 'floor-9', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 9', code: 'L9', level: 9, totalRooms: 6, qrCode: 'JEC-ORB-L9-1785290309568-XUYC', isActive: true },
  { id: 'floor-10', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 10', code: 'L10', level: 10, totalRooms: 5, qrCode: 'JEC-ORB-L10-1785290309572-9J8U', isActive: true },
  { id: 'floor-11', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 11', code: 'L11', level: 11, totalRooms: 4, qrCode: 'JEC-ORB-L11-1785290309575-50K0', isActive: true },
];

// Rooms (subset)
export const adminRooms: AdminRoom[] = [
  { id: 'r1', floorId: 'floor-sb', floorName: 'Semi Basement', name: 'Ruang Genset', code: 'SB-01', patrolOrder: 1, hasAc: false, hasLight: true, photoGuide: 'Foto panel utama genset', isActive: true },
  { id: 'r2', floorId: 'floor-sb', floorName: 'Semi Basement', name: 'Ruang Panel Listrik', code: 'SB-02', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto panel listrik utama', isActive: true },
  { id: 'r3', floorId: 'floor-sb', floorName: 'Semi Basement', name: 'Ruang Server', code: 'SB-03', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area server dan suhu AC', isActive: true },
  { id: 'r4', floorId: 'floor-sb', floorName: 'Semi Basement', name: 'Gudang Umum', code: 'SB-04', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto area gudang', isActive: true },
  { id: 'r5', floorId: 'floor-1', floorName: 'Lantai 1', name: 'Lobby Utama', code: 'L1-01', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto area lobby', isActive: true },
  { id: 'r6', floorId: 'floor-1', floorName: 'Lantai 1', name: 'Pendaftaran', code: 'L1-02', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area pendaftaran', isActive: true },
  { id: 'r7', floorId: 'floor-1', floorName: 'Lantai 1', name: 'Kasir', code: 'L1-03', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area kasir', isActive: true },
  { id: 'r8', floorId: 'floor-1', floorName: 'Lantai 1', name: 'Apotek', code: 'L1-04', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto area apotek', isActive: true },
];

// Schedules
export const adminSchedules: AdminSchedule[] = [
  { id: 'sc1', patrolNumber: 1, startTime: '00:00', endTime: '03:00', shiftId: 's3', shiftName: 'Shift Malam', isActive: true },
  { id: 'sc2', patrolNumber: 2, startTime: '03:00', endTime: '06:00', shiftId: 's3', shiftName: 'Shift Malam', isActive: true },
  { id: 'sc3', patrolNumber: 3, startTime: '06:00', endTime: '09:00', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true },
  { id: 'sc4', patrolNumber: 4, startTime: '09:00', endTime: '12:00', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true },
  { id: 'sc5', patrolNumber: 5, startTime: '12:00', endTime: '15:00', shiftId: 's1', shiftName: 'Shift Pagi', isActive: true },
  { id: 'sc6', patrolNumber: 6, startTime: '15:00', endTime: '18:00', shiftId: 's2', shiftName: 'Shift Siang', isActive: true },
  { id: 'sc7', patrolNumber: 7, startTime: '18:00', endTime: '21:00', shiftId: 's2', shiftName: 'Shift Siang', isActive: true },
  { id: 'sc8', patrolNumber: 8, startTime: '21:00', endTime: '00:00', shiftId: 's2', shiftName: 'Shift Siang', isActive: true },
];

// Shifts
export const adminShifts: AdminShift[] = [
  { id: 's1', name: 'Shift Pagi', code: 'PAGI', startTime: '06:00', endTime: '14:00', isActive: true },
  { id: 's2', name: 'Shift Siang', code: 'SIANG', startTime: '14:00', endTime: '22:00', isActive: true },
  { id: 's3', name: 'Shift Malam', code: 'MALAM', startTime: '22:00', endTime: '06:00', isActive: true },
];

// QR Configs - 100% Locked to Physical Stickers on Walls
export const qrConfigs: QRConfig[] = [
  { id: 'qr-sb', floorId: 'floor-sb', floorName: 'Semi Basement', floorCode: 'SB', qrValue: 'JEC-ORB-SB-1785290309537-R4ZC', generatedAt: '2026-07-29T01:58:29.537Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l1', floorId: 'floor-1', floorName: 'Lantai 1', floorCode: 'L1', qrValue: 'JEC-ORB-L1-1785290309542-8Z4K', generatedAt: '2026-07-29T01:58:29.542Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-p2', floorId: 'floor-2', floorName: 'Lantai P2', floorCode: 'P2', qrValue: 'JEC-ORB-P2-1785290309546-TWEO', generatedAt: '2026-07-29T01:58:29.546Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-p3', floorId: 'floor-3', floorName: 'Lantai P3', floorCode: 'P3', qrValue: 'JEC-ORB-P3-1785290309549-P2CR', generatedAt: '2026-07-29T01:58:29.549Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-p4', floorId: 'floor-4', floorName: 'Lantai P4', floorCode: 'P4', qrValue: 'JEC-ORB-P4-1785290309552-ZUMY', generatedAt: '2026-07-29T01:58:29.552Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l5', floorId: 'floor-5', floorName: 'Lantai 5', floorCode: 'L5', qrValue: 'JEC-ORB-L5-1785290309555-6X2J', generatedAt: '2026-07-29T01:58:29.555Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l6', floorId: 'floor-6', floorName: 'Lantai 6', floorCode: 'L6', qrValue: 'JEC-ORB-L6-1785290309559-6YRH', generatedAt: '2026-07-29T01:58:29.559Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l7', floorId: 'floor-7', floorName: 'Lantai 7', floorCode: 'L7', qrValue: 'JEC-ORB-L7-1785290309562-B2S5', generatedAt: '2026-07-29T01:58:29.562Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l8', floorId: 'floor-8', floorName: 'Lantai 8', floorCode: 'L8', qrValue: 'JEC-ORB-L8-1785290309565-QK16', generatedAt: '2026-07-29T01:58:29.565Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l9', floorId: 'floor-9', floorName: 'Lantai 9', floorCode: 'L9', qrValue: 'JEC-ORB-L9-1785290309568-XUYC', generatedAt: '2026-07-29T01:58:29.568Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l10', floorId: 'floor-10', floorName: 'Lantai 10', floorCode: 'L10', qrValue: 'JEC-ORB-L10-1785290309572-9J8U', generatedAt: '2026-07-29T01:58:29.572Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
  { id: 'qr-l11', floorId: 'floor-11', floorName: 'Lantai 11', floorCode: 'L11', qrValue: 'JEC-ORB-L11-1785290309575-50K0', generatedAt: '2026-07-29T01:58:29.575Z', lastPrinted: '2026-07-29T02:00:00.000Z' },
];
