import { basename } from "node:path";

export const DIAGRAM_INPUT_HELP =
  "Input .arch or .archlex file (or use --stdin)";

export function isDiagramFile(filename: string): boolean {
  return filename.endsWith(".arch") || filename.endsWith(".archlex");
}

export function diagramId(filename: string): string {
  if (filename.endsWith(".archlex")) return basename(filename, ".archlex");
  if (filename.endsWith(".arch")) return basename(filename, ".arch");
  return basename(filename);
}

export function defaultSvgPath(inputPath: string): string {
  return inputPath.replace(/\.(?:archlex|arch)$/, ".svg");
}
