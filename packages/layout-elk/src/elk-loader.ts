/**
 * Lazy loader for ELK layout library.
 * Enables code splitting and reduces initial bundle size.
 */

interface ELKLike {
  layout(graph: unknown): Promise<unknown>;
}

type ELKConstructor = new () => ELKLike;

let elkInstance: ELKLike | null = null;
let elkPromise: Promise<ELKLike> | null = null;

/**
 * Lazily loads and initializes the ELK layout engine.
 * Uses dynamic import for code splitting.
 */
export async function loadElk(): Promise<ELKLike> {
  // Return cached instance if available
  if (elkInstance) {
    return elkInstance;
  }

  // Return in-flight promise if already loading
  if (elkPromise) {
    return elkPromise;
  }

  // Start loading
  elkPromise = (async () => {
    try {
      if (typeof globalThis.Worker === "undefined") {
        class WorkerPolyfill {
          onmessage?: (event: { data: unknown }) => void;
          onerror?: (error: unknown) => void;
          postMessage() {}
          terminate() {}
          addEventListener() {}
          removeEventListener() {}
        }
        (globalThis as unknown as Record<string, unknown>).Worker =
          WorkerPolyfill;
      }

      // Dynamic import for code splitting
      const module = await import("elkjs/lib/elk.bundled.js");
      const ELK = (module.default || module) as unknown as new (
        options?: Record<string, unknown>,
      ) => ELKLike;
      elkInstance = new ELK({ workerUrl: undefined });
      return elkInstance;
    } catch (error) {
      elkPromise = null; // Reset promise on error to allow retry
      throw new Error(
        `Failed to load ELK layout engine: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  })();

  return elkPromise;
}

/**
 * Preloads ELK without blocking.
 * Call this to warm up the cache before layout is needed.
 */
export function preloadElk(): void {
  if (!elkInstance && !elkPromise) {
    void loadElk(); // Fire and forget
  }
}

/**
 * Clears the cached ELK instance.
 * Useful for testing or memory management.
 */
export function clearElkCache(): void {
  elkInstance = null;
  elkPromise = null;
}
