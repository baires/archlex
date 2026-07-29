export interface NodeLabelLayout {
  lines: readonly string[];
  truncated: boolean;
}

const DEFAULT_MAX_CHARACTERS_PER_LINE = 16;

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
