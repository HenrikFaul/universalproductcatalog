import { NextResponse } from 'next/server';
import {
  cloneCatalogAsNew,
  getPersistenceDiagnostics,
} from '../../../../lib/catalogPersistence';

export const dynamic = 'force-dynamic';

export async function POST(_request, { params }) {
  try {
    const { slug } = await params;
    const created = await cloneCatalogAsNew(slug);
    return NextResponse.json({ ok: true, item: created, diagnostics: getPersistenceDiagnostics() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
