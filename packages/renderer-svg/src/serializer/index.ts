import type {
  Diagnostic,
  ElementMapping,
  LayoutGraph,
  LayoutNode,
  SvgResult,
} from "@cloudmer/model";
import { type ThemeTokens, darkTheme, lightTheme } from "../theme/index.js";
import { layoutNodeLabel } from "./labels.js";

const NODE_ICON_SIZE = 48;
const NODE_ICON_TOP = 10;
const NODE_LABEL_LINE_HEIGHT = 15;
const NODE_LABEL_SINGLE_LINE_BOTTOM_INSET = 10;
const NODE_LABEL_MULTILINE_BOTTOM_INSET = 5;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function encodeSvgId(value: string): string {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length === 0) return "0";
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function createInternalSvgId(kind: string, value: string): string {
  return `cloudmer-${kind}-${encodeSvgId(value)}`;
}

function namespaceIconIds(iconSvg: string, nodeId: string): string {
  const namespace = createInternalSvgId("icon", nodeId);
  const idMap = new Map<string, string>();

  for (const match of iconSvg.matchAll(/\sid\s*=\s*(["'])([^"']+)\1/g)) {
    const localId = match[2];
    if (!idMap.has(localId)) {
      idMap.set(localId, `${namespace}-${encodeSvgId(localId)}`);
    }
  }
  if (idMap.size === 0) return iconSvg;

  let namespaced = iconSvg.replace(
    /(\s)id\s*=\s*(["'])([^"']+)\2/g,
    (attribute, whitespace: string, quote: string, localId: string) => {
      const replacement = idMap.get(localId);
      return replacement
        ? `${whitespace}id=${quote}${replacement}${quote}`
        : attribute;
    },
  );
  namespaced = namespaced.replace(
    /url\(\s*(["']?)#([^\s#"'()<>]+)\1\s*\)/gi,
    (reference, quote: string, localId: string) => {
      const replacement = idMap.get(localId);
      return replacement ? `url(${quote}#${replacement}${quote})` : reference;
    },
  );
  namespaced = namespaced.replace(
    /(\s(?:href|xlink:href)\s*=\s*)(["'])#([^"']+)\2/gi,
    (reference, prefix: string, quote: string, localId: string) => {
      const replacement = idMap.get(localId);
      return replacement
        ? `${prefix}${quote}#${replacement}${quote}`
        : reference;
    },
  );
  namespaced = namespaced.replace(
    /(\s(?:aria-activedescendant|aria-controls|aria-describedby|aria-details|aria-errormessage|aria-flowto|aria-labelledby|aria-owns)\s*=\s*)(["'])([^"']*)\2/gi,
    (reference, prefix: string, quote: string, idRefs: string) => {
      const rewritten = idRefs
        .split(/\s+/)
        .map((localId) => idMap.get(localId) ?? localId)
        .join(" ");
      return `${prefix}${quote}${rewritten}${quote}`;
    },
  );
  return namespaced;
}

function buildRoundedPath(
  points: readonly { x: number; y: number }[],
  cornerRadius = 8,
): string {
  if (!points || points.length === 0) return "M 0.0 0.0 L 100.0 0.0";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dist1 = Math.hypot(dx1, dy1);

    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const dist2 = Math.hypot(dx2, dy2);

    if (dist1 < 1e-3 || dist2 < 1e-3) {
      pathD += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }

    const r = Math.min(cornerRadius, dist1 / 2, dist2 / 2);
    if (r < 1) {
      pathD += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
      continue;
    }

    const startX = curr.x - (dx1 / dist1) * r;
    const startY = curr.y - (dy1 / dist1) * r;
    const endX = curr.x + (dx2 / dist2) * r;
    const endY = curr.y + (dy2 / dist2) * r;

    pathD += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  pathD += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return pathD;
}

function routeMidpoint(points: readonly { x: number; y: number }[]): {
  x: number;
  y: number;
} {
  if (points.length === 0) return { x: 50, y: 0 };
  if (points.length === 1) return points[0];

  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalLength += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  if (totalLength < 1e-9) return points[0];

  let remainingDistance = totalLength / 2;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (segmentLength < 1e-9) continue;
    if (remainingDistance <= segmentLength) {
      const progress = remainingDistance / segmentLength;
      return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      };
    }
    remainingDistance -= segmentLength;
  }

  return points[points.length - 1];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectanglesOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

function findBestLabelPosition(
  points: readonly { x: number; y: number }[],
  labelWidth: number,
  labelHeight: number,
  nodes: readonly LayoutNode[],
  sourceNodeId: string,
  targetNodeId: string,
  minClearance = 12,
): { x: number; y: number } {
  if (points.length === 0) return { x: 50, y: 0 };
  if (points.length === 1) return points[0];

  let totalLength = 0;
  const segments: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    length: number;
  }> = [];

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ start, end, length });
    totalLength += length;
  }

  if (totalLength < 1e-9) return points[0];

  // Filter to leaf nodes, excluding the source and target of this edge
  const leafNodes = nodes.filter(
    (node) =>
      (!node.children || node.children.length === 0) &&
      node.id !== sourceNodeId &&
      node.id !== targetNodeId,
  );

  const testPosition = (distance: number): { x: number; y: number } | null => {
    let remaining = distance;
    for (const segment of segments) {
      if (segment.length < 1e-9) continue;
      if (remaining <= segment.length) {
        const progress = remaining / segment.length;
        const x =
          segment.start.x + (segment.end.x - segment.start.x) * progress;
        const y =
          segment.start.y + (segment.end.y - segment.start.y) * progress;

        const labelRect: Rect = {
          x: x - labelWidth / 2 - minClearance,
          y: y - labelHeight / 2 - minClearance,
          width: labelWidth + minClearance * 2,
          height: labelHeight + minClearance * 2,
        };

        const hasOverlap = leafNodes.some((node) => {
          const nodeRect: Rect = {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          };
          return rectanglesOverlap(labelRect, nodeRect);
        });

        if (!hasOverlap) {
          return { x, y };
        }
        return null;
      }
      remaining -= segment.length;
    }
    return null;
  };

  // Try midpoint first
  const midpoint = testPosition(totalLength / 2);
  if (midpoint) return midpoint;

  // Try alternative positions along the route
  // Sample at multiple granularities to find gaps between nodes
  const candidates: number[] = [];

  // Coarse sampling: every 10%
  for (let percent = 10; percent <= 90; percent += 10) {
    if (percent !== 50) {
      candidates.push((totalLength * percent) / 100);
    }
  }

  // Fine sampling near endpoints: 2%, 5%, 95%, 98%
  for (const percent of [2, 5, 95, 98]) {
    candidates.push((totalLength * percent) / 100);
  }

  // Sort candidates by distance from midpoint (prefer centered labels when possible)
  const mid = totalLength / 2;
  candidates.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));

  // Try each candidate
  for (const distance of candidates) {
    const candidate = testPosition(distance);
    if (candidate) return candidate;
  }

  // If no position is free of overlaps, return midpoint anyway as fallback
  // (better to have some overlap than to skip the label entirely)
  let remainingDistance = totalLength / 2;
  for (const segment of segments) {
    if (segment.length < 1e-9) continue;
    if (remainingDistance <= segment.length) {
      const progress = remainingDistance / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * progress,
        y: segment.start.y + (segment.end.y - segment.start.y) * progress,
      };
    }
    remainingDistance -= segment.length;
  }

  return points[points.length - 1];
}

interface ScopeStyle {
  fill: string;
  stroke: string;
  accent: string;
  kind: string;
  name: string;
  dashArray: string;
}

function resolveScopeStyle(label: string, theme: ThemeTokens): ScopeStyle {
  let kind = "";
  let name = label;
  if (label.includes(": ")) {
    const parts = label.split(": ");
    kind = parts[0].trim().toLowerCase();
    name = parts.slice(1).join(": ").trim();
  }

  switch (kind) {
    case "account":
      return {
        fill: theme.scopeFill,
        stroke: theme.scopeStroke,
        accent: theme.scopeAccents?.account ?? theme.scopeStroke,
        kind: "ACCOUNT",
        name,
        dashArray: "6 4",
      };
    case "region":
      return {
        fill: theme.scopeFill,
        stroke: theme.scopeStroke,
        accent: theme.scopeAccents?.region ?? theme.scopeStroke,
        kind: "REGION",
        name,
        dashArray: "none",
      };
    case "vpc":
      return {
        fill: theme.scopeFill,
        stroke: theme.scopeStroke,
        accent: theme.scopeAccents?.vpc ?? theme.scopeStroke,
        kind: "VPC",
        name,
        dashArray: "5 4",
      };
    case "subnet":
      return {
        fill: theme.scopeFill,
        stroke: theme.scopeStroke,
        accent: theme.scopeAccents?.subnet ?? theme.scopeStroke,
        kind: "SUBNET",
        name,
        dashArray: "3 3",
      };
    default:
      return {
        fill: theme.scopeFill,
        stroke: theme.scopeStroke,
        accent: theme.scopeStroke,
        kind: kind ? kind.toUpperCase() : "SCOPE",
        name,
        dashArray: "4 4",
      };
  }
}

function renderNodeLabel(
  label: string,
  nodeWidth: number,
  nodeHeight: number,
  hasIcon: boolean,
  theme: ThemeTokens,
): string {
  const { lines } = layoutNodeLabel(label);
  if (lines.length === 0) return "";

  const centerX = (nodeWidth / 2).toFixed(1);
  const lineHeight = NODE_LABEL_LINE_HEIGHT;
  const labelBottomInset =
    lines.length > 1
      ? NODE_LABEL_MULTILINE_BOTTOM_INSET
      : NODE_LABEL_SINGLE_LINE_BOTTOM_INSET;
  const firstBaseline = hasIcon
    ? nodeHeight - labelBottomInset - (lines.length - 1) * lineHeight
    : nodeHeight / 2 + 4 - ((lines.length - 1) * lineHeight) / 2;

  let labelSvg = `    <text class="cloudmer-node-label" x="${centerX}" fill="${theme.textFill}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" text-anchor="middle" aria-hidden="true">\n`;
  for (const [index, line] of lines.entries()) {
    const position =
      index === 0 ? ` y="${firstBaseline.toFixed(1)}"` : ` dy="${lineHeight}"`;
    labelSvg += `      <tspan x="${centerX}"${position}>${escapeXml(line)}</tspan>\n`;
  }
  labelSvg += "    </text>\n";
  return labelSvg;
}

function renderStatusMarker(
  id: string,
  x: number,
  y: number,
  color: string,
  description: string,
  theme: ThemeTokens,
): string {
  return `    <g id="${id}" class="cloudmer-status-marker" transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})" role="img" aria-label="${escapeXml(description)}">
      <circle r="7" fill="${theme.background}" stroke="${color}" stroke-width="1.5"/>
      <text y="3.5" fill="${color}" font-family="system-ui, sans-serif" font-size="10" font-weight="700" text-anchor="middle" aria-hidden="true">!</text>
    </g>
`;
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
  for (const [scopeIndex, scope] of scopeNodes.entries()) {
    const style = resolveScopeStyle(scope.label, theme);
    const isError = errorElements.has(scope.id);
    const isWarning = warningElements.has(scope.id);
    const strokeColor = isError
      ? theme.errorStroke
      : isWarning
        ? theme.warningMarker
        : style.stroke;
    const dashArray = isError ? "4 3" : isWarning ? "2 2" : style.dashArray;
    const svgId = `scope-${scope.id}`;
    const dashAttr =
      dashArray !== "none" ? ` stroke-dasharray="${dashArray}"` : "";
    const elementDiagnostics = diagnostics.filter((diagnostic) =>
      diagnostic.elements.includes(scope.id),
    );
    const diagnosticId =
      isError || isWarning ? `cloudmer-scope-diagnostic-${scopeIndex}` : "";
    const describedByAttr = diagnosticId
      ? ` aria-describedby="${diagnosticId}"`
      : "";

    scopeSvgContent += `    <g id="${svgId}" class="cloudmer-scope" data-cloudmer-id="${escapeXml(scope.id)}" data-cloudmer-scope-kind="${escapeXml(style.kind.toLowerCase())}" transform="translate(${scope.x.toFixed(1)}, ${scope.y.toFixed(1)})"${describedByAttr}>\n`;
    scopeSvgContent += `      <rect width="${scope.width.toFixed(1)}" height="${scope.height.toFixed(1)}" rx="8" ry="8" fill="${style.fill}" stroke="${strokeColor}" stroke-width="1.5"${dashAttr}/>\n`;
    scopeSvgContent += `      <path class="cloudmer-scope-accent" d="M 8 1.5 H ${(scope.width - 8).toFixed(1)}" stroke="${style.accent}" stroke-width="3" stroke-linecap="round" aria-hidden="true"/>\n`;
    scopeSvgContent += `      <text class="cloudmer-scope-label" x="12" y="20" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">\n`;
    scopeSvgContent += `        <tspan fill="${theme.textMuted ?? theme.scopeTextFill}" font-size="9" font-weight="700" letter-spacing="0.5">${escapeXml(style.kind)}</tspan>\n`;
    scopeSvgContent += `        <tspan dx="6" fill="${theme.scopeTextFill}" font-size="11" font-weight="600">${escapeXml(style.name)}</tspan>\n`;
    scopeSvgContent += "      </text>\n";
    if (diagnosticId) {
      const description = elementDiagnostics
        .map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`)
        .join("; ");
      scopeSvgContent += renderStatusMarker(
        diagnosticId,
        scope.width - 9,
        9,
        strokeColor,
        description,
        theme,
      );
    }
    scopeSvgContent += "    </g>\n";
  }

  // 2. Edges SVG content
  let edgeSvgContent = "";
  for (const [edgeIndex, edge] of sortedEdges.entries()) {
    const isError = errorElements.has(edge.id);
    const isWarning = warningElements.has(edge.id);
    const isDotted = edge.arrow.includes(".");
    const strokeColor = isError
      ? theme.errorStroke
      : isWarning
        ? theme.warningMarker
        : theme.edgeStroke;
    const strokeDash = isError
      ? ' stroke-dasharray="4 3"'
      : isWarning
        ? ' stroke-dasharray="2 2"'
        : isDotted
          ? ' stroke-dasharray="6 5"'
          : "";

    const pathD = buildRoundedPath(edge.points, 8);
    if (!pathD) continue;

    const svgId = createInternalSvgId("edge", edge.id);
    const markerEnd = edge.arrow.includes(">") ? "url(#arrowhead)" : "none";
    const markerStart = edge.arrow.includes("<")
      ? "url(#arrowhead-start)"
      : "none";
    const elementDiagnostics = diagnostics.filter((diagnostic) =>
      diagnostic.elements.includes(edge.id),
    );
    const diagnosticId =
      isError || isWarning ? `cloudmer-edge-diagnostic-${edgeIndex}` : "";
    const describedByAttr = diagnosticId
      ? ` aria-describedby="${diagnosticId}"`
      : "";
    const relationshipLabel = edge.label?.trim() || edge.kind?.trim() || "";
    const ariaLabelAttr = relationshipLabel
      ? ` aria-label="${escapeXml(relationshipLabel)}" role="graphics-object"`
      : "";

    edgeSvgContent += `  <path id="${svgId}" class="cloudmer-edge" data-cloudmer-id="${escapeXml(edge.id)}" data-cloudmer-arrow="${escapeXml(edge.arrow)}" d="${pathD}" stroke="${strokeColor}" stroke-width="1.5"${strokeDash} fill="none" marker-start="${markerStart}" marker-end="${markerEnd}"${ariaLabelAttr}${describedByAttr}/>\n`;
    if (relationshipLabel) {
      const labelWidth = Math.max(38, relationshipLabel.length * 6.6 + 14);
      const labelHeight = 21;
      const labelPoint = findBestLabelPosition(
        edge.points,
        labelWidth,
        labelHeight,
        leafNodes,
        edge.source,
        edge.target,
      );
      edgeSvgContent += `  <g class="cloudmer-edge-label" transform="translate(${labelPoint.x.toFixed(1)}, ${labelPoint.y.toFixed(1)})" aria-hidden="true">\n`;
      edgeSvgContent += `    <rect x="${(-labelWidth / 2).toFixed(1)}" y="-10.5" width="${labelWidth.toFixed(1)}" height="21" rx="5" fill="${theme.nodeFill}" stroke="${theme.nodeStroke}" stroke-width="1"/>\n`;
      edgeSvgContent += `    <text y="4" fill="${theme.textFill}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" text-anchor="middle">${escapeXml(relationshipLabel)}</text>\n`;
      edgeSvgContent += "  </g>\n";
    }
    if (diagnosticId) {
      const markerPoint = routeMidpoint(edge.points);
      const description = elementDiagnostics
        .map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`)
        .join("; ");
      edgeSvgContent += renderStatusMarker(
        diagnosticId,
        markerPoint.x,
        markerPoint.y,
        strokeColor,
        description,
        theme,
      );
    }

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
  for (const [nodeIndex, node] of leafNodes.entries()) {
    const isError = errorElements.has(node.id);
    const isWarning = warningElements.has(node.id);
    const strokeColor = isError
      ? theme.errorStroke
      : isWarning
        ? theme.warningMarker
        : theme.nodeStroke;
    const strokeDash = isError
      ? ' stroke-dasharray="4 3"'
      : isWarning
        ? ' stroke-dasharray="2 2"'
        : "";
    const svgId = `node-${node.id}`;
    const elementDiagnostics = diagnostics.filter((diagnostic) =>
      diagnostic.elements.includes(node.id),
    );
    const diagnosticId =
      isError || isWarning ? `cloudmer-diagnostic-${nodeIndex}` : "";
    const describedByAttr = diagnosticId
      ? ` aria-describedby="${diagnosticId}"`
      : "";

    nodeSvgContent += `  <g id="${svgId}" class="cloudmer-node" data-cloudmer-id="${escapeXml(node.id)}" transform="translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})" tabindex="0" role="graphics-symbol" aria-label="${escapeXml(node.label)}"${describedByAttr}>\n`;
    nodeSvgContent += `    <rect class="cloudmer-node-surface" width="${node.width.toFixed(1)}" height="${node.height.toFixed(1)}" rx="6" ry="6" fill="${theme.nodeFill}" stroke="${strokeColor}" stroke-width="1"${strokeDash}/>\n`;

    if (node.icon) {
      const iconKeyAttr = node.iconKey
        ? ` data-cloudmer-icon="${escapeXml(node.iconKey)}"`
        : "";
      const iconSize = NODE_ICON_SIZE;
      const iconX = (node.width / 2 - iconSize / 2).toFixed(1);
      const iconY = NODE_ICON_TOP;

      if (node.icon.startsWith("<svg")) {
        const namespacedIcon = namespaceIconIds(node.icon, node.id);
        const positionedIcon = namespacedIcon.replace(
          /^<svg\b[^>]*>/,
          (opening) => {
            const withoutIntrinsicSize = opening.replace(
              /\s(?:width|height)="[^"]*"/g,
              "",
            );
            return withoutIntrinsicSize.replace(
              "<svg",
              `<svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}"${iconKeyAttr} aria-hidden="true" focusable="false"`,
            );
          },
        );
        nodeSvgContent += `    ${positionedIcon}\n`;
      } else {
        nodeSvgContent += `    <g transform="translate(${iconX}, ${iconY})"${iconKeyAttr}>\n`;
        nodeSvgContent += `      ${node.icon}\n`;
        nodeSvgContent += "    </g>\n";
      }
    }

    nodeSvgContent += renderNodeLabel(
      node.label,
      node.width,
      node.height,
      Boolean(node.icon),
      theme,
    );
    if (diagnosticId) {
      const description = elementDiagnostics
        .map((diagnostic) => `${diagnostic.severity}: ${diagnostic.message}`)
        .join("; ");
      nodeSvgContent += renderStatusMarker(
        diagnosticId,
        node.width - 9,
        9,
        strokeColor,
        description,
        theme,
      );
    }
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
    <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6.5" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="${theme.arrowFill}"/>
    </marker>
    <marker id="arrowhead-start" markerWidth="7" markerHeight="7" refX="0.5" refY="3.5" orient="auto" markerUnits="strokeWidth">
      <path d="M 7 0 L 0 3.5 L 7 7 Z" fill="${theme.arrowFill}"/>
    </marker>
    <style>
      g.cloudmer-node:focus-visible > rect.cloudmer-node-surface { stroke: ${theme.edgeHoverStroke ?? theme.edgeStroke}; stroke-width: 2; }
    </style>
  </defs>
  <rect class="cloudmer-canvas" width="100%" height="100%" fill="${theme.background}"/>
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
