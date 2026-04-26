import { NextResponse } from 'next/server';
import {
  getPersistenceDiagnostics,
  resolveCatalogBySlug,
  updatePersistedHierarchy,
} from '../../../../lib/catalogPersistence';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const catalog = await resolveCatalogBySlug(slug);
    if (!catalog) {
      return NextResponse.json({ ok: false, error: 'Catalog not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      items: catalog.hierarchy || [],
      serviceMapping: catalog.serviceMapping || [],
      diagnostics: getPersistenceDiagnostics(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const payload = await request.json();
    const { slug } = await params;
    const updated = await updatePersistedHierarchy(slug, payload.items || [], payload.serviceMapping);
    return NextResponse.json({
      ok: true,
      item: updated,
      items: updated.hierarchy || [],
      serviceMapping: updated.serviceMapping || [],
      diagnostics: getPersistenceDiagnostics(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
