import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function logServerError(action: string, error: unknown, request?: Request) {
  try {
    const auth = await getAuthUser().catch(() => null);
    const msg = error instanceof Error ? error.message : String(error || 'Unknown Server Error');
    const stack = error instanceof Error ? error.stack : null;
    const url = request ? request.url : 'server-internal';

    await prisma.systemErrorLog.create({
      data: {
        userId: auth?.id || null,
        userName: auth?.name || null,
        employeeId: auth?.employeeId || null,
        role: auth?.role || null,
        url,
        message: `[${action}] ${msg}`.slice(0, 2000),
        stack: stack ? String(stack) : null,
        status: 'unresolved',
      },
    });
  } catch (logErr) {
    console.error('Failed to persist server error log:', logErr);
  }
}
