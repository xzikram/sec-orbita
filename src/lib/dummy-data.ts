// ============================================================
// DUMMY DATA — Security Patrol Monitoring System
// RS Mata JEC ORBITA
// ============================================================

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: 'security' | 'supervisor' | 'admin';
  shiftId: string;
  isActive: boolean;
  avatar?: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface Room {
  id: string;
  floorId: string;
  code: string;
  name: string;
  patrolOrder: number;
  hasAc: boolean;
  hasLight: boolean;
  photoGuide: string;
  isActive: boolean;
}

export interface PatrolSchedule {
  id: string;
  name: string;
  patrolNumber: number;
  startTime: string;
  endTime: string;
}

export type PatrolSessionStatus = 'pending' | 'in_progress' | 'completed' | 'late' | 'incomplete';
export type FloorSessionStatus = 'pending' | 'in_progress' | 'completed';
export type CheckCondition = 'normal' | 'finding';
export type ACStatus = 'on' | 'off' | 'not_available';
export type LightStatus = 'on' | 'off' | 'not_available';
export type FindingCategory = 'keamanan' | 'fasilitas' | 'listrik' | 'ac' | 'kebersihan' | 'akses_pintu' | 'orang_mencurigakan' | 'lainnya';
export type FindingStatus = 'new' | 'in_progress' | 'resolved';

