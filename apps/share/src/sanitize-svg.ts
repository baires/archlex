import {
  DOMParser,
  XMLSerializer,
  type Element as XmlElement,
} from "@xmldom/xmldom";

const EMPTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg"/>`;
const DROP_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "embed",
  "object",
  "handler",
]);

function isScriptUrl(value: string): boolean {
  let compact = "";
  for (const char of value) {
    if (char.charCodeAt(0) <= 32) continue;
    compact += char;
  }
  return compact.toLowerCase().startsWith("javascript:");
}

function localName(node: XmlElement): string {
  return (node.localName || node.nodeName).toLowerCase();
}

function stripActiveAttributes(element: XmlElement): void {
  for (const attr of Array.from(element.attributes)) {
    const name = (attr.localName || attr.name).toLowerCase();
    if (name.startsWith("on")) {
      element.removeAttribute(attr.name);
      continue;
    }
    if (
      (name === "href" || attr.name.toLowerCase().endsWith(":href")) &&
      isScriptUrl(attr.value)
    ) {
      element.removeAttribute(attr.name);
    }
  }
}

function scrub(element: XmlElement): void {
  stripActiveAttributes(element);
  const children = Array.from(element.childNodes);
  for (const child of children) {
    if (child.nodeType !== 1) continue;
    const node = child as XmlElement;
    if (DROP_TAGS.has(localName(node))) {
      element.removeChild(node);
      continue;
    }
    scrub(node);
  }
}

export function sanitizeDiagramSvg(svg: string): string {
  if (/<!doctype/i.test(svg)) return EMPTY_SVG;
  let failed = false;
  let document: ReturnType<DOMParser["parseFromString"]>;
  try {
    document = new DOMParser({
      onError: (level: string) => {
        if (level === "error" || level === "fatalError") failed = true;
      },
    }).parseFromString(svg, "image/svg+xml");
  } catch {
    return EMPTY_SVG;
  }
  const root = document.documentElement;
  if (
    failed ||
    !root ||
    localName(root) !== "svg" ||
    document.getElementsByTagName("parsererror").length > 0
  ) {
    return EMPTY_SVG;
  }
  scrub(root);
  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  return new XMLSerializer().serializeToString(root);
}
