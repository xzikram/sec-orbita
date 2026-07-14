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
export const adminFloors: AdminFloor[] = [
  { id: 'f1', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Semi Basement', code: 'SB', level: -1, totalRooms: 12, qrCode: 'JEC-ORB-SB-2026', isActive: true },
  { id: 'f2', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 1', code: 'L1', level: 1, totalRooms: 12, qrCode: 'JEC-ORB-L1-2026', isActive: true },
  { id: 'f3', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 2', code: 'L2', level: 2, totalRooms: 10, qrCode: 'JEC-ORB-L2-2026', isActive: true },
  { id: 'f4', buildingId: 'b1', buildingName: 'RS Mata JEC ORBITA', name: 'Lantai 3', code: 'L3', level: 3, totalRooms: 8, qrCode: 'JEC-ORB-L3-2026', isActive: true },
];

// Rooms (subset)
export const adminRooms: AdminRoom[] = [
  { id: 'r1', floorId: 'f1', floorName: 'Semi Basement', name: 'Ruang Genset', code: 'SB-01', patrolOrder: 1, hasAc: false, hasLight: true, photoGuide: 'Foto panel utama genset', isActive: true },
  { id: 'r2', floorId: 'f1', floorName: 'Semi Basement', name: 'Ruang Panel Listrik', code: 'SB-02', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto panel listrik utama', isActive: true },
  { id: 'r3', floorId: 'f1', floorName: 'Semi Basement', name: 'Ruang Server', code: 'SB-03', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area server dan suhu AC', isActive: true },
  { id: 'r4', floorId: 'f1', floorName: 'Semi Basement', name: 'Gudang Umum', code: 'SB-04', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto area gudang', isActive: true },
  { id: 'r5', floorId: 'f2', floorName: 'Lantai 1', name: 'Lobby Utama', code: 'L1-01', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto area lobby', isActive: true },
  { id: 'r6', floorId: 'f2', floorName: 'Lantai 1', name: 'Pendaftaran', code: 'L1-02', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area pendaftaran', isActive: true },
  { id: 'r7', floorId: 'f2', floorName: 'Lantai 1', name: 'Kasir', code: 'L1-03', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area kasir', isActive: true },
  { id: 'r8', floorId: 'f2', floorName: 'Lantai 1', name: 'Apotek', code: 'L1-04', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto area apotek', isActive: true },
  { id: 'r9', floorId: 'f3', floorName: 'Lantai 2', name: 'Ruang Konsultasi 1', code: 'L2-01', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto ruang konsultasi', isActive: true },
  { id: 'r10', floorId: 'f3', floorName: 'Lantai 2', name: 'Ruang Konsultasi 2', code: 'L2-02', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto ruang konsultasi', isActive: true },
  { id: 'r11', floorId: 'f4', floorName: 'Lantai 3', name: 'Ruang Operasi 1', code: 'L3-01', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto pintu ruang operasi', isActive: true },
  { id: 'r12', floorId: 'f4', floorName: 'Lantai 3', name: 'Ruang Operasi 2', code: 'L3-02', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto pintu ruang operasi', isActive: true },
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

// QR Configs
export const qrConfigs: QRConfig[] = [
  { id: 'qr1', floorId: 'f1', floorName: 'Semi Basement', floorCode: 'SB', qrValue: 'JEC-ORB-SB-2026-A7B3', generatedAt: '2026-01-15T08:00:00', lastPrinted: '2026-06-01T09:30:00' },
  { id: 'qr2', floorId: 'f2', floorName: 'Lantai 1', floorCode: 'L1', qrValue: 'JEC-ORB-L1-2026-C4D8', generatedAt: '2026-01-15T08:00:00', lastPrinted: '2026-06-01T09:30:00' },
  { id: 'qr3', floorId: 'f3', floorName: 'Lantai 2', floorCode: 'L2', qrValue: 'JEC-ORB-L2-2026-E5F2', generatedAt: '2026-01-15T08:00:00', lastPrinted: '2026-06-01T09:30:00' },
  { id: 'qr4', floorId: 'f4', floorName: 'Lantai 3', floorCode: 'L3', qrValue: 'JEC-ORB-L3-2026-G9H1', generatedAt: '2026-01-15T08:00:00', lastPrinted: null },
];
