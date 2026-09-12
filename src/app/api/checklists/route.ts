import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/checklists - List checklist templates
export async function GET() {
  const auth = await getAuthUser();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const templates = await prisma.checklistTemplate.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  const parsed = templates.map(t => ({
    id: t.id,
    name: t.name,
    items: typeof t.items === 'string' ? JSON.parse(t.items) : (Array.isArray(t.items) ? t.items : []),
    isDefault: t.isDefault,
    isActive: t.isActive,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return NextResponse.json(parsed);
}

// POST /api/checklists - Create checklist template
export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { name, items, isDefault } = body;

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Nama template dan minimal 1 item checklist wajib diisi' }, { status: 400 });
    }

    if (isDefault) {
      // Unset existing default
      await prisma.checklistTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        name: name.trim(),
        items: items.map((i: string) => i.trim()).filter(Boolean),
        isDefault: Boolean(isDefault),
        isActive: true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
