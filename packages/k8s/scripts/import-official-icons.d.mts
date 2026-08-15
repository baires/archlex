export interface OfficialIconEntry {
  key: string;
  sourcePath: string;
}

export function sanitizeK8sSvg(
  svg: string,
  sourceName: string,
): { viewBox: string; svg: string };

export function generateIconModule(
  entries: readonly OfficialIconEntry[],
): Promise<string>;
