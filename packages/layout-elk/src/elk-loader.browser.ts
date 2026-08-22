/** Lazy browser loader for ELK using a real, minified web worker. */

import {
  createLazyElkLoader,
  getElkConstructor,
  getWorkerConstructor,
} from "./elk-loader.shared.js";

const loader = createLazyElkLoader(async () => {
  const [apiModule, workerModule] = await Promise.all([
    import("elkjs/lib/elk-api.js"),
    import("elkjs/lib/elk-worker.min.js?worker&inline"),
  ]);
  const ELK = getElkConstructor(apiModule);
  const ElkWorker = getWorkerConstructor(workerModule);
  return new ELK({ workerFactory: () => new ElkWorker() });
});

export const { clearElkCache, loadElk, preloadElk } = loader;
