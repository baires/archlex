export const MIN_PREVIEW_SCALE = 0.25;
export const MAX_PREVIEW_SCALE = 3;

interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_PREVIEW_SCALE, Math.max(MIN_PREVIEW_SCALE, scale));
}

export function calculateWheelZoomDelta(
  deltaY: number,
  isPinchGesture: boolean,
): number {
  const direction = deltaY < 0 ? 1 : -1;
  return direction * (isPinchGesture ? 0.01 : 0.1);
}

export function calculateAnchoredZoom(
  scale: number,
  pan: Point,
  anchor: Point,
  nextScale: number,
): { scale: number; pan: Point } {
  const clampedNextScale = clampScale(nextScale);
  const ratio = clampedNextScale / scale;

  return {
    scale: clampedNextScale,
    pan: {
      x: anchor.x - (anchor.x - pan.x) * ratio,
      y: anchor.y - (anchor.y - pan.y) * ratio,
    },
  };
}

export function calculateFitScale(
  diagram: Size,
  viewport: Size,
  padding = 48,
): number {
  if (
    diagram.width <= 0 ||
    diagram.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    return 1;
  }

  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  return clampScale(
    Math.min(
      availableWidth / diagram.width,
      availableHeight / diagram.height,
      1,
    ),
  );
}
