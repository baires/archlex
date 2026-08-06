import type {
  CloudGraph,
  CloudScope,
  LayoutEdge,
  LayoutGraph,
  LayoutNode,
} from "@archlex/model";
import {
  EDGE_LABEL_HEIGHT,
  edgeLabelBoxWidth,
  nodeWidthForLabel,
} from "@archlex/model";

const COMPACT_RESOURCE_WIDTH = 128;
const COMPACT_RESOURCE_HEIGHT = 92;
const SCOPE_HEADER_CLEARANCE = 36;

// Fixed px of edge line reserved on each side of a relationship label so the
// line start/end and the arrowhead always render fully.
const EDGE_LABEL_SIDE_PADDING = 8;

// ELK spacing values (px) for the root graph and for nested scope containers.
// BetweenLayers spacing is applied on BOTH sides of an edge label by ELK, so
// it directly drives the visual distance between connected nodes.
const ROOT_SPACING = {
  nodeNode: 60,
  edgeNode: 40,
  edgeEdge: 24,
  nodeNodeBetweenLayers: 42,
} as const;

const SCOPE_SPACING = {
  nodeNode: 36,
  edgeNode: 20,
  nodeNodeBetweenLayers: 56,
  paddingSides: 20,
} as const;

export interface ElkNodeInput {
  id: string;
  width?: number;
  height?: number;
  labels?: { text: string }[];
  accessibleName?: string;
  iconKey?: string;
  icon?: string;
  layoutOptions?: Record<string, string>;
  children?: ElkNodeInput[];
  ports?: { id: string; layoutOptions: Record<string, string> }[];
}

export function buildElkGraph(
  graph: CloudGraph,
  direction: "LR" | "RL" | "TB" | "BT" = "LR",
) {
  const elkDirection =
    direction === "LR"
      ? "RIGHT"
      : direction === "RL"
        ? "LEFT"
        : direction === "TB"
          ? "DOWN"
          : "UP";

  // Build node lookup map
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const claimedNodeIds = new Set<string>();

  // Map scopes recursively or hierarchically
  const scopeMap = new Map<string, CloudScope>();
  for (const scope of graph.scopes) {
    scopeMap.set(scope.id, scope);
  }

  // Find root scopes (not claimed by a parent scope)
  const rootScopes = graph.scopes.filter((scope) => {
    const parentPath = scope.id.substring(0, scope.id.lastIndexOf("/"));
    return !parentPath || !scopeMap.has(parentPath);
  });

  const inPortSide =
    direction === "TB" || direction === "BT" ? "NORTH" : "WEST";
  const outPortSide =
    direction === "TB" || direction === "BT" ? "SOUTH" : "EAST";

  const buildScopeChildren = (scope: CloudScope): ElkNodeInput => {
    const directChildScopes = graph.scopes.filter((s) => {
      const lastSlash = s.id.lastIndexOf("/");
      return lastSlash !== -1 && s.id.substring(0, lastSlash) === scope.id;
    });

    const childNodes: ElkNodeInput[] = [];

    // Add child scope containers
    for (const childScope of directChildScopes) {
      childNodes.push(buildScopeChildren(childScope));
    }

    // Add leaf nodes directly under this scope
    for (const nodeId of scope.childrenNodeIds) {
      if (!claimedNodeIds.has(nodeId)) {
        const n = nodeMap.get(nodeId);
        if (n) {
          claimedNodeIds.add(nodeId);
          childNodes.push({
            id: n.id,
            width: nodeWidthForLabel(n.label),
            height: COMPACT_RESOURCE_HEIGHT,
            labels: [{ text: n.label }],
            accessibleName: n.accessibleName,
            iconKey: n.iconKey,
            icon: n.icon,
          });
        }
      }
    }

    return {
      id: scope.id,
      labels: [{ text: `${scope.kind}: ${scope.name}` }],
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": elkDirection,
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.padding": `[top=${SCOPE_HEADER_CLEARANCE},left=${SCOPE_SPACING.paddingSides},bottom=${SCOPE_SPACING.paddingSides},right=${SCOPE_SPACING.paddingSides}]`,
        "elk.spacing.nodeNode": String(SCOPE_SPACING.nodeNode),
        "elk.spacing.edgeNode": String(SCOPE_SPACING.edgeNode),
        "elk.layered.spacing.nodeNodeBetweenLayers": String(
          SCOPE_SPACING.nodeNodeBetweenLayers,
        ),
      },
      children: childNodes,
    };
  };

  const topLevelChildren: ElkNodeInput[] = [];

  for (const rootScope of rootScopes) {
    topLevelChildren.push(buildScopeChildren(rootScope));
  }

  // Add remaining un-scoped nodes
  for (const n of graph.nodes) {
    if (!claimedNodeIds.has(n.id)) {
      claimedNodeIds.add(n.id);
      topLevelChildren.push({
        id: n.id,
        width: nodeWidthForLabel(n.label),
        height: COMPACT_RESOURCE_HEIGHT,
        labels: [{ text: n.label }],
        accessibleName: n.accessibleName,
        iconKey: n.iconKey,
        icon: n.icon,
        ports: undefined,
      });
    }
  }

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": String(ROOT_SPACING.nodeNode),
      "elk.spacing.edgeNode": String(ROOT_SPACING.edgeNode),
      "elk.spacing.edgeEdge": String(ROOT_SPACING.edgeEdge),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(
        ROOT_SPACING.nodeNodeBetweenLayers,
      ),
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeLabels.placement": "CENTER",
    },
    children: topLevelChildren,
    edges: graph.edges.map((e) => {
      const labelText = e.label?.trim() || e.kind?.trim() || "";
      return {
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        arrow: e.arrow,
        kind: e.kind,
        label: e.label,
        labels: labelText
          ? [
              {
                text: labelText,
                width:
                  edgeLabelBoxWidth(labelText) + EDGE_LABEL_SIDE_PADDING * 2,
                height: EDGE_LABEL_HEIGHT,
              },
            ]
          : [],
      };
    }),
  };
}

