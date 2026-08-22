import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  inputRequired,
} from "@modelcontextprotocol/server";
import type { ModernRequestMeta } from "../../src/protocol/types.js";

export const VALID_MODERN_META_FULL = {
  [PROTOCOL_VERSION_META_KEY]: "2026-07-28",
  [CLIENT_CAPABILITIES_META_KEY]: {},
  [CLIENT_INFO_META_KEY]: {
    name: "archlex-test",
    version: "1.0.0",
  },
  progressToken: "progress-1",
} satisfies ModernRequestMeta;

export const VALID_INPUT_REQUIRED_RESULT = inputRequired({
  inputRequests: {
    confirm: inputRequired.elicit({
      message: "Confirm diagram rendering",
      requestedSchema: {
        type: "object",
        properties: { confirmed: { type: "boolean" } },
        required: ["confirmed"],
      },
    }),
  },
  requestState: "opaque-signed-state",
});

export const VALID_DISCOVER_RESULT = {
  supportedVersions: ["2026-07-28"],
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
  },
  instructions: "Use render_diagram for ArchLex diagrams.",
};

export const VALID_SUBSCRIPTION_FILTER = {
  toolsListChanged: true,
  promptsListChanged: true,
  resourcesListChanged: true,
  resourceSubscriptions: ["archlex://docs/dsl-syntax"],
};

export const INVALID_NULL_REQUEST_ID = {
  jsonrpc: "2.0",
  id: null,
  method: "server/discover",
};

export const INVALID_OBJECT_RESOURCE_SUBSCRIPTION = {
  resourceSubscriptions: [{ uri: "archlex://docs/dsl-syntax" }],
};
