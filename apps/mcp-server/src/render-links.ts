export interface RenderLinkPayload {
  version: 1;
  source: string;
  theme?: "light" | "dark";
  direction?: "LR" | "RL" | "TB" | "BT";
  validation?: "strict" | "normal" | "off";
  expiresAt: number;
}

export interface RenderLinkConfig {
  secret: string;
  ttlSeconds: number;
  maxUrlLength: number;
  baseUrl: string;
}

export type RenderUrlResult =
  | { delivery: "url"; url: string; expiresAt: string }
  | {
      delivery: "embedded";
      reason: "render_url_unconfigured" | "source_too_large";
    };

export class InvalidRenderTokenError extends Error {
  constructor(message = "Invalid render token") {
    super(message);
    this.name = "InvalidRenderTokenError";
  }
}

const MAX_SOURCE_LENGTH = 100_000;
const THEMES = new Set(["light", "dark"]);
const DIRECTIONS = new Set(["LR", "RL", "TB", "BT"]);
const VALIDATIONS = new Set(["strict", "normal", "off"]);

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(secret),
  );
  return crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(encoded: string): Uint8Array {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const binary = atob(`${normalized}${"=".repeat(padLength)}`);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(new ArrayBuffer(totalLength));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(
      new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
      offset,
    );
    offset += chunk.length;
  }
  return result;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
  const decompressedStream = stream.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const chunks: Uint8Array[] = [];
  const reader = decompressedStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(new ArrayBuffer(totalLength));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(
      new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
      offset,
    );
    offset += chunk.length;
  }
  return result;
}

export async function createRenderToken(
  payload: RenderLinkPayload,
  secret: string,
): Promise<string> {
  if (payload.version !== 1) {
    throw new Error("Unsupported payload version");
  }

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));
  const compressed = await compress(plaintext);

  const key = await deriveKey(secret);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  // Use slice to get a new Uint8Array with proper ArrayBuffer typing
  const compressedBuffer = compressed.slice(0);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      compressedBuffer,
    ),
  );

  const versionByte = new Uint8Array([payload.version]);
  const result = new Uint8Array(1 + nonce.length + ciphertext.length);
  result.set(versionByte, 0);
  result.set(nonce, 1);
  result.set(ciphertext, 1 + nonce.length);

  return base64UrlEncode(result);
}

export async function readRenderToken(
  token: string,
  secret: string,
  now: number,
): Promise<RenderLinkPayload> {
  try {
    const bytes = base64UrlDecode(token);

    if (bytes.length < 1 + 12) {
      throw new InvalidRenderTokenError();
    }

    const version = bytes[0];
    if (version !== 1) {
      throw new InvalidRenderTokenError();
    }

    const nonce = bytes.slice(1, 13);
    const ciphertext = bytes.slice(13);

    const key = await deriveKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      key,
      ciphertext,
    );

    const decompressed = await decompress(new Uint8Array(decrypted));
    const decoder = new TextDecoder();
    const json = decoder.decode(decompressed);
    const payload = JSON.parse(json) as RenderLinkPayload;

    // Validate payload structure
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.version !== 1 ||
      typeof payload.source !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      throw new InvalidRenderTokenError();
    }

    if (payload.source.length > MAX_SOURCE_LENGTH) {
      throw new InvalidRenderTokenError();
    }

    if (
      (payload.theme !== undefined && !THEMES.has(payload.theme)) ||
      (payload.direction !== undefined && !DIRECTIONS.has(payload.direction)) ||
      (payload.validation !== undefined && !VALIDATIONS.has(payload.validation))
    ) {
      throw new InvalidRenderTokenError();
    }

    if (payload.expiresAt <= now) {
      throw new InvalidRenderTokenError();
    }

    return payload;
  } catch (error) {
    if (error instanceof InvalidRenderTokenError) {
      throw error;
    }
    throw new InvalidRenderTokenError();
  }
}

export async function createRenderUrl(
  payload: RenderLinkPayload,
  config: RenderLinkConfig,
): Promise<RenderUrlResult> {
  if (!config.secret) {
    return { delivery: "embedded", reason: "render_url_unconfigured" };
  }

  const token = await createRenderToken(payload, config.secret);
  const url = `${config.baseUrl}/renders/${token}.png`;

  if (url.length > config.maxUrlLength) {
    return { delivery: "embedded", reason: "source_too_large" };
  }

  return {
    delivery: "url",
    url,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}
