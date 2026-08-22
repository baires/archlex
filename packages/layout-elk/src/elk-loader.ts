/** Lazy Node/workerd loader for the ELK layout library. */

import {
  createLazyElkLoader,
  getElkConstructor,
  getWorkerConstructor,
} from "./elk-loader.shared.js";

async function withSelfShadowed<T>(load: () => Promise<T>): Promise<T> {
  const global = globalThis as { self?: unknown };
  const hadSelf = "self" in global;
  const previousSelf = global.self;
  global.self = undefined;
  try {
    return await load();
  } finally {
    if (hadSelf) {
      global.self = previousSelf;
    } else {
      // biome-ignore lint/performance/noDelete: assigning undefined leaves `self` observable
      delete global.self;
    }
  }
}

const loader = createLazyElkLoader(async () => {
  // Sequential: the self-shadowing wrapper is not reentrant.
  const apiModule = await withSelfShadowed(
    () => import("elkjs/lib/elk-api.js"),
  );
  const workerModule = await withSelfShadowed(
    () => import("elkjs/lib/elk-worker.js"),
  );

  const ELK = getElkConstructor(apiModule);
  const FakeWorker = getWorkerConstructor(workerModule);
  return new ELK({ workerFactory: () => new FakeWorker() });
});

export const { clearElkCache, loadElk, preloadElk } = loader;
