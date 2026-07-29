import { describe, expect, it } from "vitest";
import { layoutNodeLabel } from "./labels.js";

describe("layoutNodeLabel", () => {
  it.each([
    [
      "keeps a short label on one line",
      "Amazon RDS",
      16,
      ["Amazon RDS"],
      false,
    ],
    [
      "wraps at a word boundary before the second line",
      "Amazon RDS Proxy",
      12,
      ["Amazon RDS", "Proxy"],
      false,
    ],
    [
      "truncates overflow on the second line with one ellipsis",
      "An Extremely Long Unsupported Service Name",
      12,
      ["An Extremely", "Long Unsupp…"],
      true,
    ],
    [
      "normalizes repeated whitespace before wrapping",
      "Amazon   RDS\n\tProxy",
      12,
      ["Amazon RDS", "Proxy"],
      false,
    ],
    [
      "ellipsizes an overlong first token",
      "Supercalifragilistic",
      12,
      ["Supercalifr…"],
      true,
    ],
    [
      "ellipsizes an overlong first token when more words follow",
      "Supercalifragilistic Service Name",
      12,
      ["Supercalifr…"],
      true,
    ],
  ] as const)("%s", (_name, label, maxCharactersPerLine, lines, truncated) => {
    expect(layoutNodeLabel(label, maxCharactersPerLine)).toEqual({
      lines,
      truncated,
    });
  });
});
