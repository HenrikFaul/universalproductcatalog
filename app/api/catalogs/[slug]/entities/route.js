import { NextResponse } from 'next/server';
import {
  getPersistenceDiagnostics,
  resolveCatalogBySlug,
  updatePersistedEntities,
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
      item: {
        productSpecifications: catalog.productSpecifications || [],
        serviceSpecifications: catalog.serviceSpecifications || [],
        resourceSpecifications: catalog.resourceSpecifications || [],
        productOfferings: catalog.productOfferings || [],
        catalogCategories: catalog.metadata?.catalogGrouping?.catalogCategories || [],
        offeringCategories: catalog.metadata?.catalogGrouping?.offeringCategories || [],
      },
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
    const updated = await updatePersistedEntities(slug, payload || {});

    return NextResponse.json({
      ok: true,
      item: {
        productSpecifications: updated.productSpecifications || [],
        serviceSpecifications: updated.serviceSpecifications || [],
        resourceSpecifications: updated.resourceSpecifications || [],
        productOfferings: updated.productOfferings || [],
        catalogCategories: updated.metadata?.catalogGrouping?.catalogCategories || [],
        offeringCategories: updated.metadata?.catalogGrouping?.offeringCategories || [],
      },
      diagnostics: getPersistenceDiagnostics(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
