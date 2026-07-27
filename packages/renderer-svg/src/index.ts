import type {
  Diagnostic,
  ElementMapping,
  GraphRenderer,
  LayoutGraph,
  SvgResult,
} from "@cloudmer/model";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createSvgRenderer(): GraphRenderer {
  return {
    id: "svg-renderer",
    render(
      layoutGraph: LayoutGraph,
      diagnostics: readonly Diagnostic[] = [],
    ): SvgResult {
      const mappings: ElementMapping[] = [];

      // Sort nodes deterministically by ID
      const sortedNodes = [...layoutGraph.nodes].sort((a, b) =>
        a.id.localeCompare(b.id),
      );
      const sortedEdges = [...layoutGraph.edges].sort((a, b) =>
        a.id.localeCompare(b.id),
      );

      let nodeSvgContent = "";
      for (const node of sortedNodes) {
        const svgId = `node-${node.id}`;
        nodeSvgContent += `  <g id="${svgId}" data-cloudmer-id="${escapeXml(node.id)}" transform="translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})">\n`;
        nodeSvgContent += `    <rect width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}" rx="6" ry="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>\n`;
        nodeSvgContent += `    <text x="${(node.width / 2).toFixed(1)}" y="${(node.height / 2 + 5).toFixed(1)}" fill="#f8fafc" font-family="sans-serif" font-size="14" text-anchor="middle">${escapeXml(node.label)}</text>\n`;
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

      let edgeSvgContent = "";
      for (const edge of sortedEdges) {
        const svgId = `edge-${edge.id}`;
        let pathD = "";
        if (edge.points.length >= 2) {
          const first = edge.points[0];
          pathD = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
          for (let i = 1; i < edge.points.length; i++) {
            const pt = edge.points[i];
            pathD += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          }
        } else {
          pathD = "M 0 0 L 100 0";
        }
        edgeSvgContent += `  <path id="${svgId}" data-cloudmer-id="${escapeXml(edge.id)}" d="${pathD}" stroke="#94a3b8" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>\n`;

        mappings.push({
          elementId: edge.id,
          svgId,
          span: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
          diagnosticCodes: [],
        });
      }

      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutGraph.width.toFixed(1)} ${layoutGraph.height.toFixed(1)}" role="graphics-document" aria-label="CloudMer Architecture Diagram" data-cloudmer-version="0.1.0">`,
        "  <defs>",
        `    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">`,
        `      <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8"/>`,
        "    </marker>",
        "  </defs>",
        edgeSvgContent,
        nodeSvgContent,
        "</svg>",
      ].join("\n");

      return {
        svg,
        diagnostics,
        mappings,
        metadata: {
          renderer: "svg-renderer",
          width: layoutGraph.width,
          height: layoutGraph.height,
        },
      };
    },
  };
}
