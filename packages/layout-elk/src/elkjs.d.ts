// Type declarations for ELK worker builds
declare module "elkjs/lib/elk-worker.min.js" {
  interface ELKWorker {
    layout(graph: unknown): Promise<unknown>;
  }
  const ELK: new () => ELKWorker;
  export default ELK;
}

declare module "elkjs/lib/elk.bundled.js" {
  interface ELK {
    layout(graph: unknown): Promise<unknown>;
  }
  const ELKConstructor: new () => ELK;
  export default ELKConstructor;
}
