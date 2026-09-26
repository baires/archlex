import { KNOWN_RELATIONSHIPS } from "@archlex/core";

export const SYSTEM_PROMPTS = {
  architect_cloud_infrastructure: {
    name: "architect_cloud_infrastructure",
    description:
      "Generate a well-architected cloud architecture diagram using ArchLex DSL.",
    arguments: [
      {
        name: "provider",
        description: "Cloud provider ('aws', 'gcp', or 'k8s')",
        required: true,
      },
      {
        name: "requirements",
        description: "Description of the system architecture",
        required: true,
      },
    ],
    generateMessages: (args: { provider: string; requirements: string }) => [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `You are an expert Cloud Architect. Generate an ArchLex architecture diagram for the following requirements using provider '${args.provider}':

Requirements: ${args.requirements}

Rules:
1. Always start with directives: \`direction LR\` and \`provider ${args.provider}\` (no colons in directives).
2. Group resources logically into provider-appropriate scopes such as \`vpc\`/\`subnet\` or \`cluster\`/\`namespace\`.
3. Use shorthand arrows like \`>\` or typed relationships like \`-[writes]->\`. A kind inside \`-[...]->\` is exactly one lowercase word from the known kinds list (${KNOWN_RELATIONSHIPS.join(", ")}). Put any free-form display text in pipes instead: \`api -[writes]->|PostgreSQL over TLS| database\`. Never put spaces or slashes inside \`-[...]\`.
4. Return only the valid ArchLex DSL source code inside a code block, then call the \`render_diagram\` tool to preview the SVG.

Workflow:
1. Use familiar catalog identifiers directly. Call \`get_cloud_catalog\` once with a focused query only when a resource identifier, scope, or relationship is unknown.
2. Draft the source and call \`render_diagram\` directly; it validates and returns diagnostics. Do not call \`validate_diagram\` first unless the user asks for validation-only. If rendering fails, repair from its diagnostics and retry once.
3. Display or embed the returned image inline, then include the exact source and \`playground_url\`. Check \`share_status\`: call it a short share link only when it is \`created\`; otherwise explain that it is a source-encoded fallback. Never include \`revoke_token\` in user-facing text.`,
        },
      },
    ],
  },
};
