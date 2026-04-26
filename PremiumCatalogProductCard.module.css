'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../ui/Button';

export default function CloneCatalogButton({ slug }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function cloneCatalog() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/catalogs/${slug}/clone`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Failed to clone catalog.');
      }
      router.push(`/catalogs/${payload.item.slug}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="clone-action-wrap">
      <Button onClick={cloneCatalog} loading={loading}>Clone as new catalog</Button>
      {error ? <span className="ds-field__error clone-action-error">{error}</span> : null}
    </span>
  );
}
