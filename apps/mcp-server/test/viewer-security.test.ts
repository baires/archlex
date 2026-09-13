import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { DIAGRAM_VIEWER_HTML } from "../src/ui/diagram-viewer.js";

interface TestElement {
  innerHTML: string;
  style: Record<string, string>;
  hidden: boolean;
  textContent: string;
  src: string;
  children: TestElement[];
  attributes: Map<string, string>;
  addEventListener(): void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  querySelector(): null;
  appendChild(child: TestElement): void;
  replaceChildren(): void;
}

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Missing viewer fixture");
  return value;
}

function viewerHarness() {
  function element(): TestElement {
    const attributes = new Map<string, string>();
    return {
      innerHTML: "",
      style: {},
      hidden: false,
      textContent: "",
      src: "",
      children: [] as TestElement[],
      attributes,
      addEventListener() {},
      setAttribute(name: string, value: string) {
        attributes.set(name, value);
      },
      removeAttribute(name: string) {
        attributes.delete(name);
      },
      querySelector() {
        return null;
      },
      appendChild(child: TestElement) {
        this.children.push(child);
      },
      replaceChildren() {
        this.children = [];
      },
    };
  }
  const elements = new Map<string, ReturnType<typeof element>>();
  let listener: ((event: Record<string, unknown>) => void) | undefined;
  const parent = { postMessage() {} };
  const script = required(
    DIAGRAM_VIEWER_HTML.match(/<script>([\s\S]*?)<\/script>/),
  )[1];
  runInNewContext(script, {
    URL,
    encodeURIComponent,
    window: {
      parent,
      addEventListener(type: string, callback: typeof listener) {
        if (type === "message") listener = callback;
      },
    },
    document: {
      createElement: element,
      getElementById(id: string) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      body: { scrollWidth: 100, scrollHeight: 100 },
    },
  });
  return {
    parent,
    elements,
    deliver(source: object, svg: string, playground_url?: string) {
      required(listener)({
        source,
        origin: "https://host.invalid",
        data: {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          params: { structuredContent: { svg, playground_url } },
        },
      });
    },
  };
}

it("ignores tool results from windows other than the parent", () => {
  const harness = viewerHarness();
  harness.deliver({}, '<svg onload="alert(1)"/>');
  const stage = required(harness.elements.get("stage"));
  expect(stage.innerHTML).toBe("");
  expect(stage.children).toHaveLength(0);
});

it("renders even parent-provided SVG only as a passive image", () => {
  const harness = viewerHarness();
  const source = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>';
  harness.deliver(harness.parent, source);
  const stage = required(harness.elements.get("stage"));
  expect(stage.innerHTML).toBe("");
  expect(stage.children).toHaveLength(1);
  expect(stage.children[0].src).toBe(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`,
  );
});

it.each([
  "javascript:alert(1)",
  "https://evil.invalid/",
  "https://playground.archlex.dev.evil.invalid/",
  "https://user@playground.archlex.dev/",
])("does not expose an untrusted playground link: %s", (url) => {
  const harness = viewerHarness();
  harness.deliver(harness.parent, "<svg/>", url);
  const link = required(harness.elements.get("open-playground"));
  expect(link.hidden).toBe(true);
  expect(link.attributes.has("href")).toBe(false);
});

it("preserves an approved playground destination", () => {
  const harness = viewerHarness();
  const url = "https://playground.archlex.dev/?code=ecs";
  harness.deliver(harness.parent, "<svg/>", url);
  const link = required(harness.elements.get("open-playground"));
  expect(link.hidden).toBe(false);
  expect(link.attributes.get("href")).toBe(url);
});
