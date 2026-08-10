import { afterEach, describe, expect, it } from "vitest";
import { clearElkCache, loadElk } from "./elk-loader.js";

const originalSelfDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "self",
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);
const originalWorkerDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "Worker",
);

afterEach(() => {
  clearElkCache();

  if (originalSelfDescriptor) {
    Object.defineProperty(globalThis, "self", originalSelfDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "self");
  }

  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }

  if (originalWorkerDescriptor) {
    Object.defineProperty(globalThis, "Worker", originalWorkerDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "Worker");
  }
});

describe("loadElk", () => {
  it("does not clear the browser self global while loading ELK", async () => {
    let selfWasCleared = false;
    let selfValue: unknown = globalThis;

    Object.defineProperty(globalThis, "self", {
      configurable: true,
      get: () => selfValue,
      set: (value: unknown) => {
        if (value === undefined) selfWasCleared = true;
        selfValue = value;
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: globalThis,
    });
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: class {
        onmessage: ((event: MessageEvent<unknown>) => void) | null = null;

        postMessage(): void {}
      },
    });

    await loadElk();

    expect(selfWasCleared).toBe(false);
  });
});
