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
export const todaySessions: (PatrolSession & { userName: string })[] = [];

// Detailed floor checks for session 6 (active)
export const session6Floors: (PatrolSessionFloor & { floorName: string; totalRooms: number; checkedRooms: number })[] = [];

// Room checks for Lantai 1 (detailed view)
export const lantai1Checks: PatrolCheck[] = [];

// SB checks
export const sbChecks: PatrolCheck[] = [];

// All supervisor findings (extended)
export const allFindings: (Finding & { userName: string })[] = [];

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

export const findingUpdates: FindingUpdate[] = [];

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

export const galleryPhotos: GalleryPhoto[] = [];

export interface StatsOfficer {
  name: string;
  id: string;
  shift: string;
  patrols: number;
  status: string;
}

// Stats summary
export const todayStats = {
  totalSessions: 8,
  completedSessions: 0,
  activeSessions: 0,
  pendingSessions: 8,
  lateSessions: 0,
  totalRoomsToday: 0,
  checkedRooms: 0,
  totalFindings: 0,
  newFindings: 0,
  activeFindings: 0,
  resolvedFindings: 0,
  officers: [] as StatsOfficer[],
};
