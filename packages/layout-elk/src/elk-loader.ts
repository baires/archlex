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
      const [apiModule, workerModule] = await Promise.all([
        import("elkjs/lib/elk-api.js"),
        import("elkjs/lib/elk-worker.js"),
      ]);

      const api = apiModule as unknown as {
        default?: (new (
          options: Record<string, unknown>,
        ) => ELKLike) & {
          default?: new (options: Record<string, unknown>) => ELKLike;
        };
      };
      const worker = workerModule as unknown as {
        Worker?: new () => unknown;
        default?: { Worker?: new () => unknown };
      };

      const ELK =
        api.default?.default ||
        api.default ||
        (api as unknown as new (
          options: Record<string, unknown>,
        ) => ELKLike);
      const FakeWorker =
        worker.Worker ||
        worker.default?.Worker ||
        (worker as unknown as new () => unknown);

      elkInstance = new ELK({
        workerFactory: () => new FakeWorker(),
      });
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