export interface PatrolSession {
  id: string;
  userId: string;
  scheduleId: string;
  shiftId: string;
  patrolDate: string;
  patrolNumber: number;
  status: PatrolSessionStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface PatrolSessionFloor {
  id: string;
  sessionId: string;
  floorId: string;
  floorNameSnapshot: string;
  status: FloorSessionStatus;
  qrValidated: boolean;
  qrScannedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PatrolCheck {
  id: string;
  sessionFloorId: string;
  roomId: string;
  userId: string;
  roomNameSnapshot: string;
  roomCodeSnapshot: string;
  floorNameSnapshot: string;
  roomOrderSnapshot: number;
  acStatus: ACStatus;
  lightStatus: LightStatus;
  condition: CheckCondition;
  remarks?: string;
  checkedAt: string;
  photoUrl?: string;
}

export interface Finding {
  id: string;
  findingNumber: string;
  checkId: string;
  sessionId: string;
  userId: string;
  floorId: string;
  roomId: string;
  floorNameSnapshot: string;
  roomNameSnapshot: string;
  category: FindingCategory;
  description: string;
  status: FindingStatus;
  photoUrl?: string;
  createdAt: string;
}

// ============================================================
// DATA
// ============================================================

export const shifts: Shift[] = [
  { id: 'shift-1', name: 'Shift Pagi', startTime: '07:00', endTime: '19:00' },
  { id: 'shift-2', name: 'Shift Malam', startTime: '19:00', endTime: '07:00' },
];

export const users: User[] = [
  { id: 'user-1', employeeId: 'SEC-001', name: 'Ahmad Fadillah', email: 'ahmad@jec.co.id', role: 'security', shiftId: 'shift-1', isActive: true },
  { id: 'user-2', employeeId: 'SEC-002', name: 'Budi Santoso', email: 'budi@jec.co.id', role: 'security', shiftId: 'shift-1', isActive: true },
  { id: 'user-3', employeeId: 'SEC-003', name: 'Candra Wijaya', email: 'candra@jec.co.id', role: 'security', shiftId: 'shift-2', isActive: true },
  { id: 'user-4', employeeId: 'SPV-001', name: 'Dimas Prasetyo', email: 'dimas@jec.co.id', role: 'supervisor', shiftId: 'shift-1', isActive: true },
  { id: 'user-5', employeeId: 'ADM-001', name: 'Eka Putri', email: 'eka@jec.co.id', role: 'admin', shiftId: 'shift-1', isActive: true },
];

export const buildings: Building[] = [
  { id: 'bld-1', code: 'ORBITA', name: 'RS Mata JEC ORBITA' },
];export const floors: Floor[] = [
  { id: 'floor-sb', buildingId: 'bld-1', code: 'SB', name: 'Semi Basement', sortOrder: 0 },
  { id: 'floor-1', buildingId: 'bld-1', code: 'L1', name: 'Lantai 1', sortOrder: 1 },
  { id: 'floor-2', buildingId: 'bld-1', code: 'P2', name: 'Lantai P2', sortOrder: 2 },
  { id: 'floor-3', buildingId: 'bld-1', code: 'P3', name: 'Lantai P3', sortOrder: 3 },
  { id: 'floor-4', buildingId: 'bld-1', code: 'P4', name: 'Lantai P4', sortOrder: 4 },
  { id: 'floor-5', buildingId: 'bld-1', code: 'L5', name: 'Lantai 5', sortOrder: 5 },
  { id: 'floor-6', buildingId: 'bld-1', code: 'L6', name: 'Lantai 6', sortOrder: 6 },
  { id: 'floor-7', buildingId: 'bld-1', code: 'L7', name: 'Lantai 7', sortOrder: 7 },
  { id: 'floor-8', buildingId: 'bld-1', code: 'L8', name: 'Lantai 8', sortOrder: 8 },
  { id: 'floor-9', buildingId: 'bld-1', code: 'L9', name: 'Lantai 9', sortOrder: 9 },
  { id: 'floor-10', buildingId: 'bld-1', code: 'L10', name: 'Lantai 10', sortOrder: 10 },
  { id: 'floor-11', buildingId: 'bld-1', code: 'L11', name: 'Lantai 11', sortOrder: 11 },
];

export const rooms: Room[] = [
  // Semi Basement (SB)
  { id: 'room-sb-01', floorId: 'floor-sb', code: 'SB-01', name: 'R. POMPA HYDRANT', patrolOrder: 1, hasAc: false, hasLight: true, photoGuide: 'Foto pompa hydrant', isActive: true },
  { id: 'room-sb-02', floorId: 'floor-sb', code: 'SB-02', name: 'R. GENSET', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto panel utama genset', isActive: true },
  { id: 'room-sb-03', floorId: 'floor-sb', code: 'SB-03', name: 'R.SECURITY (Musik nyala 07:00-21:00)', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto pos security', isActive: true },
  { id: 'room-sb-04', floorId: 'floor-sb', code: 'SB-04', name: 'R. CAPASITOR', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto panel capacitor', isActive: true },
  { id: 'room-sb-05', floorId: 'floor-sb', code: 'SB-05', name: 'KANTIN', patrolOrder: 5, hasAc: false, hasLight: true, photoGuide: 'Foto area kantin', isActive: true },
  { id: 'room-sb-06', floorId: 'floor-sb', code: 'SB-06', name: 'MUSHOLLA', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto area musholla', isActive: true },
  { id: 'room-sb-07', floorId: 'floor-sb', code: 'SB-07', name: 'R. LINEN', patrolOrder: 7, hasAc: false, hasLight: true, photoGuide: 'Foto R. Linen', isActive: true },
  { id: 'room-sb-08', floorId: 'floor-sb', code: 'SB-08', name: 'R. G. GA', patrolOrder: 8, hasAc: false, hasLight: true, photoGuide: 'Foto R. G. GA', isActive: true },
  { id: 'room-sb-09', floorId: 'floor-sb', code: 'SB-09', name: 'R GA', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto R GA', isActive: true },
  { id: 'room-sb-10', floorId: 'floor-sb', code: 'SB-10', name: 'R. RM', patrolOrder: 10, hasAc: true, hasLight: true, photoGuide: 'Foto area rekam medis', isActive: true },
  { id: 'room-sb-11', floorId: 'floor-sb', code: 'SB-11', name: 'R. GANTI KARYAWAN', patrolOrder: 11, hasAc: true, hasLight: true, photoGuide: 'Foto ruang ganti', isActive: true },
  { id: 'room-sb-12', floorId: 'floor-sb', code: 'SB-12', name: 'R. CCTV', patrolOrder: 12, hasAc: true, hasLight: true, photoGuide: 'Foto monitor CCTV', isActive: true },
  { id: 'room-sb-13', floorId: 'floor-sb', code: 'SB-13', name: 'R. PANEL UPS', patrolOrder: 13, hasAc: true, hasLight: true, photoGuide: 'Foto panel UPS', isActive: true },
  { id: 'room-sb-14', floorId: 'floor-sb', code: 'SB-14', name: 'R. PANEL TM INDIKASI', patrolOrder: 14, hasAc: false, hasLight: true, photoGuide: 'Foto panel TM indikasi', isActive: true },
  { id: 'room-sb-15', floorId: 'floor-sb', code: 'SB-15', name: 'TANGGA DARURAT', patrolOrder: 15, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },

  // Lantai 1 (L1)
  { id: 'room-l1-01', floorId: 'floor-1', code: 'L1-01', name: 'ADMISI', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto area admisi', isActive: true },
  { id: 'room-l1-02', floorId: 'floor-1', code: 'L1-02', name: 'KASIR', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area kasir', isActive: true },
  { id: 'room-l1-03', floorId: 'floor-1', code: 'L1-03', name: 'APOTIK', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area apotik', isActive: true },
  { id: 'room-l1-04', floorId: 'floor-1', code: 'L1-04', name: 'OPTIK & R. P OPTIK', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto optik dan ruang periksa', isActive: true },
  { id: 'room-l1-05', floorId: 'floor-1', code: 'L1-05', name: 'IGD', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto area IGD', isActive: true },
  { id: 'room-l1-06', floorId: 'floor-1', code: 'L1-06', name: 'TRANSIT JENAZAH', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto ruang transit jenazah', isActive: true },
  { id: 'room-l1-07', floorId: 'floor-1', code: 'L1-07', name: 'R GAS MEDIS', patrolOrder: 7, hasAc: false, hasLight: true, photoGuide: 'Foto panel/tabung gas medis', isActive: true },
  { id: 'room-l1-08', floorId: 'floor-1', code: 'L1-08', name: 'R MCFA', patrolOrder: 8, hasAc: false, hasLight: true, photoGuide: 'Foto panel MCFA', isActive: true },
  { id: 'room-l1-09', floorId: 'floor-1', code: 'L1-09', name: 'R. TPS', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto area TPS', isActive: true },
  { id: 'room-l1-10', floorId: 'floor-1', code: 'L1-10', name: 'R. PANEL', patrolOrder: 10, hasAc: false, hasLight: true, photoGuide: 'Foto pintu panel', isActive: true },
  { id: 'room-l1-11', floorId: 'floor-1', code: 'L1-11', name: 'TOILET STAF & PASIEN', patrolOrder: 11, hasAc: false, hasLight: true, photoGuide: 'Foto area toilet', isActive: true },
  { id: 'room-l1-12', floorId: 'floor-1', code: 'L1-12', name: 'TANGGA DARURAT', patrolOrder: 12, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },

  // Lantai P2 (P2)
  { id: 'room-p2-01', floorId: 'floor-2', code: 'P2-01', name: 'R. FASET', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto area R. Faset', isActive: true },
  { id: 'room-p2-02', floorId: 'floor-2', code: 'P2-02', name: 'TANGGA DARURAT', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-p2-03', floorId: 'floor-2', code: 'P2-03', name: 'R PANEL', patrolOrder: 3, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai P2', isActive: true },
  { id: 'room-p2-04', floorId: 'floor-2', code: 'P2-04', name: 'JANITOR', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-p2-05', floorId: 'floor-2', code: 'P2-05', name: 'TOILET', patrolOrder: 5, hasAc: false, hasLight: true, photoGuide: 'Foto toilet P2', isActive: true },

  // Lantai P3 (P3)
  { id: 'room-p3-01', floorId: 'floor-3', code: 'P3-01', name: 'GUDANG GIZI', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto pintu gudang gizi', isActive: true },
  { id: 'room-p3-02', floorId: 'floor-3', code: 'P3-02', name: 'TANGGA DARURAT', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-p3-03', floorId: 'floor-3', code: 'P3-03', name: 'JANITOR', patrolOrder: 3, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-p3-04', floorId: 'floor-3', code: 'P3-04', name: 'R. PANEL', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai P3', isActive: true },
  { id: 'room-p3-05', floorId: 'floor-3', code: 'P3-05', name: 'TOILET STAF & PASIEN', patrolOrder: 5, hasAc: false, hasLight: true, photoGuide: 'Foto toilet P3', isActive: true },

  // Lantai P4 (P4)
  { id: 'room-p4-01', floorId: 'floor-4', code: 'P4-01', name: 'R. GUDANG IT', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto ruang gudang IT', isActive: true },
  { id: 'room-p4-02', floorId: 'floor-4', code: 'P4-02', name: 'JANITOR', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-p4-03', floorId: 'floor-4', code: 'P4-03', name: 'TANGGA DARURAT', patrolOrder: 3, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-p4-04', floorId: 'floor-4', code: 'P4-04', name: 'R. PANEL', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai P4', isActive: true },
  { id: 'room-p4-05', floorId: 'floor-4', code: 'P4-05', name: 'TOILET STAF & PASIEN', patrolOrder: 5, hasAc: false, hasLight: true, photoGuide: 'Foto toilet P4', isActive: true },

  // Lantai 5 (L5)
  { id: 'room-l5-01', floorId: 'floor-5', code: 'L5-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto nurse station lantai 5', isActive: true },
  { id: 'room-l5-02', floorId: 'floor-5', code: 'L5-02', name: 'LAB', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area laboratorium', isActive: true },
  { id: 'room-l5-03', floorId: 'floor-5', code: 'L5-03', name: 'RADIOLOGI', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto pintu radiologi', isActive: true },
  { id: 'room-l5-04', floorId: 'floor-5', code: 'L5-04', name: 'POLI 5A', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 5A', isActive: true },
  { id: 'room-l5-05', floorId: 'floor-5', code: 'L5-05', name: 'POLI 5B', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 5B', isActive: true },
  { id: 'room-l5-06', floorId: 'floor-5', code: 'L5-06', name: 'POLI 5C', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 5C', isActive: true },
  { id: 'room-l5-07', floorId: 'floor-5', code: 'L5-07', name: 'POLI 5D R TINDAKAN', patrolOrder: 7, hasAc: true, hasLight: true, photoGuide: 'Foto ruang tindakan 5D', isActive: true },
  { id: 'room-l5-08', floorId: 'floor-5', code: 'L5-08', name: 'POLI 5E', patrolOrder: 8, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 5E', isActive: true },
  { id: 'room-l5-09', floorId: 'floor-5', code: 'L5-09', name: 'POLI 5F', patrolOrder: 9, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 5F', isActive: true },
  { id: 'room-l5-10', floorId: 'floor-5', code: 'L5-10', name: 'BDR', patrolOrder: 10, hasAc: true, hasLight: true, photoGuide: 'Foto ruang BDR', isActive: true },
  { id: 'room-l5-11', floorId: 'floor-5', code: 'L5-11', name: 'PEC', patrolOrder: 11, hasAc: true, hasLight: true, photoGuide: 'Foto ruang PEC', isActive: true },
  { id: 'room-l5-12', floorId: 'floor-5', code: 'L5-12', name: 'JANITOR', patrolOrder: 12, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l5-13', floorId: 'floor-5', code: 'L5-13', name: 'TENANT', patrolOrder: 13, hasAc: true, hasLight: true, photoGuide: 'Foto area tenant', isActive: true },
  { id: 'room-l5-14', floorId: 'floor-5', code: 'L5-14', name: 'TANGGA DARURAT', patrolOrder: 14, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-l5-15', floorId: 'floor-5', code: 'L5-15', name: 'KORIDOR BELAKANG', patrolOrder: 15, hasAc: false, hasLight: true, photoGuide: 'Foto koridor belakang', isActive: true },
  { id: 'room-l5-16', floorId: 'floor-5', code: 'L5-16', name: 'R. PANEL', patrolOrder: 16, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai 5', isActive: true },
  { id: 'room-l5-17', floorId: 'floor-5', code: 'L5-17', name: 'TOILET STAF & PASIEN', patrolOrder: 17, hasAc: false, hasLight: true, photoGuide: 'Foto toilet lantai 5', isActive: true },

  // Lantai 6 (L6)
  { id: 'room-l6-01', floorId: 'floor-6', code: 'L6-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto nurse station lantai 6', isActive: true },
  { id: 'room-l6-02', floorId: 'floor-6', code: 'L6-02', name: 'DRY EYE CENTER', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area dry eye center', isActive: true },
  { id: 'room-l6-03', floorId: 'floor-6', code: 'L6-03', name: 'FITTING LENSA', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area fitting lensa', isActive: true },
  { id: 'room-l6-04', floorId: 'floor-6', code: 'L6-04', name: 'POLI 6A', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 6A', isActive: true },
  { id: 'room-l6-05', floorId: 'floor-6', code: 'L6-05', name: 'POLI 6B', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 6B', isActive: true },
  { id: 'room-l6-06', floorId: 'floor-6', code: 'L6-06', name: 'POLI 6C', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 6C', isActive: true },
  { id: 'room-l6-07', floorId: 'floor-6', code: 'L6-07', name: 'POLI 6D', patrolOrder: 7, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 6D', isActive: true },
  { id: 'room-l6-08', floorId: 'floor-6', code: 'L6-08', name: 'POLI 6E', patrolOrder: 8, hasAc: true, hasLight: true, photoGuide: 'Foto ruang poli 6E', isActive: true },
  { id: 'room-l6-09', floorId: 'floor-6', code: 'L6-09', name: 'JANITOR', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l6-10', floorId: 'floor-6', code: 'L6-10', name: 'BDR', patrolOrder: 10, hasAc: true, hasLight: true, photoGuide: 'Foto ruang BDR lantai 6', isActive: true },
  { id: 'room-l6-11', floorId: 'floor-6', code: 'L6-11', name: 'LASER ROOM', patrolOrder: 11, hasAc: true, hasLight: true, photoGuide: 'Foto laser room', isActive: true },
  { id: 'room-l6-12', floorId: 'floor-6', code: 'L6-12', name: 'CDC', patrolOrder: 12, hasAc: true, hasLight: true, photoGuide: 'Foto area CDC', isActive: true },
  { id: 'room-l6-13', floorId: 'floor-6', code: 'L6-13', name: 'GUDANG LOGISTIK', patrolOrder: 13, hasAc: true, hasLight: true, photoGuide: 'Foto pintu gudang logistik', isActive: true },
  { id: 'room-l6-14', floorId: 'floor-6', code: 'L6-14', name: 'KORIDOR BELAKANG', patrolOrder: 14, hasAc: false, hasLight: true, photoGuide: 'Foto koridor belakang', isActive: true },
  { id: 'room-l6-15', floorId: 'floor-6', code: 'L6-15', name: 'TANGGA DARURAT', patrolOrder: 15, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-l6-16', floorId: 'floor-6', code: 'L6-16', name: 'R. PANEL', patrolOrder: 16, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai 6', isActive: true },
  { id: 'room-l6-17', floorId: 'floor-6', code: 'L6-17', name: 'TOILET STAF & PASIEN', patrolOrder: 17, hasAc: false, hasLight: true, photoGuide: 'Foto toilet lantai 6', isActive: true },

  // Lantai 7 (L7)
  { id: 'room-l7-01', floorId: 'floor-7', code: 'L7-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto nurse station lantai 7', isActive: true },
  { id: 'room-l7-02', floorId: 'floor-7', code: 'L7-02', name: 'BDR / PEDIATRIC', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area BDR/pediatric', isActive: true },
  { id: 'room-l7-03', floorId: 'floor-7', code: 'L7-03', name: 'LOW VISION', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area low vision', isActive: true },
  { id: 'room-l7-04', floorId: 'floor-7', code: 'L7-04', name: 'PLAYGROUND', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto playground', isActive: true },
  { id: 'room-l7-05', floorId: 'floor-7', code: 'L7-05', name: 'NUSERY ROOM', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto nusery room', isActive: true },
  { id: 'room-l7-06', floorId: 'floor-7', code: 'L7-06', name: 'EYE CENTER', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto area eye center', isActive: true },
  { id: 'room-l7-07', floorId: 'floor-7', code: 'L7-07', name: 'PROTESA SERVICE', patrolOrder: 7, hasAc: true, hasLight: true, photoGuide: 'Foto area protesa service', isActive: true },
  { id: 'room-l7-08', floorId: 'floor-7', code: 'L7-08', name: 'LASER VISION', patrolOrder: 8, hasAc: true, hasLight: true, photoGuide: 'Foto laser vision', isActive: true },
  { id: 'room-l7-09', floorId: 'floor-7', code: 'L7-09', name: 'R. PEMULIHAN LASIK', patrolOrder: 9, hasAc: true, hasLight: true, photoGuide: 'Foto ruang pemulihan LASIK', isActive: true },
  { id: 'room-l7-10', floorId: 'floor-7', code: 'L7-10', name: 'R. PEMERIKSAAN', patrolOrder: 10, hasAc: true, hasLight: true, photoGuide: 'Foto ruang pemeriksaan', isActive: true },
  { id: 'room-l7-11', floorId: 'floor-7', code: 'L7-11', name: 'KORIDOR BELAKANG', patrolOrder: 11, hasAc: false, hasLight: true, photoGuide: 'Foto koridor belakang', isActive: true },
  { id: 'room-l7-12', floorId: 'floor-7', code: 'L7-12', name: 'JANITOR', patrolOrder: 12, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l7-13', floorId: 'floor-7', code: 'L7-13', name: 'TANGGA DARURAT', patrolOrder: 13, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-l7-14', floorId: 'floor-7', code: 'L7-14', name: 'R. PANEL', patrolOrder: 14, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai 7', isActive: true },
  { id: 'room-l7-15', floorId: 'floor-7', code: 'L7-15', name: 'TOILET STAF & PASIEN', patrolOrder: 15, hasAc: false, hasLight: true, photoGuide: 'Foto toilet lantai 7', isActive: true },

  // Lantai 8 (L8)
  { id: 'room-l8-01', floorId: 'floor-8', code: 'L8-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto nurse station lantai 8', isActive: true },
  { id: 'room-l8-02', floorId: 'floor-8', code: 'L8-02', name: 'VVIP', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto area VVIP', isActive: true },
  { id: 'room-l8-03', floorId: 'floor-8', code: 'L8-03', name: 'VIP A', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area VIP A', isActive: true },
  { id: 'room-l8-04', floorId: 'floor-8', code: 'L8-04', name: 'VIP B', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto area VIP B', isActive: true },
  { id: 'room-l8-05', floorId: 'floor-8', code: 'L8-05', name: 'KELAS 1', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto area kelas 1', isActive: true },
  { id: 'room-l8-06', floorId: 'floor-8', code: 'L8-06', name: 'KELAS 2', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto area kelas 2', isActive: true },
  { id: 'room-l8-07', floorId: 'floor-8', code: 'L8-07', name: 'KRIS A', patrolOrder: 7, hasAc: true, hasLight: true, photoGuide: 'Foto area KRIS A', isActive: true },
  { id: 'room-l8-08', floorId: 'floor-8', code: 'L8-08', name: 'KRIS B', patrolOrder: 8, hasAc: true, hasLight: true, photoGuide: 'Foto area KRIS B', isActive: true },
  { id: 'room-l8-09', floorId: 'floor-8', code: 'L8-09', name: 'R. GUDANG LINEN', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto R. Gudang Linen', isActive: true },
  { id: 'room-l8-10', floorId: 'floor-8', code: 'L8-10', name: 'R. GUDANG UMUM', patrolOrder: 10, hasAc: false, hasLight: true, photoGuide: 'Foto R. Gudang Umum', isActive: true },
  { id: 'room-l8-11', floorId: 'floor-8', code: 'L8-11', name: 'ISOLASI', patrolOrder: 11, hasAc: true, hasLight: true, photoGuide: 'Foto ruang isolasi', isActive: true },
  { id: 'room-l8-12', floorId: 'floor-8', code: 'L8-12', name: 'PANTRY', patrolOrder: 12, hasAc: false, hasLight: true, photoGuide: 'Foto area pantry', isActive: true },
  { id: 'room-l8-13', floorId: 'floor-8', code: 'L8-13', name: 'JANITOR', patrolOrder: 13, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l8-14', floorId: 'floor-8', code: 'L8-14', name: 'R. PANEL', patrolOrder: 14, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai 8', isActive: true },
  { id: 'room-l8-15', floorId: 'floor-8', code: 'L8-15', name: 'TOILET PERAWAT', patrolOrder: 15, hasAc: false, hasLight: true, photoGuide: 'Foto toilet perawat', isActive: true },

  // Lantai 9 (L9)
  { id: 'room-l9-01', floorId: 'floor-9', code: 'L9-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto nurse station lantai 9', isActive: true },
  { id: 'room-l9-02', floorId: 'floor-9', code: 'L9-02', name: 'PENDAFTARAN', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto pendaftaran lantai 9', isActive: true },
  { id: 'room-l9-03', floorId: 'floor-9', code: 'L9-03', name: 'CSSD', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto area CSSD', isActive: true },
  { id: 'room-l9-04', floorId: 'floor-9', code: 'L9-04', name: 'R. DOKTER', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto ruang dokter', isActive: true },
  { id: 'room-l9-05', floorId: 'floor-9', code: 'L9-05', name: 'R. PERIKSA DOKTER', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto ruang periksa dokter', isActive: true },
  { id: 'room-l9-06', floorId: 'floor-9', code: 'L9-06', name: 'R. PANEL', patrolOrder: 6, hasAc: true, hasLight: true, photoGuide: 'Foto panel lantai 9', isActive: true },
  { id: 'room-l9-07', floorId: 'floor-9', code: 'L9-07', name: 'R. PANTRY', patrolOrder: 7, hasAc: false, hasLight: true, photoGuide: 'Foto pantry lantai 9', isActive: true },
  { id: 'room-l9-08', floorId: 'floor-9', code: 'L9-08', name: 'JANITOR', patrolOrder: 8, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l9-09', floorId: 'floor-9', code: 'L9-09', name: 'TANGGA DARURAT', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-l9-10', floorId: 'floor-9', code: 'L9-10', name: 'TOILET STAF & PASIEN', patrolOrder: 10, hasAc: false, hasLight: true, photoGuide: 'Foto toilet', isActive: true },

  // Lantai 10 (L10)
  { id: 'room-l10-01', floorId: 'floor-10', code: 'L10-01', name: 'R. AUDITORIUM', patrolOrder: 1, hasAc: true, hasLight: true, photoGuide: 'Foto auditorium', isActive: true },
  { id: 'room-l10-02', floorId: 'floor-10', code: 'L10-02', name: 'R. MANAJEMEN', patrolOrder: 2, hasAc: true, hasLight: true, photoGuide: 'Foto ruang manajemen', isActive: true },
  { id: 'room-l10-03', floorId: 'floor-10', code: 'L10-03', name: 'R. DIREKSI', patrolOrder: 3, hasAc: true, hasLight: true, photoGuide: 'Foto ruang direksi', isActive: true },
  { id: 'room-l10-04', floorId: 'floor-10', code: 'L10-04', name: 'DRY LAB', patrolOrder: 4, hasAc: true, hasLight: true, photoGuide: 'Foto dry lab', isActive: true },
  { id: 'room-l10-05', floorId: 'floor-10', code: 'L10-05', name: 'WET LAB', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto wet lab', isActive: true },
  { id: 'room-l10-06', floorId: 'floor-10', code: 'L10-06', name: 'PANTRY', patrolOrder: 6, hasAc: false, hasLight: true, photoGuide: 'Foto area pantry', isActive: true },
  { id: 'room-l10-07', floorId: 'floor-10', code: 'L10-07', name: 'PERPUSTAKAAN', patrolOrder: 7, hasAc: true, hasLight: true, photoGuide: 'Foto perpustakaan', isActive: true },
  { id: 'room-l10-08', floorId: 'floor-10', code: 'L10-08', name: 'R. PANEL', patrolOrder: 8, hasAc: false, hasLight: true, photoGuide: 'Foto panel lantai 10', isActive: true },
  { id: 'room-l10-09', floorId: 'floor-10', code: 'L10-09', name: 'JANITOR', patrolOrder: 9, hasAc: false, hasLight: true, photoGuide: 'Foto area janitor', isActive: true },
  { id: 'room-l10-10', floorId: 'floor-10', code: 'L10-10', name: 'TANGGA DARURAT', patrolOrder: 10, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
  { id: 'room-l10-11', floorId: 'floor-10', code: 'L10-11', name: 'TOILET KARYAWAN', patrolOrder: 11, hasAc: false, hasLight: true, photoGuide: 'Foto toilet karyawan', isActive: true },

  // Lantai 11 (L11)
  { id: 'room-l11-01', floorId: 'floor-11', code: 'L11-01', name: 'GONDOLA', patrolOrder: 1, hasAc: false, hasLight: true, photoGuide: 'Foto area gondola', isActive: true },
  { id: 'room-l11-02', floorId: 'floor-11', code: 'L11-02', name: 'TANDEM', patrolOrder: 2, hasAc: false, hasLight: true, photoGuide: 'Foto area tandem', isActive: true },
  { id: 'room-l11-03', floorId: 'floor-11', code: 'L11-03', name: 'REVERSE OSMOSIS (RO)', patrolOrder: 3, hasAc: false, hasLight: true, photoGuide: 'Foto panel/unit RO', isActive: true },
  { id: 'room-l11-04', floorId: 'floor-11', code: 'L11-04', name: 'AHU', patrolOrder: 4, hasAc: false, hasLight: true, photoGuide: 'Foto unit AHU', isActive: true },
  { id: 'room-l11-05', floorId: 'floor-11', code: 'L11-05', name: 'R. PANEL', patrolOrder: 5, hasAc: true, hasLight: true, photoGuide: 'Foto panel lantai 11', isActive: true },
  { id: 'room-l11-06', floorId: 'floor-11', code: 'L11-06', name: 'TANGGA DARURAT', patrolOrder: 6, hasAc: false, hasLight: true, photoGuide: 'Foto tangga darurat', isActive: true },
];

export const patrolSchedules: PatrolSchedule[] = [
  { id: 'sched-1', name: 'Patroli 1', patrolNumber: 1, startTime: '07:00', endTime: '10:00' },
  { id: 'sched-2', name: 'Patroli 2', patrolNumber: 2, startTime: '10:00', endTime: '13:00' },
  { id: 'sched-3', name: 'Patroli 3', patrolNumber: 3, startTime: '13:00', endTime: '16:00' },
  { id: 'sched-4', name: 'Patroli 4', patrolNumber: 4, startTime: '16:00', endTime: '19:00' },
  { id: 'sched-5', name: 'Patroli 5', patrolNumber: 5, startTime: '19:00', endTime: '22:00' },
  { id: 'sched-6', name: 'Patroli 6', patrolNumber: 6, startTime: '22:00', endTime: '01:00' },
  { id: 'sched-7', name: 'Patroli 7', patrolNumber: 7, startTime: '01:00', endTime: '04:00' },
  { id: 'sched-8', name: 'Patroli 8', patrolNumber: 8, startTime: '04:00', endTime: '07:00' },
];

// Database UUID to Floor code mapping
export const dbFloorMap: Record<string, string> = {
  '32f95559-8190-4335-b448-6f96b7c7e9fd': 'L1',
  'b9c1f91b-fe5d-49c3-881a-62513fcb4064': 'L10',
  '04a1208d-6e61-45c4-8047-7b3206564f67': 'L11',
  '07a3a76e-cca8-4ca9-a6c6-8d204275d9a4': 'L5',
  '8d9f5507-9c67-402b-875d-bbdf360b736f': 'L6',
  '239e1143-33c6-4808-a431-8facfb63a26b': 'L7',
  'f3cadf41-f5f0-4d2c-9270-dca03be439b8': 'L8',
  '55981ce8-06b0-4a25-abbe-8e5185d64685': 'L9',
  'c0b5ac2b-4d77-4489-8220-1f35e3c73408': 'P2',
  'f9d6a3cb-11c3-4b73-8159-976a34b0844c': 'P3',
  '73822a3b-ae0d-41f2-a361-b82aa7b1e1cd': 'P4',
  'e20088de-d3c8-4079-9532-3c5eeffe31ea': 'SB',
};

// Database UUID to Room code mapping (133 rooms)
export const dbRoomCodeMap: Record<string, string> = {
  "784ee74c-eccf-4d0e-acb2-51d8542e9b8c":"L1-01","0810746e-c948-43fe-9c6a-9fac4444d4e6":"L1-02","b3386104-9ef8-4616-ab30-4a47204ee069":"L1-03","62874552-6cad-4793-8012-6472fbccbf7e":"L1-04","a5ce1f7d-4798-4270-bb41-92e77ae6fa81":"L1-05","72db71f4-3922-47c4-80bc-32596e7c910d":"L1-06","b5ef8031-5867-46fc-8023-ce03f002a092":"L1-07","e56b35e7-4dc3-440f-9efa-bccc4a898eda":"L1-08","a008075d-5b27-4582-be23-ef94d770bef1":"L1-09","8baff6c6-0531-4d33-acab-d7f71addbbd2":"L1-10","011f75dd-dc6e-4451-83cd-0c01759e32f3":"L1-11","2b59d6c6-1f6e-49e1-bef5-0d460e0c773d":"L1-12",
  "0eff0c1e-c5db-42cd-af8d-9e5603332f39":"L10-01","9688caa8-8ca2-4c3e-be28-095ba9ecc178":"L10-02","20211de5-a82d-426f-8ae8-d6c9a7d0901b":"L10-03","767de4cd-3074-403c-99d5-f2e7d2792119":"L10-04","0da125c6-d175-4965-a2b7-c5c3d25b2dca":"L10-05","c4a98100-6094-45f6-b841-d9f7af44d79e":"L10-06","f9e9e078-0691-40ea-8b49-f03d2bf623e7":"L10-07","e9b38215-1c89-430b-b167-0da3ef3f2495":"L10-08","c69be623-dffc-4b02-806e-828754a0ee03":"L10-09","68435767-7fc2-4e32-8974-927e0a4c3892":"L10-10","a9a507d5-aaea-4325-8a8d-b8b91225c48c":"L10-11",
  "7d5ac376-3e07-4e17-ae99-7f8730f91afa":"L11-01","ffc21a3c-cc3e-4c05-8ff2-e9b16bbe5281":"L11-02","e83b5445-0f44-4fd7-8e58-2cbae2420252":"L11-03","f38997c6-98be-45e6-8048-4893591b7cde":"L11-04","f341cc00-de29-4d17-8a20-0f7b01a959ed":"L11-05","64db8fdf-6743-43b9-be1d-119263eaa6ea":"L11-06",
  "6b608c9f-de84-4134-9c92-c2e3cb795ee2":"L5-01","07b9261d-ac51-4809-aa0f-3d0f41a69b74":"L5-02","91bdff2d-262d-45c8-80f2-dc3ab0ad7390":"L5-03","06f43997-8e7f-4ea3-a83a-26752729e14f":"L5-04","883a0da5-b35b-498a-8c25-891beed16938":"L5-05","ecd6ef90-8a5b-494a-8928-ae5acd46f608":"L5-06","04cf856c-2aba-4b3d-857a-b712a16b8434":"L5-07","8961c8ce-28d6-4508-b1ce-ec663652ade9":"L5-08","41888bf9-4235-42d6-a8ea-688a8f392d0d":"L5-09","508c06fb-645d-45fc-b027-759cbb8f3399":"L5-10","3b3148e9-f6d3-4498-82be-614935a449be":"L5-11","c996686e-6c6c-486f-b142-68098f1a0631":"L5-12","efb83c83-cbb2-48d9-8e2c-c30a75fd246f":"L5-13","cbf1a653-f1af-4863-9861-c10894001b9f":"L5-14","f5559256-ed38-487d-abf7-ec3ae6d70720":"L5-15","14f35d33-4415-4ee2-a98f-a2f8e6207cd5":"L5-16","ebb05985-b438-48fc-8018-bbf010fe562b":"L5-17",
  "7ca51f69-83a6-4702-8335-9a4ff6a5f35b":"L6-01","df2526bc-ef87-4d25-b0e6-4c07afcb0cb5":"L6-02","0d871da2-a8b6-4f8b-be6e-6146400461d2":"L6-03","f234be4e-22b4-4002-88e4-cb44815b8c51":"L6-04","a8708047-8b4b-4551-9a15-1461f73cdd8b":"L6-05","6e695ec6-1bc1-4a63-a8ba-4906d6b41699":"L6-06","3d1b7bfb-bba2-47ea-a224-747efc68573f":"L6-07","781b692a-668e-446c-9520-608c8c6f00d0":"L6-08","34f63ca5-b88c-43ba-a1f6-c63994b890ec":"L6-09","28f865eb-559f-4e66-98fd-41dcd3af1a8a":"L6-10","f6e2d917-331e-4172-acfb-67b691ec6f24":"L6-11","77e7e1df-f91d-4dee-8267-8a35309aaf07":"L6-12","b0bb7e7a-3746-4fb9-9b89-e45fc89a60ac":"L6-13","89d764e6-c345-4026-b2f8-b597995d5adc":"L6-14","32f3545b-b9e7-46ce-86f0-baa9d0cedce0":"L6-15","ee84a471-003c-496d-ac4c-3dea0d6c9f26":"L6-16","225b84d9-9e9b-40c5-839b-d113917d99e6":"L6-17",
  "57ca7008-1625-445d-8c9a-a2f4af8f2338":"L7-01","9579ca6e-8186-4d52-a9a3-bc2088baf2c6":"L7-02","aa695bbe-8dd7-4030-ab08-201e0a87f482":"L7-03","caf47224-fc4c-4de2-8d8a-9c0839a05c90":"L7-04","3d3ad3a7-dd56-4075-9bb8-9e9402579668":"L7-05","cb5629ef-bcba-4a1d-bb23-fbbd65461673":"L7-06","15ef3c26-70d9-4dba-85ec-096413f75bc7":"L7-07","c3713bf1-e748-49eb-8c91-52eaf28e812d":"L7-08","a5decbb3-e10c-471a-a5db-717306b2b85c":"L7-09","fba0b07e-7089-4106-b29c-ac1df2750066":"L7-10","7c1199fd-f78e-4afb-9b94-09c3dd27ac46":"L7-11","84f179a7-57dc-407b-a79d-c032d2067812":"L7-12","7ecdf2c3-fd43-405e-a7d1-cefeb2be0d6b":"L7-13","7827bf8d-fe24-4544-b85f-a3a3e151712b":"L7-14","e37fc42f-d886-4150-85c1-1efd55f40ea9":"L7-15",
  "c099f05b-e24b-406d-8baa-2636115cc8f0":"L8-01","c3fb39b7-cc57-4bf1-8c26-53b03623ec71":"L8-02","bc4290b8-d022-4a31-9c08-77b953252c40":"L8-03","7bda0838-4028-4120-b986-6d4551337e58":"L8-04","1c1b9485-ddaf-4efa-9de1-a5642d750a05":"L8-05","90c918b7-6e76-4d2c-9646-0c3efa898d0c":"L8-06","0e791d23-295f-4fe1-af5c-bd5aeea4ed1f":"L8-07","baece458-3ae7-4be3-a1c5-1929393d38f1":"L8-08","279dcbea-61bf-4c8d-9972-285541593866":"L8-09","f8d11f5c-1a25-494b-ae6e-5efdbc0c1081":"L8-10","a7ea3451-8076-41a3-a546-222a879e70f3":"L8-11","7d7571f7-a8e3-4b49-b868-bfcb90516bdb":"L8-12","79a9382b-63f1-4751-9fc0-36490070ad17":"L8-13","891ba9e8-473c-4fc7-903a-d108f2554bee":"L8-14","efc3d59c-4ca9-45b9-a09e-70aa92de5e82":"L8-15",
  "b17a2e80-1486-4e77-b21b-6cd410bb9212":"L9-01","b3c6284d-693c-404c-a4a4-dcfafdbfe96c":"L9-02","52c34f06-5493-4f6a-bc8b-b780e16a1dc6":"L9-03","ef91999c-7f5c-407a-b997-f175ff81a9c2":"L9-04","b9e8e7d0-f90b-4dc3-bcc5-e570a25cdc71":"L9-05","940319a4-48a8-42cb-9b6e-52fc6a682ef7":"L9-06","9d196b6b-c180-4c2b-b176-4cf86149179f":"L9-07","5809c6fe-b643-4e65-8d36-a4b9cb1c43a1":"L9-08","27d9a6ed-f202-4521-a97d-05c72889b25c":"L9-09","79edc358-1c65-454c-b195-f199bdb8dd15":"L9-10",
  "9b1bb294-f150-45bf-baec-8cb2ba6f1426":"P2-01","aa5f24f1-dd03-4e23-b02f-2f812a955d81":"P2-02","17bc34c7-79d1-455d-80be-2761dd4fba04":"P2-03","9b5e7fb2-6a17-4012-8eb9-4c35679c61e9":"P2-04","d88c3638-3eb6-4590-83c5-669adc3de890":"P2-05",
  "894cb957-f9d2-451f-a37b-a87031087daa":"P3-01","6c6987ff-166b-4639-9bf1-f47bd016c919":"P3-02","8770e9e8-dd14-4002-983d-89530185b448":"P3-03","ab6fc1c4-b111-4ce8-b51c-fde13be1d9f9":"P3-04","298f923b-d987-4d86-b615-755c03441d5f":"P3-05",
  "5f69e505-604e-4777-b223-0992493d4290":"P4-01","b5148db5-5e25-4d12-8de8-741496ee9d89":"P4-02","2101475f-e682-4af5-b776-fcf588f96918":"P4-03","5df70bd6-4621-410c-9a3c-8e65c3f64b7f":"P4-04","f48bc8ab-f045-4e3a-a7dd-43a95c25fe86":"P4-05",
  "e5e1d0a6-25cc-428a-81d8-826f0e2ee06d":"SB-01","818a72dc-4ad1-4bc7-9dc1-d014395a9aa0":"SB-02","36176c3f-a773-41c5-9b70-45cc663f9332":"SB-03","a0732995-b472-4288-a0de-63cb42e52a17":"SB-04","3377e499-6ae3-4c80-829a-f06e2503e06a":"SB-05","20ebbe02-4395-4d57-b4b8-c1c5cb8e947a":"SB-06","d9b167cd-6648-4c39-bcaf-b71793479f8a":"SB-07","99952d52-f25f-4e7f-9fbf-7c97556590ad":"SB-08","65643fb3-2956-48b2-86a4-1745332741b3":"SB-09","74e64dfd-4bdc-4701-8399-052e5643fe7d":"SB-10","7c03abe7-e243-4652-ab3a-3dea3472f953":"SB-11","268ed9fc-ade4-4af0-b9ae-f295522232d9":"SB-12","426b679f-5508-4c3a-b63a-3ef85a83481e":"SB-13","42524340-7420-4e7b-af56-71686bccd6b7":"SB-14","0a175681-a2cb-4885-a173-59eb4337fa0d":"SB-15"
};

// Helper functions
export function getFloorById(floorId: string): Floor | undefined {
  if (!floorId) return undefined;
  const cleanId = String(floorId).trim().toLowerCase();

  // 1. Direct match on DB UUID map
  if (dbFloorMap[cleanId]) {
    const code = dbFloorMap[cleanId];
    return floors.find(f => f.code.toUpperCase() === code.toUpperCase());
  }

  // 2. Direct match on id
  const byId = floors.find(f => f.id.toLowerCase() === cleanId);
  if (byId) return byId;

  // 3. Direct match on code (e.g. 'SB', 'L1', 'P2')
  const byCode = floors.find(f => f.code.toLowerCase() === cleanId);
  if (byCode) return byCode;

  // 4. Match on full or partial name
  const byName = floors.find(f => f.name.toLowerCase() === cleanId);
  if (byName) return byName;

  // 5. Basement / Semi Basement aliases
  if (cleanId === '0' || cleanId === 'sb' || cleanId.includes('basement') || cleanId.includes('semi')) {
    return floors.find(f => f.code === 'SB');
  }

  // 6. If cleanId is a standard UUID but not in dbFloorMap, DO NOT parse digits from it
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  if (!isUUID) {
    // Explicit floor code mappings for numbers & common prefixes
    const numMatch = cleanId.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      if (num === 0) return floors.find(f => f.code === 'SB');
      if (num === 1) return floors.find(f => f.code === 'L1');
      if (num === 2) return floors.find(f => f.code === 'P2');
      if (num === 3) return floors.find(f => f.code === 'P3');
      if (num === 4) return floors.find(f => f.code === 'P4');
      if (num >= 5 && num <= 11) return floors.find(f => f.code === `L${num}`);
    }
  }

  // 7. Match prefixed or stripped 'floor-'
  if (cleanId.startsWith('floor-')) {
    const codePart = cleanId.replace('floor-', '');
    const byCodePart = floors.find(f => 
      f.code.toLowerCase() === codePart || 
      f.id.toLowerCase() === cleanId ||
      f.code.toLowerCase() === codePart.replace('l', '') ||
      f.code.toLowerCase() === `p${codePart}` ||
      f.code.toLowerCase() === `l${codePart}`
    );
    if (byCodePart) return byCodePart;
  } else {
    const withFloorPrefix = `floor-${cleanId}`;
    const byPrefix = floors.find(f => f.id.toLowerCase() === withFloorPrefix || f.code.toLowerCase() === cleanId);
    if (byPrefix) return byPrefix;
  }

  return undefined;
}

export function getRoomsByFloor(floorId: string): Room[] {
  const floor = getFloorById(floorId);
  const targetId = floor ? floor.id : floorId;
  return rooms.filter(r => r.floorId === targetId || (floor && r.floorId === floor.id)).sort((a, b) => a.patrolOrder - b.patrolOrder);
}

export function getRoomById(roomId: string): Room | undefined {
  if (!roomId) return undefined;
  const cleanId = String(roomId).trim().toLowerCase();

  // 0. Direct match on DB UUID map
  if (dbRoomCodeMap[cleanId]) {
    const code = dbRoomCodeMap[cleanId];
    const found = rooms.find(r => r.code.toUpperCase() === code.toUpperCase());
    if (found) return found;
  }

  // 1. Direct match on id or code
  const exact = rooms.find(r => 
    r.id.toLowerCase() === cleanId || 
    r.code.toLowerCase() === cleanId ||
    r.code.replace('-', '').toLowerCase() === cleanId.replace('-', '').toLowerCase()
  );
  if (exact) return exact;

  // 2. Normalize zero-padding (e.g. 'SB-1' -> 'SB-01', 'room-sb-1' -> 'room-sb-01')
  const match = cleanId.match(/^(?:room-)?([a-z0-9]+)[-_](\d+)$/i);
  if (match) {
    let floorPart = match[1].toLowerCase();
    const numPart = String(match[2]).padStart(2, '0');
    // Map numeric floor to code (e.g. 1 -> l1, 2 -> p2, 3 -> p3, 4 -> p4, 5 -> l5)
    if (/^\d+$/.test(floorPart)) {
      const num = parseInt(floorPart, 10);
      if (num === 1) floorPart = 'l1';
      else if (num >= 2 && num <= 4) floorPart = `p${num}`;
      else if (num >= 5) floorPart = `l${num}`;
    }
    const normalizedId = `room-${floorPart}-${numPart}`;
    const normalizedCode = `${floorPart.toUpperCase()}-${numPart}`;
    const found = rooms.find(r => 
      r.id.toLowerCase() === normalizedId || 
      r.code.toUpperCase() === normalizedCode ||
      r.code.replace('-', '').toUpperCase() === `${floorPart.toUpperCase()}${numPart}`
    );
    if (found) return found;
  }

  // 3. Match by name if query is descriptive
  if (cleanId.length > 3) {
    const byName = rooms.find(r => r.name.toLowerCase() === cleanId);
    if (byName) return byName;
  }

  return undefined;
}

export function getCurrentSchedule(): PatrolSchedule {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('id-ID', options);
  const parts = formatter.formatToParts(now);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  const currentTime = `${hour}:${minute}`;

  const sched = patrolSchedules.find(s => {
    if (s.startTime < s.endTime) {
      return currentTime >= s.startTime && currentTime < s.endTime;
    }
    // handle midnight wrap (e.g. 22:00 - 01:00)
    return currentTime >= s.startTime || currentTime < s.endTime;
  });

  return sched || patrolSchedules[3]; // Default fallback to Patroli 4 (16:00 - 19:00)
}

export function getCurrentUser(): User {
  return users[0]; // Ahmad Fadillah
}

export function getCurrentShift(): Shift {
  const currentSched = getCurrentSchedule();
  return currentSched.patrolNumber <= 4 ? shifts[0] : shifts[1];
}

// --- Active Patrol Session (dummy in-progress data) ---

const currentSched = getCurrentSchedule();

export const activeSession: PatrolSession = {
  id: 'session-today-3',
  userId: 'user-1',
  scheduleId: currentSched.id,
  shiftId: currentSched.patrolNumber <= 4 ? 'shift-1' : 'shift-2',
  patrolDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }),
  patrolNumber: currentSched.patrolNumber,
  status: 'in_progress',
  startedAt: new Date().toISOString(),
};

export const activeSessionFloors: PatrolSessionFloor[] = [
  {
    id: 'sf-1', sessionId: 'session-today-3', floorId: 'floor-sb',
    floorNameSnapshot: 'Semi Basement', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-2', sessionId: 'session-today-3', floorId: 'floor-1',
    floorNameSnapshot: 'Lantai 1', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-3', sessionId: 'session-today-3', floorId: 'floor-2',
    floorNameSnapshot: 'Lantai P2', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-4', sessionId: 'session-today-3', floorId: 'floor-3',
    floorNameSnapshot: 'Lantai P3', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-5', sessionId: 'session-today-3', floorId: 'floor-4',
    floorNameSnapshot: 'Lantai P4', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-6', sessionId: 'session-today-3', floorId: 'floor-5',
    floorNameSnapshot: 'Lantai 5', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-7', sessionId: 'session-today-3', floorId: 'floor-6',
    floorNameSnapshot: 'Lantai 6', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-8', sessionId: 'session-today-3', floorId: 'floor-7',
    floorNameSnapshot: 'Lantai 7', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-9', sessionId: 'session-today-3', floorId: 'floor-8',
    floorNameSnapshot: 'Lantai 8', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-10', sessionId: 'session-today-3', floorId: 'floor-9',
    floorNameSnapshot: 'Lantai 9', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-11', sessionId: 'session-today-3', floorId: 'floor-10',
    floorNameSnapshot: 'Lantai 10', status: 'pending',
    qrValidated: false,
  },
  {
    id: 'sf-12', sessionId: 'session-today-3', floorId: 'floor-11',
    floorNameSnapshot: 'Lantai 11', status: 'pending',
    qrValidated: false,
  },
];

// Some rooms on floor-1 already checked
export const activeChecks: PatrolCheck[] = [];

export const activeFindings: Finding[] = [];

// Previous patrol history
export const patrolHistory: PatrolSession[] = [];

// Finding categories display
export const findingCategoryLabels: Record<FindingCategory, string> = {
  keamanan: 'Keamanan',
  fasilitas: 'Fasilitas',
  listrik: 'Listrik',
  ac: 'AC',
  kebersihan: 'Kebersihan',
  akses_pintu: 'Akses/Pintu',
  orang_mencurigakan: 'Orang Mencurigakan',
  lainnya: 'Lainnya',
};

export const statusLabels: Record<string, string> = {
  pending: 'Belum Dimulai',
  in_progress: 'Sedang Berjalan',
  completed: 'Selesai',
  late: 'Terlambat',
  incomplete: 'Tidak Lengkap',
  new: 'Baru',
  resolved: 'Selesai',
  normal: 'Normal',
  finding: 'Ada Temuan',
  on: 'ON',
  off: 'OFF',
  not_available: 'Tidak Ada',
};
