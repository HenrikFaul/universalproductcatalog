import { NextResponse } from 'next/server';
import { deleteEntity, updateEntity } from '../../../../../../../src/backend/tmfEntityStore.js';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const { entity, id } = await params;
    const payload = await request.json();
    const item = updateEntity(entity, id, payload);
    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { entity, id } = await params;
    const result = deleteEntity(entity, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
