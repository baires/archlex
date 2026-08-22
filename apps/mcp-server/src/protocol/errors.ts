import type { RequestId } from "@modelcontextprotocol/server";

export class McpProtocolError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly httpStatus: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "McpProtocolError";
  }
}

export function protocolHttpStatus(code: number): number {
  if (code === -32601) return 404;
  if (code === -32603) return 500;
  return 400;
}

export function toHttpErrorResponse(
  error: McpProtocolError,
  id: RequestId | null,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: {
        code: error.code,
        message: error.message,
        ...(error.data === undefined ? {} : { data: error.data }),
      },
    }),
    {
      status: error.httpStatus,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function acceptedNotificationResponse(): Response {
  return new Response(null, { status: 202 });
}
