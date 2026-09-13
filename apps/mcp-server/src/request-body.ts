export const MAX_REQUEST_BYTES = 512 * 1024;

export class PayloadTooLargeError extends Error {
  constructor() {
    super("Payload Too Large: Max size is 512 KB");
    this.name = "PayloadTooLargeError";
  }
}

/** Buffer only a bounded body, including requests without Content-Length. */
export async function boundedRequest(request: Request): Promise<Request> {
  if (!request.body) return request;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const cancel = (): void => {
    void reader.cancel().catch(() => {});
  };
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    request.signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      request.signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        cancel();
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    request.signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const headers = new Headers(request.headers);
  headers.set("Content-Length", String(size));
  return new Request(request, { headers, body: bytes });
}
