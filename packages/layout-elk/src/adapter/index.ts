import type {
  CloudGraph,
  LayoutEdge,
  LayoutGraph,
  LayoutNode,
} from "@cloudmer/model";

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

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection,
      "elk.spacing.nodeNode": "50",
    },
    children: graph.nodes.map((n) => ({
      id: n.id,
      width: 120,
      height: 60,
      labels: [{ text: n.label }],
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
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
  const nodes: LayoutNode[] = (elkResult.children || []).map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? 120,
    height: child.height ?? 60,
    label: child.labels?.[0]?.text ?? child.id,
  }));

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
    };
  });

  return {
    width: elkResult.width ?? 800,
    height: elkResult.height ?? 600,
    nodes,
    edges,
  };
}
