import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

export const TEST_CATALOG = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
}).getCatalog();

/**
 * Extract cursor position from marked source.
 *
 * The marked source must contain exactly one `|` character.
 */
export function unmark(markedSource: string): {
  readonly source: string;
  readonly offset: number;
} {
  const offset = markedSource.indexOf("|");
  if (offset < 0) {
    throw new Error("Marked source must contain one | cursor");
  }
  return {
    source: markedSource.slice(0, offset) + markedSource.slice(offset + 1),
    offset,
  };
}
