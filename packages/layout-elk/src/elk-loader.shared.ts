export interface ELKLike {
  layout(graph: unknown): Promise<unknown>;
}

export function findFunction<T>(
  obj: unknown,
  preferredKey?: string,
  depth = 0,
): T {
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

export function getElkConstructor(
  mod: unknown,
): new (
  options: Record<string, unknown>,
) => ELKLike {
  return findFunction<new (options: Record<string, unknown>) => ELKLike>(mod);
}

export function getWorkerConstructor(mod: unknown): new () => unknown {
  return findFunction<new () => unknown>(mod, "Worker");
}

export function createLazyElkLoader(createElk: () => Promise<ELKLike>): {
  loadElk: () => Promise<ELKLike>;
  preloadElk: () => void;
  clearElkCache: () => void;
} {
  let elkInstance: ELKLike | null = null;
  let elkPromise: Promise<ELKLike> | null = null;

  const loadElk = async (): Promise<ELKLike> => {
    if (elkInstance) return elkInstance;
    if (elkPromise) return elkPromise;

    elkPromise = createElk()
      .then((instance) => {
        elkInstance = instance;
        return instance;
      })
      .catch((error: unknown) => {
        elkPromise = null;
        throw new Error(
          `Failed to load ELK layout engine: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    return elkPromise;
  };

  return {
    loadElk,
    preloadElk: () => {
      if (!elkInstance && !elkPromise) void loadElk();
    },
    clearElkCache: () => {
      elkInstance = null;
      elkPromise = null;
    },
  };
}
