export function validateSvgSafety(svgString: string): void {
  const containsUnsafeContent =
    /<(?:script|foreignObject)|\son\w+=|\b(?:href|src)=["']https?:\/\//i.test(
      svgString,
    );
  if (containsUnsafeContent) {
    throw new Error(
      "Safety check failed: SVG contains unsafe scripts, handlers, or external URLs.",
    );
  }
}

export function mountSvg(container: Element, svgString: string): SVGSVGElement {
  if (!container || typeof container.appendChild !== "function") {
    throw new Error("Invalid container element provided to mountSvg");
  }

  validateSvgSafety(svgString);

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(
      `SVG parsing failed during mountSvg: ${parserError.textContent}`,
    );
  }

  const svgElement = doc.documentElement;
  if (!svgElement || svgElement.nodeName.toLowerCase() !== "svg") {
    throw new Error("Invalid SVG root element in mountSvg");
  }

  if (doc.querySelector("script")) {
    throw new Error(
      "Safety check failed: Script element found inside SVG document.",
    );
  }

  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const importedNode = document.importNode(
    svgElement,
    true,
  ) as unknown as SVGSVGElement;
  container.appendChild(importedNode);

  return importedNode;
}
