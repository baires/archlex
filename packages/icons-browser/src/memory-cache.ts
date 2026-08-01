import type {
  IconCache,
  IconRequest,
  SanitizedIcon,
} from "@archlex/icons-core";

export class MemoryIconCache implements IconCache {
  private readonly icons = new Map<string, SanitizedIcon>();

  async get(request: IconRequest): Promise<SanitizedIcon | undefined> {
    return this.icons.get(requestId(request));
  }

  async set(
    request: IconRequest,
    icon: SanitizedIcon,
    _source: string,
  ): Promise<void> {
    this.icons.set(requestId(request), icon);
  }
}

function requestId(request: IconRequest): string {
  return `${request.provider}:${request.key}`;
}
