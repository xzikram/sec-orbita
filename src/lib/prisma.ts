import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
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
      const match = dbUrl.match(/mysql:\/\/([^:@]+)(?::([^@]+))?@([^:/]+)(?::(\d+))?\/(.+)/);
      if (match) {
        connectionConfig = {
          user: match[1],
          password: match[2] || '',
          host: match[3],
          port: match[4] ? parseInt(match[4], 10) : 3306,
          database: match[5].split('?')[0],
        };
      }
    } catch (e) {
      console.error('Failed to parse DATABASE_URL, using default configuration.', e);
    }
  }

  const adapter = new PrismaMariaDb(connectionConfig);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
