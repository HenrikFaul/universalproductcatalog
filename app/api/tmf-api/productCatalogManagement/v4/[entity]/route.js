import { NextResponse } from 'next/server';
import { createEntity, listEntities } from '../../../../../../src/backend/tmfEntityStore.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { entity } = await params;
    const data = listEntities(entity, request.nextUrl.searchParams);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { entity } = await params;
    const payload = await request.json();
    const item = createEntity(entity, payload);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
