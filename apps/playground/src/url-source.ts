function searchParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export function sourceFromSearch(search: string): string | undefined {
  const code = searchParams(search).get("code");
  if (code == null || code.length === 0) return undefined;
  return code;
}

export function shareIdFromSearch(search: string): string | undefined {
  const id = searchParams(search).get("s");
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return undefined;
  return id;
}

export function shareIdToLoad(search: string): string | undefined {
  if (sourceFromSearch(search)) return undefined;
  return shareIdFromSearch(search);
}

export function resolveInitialSource(
  search: string,
  persisted: string | null,
  fallback: string,
): string {
  return sourceFromSearch(search) ?? (persisted?.trim() ? persisted : fallback);
}
