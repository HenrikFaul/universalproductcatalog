import { NextResponse } from 'next/server';
import {
  createBlueprintRecord,
  createPersistedCatalog,
  getPersistenceDiagnostics,
  listPersistedCatalogs,
} from '../../lib/catalogPersistence';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listPersistedCatalogs();
    return NextResponse.json({ ok: true, items, diagnostics: getPersistenceDiagnostics() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const record = createBlueprintRecord(payload || {});
    const created = await createPersistedCatalog(record);
    return NextResponse.json({ ok: true, item: created, diagnostics: getPersistenceDiagnostics() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
