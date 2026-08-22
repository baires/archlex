import { JSONRPC_ERROR_CODES } from "./constants.js";
import { McpProtocolError } from "./errors.js";

interface CursorPayload {
  version: 1;
  offset: number;
  pageSize: number;
  fingerprint: string;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

function invalidCursor(): never {
  throw new McpProtocolError(
    JSONRPC_ERROR_CODES.INVALID_PARAMS,
    "Invalid pagination cursor",
    400,
  );
}

function fingerprint(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  return btoa(json)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeCursor(cursor: string): CursorPayload {
  if (!/^[A-Za-z0-9_-]+$/u.test(cursor)) invalidCursor();
  try {
    const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const value = JSON.parse(atob(`${base64}${padding}`)) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      invalidCursor();
    }
    const payload = value as Partial<CursorPayload>;
    if (
      payload.version !== 1 ||
      !Number.isSafeInteger(payload.offset) ||
      !Number.isSafeInteger(payload.pageSize) ||
      typeof payload.fingerprint !== "string"
    ) {
      invalidCursor();
    }
    return payload as CursorPayload;
  } catch (error: unknown) {
    if (error instanceof McpProtocolError) throw error;
    invalidCursor();
  }
}

export function paginate<T>(
  items: readonly T[],
  cursor: string | undefined,
  pageSize: number,
): Page<T> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("pageSize must be a positive safe integer");
  }

  const collectionFingerprint = fingerprint(items);
  let offset = 0;
  if (cursor !== undefined) {
    const payload = decodeCursor(cursor);
    if (
      payload.fingerprint !== collectionFingerprint ||
      payload.pageSize !== pageSize ||
      payload.offset <= 0 ||
      payload.offset >= items.length ||
      payload.offset % pageSize !== 0
    ) {
      invalidCursor();
    }
    offset = payload.offset;
  }

  const pageItems = items.slice(offset, offset + pageSize);
  const nextOffset = offset + pageItems.length;
  return {
    items: pageItems,
    ...(nextOffset < items.length
      ? {
          nextCursor: encodeCursor({
            version: 1,
            offset: nextOffset,
            pageSize,
            fingerprint: collectionFingerprint,
          }),
        }
      : {}),
  };
}