export interface ElkChildNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  labels?: { text: string }[];
  accessibleName?: string;
  iconKey?: string;
  icon?: string;
  children?: ElkChildNode[];
}

export interface ElkEdgeSection {
  startPoint?: { x: number; y: number };
  bendPoints?: { x: number; y: number }[];
  endPoint?: { x: number; y: number };
}

export interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  sections?: ElkEdgeSection[];
  container?: string;
  arrow?: string;
  kind?: string;
  label?: string;
}

export interface ElkLayoutResult {
  width?: number;
  height?: number;
  children?: ElkChildNode[];
  edges?: ElkEdge[];
}

export function convertElkResultToLayoutGraph(
  elkResult: ElkLayoutResult,
): LayoutGraph {
  const flatNodes: LayoutNode[] = [];

  const extractNodes = (
    children: ElkChildNode[] | undefined,
    parentX = 0,
    parentY = 0,
  ) => {
    if (!children) return;
    for (const child of children) {
      const absX = parentX + (child.x ?? 0);
      const absY = parentY + (child.y ?? 0);

      const layoutNode: LayoutNode = {
        id: child.id,
        x: absX,
        y: absY,
        width: child.width ?? COMPACT_RESOURCE_WIDTH,
        height: child.height ?? COMPACT_RESOURCE_HEIGHT,
        label: child.labels?.[0]?.text ?? child.id,
        accessibleName: child.accessibleName,
        iconKey: child.iconKey,
        icon: child.icon,
      };

      if (child.children && child.children.length > 0) {
        extractNodes(child.children, absX, absY);
        layoutNode.children = child.children.map((c) => ({
          id: c.id,
          x: absX + (c.x ?? 0),
          y: absY + (c.y ?? 0),
          width: c.width ?? COMPACT_RESOURCE_WIDTH,
          height: c.height ?? COMPACT_RESOURCE_HEIGHT,
          label: c.labels?.[0]?.text ?? c.id,
          accessibleName: c.accessibleName,
          iconKey: c.iconKey,
          icon: c.icon,
        }));
      }

      flatNodes.push(layoutNode);
    }
  };

  extractNodes(elkResult.children);

  const nodePositions = new Map(flatNodes.map((node) => [node.id, node]));

  const edges: LayoutEdge[] = (elkResult.edges || []).map((edge) => {
    const points: { x: number; y: number }[] = [];
    const container = edge.container
      ? nodePositions.get(edge.container)
      : undefined;
    const containerX = container?.x ?? 0;
    const containerY = container?.y ?? 0;
    if (edge.sections) {
      for (const sec of edge.sections) {
        if (sec.startPoint) {
          points.push({
            x: sec.startPoint.x + containerX,
            y: sec.startPoint.y + containerY,
          });
        }
        if (sec.bendPoints) {
          points.push(
            ...sec.bendPoints.map((point) => ({
              x: point.x + containerX,
              y: point.y + containerY,
            })),
          );
        }
        if (sec.endPoint) {
          points.push({
            x: sec.endPoint.x + containerX,
            y: sec.endPoint.y + containerY,
          });
        }
      }
    }
    return {
      id: edge.id,
      source: edge.sources[0],
      target: edge.targets[0],
      points,
      arrow: edge.arrow ?? "->",
      kind: edge.kind,
      label: edge.label,
    };
  });

  return {
    width: elkResult.width ?? 800,
    height: elkResult.height ?? 600,
    nodes: flatNodes,
    edges,
  };
}
