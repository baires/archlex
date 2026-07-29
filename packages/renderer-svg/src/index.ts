import type {
  Diagnostic,
  GraphRenderer,
  LayoutGraph,
  SvgResult,
} from "@cloudmer/model";
import { serializeSvgGraph } from "./serializer/index.js";

export * from "./serializer/index.js";
export * from "./theme/index.js";

export function createSvgRenderer(): GraphRenderer {
  return {
    id: "svg-renderer",
    render(
      layoutGraph: LayoutGraph,
      diagnostics: readonly Diagnostic[] = [],
      themeName?: "light" | "dark",
    ): SvgResult {
      return serializeSvgGraph(layoutGraph, diagnostics, themeName);
    },
  };
}
