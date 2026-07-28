import type {
  CloudGraph,
  CloudScope,
  LayoutEdge,
  LayoutGraph,
  LayoutNode,
} from "@cloudmer/model";

export interface ElkNodeInput {
  id: string;
  width?: number;
  height?: number;
  labels?: { text: string }[];
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
            width: 180,
            height: 92,
            labels: [{ text: n.label }],
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
        "elk.padding": "[top=40,left=20,bottom=20,right=20]",
        "elk.spacing.nodeNode": "40",
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
        width: 180,
        height: 92,
        labels: [{ text: n.label }],
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
      "elk.spacing.nodeNode": "50",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
    },
    children: topLevelChildren,
    edges: graph.edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      arrow: e.arrow,
      kind: e.kind,
      label: e.label,
    })),
  };
}

export interface ElkChildNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  labels?: { text: string }[];
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
        width: child.width ?? 180,
        height: child.height ?? 92,
        label: child.labels?.[0]?.text ?? child.id,
        iconKey: child.iconKey,
        icon: child.icon,
      };

      if (child.children && child.children.length > 0) {
        extractNodes(child.children, absX, absY);
        layoutNode.children = child.children.map((c) => ({
          id: c.id,
          x: absX + (c.x ?? 0),
          y: absY + (c.y ?? 0),
          width: c.width ?? 180,
          height: c.height ?? 92,
          label: c.labels?.[0]?.text ?? c.id,
          iconKey: c.iconKey,
          icon: c.icon,
        }));
      }

      flatNodes.push(layoutNode);
    }
  };

  extractNodes(elkResult.children);

  const edges: LayoutEdge[] = (elkResult.edges || []).map((edge) => {
    const points: { x: number; y: number }[] = [];
    if (edge.sections) {
      for (const sec of edge.sections) {
        if (sec.startPoint) points.push(sec.startPoint);
        if (sec.bendPoints) points.push(...sec.bendPoints);
        if (sec.endPoint) points.push(sec.endPoint);
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
