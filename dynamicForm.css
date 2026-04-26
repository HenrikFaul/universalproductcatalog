export function isEffective(record, at = new Date()) {
  const point = new Date(at).getTime();
  const from = new Date(record.valid_from).getTime();
  const to = record.valid_to ? new Date(record.valid_to).getTime() : Number.POSITIVE_INFINITY;
  return point >= from && point < to;
}

export function closeAndCreateMajorVersion(current, patch) {
  const now = new Date().toISOString();
  const closed = { ...current, valid_to: now, updated_at: now };
  const next = {
    ...current,
    ...patch,
    id: patch.id,
    version_major: (current.version_major ?? 1) + 1,
    version_minor: 0,
    valid_from: now,
    valid_to: null,
    created_at: now,
    updated_at: now
  };
  return { closed, next };
}

export function createMinorVersion(current, patch) {
  return {
    ...current,
    ...patch,
    version_minor: (current.version_minor ?? 0) + 1,
    updated_at: new Date().toISOString()
  };
}

export function buildTimeTravelFilter(at = 'NOW()') {
  return `valid_from <= ${at} AND (valid_to IS NULL OR valid_to > ${at}) AND deleted_at IS NULL`;
}
