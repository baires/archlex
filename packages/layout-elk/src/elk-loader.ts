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

function findFunction<T>(obj: unknown, preferredKey?: string, depth = 0): T {
  if (!obj || depth > 5) {
    throw new Error(
      `Could not resolve constructor for ${preferredKey || "default"}`,
    );
  }
  if (typeof obj === "function") {
    return obj as unknown as T;
  }
  if (typeof obj === "object" && obj !== null) {
    const record = obj as Record<string, unknown>;
    if (preferredKey && typeof record[preferredKey] === "function") {
      return record[preferredKey] as unknown as T;
    }
    if (typeof record.default === "function") {
      return record.default as unknown as T;
    }
    for (const key of Object.keys(record)) {
      try {
        return findFunction<T>(record[key], preferredKey, depth + 1);
      } catch {}
    }
  }
  throw new Error(
    `Could not resolve constructor for ${preferredKey || "default"}`,
  );
}

function getElkConstructor(
  mod: unknown,
): new (
  options: Record<string, unknown>,
) => ELKLike {
  return findFunction<new (options: Record<string, unknown>) => ELKLike>(mod);
}

function getWorkerConstructor(mod: unknown): new () => unknown {
  return findFunction<new () => unknown>(mod, "Worker");
}

/**
 * Runs a module loader with the global `self` shadowed.
 *
 * elkjs's worker module only assigns `module.exports` when `self` is
 * undefined (its Node.js branch). Runtimes like workerd define `self`,
 * which makes the module register itself as a Web Worker and export
 * nothing. Shadowing `self` during the import forces the export branch.
 * The loader callback must use a literal `import("...")` specifier so the
 * bundler can resolve it statically.
 */
async function withSelfShadowed<T>(load: () => Promise<T>): Promise<T> {
  const g = globalThis as { self?: unknown };
  const hadSelf = "self" in g;
  const previousSelf = g.self;
  g.self = undefined;
  try {
    return await load();
  } finally {
    if (hadSelf) {
      g.self = previousSelf;
    } else {
      // biome-ignore lint/performance/noDelete: assigning undefined would leave `self` observable
      delete g.self;
    }
  }
}

/**
 * Lazily loads and initializes the ELK layout engine.
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
      // Sequential: the self-shadowing wrapper is not reentrant.
      const apiModule = await withSelfShadowed(
        () => import("elkjs/lib/elk-api.js"),
      );
      const workerModule = await withSelfShadowed(
        () => import("elkjs/lib/elk-worker.js"),
      );

      const ELK = getElkConstructor(apiModule);
      const FakeWorker = getWorkerConstructor(workerModule);

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
