import type {
  Diagnostic,
  ElementMapping,
  LayoutGraph,
  SvgResult,
} from "@cloudmer/model";
import { darkTheme, lightTheme } from "../theme/index.js";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function serializeSvgGraph(
  layoutGraph: LayoutGraph,
  diagnostics: readonly Diagnostic[] = [],
  themeName: "light" | "dark" = "dark",
): SvgResult {
  const mappings: ElementMapping[] = [];
  const theme = themeName === "light" ? lightTheme : darkTheme;

  // Build error and warning element lookup sets
  const errorElements = new Set<string>();
  const warningElements = new Set<string>();
  for (const diag of diagnostics) {
    for (const elemId of diag.elements) {
      if (diag.severity === "error") errorElements.add(elemId);
      if (diag.severity === "warning") warningElements.add(elemId);
    }
  }

  // Sort nodes and edges deterministically
  const sortedNodes = [...layoutGraph.nodes].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const sortedEdges = [...layoutGraph.edges].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  // Group nodes into scopes vs leaf nodes
  const scopeNodes = sortedNodes.filter(
    (n) => n.children && n.children.length > 0,
  );
  const leafNodes = sortedNodes.filter(
    (n) => !n.children || n.children.length === 0,
  );

  // 1. Scopes container SVG content
  let scopeSvgContent = "";
  for (const scope of scopeNodes) {
    const svgId = `scope-${scope.id}`;
    scopeSvgContent += `    <g id="${svgId}" class="cloudmer-scope" data-cloudmer-id="${escapeXml(scope.id)}" transform="translate(${scope.x.toFixed(1)}, ${scope.y.toFixed(1)})">\n`;
    scopeSvgContent += `      <rect width="${scope.width.toFixed(1)}" height="${scope.height.toFixed(1)}" rx="8" ry="8" fill="${theme.scopeFill}" stroke="${theme.scopeStroke}" stroke-width="1.5" stroke-dasharray="4 4"/>\n`;
    scopeSvgContent += `      <text x="12.0" y="24.0" fill="${theme.scopeTextFill}" font-family="sans-serif" font-size="12" font-weight="600">${escapeXml(scope.label)}</text>\n`;
    scopeSvgContent += "    </g>\n";
  }

  // 2. Edges SVG content
  let edgeSvgContent = "";
  for (const edge of sortedEdges) {
    const isError = errorElements.has(edge.id);
    const isDotted = edge.arrow.includes(".");
    const strokeColor = isError ? theme.errorStroke : theme.edgeStroke;
    const strokeDash = isError
      ? ' stroke-dasharray="4 4"'
      : isDotted
        ? ' stroke-dasharray="6 5"'
        : "";

    let pathD = "";
    if (edge.points.length > 0) {
      const [start, ...rest] = edge.points;
      pathD = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
      for (const p of rest) {
        pathD += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      }
    } else {
      pathD = "M 0.0 0.0 L 100.0 0.0";
    }

    const svgId = `edge-${edge.id}`;
    const markerEnd = edge.arrow.includes(">") ? "url(#arrowhead)" : "none";
    const markerStart = edge.arrow.includes("<")
      ? "url(#arrowhead-start)"
      : "none";

    edgeSvgContent += `  <path id="${svgId}" data-cloudmer-id="${escapeXml(edge.id)}" data-cloudmer-arrow="${escapeXml(edge.arrow)}" d="${pathD}" stroke="${strokeColor}" stroke-width="2"${strokeDash} fill="none" marker-start="${markerStart}" marker-end="${markerEnd}"/>\n`;

    mappings.push({
      elementId: edge.id,
      svgId,
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      },
      diagnosticCodes: diagnostics
        .filter((d) => d.elements.includes(edge.id))
        .map((d) => d.code),
    });
  }

  // 3. Leaf Nodes SVG content
  let nodeSvgContent = "";
  for (const node of leafNodes) {
    const isError = errorElements.has(node.id);
    const isWarning = warningElements.has(node.id);
    const strokeColor = isError
      ? theme.errorStroke
      : isWarning
        ? theme.warningMarker
        : theme.nodeStroke;
    const strokeWidth = isError ? "3" : "2";
    const svgId = `node-${node.id}`;

    nodeSvgContent += `  <g id="${svgId}" data-cloudmer-id="${escapeXml(node.id)}" transform="translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})" tabindex="0" role="graphics-symbol" aria-label="${escapeXml(node.label)}">\n`;
    nodeSvgContent += `    <rect width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}" rx="6" ry="6" fill="${theme.nodeFill}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>\n`;

    if (node.icon) {
      const iconKeyAttr = node.iconKey
        ? ` data-cloudmer-icon="${escapeXml(node.iconKey)}"`
        : "";
      if (node.icon.startsWith("<svg")) {
        const positionedIcon = node.icon.replace(/^<svg\b[^>]*>/, (opening) => {
          const withoutIntrinsicSize = opening.replace(
            /\s(?:width|height)="[^"]*"/g,
            "",
          );
          return withoutIntrinsicSize.replace(
            "<svg",
            `<svg x="${(node.width / 2 - 24).toFixed(1)}" y="10" width="48" height="48"${iconKeyAttr}`,
          );
        });
        nodeSvgContent += `    ${positionedIcon}\n`;
      } else {
        nodeSvgContent += `    <g transform="translate(${(node.width / 2 - 32).toFixed(1)}, 10)"${iconKeyAttr}>\n`;
        nodeSvgContent += `      ${node.icon}\n`;
        nodeSvgContent += "    </g>\n";
      }
    }

    nodeSvgContent += `    <text x="${(node.width / 2).toFixed(1)}" y="${(node.height - 12).toFixed(1)}" fill="${theme.textFill}" font-family="sans-serif" font-size="14" text-anchor="middle">${escapeXml(node.label)}</text>\n`;
    nodeSvgContent += "  </g>\n";

    mappings.push({
      elementId: node.id,
      svgId,
      span: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      },
      diagnosticCodes: diagnostics
        .filter((d) => d.elements.includes(node.id))
        .map((d) => d.code),
    });
  }

  const width = Math.max(layoutGraph.width, 100);
  const height = Math.max(layoutGraph.height, 100);

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}" role="graphics-document" aria-label="CloudMer Architecture Diagram" data-cloudmer-version="0.1.0">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="${theme.arrowFill}"/>
    </marker>
    <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
      <polygon points="10 0, 0 3.5, 10 7" fill="${theme.arrowFill}"/>
    </marker>
  </defs>
  <g id="scopes">
${scopeSvgContent}  </g>
  <g id="edges">
${edgeSvgContent}  </g>
  <g id="nodes">
${nodeSvgContent}  </g>
</svg>`;

  return {
    svg: fullSvg,
    diagnostics,
    mappings,
    metadata: {
      renderer: "renderer-svg",
      width,
      height,
    },
  };
}

export function createSvgRenderer(): {
  id: string;
  render(
    layoutGraph: LayoutGraph,
    diagnostics?: readonly Diagnostic[],
    themeName?: "light" | "dark",
  ): SvgResult;
} {
  return {
    id: "renderer-svg",
    render(
      layoutGraph: LayoutGraph,
      diagnostics?: readonly Diagnostic[],
      themeName?: "light" | "dark",
    ): SvgResult {
      return serializeSvgGraph(layoutGraph, diagnostics, themeName);
    },
  };
}
