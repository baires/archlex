export interface NodeLabelLayout {
  lines: readonly string[];
  truncated: boolean;
}

/**
 * Leaf resource cards use discrete width tiers so short labels stay compact
 * while canonical service names (e.g. "Google Kubernetes Engine") fit
 * without truncation. Label wrapping derives from the chosen width, keeping
 * layout measurement and SVG serialization in agreement without DOM font
 * metrics.
 */
export const NODE_WIDTH_TIERS = [128, 160, 192] as const;
export const NODE_LABEL_HORIZONTAL_PADDING = 16;
export const NODE_LABEL_CHAR_WIDTH = 7;

export function charsPerLineForWidth(width: number): number {
  return Math.max(
    1,
    Math.floor((width - NODE_LABEL_HORIZONTAL_PADDING) / NODE_LABEL_CHAR_WIDTH),
  );
}

const DEFAULT_MAX_CHARACTERS_PER_LINE = charsPerLineForWidth(
  NODE_WIDTH_TIERS[0],
);

function ellipsize(value: string, maxCharacters: number): string {
  if (maxCharacters <= 0) return "";
  if (maxCharacters === 1) return "…";
  return `${value.slice(0, maxCharacters - 1)}…`;
}

export function layoutNodeLabel(
  label: string,
  maxCharactersPerLine = DEFAULT_MAX_CHARACTERS_PER_LINE,
): NodeLabelLayout {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], truncated: false };
  if (words[0].length > maxCharactersPerLine) {
    return {
      lines: [ellipsize(words[0], maxCharactersPerLine)],
      truncated: true,
    };
  }

  let wordIndex = 0;
  let firstLine = "";
  while (wordIndex < words.length) {
    const candidate = firstLine
      ? `${firstLine} ${words[wordIndex]}`
      : words[wordIndex];
    if (firstLine && candidate.length > maxCharactersPerLine) break;

    firstLine = candidate;
    wordIndex += 1;
  }

  if (wordIndex === words.length) {
    return { lines: [firstLine], truncated: false };
  }

  let secondLine = "";
  while (wordIndex < words.length) {
    const candidate = secondLine
      ? `${secondLine} ${words[wordIndex]}`
      : words[wordIndex];
    if (candidate.length > maxCharactersPerLine) {
      return {
        lines: [firstLine, ellipsize(candidate, maxCharactersPerLine)],
        truncated: true,
      };
    }

    secondLine = candidate;
    wordIndex += 1;
  }

  return { lines: [firstLine, secondLine], truncated: false };
}

/**
 * Smallest width tier whose label wrapping fits in two lines without
 * truncation; the largest tier when every tier truncates.
 */
export function nodeWidthForLabel(label: string): number {
  for (const tier of NODE_WIDTH_TIERS) {
    if (!layoutNodeLabel(label, charsPerLineForWidth(tier)).truncated) {
      return tier;
    }
  }
  return NODE_WIDTH_TIERS[NODE_WIDTH_TIERS.length - 1];
}
