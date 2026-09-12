import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// PUT /api/checklists/[id] - Update checklist template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { name, items, isDefault, isActive } = body;

    const dataToUpdate: Record<string, unknown> = {};
    if (name) dataToUpdate.name = name.trim();
    if (Array.isArray(items)) dataToUpdate.items = items.map((i: string) => i.trim()).filter(Boolean);
    if (typeof isActive === 'boolean') dataToUpdate.isActive = isActive;
    if (typeof isDefault === 'boolean') {
      dataToUpdate.isDefault = isDefault;
      if (isDefault) {
        await prisma.checklistTemplate.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }

    const updated = await prisma.checklistTemplate.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/checklists/[id] - Delete checklist template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser();
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
    if (existing?.isDefault) {
      return NextResponse.json({ error: 'Checklist default tidak dapat dihapus' }, { status: 400 });
    }

    await prisma.checklistTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
