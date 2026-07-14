import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcryptjs';

// Parse DATABASE_URL if available
let connectionConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'security_patrol',
};

const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  try {
    // Format: mysql://user:password@host:port/database
    const match = dbUrl.match(/mysql:\/\/([^:@]+)(?::([^@]+))?@([^:/]+)(?::(\d+))?\/(.+)/);
    if (match) {
      connectionConfig = {
        user: match[1],
        password: match[2] || '',
        host: match[3],
        port: match[4] ? parseInt(match[4], 10) : 3306,
        database: match[5].split('?')[0], // strip any query params
      };
    }
  } catch (e) {
    console.error('Failed to parse DATABASE_URL, using default configuration.', e);
  }
}

const adapter = new PrismaMariaDb(connectionConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.findingUpdate.deleteMany();
  await prisma.finding.deleteMany();
  await prisma.patrolPhoto.deleteMany();
  await prisma.patrolCheck.deleteMany();
  await prisma.patrolSessionFloor.deleteMany();
  await prisma.patrolSession.deleteMany();
  await prisma.floorQrCode.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.patrolSchedule.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shift.deleteMany();
  console.log('  ✓ Cleared existing data');

  // 1. Shifts
  const shiftPagi = await prisma.shift.create({ data: { name: 'Shift Pagi', code: 'PAGI', startTime: '07:00', endTime: '19:00' } });
  const shiftMalam = await prisma.shift.create({ data: { name: 'Shift Malam', code: 'MALAM', startTime: '19:00', endTime: '07:00' } });
  console.log('  ✓ Shifts created');

  // 2. Users
  const spvPwd = await hash('password123', 12);
  await prisma.user.create({
    data: {
      id: 'd3b07384-d113-4ec6-a558-4c31bcafdf4a',
      employeeId: 'SPV-001',
      name: 'Dimas Prasetyo',
      email: 'dimas@jec.co.id',
      password: spvPwd,
      role: 'supervisor',
      shiftId: shiftPagi.id
    }
  });
  await prisma.user.create({
    data: {
      id: 'a78f3c7b-7bcf-4f9e-a890-bf3843a854d1',
      employeeId: 'ADM-001',
      name: 'Eka Putri',
      email: 'eka@jec.co.id',
      password: spvPwd,
      role: 'admin',
      shiftId: shiftPagi.id
    }
  });

  const securityNames = [
    'Fitriani Hasan',
    'Sakir',
    'Muh. Jusuf D',
    'Reinaldy',
    'Muhajir',
    'Haerul H',
    'Sudarman',
    'Muh iqbal'
  ];

  const securityUUIDs = [
    'e2b10a2d-3cbf-4e20-bf4d-3b5f07a4a9c8', // SEC-002 (Fitriani Hasan)
    'f3c21b3e-4dca-5f31-c05e-4c6f18b5b0d9', // SEC-003
    '0a4d2c4f-5edb-6a42-d16f-5d7e29c6c1ea', // SEC-004
    '1b5e3d50-6fec-7b53-e270-6e8f3ad7d2fb', // SEC-005
    '2c6f4e61-70fd-8c64-f381-7f9f4be8e3fc', // SEC-006
    '3d7f5f72-810e-9d75-0492-80af5cf9f4fd', // SEC-007
    '4e8f6f83-921f-0e86-15a3-91bf6df0f5fe', // SEC-008
    '5f9f7f94-a320-1e97-26b4-a2c07e01a6ff'  // SEC-009
  ];

  for (let i = 0; i < securityNames.length; i++) {
    const num = i + 2;
    const employeeId = `SEC-00${num}`;
    const userPwd = await hash(employeeId, 12);
    const shiftId = i % 2 === 0 ? shiftPagi.id : shiftMalam.id;
    const email = `${securityNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')}@jec.co.id`;
    await prisma.user.create({
      data: {
        id: securityUUIDs[i],
        employeeId,
        name: securityNames[i],
        email,
        password: userPwd,
        role: 'security',
        shiftId
      }
    });
  }
  console.log('  ✓ Users created (Security: SEC-002 to SEC-009, static UUIDs)');

  // 3. Building
  const building = await prisma.building.create({ data: { code: 'JEC-ORB', name: 'RS Mata JEC ORBITA', address: 'Jl. Raya Orbita No. 1, Jakarta' } });
  console.log('  ✓ Building created');

  // 4. Floors
  const floorsToSeed = [
    { code: 'SB', name: 'Semi Basement', sortOrder: -1 },
    { code: 'L1', name: 'Lantai 1', sortOrder: 1 },
    { code: 'P2', name: 'Lantai P2', sortOrder: 2 },
    { code: 'P3', name: 'Lantai P3', sortOrder: 3 },
    { code: 'P4', name: 'Lantai P4', sortOrder: 4 },
    { code: 'L5', name: 'Lantai 5', sortOrder: 5 },
    { code: 'L6', name: 'Lantai 6', sortOrder: 6 },
    { code: 'L7', name: 'Lantai 7', sortOrder: 7 },
    { code: 'L8', name: 'Lantai 8', sortOrder: 8 },
    { code: 'L9', name: 'Lantai 9', sortOrder: 9 },
    { code: 'L10', name: 'Lantai 10', sortOrder: 10 },
    { code: 'L11', name: 'Lantai 11', sortOrder: 11 },
  ];

  const floorMap = new Map<string, string>();
  const createdFloors = [];
  for (const f of floorsToSeed) {
    const created = await prisma.floor.create({
      data: { buildingId: building.id, code: f.code, name: f.name, sortOrder: f.sortOrder }
    });
    floorMap.set(f.code, created.id);
    createdFloors.push(created);
  }
  console.log('  ✓ Floors created');

  // 5. Rooms
  const rawRoomData = [
    // Semi Basement (SB)
    { floorCode: 'SB', code: 'SB-01', name: 'R. POMPA HYDRANT', patrolOrder: 1, hasAc: false, photoGuide: 'Foto pompa hydrant' },
    { floorCode: 'SB', code: 'SB-02', name: 'R. GENSET', patrolOrder: 2, hasAc: false, photoGuide: 'Foto panel utama genset' },
    { floorCode: 'SB', code: 'SB-03', name: 'R.SECURITY (Musik nyala 07:00-21:00)', patrolOrder: 3, hasAc: true, photoGuide: 'Foto pos security' },
    { floorCode: 'SB', code: 'SB-04', name: 'R. CAPASITOR', patrolOrder: 4, hasAc: false, photoGuide: 'Foto panel capacitor' },
    { floorCode: 'SB', code: 'SB-05', name: 'KANTIN', patrolOrder: 5, hasAc: false, photoGuide: 'Foto area kantin' },
    { floorCode: 'SB', code: 'SB-06', name: 'MUSHOLLA', patrolOrder: 6, hasAc: true, photoGuide: 'Foto area musholla' },
    { floorCode: 'SB', code: 'SB-07', name: 'R. LINEN', patrolOrder: 7, hasAc: false, photoGuide: 'Foto pintu R. Linen' },
    { floorCode: 'SB', code: 'SB-08', name: 'R. G. GA', patrolOrder: 8, hasAc: false, photoGuide: 'Foto area R. G. GA' },
    { floorCode: 'SB', code: 'SB-09', name: 'R GA', patrolOrder: 9, hasAc: false, photoGuide: 'Foto area R GA' },
    { floorCode: 'SB', code: 'SB-10', name: 'R. RM', patrolOrder: 10, hasAc: true, photoGuide: 'Foto area rekam medis' },
    { floorCode: 'SB', code: 'SB-11', name: 'R. GANTI KARYAWAN', patrolOrder: 11, hasAc: true, photoGuide: 'Foto ruang ganti' },
    { floorCode: 'SB', code: 'SB-12', name: 'R. CCTV', patrolOrder: 12, hasAc: true, photoGuide: 'Foto monitor CCTV' },
    { floorCode: 'SB', code: 'SB-13', name: 'R. PANEL UPS', patrolOrder: 13, hasAc: true, photoGuide: 'Foto panel UPS' },
    { floorCode: 'SB', code: 'SB-14', name: 'R. PANEL TM INDIKASI', patrolOrder: 14, hasAc: false, photoGuide: 'Foto panel TM indikasi' },
    { floorCode: 'SB', code: 'SB-15', name: 'TANGGA DARURAT', patrolOrder: 15, hasAc: false, photoGuide: 'Foto tangga darurat' },

    // Lantai 1 (L1)
    { floorCode: 'L1', code: 'L1-01', name: 'ADMISI', patrolOrder: 1, hasAc: true, photoGuide: 'Foto area admisi' },
    { floorCode: 'L1', code: 'L1-02', name: 'KASIR', patrolOrder: 2, hasAc: true, photoGuide: 'Foto area kasir' },
    { floorCode: 'L1', code: 'L1-03', name: 'APOTIK', patrolOrder: 3, hasAc: true, photoGuide: 'Foto area apotik' },
    { floorCode: 'L1', code: 'L1-04', name: 'OPTIK & R. P OPTIK', patrolOrder: 4, hasAc: true, photoGuide: 'Foto optik dan ruang periksa' },
    { floorCode: 'L1', code: 'L1-05', name: 'IGD', patrolOrder: 5, hasAc: true, photoGuide: 'Foto area IGD' },
    { floorCode: 'L1', code: 'L1-06', name: 'TRANSIT JENAZAH', patrolOrder: 6, hasAc: true, photoGuide: 'Foto ruang transit jenazah' },
    { floorCode: 'L1', code: 'L1-07', name: 'R GAS MEDIS', patrolOrder: 7, hasAc: false, photoGuide: 'Foto panel/tabung gas medis' },
    { floorCode: 'L1', code: 'L1-08', name: 'R MCFA', patrolOrder: 8, hasAc: false, photoGuide: 'Foto panel MCFA' },
    { floorCode: 'L1', code: 'L1-09', name: 'R. TPS', patrolOrder: 9, hasAc: false, photoGuide: 'Foto area TPS' },
    { floorCode: 'L1', code: 'L1-10', name: 'R. PANEL', patrolOrder: 10, hasAc: false, photoGuide: 'Foto pintu panel' },
    { floorCode: 'L1', code: 'L1-11', name: 'TOILET STAF & PASIEN', patrolOrder: 11, hasAc: false, photoGuide: 'Foto area toilet' },
    { floorCode: 'L1', code: 'L1-12', name: 'TANGGA DARURAT', patrolOrder: 12, hasAc: false, photoGuide: 'Foto tangga darurat' },

    // Lantai P2 (P2)
    { floorCode: 'P2', code: 'P2-01', name: 'R. FASET', patrolOrder: 1, hasAc: true, photoGuide: 'Foto area R. Faset' },
    { floorCode: 'P2', code: 'P2-02', name: 'TANGGA DARURAT', patrolOrder: 2, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'P2', code: 'P2-03', name: 'R PANEL', patrolOrder: 3, hasAc: false, photoGuide: 'Foto panel lantai P2' },
    { floorCode: 'P2', code: 'P2-04', name: 'JANITOR', patrolOrder: 4, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'P2', code: 'P2-05', name: 'TOILET', patrolOrder: 5, hasAc: false, photoGuide: 'Foto toilet P2' },

    // Lantai P3 (P3)
    { floorCode: 'P3', code: 'P3-01', name: 'GUDANG GIZI', patrolOrder: 1, hasAc: true, photoGuide: 'Foto pintu gudang gizi' },
    { floorCode: 'P3', code: 'P3-02', name: 'TANGGA DARURAT', patrolOrder: 2, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'P3', code: 'P3-03', name: 'JANITOR', patrolOrder: 3, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'P3', code: 'P3-04', name: 'R. PANEL', patrolOrder: 4, hasAc: false, photoGuide: 'Foto panel lantai P3' },
    { floorCode: 'P3', code: 'P3-05', name: 'TOILET STAF & PASIEN', patrolOrder: 5, hasAc: false, photoGuide: 'Foto toilet P3' },

    // Lantai P4 (P4)
    { floorCode: 'P4', code: 'P4-01', name: 'R. GUDANG IT', patrolOrder: 1, hasAc: true, photoGuide: 'Foto ruang gudang IT' },
    { floorCode: 'P4', code: 'P4-02', name: 'JANITOR', patrolOrder: 2, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'P4', code: 'P4-03', name: 'TANGGA DARURAT', patrolOrder: 3, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'P4', code: 'P4-04', name: 'R. PANEL', patrolOrder: 4, hasAc: false, photoGuide: 'Foto panel lantai P4' },
    { floorCode: 'P4', code: 'P4-05', name: 'TOILET STAF & PASIEN', patrolOrder: 5, hasAc: false, photoGuide: 'Foto toilet P4' },

    // Lantai 5 (L5)
    { floorCode: 'L5', code: 'L5-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, photoGuide: 'Foto nurse station lantai 5' },
    { floorCode: 'L5', code: 'L5-02', name: 'LAB', patrolOrder: 2, hasAc: true, photoGuide: 'Foto area laboratorium' },
    { floorCode: 'L5', code: 'L5-03', name: 'RADIOLOGI', patrolOrder: 3, hasAc: true, photoGuide: 'Foto pintu radiologi' },
    { floorCode: 'L5', code: 'L5-04', name: 'POLI 5A', patrolOrder: 4, hasAc: true, photoGuide: 'Foto ruang poli 5A' },
    { floorCode: 'L5', code: 'L5-05', name: 'POLI 5B', patrolOrder: 5, hasAc: true, photoGuide: 'Foto ruang poli 5B' },
    { floorCode: 'L5', code: 'L5-06', name: 'POLI 5C', patrolOrder: 6, hasAc: true, photoGuide: 'Foto ruang poli 5C' },
    { floorCode: 'L5', code: 'L5-07', name: 'POLI 5D R TINDAKAN', patrolOrder: 7, hasAc: true, photoGuide: 'Foto ruang tindakan 5D' },
    { floorCode: 'L5', code: 'L5-08', name: 'POLI 5E', patrolOrder: 8, hasAc: true, photoGuide: 'Foto ruang poli 5E' },
    { floorCode: 'L5', code: 'L5-09', name: 'POLI 5F', patrolOrder: 9, hasAc: true, photoGuide: 'Foto ruang poli 5F' },
    { floorCode: 'L5', code: 'L5-10', name: 'BDR', patrolOrder: 10, hasAc: true, photoGuide: 'Foto ruang BDR' },
    { floorCode: 'L5', code: 'L5-11', name: 'PEC', patrolOrder: 11, hasAc: true, photoGuide: 'Foto ruang PEC' },
    { floorCode: 'L5', code: 'L5-12', name: 'JANITOR', patrolOrder: 12, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L5', code: 'L5-13', name: 'TENANT', patrolOrder: 13, hasAc: true, photoGuide: 'Foto area tenant' },
    { floorCode: 'L5', code: 'L5-14', name: 'TANGGA DARURAT', patrolOrder: 14, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'L5', code: 'L5-15', name: 'KORIDOR BELAKANG', patrolOrder: 15, hasAc: false, photoGuide: 'Foto koridor belakang' },
    { floorCode: 'L5', code: 'L5-16', name: 'R. PANEL', patrolOrder: 16, hasAc: false, photoGuide: 'Foto panel lantai 5' },
    { floorCode: 'L5', code: 'L5-17', name: 'TOILET STAF & PASIEN', patrolOrder: 17, hasAc: false, photoGuide: 'Foto toilet lantai 5' },

    // Lantai 6 (L6)
    { floorCode: 'L6', code: 'L6-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, photoGuide: 'Foto nurse station lantai 6' },
    { floorCode: 'L6', code: 'L6-02', name: 'DRY EYE CENTER', patrolOrder: 2, hasAc: true, photoGuide: 'Foto area dry eye center' },
    { floorCode: 'L6', code: 'L6-03', name: 'FITTING LENSA', patrolOrder: 3, hasAc: true, photoGuide: 'Foto area fitting lensa' },
    { floorCode: 'L6', code: 'L6-04', name: 'POLI 6A', patrolOrder: 4, hasAc: true, photoGuide: 'Foto ruang poli 6A' },
    { floorCode: 'L6', code: 'L6-05', name: 'POLI 6B', patrolOrder: 5, hasAc: true, photoGuide: 'Foto ruang poli 6B' },
    { floorCode: 'L6', code: 'L6-06', name: 'POLI 6C', patrolOrder: 6, hasAc: true, photoGuide: 'Foto ruang poli 6C' },
    { floorCode: 'L6', code: 'L6-07', name: 'POLI 6D', patrolOrder: 7, hasAc: true, photoGuide: 'Foto ruang poli 6D' },
    { floorCode: 'L6', code: 'L6-08', name: 'POLI 6E', patrolOrder: 8, hasAc: true, photoGuide: 'Foto ruang poli 6E' },
    { floorCode: 'L6', code: 'L6-09', name: 'JANITOR', patrolOrder: 9, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L6', code: 'L6-10', name: 'BDR', patrolOrder: 10, hasAc: true, photoGuide: 'Foto ruang BDR lantai 6' },
    { floorCode: 'L6', code: 'L6-11', name: 'LASER ROOM', patrolOrder: 11, hasAc: true, photoGuide: 'Foto laser room' },
    { floorCode: 'L6', code: 'L6-12', name: 'CDC', patrolOrder: 12, hasAc: true, photoGuide: 'Foto area CDC' },
    { floorCode: 'L6', code: 'L6-13', name: 'GUDANG LOGISTIK', patrolOrder: 13, hasAc: true, photoGuide: 'Foto pintu gudang logistik' },
    { floorCode: 'L6', code: 'L6-14', name: 'KORIDOR BELAKANG', patrolOrder: 14, hasAc: false, photoGuide: 'Foto koridor belakang' },
    { floorCode: 'L6', code: 'L6-15', name: 'TANGGA DARURAT', patrolOrder: 15, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'L6', code: 'L6-16', name: 'R. PANEL', patrolOrder: 16, hasAc: false, photoGuide: 'Foto panel lantai 6' },
    { floorCode: 'L6', code: 'L6-17', name: 'TOILET STAF & PASIEN', patrolOrder: 17, hasAc: false, photoGuide: 'Foto toilet lantai 6' },

    // Lantai 7 (L7)
    { floorCode: 'L7', code: 'L7-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, photoGuide: 'Foto nurse station lantai 7' },
    { floorCode: 'L7', code: 'L7-02', name: 'BDR / PEDIATRIC', patrolOrder: 2, hasAc: true, photoGuide: 'Foto area BDR/pediatric' },
    { floorCode: 'L7', code: 'L7-03', name: 'LOW VISION', patrolOrder: 3, hasAc: true, photoGuide: 'Foto area low vision' },
    { floorCode: 'L7', code: 'L7-04', name: 'PLAYGROUND', patrolOrder: 4, hasAc: false, photoGuide: 'Foto playground' },
    { floorCode: 'L7', code: 'L7-05', name: 'NUSERY ROOM', patrolOrder: 5, hasAc: true, photoGuide: 'Foto nusery room' },
    { floorCode: 'L7', code: 'L7-06', name: 'EYE CENTER', patrolOrder: 6, hasAc: true, photoGuide: 'Foto area eye center' },
    { floorCode: 'L7', code: 'L7-07', name: 'PROTESA SERVICE', patrolOrder: 7, hasAc: true, photoGuide: 'Foto area protesa service' },
    { floorCode: 'L7', code: 'L7-08', name: 'LASER VISION', patrolOrder: 8, hasAc: true, photoGuide: 'Foto laser vision' },
    { floorCode: 'L7', code: 'L7-09', name: 'R. PEMULIHAN LASIK', patrolOrder: 9, hasAc: true, photoGuide: 'Foto ruang pemulihan LASIK' },
    { floorCode: 'L7', code: 'L7-10', name: 'R. PEMERIKSAAN', patrolOrder: 10, hasAc: true, photoGuide: 'Foto ruang pemeriksaan' },
    { floorCode: 'L7', code: 'L7-11', name: 'KORIDOR BELAKANG', patrolOrder: 11, hasAc: false, photoGuide: 'Foto koridor belakang' },
    { floorCode: 'L7', code: 'L7-12', name: 'JANITOR', patrolOrder: 12, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L7', code: 'L7-13', name: 'TANGGA DARURAT', patrolOrder: 13, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'L7', code: 'L7-14', name: 'R. PANEL', patrolOrder: 14, hasAc: false, photoGuide: 'Foto panel lantai 7' },
    { floorCode: 'L7', code: 'L7-15', name: 'TOILET STAF & PASIEN', patrolOrder: 15, hasAc: false, photoGuide: 'Foto toilet lantai 7' },

    // Lantai 8 (L8)
    { floorCode: 'L8', code: 'L8-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, photoGuide: 'Foto nurse station lantai 8' },
    { floorCode: 'L8', code: 'L8-02', name: 'VVIP', patrolOrder: 2, hasAc: true, photoGuide: 'Foto area VVIP' },
    { floorCode: 'L8', code: 'L8-03', name: 'VIP A', patrolOrder: 3, hasAc: true, photoGuide: 'Foto area VIP A' },
    { floorCode: 'L8', code: 'L8-04', name: 'VIP B', patrolOrder: 4, hasAc: true, photoGuide: 'Foto area VIP B' },
    { floorCode: 'L8', code: 'L8-05', name: 'KELAS 1', patrolOrder: 5, hasAc: true, photoGuide: 'Foto area kelas 1' },
    { floorCode: 'L8', code: 'L8-06', name: 'KELAS 2', patrolOrder: 6, hasAc: true, photoGuide: 'Foto area kelas 2' },
    { floorCode: 'L8', code: 'L8-07', name: 'KRIS A', patrolOrder: 7, hasAc: true, photoGuide: 'Foto area KRIS A' },
    { floorCode: 'L8', code: 'L8-08', name: 'KRIS B', patrolOrder: 8, hasAc: true, photoGuide: 'Foto area KRIS B' },
    { floorCode: 'L8', code: 'L8-09', name: 'R. GUDANG LINEN', patrolOrder: 9, hasAc: false, photoGuide: 'Foto pintu R. Gudang Linen' },
    { floorCode: 'L8', code: 'L8-10', name: 'R. GUDANG UMUM', patrolOrder: 10, hasAc: false, photoGuide: 'Foto pintu R. Gudang Umum' },
    { floorCode: 'L8', code: 'L8-11', name: 'ISOLASI', patrolOrder: 11, hasAc: true, photoGuide: 'Foto ruang isolasi' },
    { floorCode: 'L8', code: 'L8-12', name: 'PANTRY', patrolOrder: 12, hasAc: false, photoGuide: 'Foto area pantry' },
    { floorCode: 'L8', code: 'L8-13', name: 'JANITOR', patrolOrder: 13, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L8', code: 'L8-14', name: 'R. PANEL', patrolOrder: 14, hasAc: false, photoGuide: 'Foto panel lantai 8' },
    { floorCode: 'L8', code: 'L8-15', name: 'TOILET PERAWAT', patrolOrder: 15, hasAc: false, photoGuide: 'Foto toilet perawat' },

    // Lantai 9 (L9)
    { floorCode: 'L9', code: 'L9-01', name: 'NURSE STATION', patrolOrder: 1, hasAc: true, photoGuide: 'Foto nurse station lantai 9' },
    { floorCode: 'L9', code: 'L9-02', name: 'PENDAFTARAN', patrolOrder: 2, hasAc: true, photoGuide: 'Foto pendaftaran lantai 9' },
    { floorCode: 'L9', code: 'L9-03', name: 'CSSD', patrolOrder: 3, hasAc: true, photoGuide: 'Foto area CSSD' },
    { floorCode: 'L9', code: 'L9-04', name: 'R. DOKTER', patrolOrder: 4, hasAc: true, photoGuide: 'Foto ruang dokter' },
    { floorCode: 'L9', code: 'L9-05', name: 'R. PERIKSA DOKTER', patrolOrder: 5, hasAc: true, photoGuide: 'Foto ruang periksa dokter' },
    { floorCode: 'L9', code: 'L9-06', name: 'R. PANEL', patrolOrder: 6, hasAc: true, photoGuide: 'Foto panel lantai 9' },
    { floorCode: 'L9', code: 'L9-07', name: 'R. PANTRY', patrolOrder: 7, hasAc: false, photoGuide: 'Foto pantry lantai 9' },
    { floorCode: 'L9', code: 'L9-08', name: 'JANITOR', patrolOrder: 8, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L9', code: 'L9-09', name: 'TANGGA DARURAT', patrolOrder: 9, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'L9', code: 'L9-10', name: 'TOILET STAF & PASIEN', patrolOrder: 10, hasAc: false, photoGuide: 'Foto toilet' },

    // Lantai 10 (L10)
    { floorCode: 'L10', code: 'L10-01', name: 'R. AUDITORIUM', patrolOrder: 1, hasAc: true, photoGuide: 'Foto auditorium' },
    { floorCode: 'L10', code: 'L10-02', name: 'R. MANAJEMEN', patrolOrder: 2, hasAc: true, photoGuide: 'Foto ruang manajemen' },
    { floorCode: 'L10', code: 'L10-03', name: 'R. DIREKSI', patrolOrder: 3, hasAc: true, photoGuide: 'Foto ruang direksi' },
    { floorCode: 'L10', code: 'L10-04', name: 'DRY LAB', patrolOrder: 4, hasAc: true, photoGuide: 'Foto dry lab' },
    { floorCode: 'L10', code: 'L10-05', name: 'WET LAB', patrolOrder: 5, hasAc: true, photoGuide: 'Foto wet lab' },
    { floorCode: 'L10', code: 'L10-06', name: 'PANTRY', patrolOrder: 6, hasAc: false, photoGuide: 'Foto area pantry' },
    { floorCode: 'L10', code: 'L10-07', name: 'PERPUSTAKAAN', patrolOrder: 7, hasAc: true, photoGuide: 'Foto perpustakaan' },
    { floorCode: 'L10', code: 'L10-08', name: 'R. PANEL', patrolOrder: 8, hasAc: false, photoGuide: 'Foto panel lantai 10' },
    { floorCode: 'L10', code: 'L10-09', name: 'JANITOR', patrolOrder: 9, hasAc: false, photoGuide: 'Foto area janitor' },
    { floorCode: 'L10', code: 'L10-10', name: 'TANGGA DARURAT', patrolOrder: 10, hasAc: false, photoGuide: 'Foto tangga darurat' },
    { floorCode: 'L10', code: 'L10-11', name: 'TOILET KARYAWAN', patrolOrder: 11, hasAc: false, photoGuide: 'Foto toilet karyawan' },

    // Lantai 11 (L11)
    { floorCode: 'L11', code: 'L11-01', name: 'GONDOLA', patrolOrder: 1, hasAc: false, photoGuide: 'Foto area gondola' },
    { floorCode: 'L11', code: 'L11-02', name: 'TANDEM', patrolOrder: 2, hasAc: false, photoGuide: 'Foto area tandem' },
    { floorCode: 'L11', code: 'L11-03', name: 'REVERSE OSMOSIS (RO)', patrolOrder: 3, hasAc: false, photoGuide: 'Foto panel/unit RO' },
    { floorCode: 'L11', code: 'L11-04', name: 'AHU', patrolOrder: 4, hasAc: false, photoGuide: 'Foto unit AHU' },
    { floorCode: 'L11', code: 'L11-05', name: 'R. PANEL', patrolOrder: 5, hasAc: true, photoGuide: 'Foto panel lantai 11' },
    { floorCode: 'L11', code: 'L11-06', name: 'TANGGA DARURAT', patrolOrder: 6, hasAc: false, photoGuide: 'Foto tangga darurat' },
  ];

  const roomData = rawRoomData.map(r => ({
    floorId: floorMap.get(r.floorCode) || '',
    code: r.code,
    name: r.name,
    patrolOrder: r.patrolOrder,
    hasAc: r.hasAc,
    photoGuide: r.photoGuide
  }));

  await prisma.room.createMany({ data: roomData });
  console.log(`  ✓ ${roomData.length} rooms created`);

  // 6. QR Codes
  for (const f of createdFloors) {
    const token = `JEC-ORB-${f.code}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await prisma.floorQrCode.create({ data: { floorId: f.id, token, qrContent: JSON.stringify({ floorId: f.id, code: f.code, token }) } });
  }
  console.log('  ✓ QR codes generated');

  // 7. Patrol Schedules (8 sesi per hari, setiap 3 jam)
  const schedules = [
    { name: 'Patroli 1', patrolNumber: 1, startTime: '07:00', endTime: '10:00' },
    { name: 'Patroli 2', patrolNumber: 2, startTime: '10:00', endTime: '13:00' },
    { name: 'Patroli 3', patrolNumber: 3, startTime: '13:00', endTime: '16:00' },
    { name: 'Patroli 4', patrolNumber: 4, startTime: '16:00', endTime: '19:00' },
    { name: 'Patroli 5', patrolNumber: 5, startTime: '19:00', endTime: '22:00' },
    { name: 'Patroli 6', patrolNumber: 6, startTime: '22:00', endTime: '01:00' },
    { name: 'Patroli 7', patrolNumber: 7, startTime: '01:00', endTime: '04:00' },
    { name: 'Patroli 8', patrolNumber: 8, startTime: '04:00', endTime: '07:00' },
  ];
  await prisma.patrolSchedule.createMany({ data: schedules });
  console.log('  ✓ 8 patrol schedules created');

  // 8. Checklist Template
  await prisma.checklistTemplate.create({
    data: { name: 'Checklist Default', items: JSON.stringify(['AC', 'Lampu', 'Kondisi Ruangan']), isDefault: true },
  });
  await prisma.checklistTemplate.create({
    data: { name: 'Checklist Server Room', items: JSON.stringify(['AC', 'Lampu', 'Suhu Server', 'UPS Status', 'Kondisi Kabel']), isDefault: false },
  });
  console.log('  ✓ Checklist templates created');

  // 9. System Settings
  const settings = [
    { key: 'hospital_name', value: 'RS Mata JEC ORBITA', description: 'Nama rumah sakit' },
    { key: 'patrol_interval_hours', value: '3', description: 'Interval antar sesi patroli (jam)' },
    { key: 'late_tolerance_minutes', value: '15', description: 'Toleransi keterlambatan (menit)' },
    { key: 'photo_required', value: 'true', description: 'Wajib foto per ruangan' },
    { key: 'photo_quality', value: '80', description: 'Kualitas kompresi foto (%)' },
    { key: 'watermark_enabled', value: 'true', description: 'Watermark timestamp pada foto' },
    { key: 'gallery_upload_blocked', value: 'true', description: 'Blokir upload dari galeri' },
    { key: 'qr_required', value: 'true', description: 'Wajib scan QR per lantai' },
    { key: 'gps_validation', value: 'false', description: 'Validasi lokasi GPS saat scan QR' },
    { key: 'notify_late', value: 'true', description: 'Notifikasi keterlambatan' },
    { key: 'notify_finding', value: 'true', description: 'Notifikasi temuan baru' },
  ];
  await prisma.systemSetting.createMany({ data: settings });
  console.log('  ✓ System settings created');

  console.log('\n✅ Seed completed!');
  console.log('\n📋 Login credentials:');
  console.log('   Security  : SEC-002 through SEC-009 (password matches employee ID)');
  console.log('   Supervisor: SPV-001 / password123');
  console.log('   Admin     : ADM-001 / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
