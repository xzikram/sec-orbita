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

// Helper
export function getRoomsByFloor(floorId: string): Room[] {
  return rooms.filter(r => r.floorId === floorId).sort((a, b) => a.patrolOrder - b.patrolOrder);
}

export function getFloorById(floorId: string): Floor | undefined {
  return floors.find(f => f.id === floorId);
}

export function getRoomById(roomId: string): Room | undefined {
  return rooms.find(r => r.id === roomId);
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
    floorNameSnapshot: 'Semi Basement', status: 'completed',
    qrValidated: true, qrScannedAt: '2026-07-08T15:42:00',
    startedAt: '2026-07-08T15:12:00', completedAt: '2026-07-08T15:42:00',
  },
  {
    id: 'sf-2', sessionId: 'session-today-3', floorId: 'floor-1',
    floorNameSnapshot: 'Lantai 1', status: 'in_progress',
    qrValidated: false,
    startedAt: '2026-07-08T15:45:00',
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
