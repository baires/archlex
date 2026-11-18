import type {
  Diagnostic,
  GraphRenderer,
  LayoutGraph,
  PresentationText,
  SvgResult,
} from "@archlex/model";
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
      presentation?: PresentationText,
    ): SvgResult {
      return serializeSvgGraph(
        layoutGraph,
        diagnostics,
        themeName,
        presentation,
      );
    },
  };
}
