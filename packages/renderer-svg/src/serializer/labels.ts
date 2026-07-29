export interface NodeLabelLayout {
  lines: readonly string[];
  truncated: boolean;
}

const DEFAULT_MAX_CHARACTERS_PER_LINE = 16;

export function layoutNodeLabel(
  label: string,
  maxCharactersPerLine = DEFAULT_MAX_CHARACTERS_PER_LINE,
): NodeLabelLayout {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [], truncated: false };

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
        lines: [firstLine, `${candidate.slice(0, maxCharactersPerLine - 1)}…`],
        truncated: true,
      };
    }

    secondLine = candidate;
    wordIndex += 1;
  }

  return { lines: [firstLine, secondLine], truncated: false };
}
