export function sourceFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const code = params.get("code");
  if (code == null || code.length === 0) return undefined;
  return code;
}

export function resolveInitialSource(
  search: string,
  persisted: string | null,
  fallback: string,
): string {
  return sourceFromSearch(search) ?? (persisted?.trim() ? persisted : fallback);
}
