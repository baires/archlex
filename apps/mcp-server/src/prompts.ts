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
1. Call \`get_cloud_catalog\` for provider '${args.provider}' first to discover exact resource kind names before authoring.
2. Draft the source, then iterate with \`validate_diagram\` until it reports 0 errors.
3. Finally call \`render_diagram\` (it also returns diagnostics, so a single call confirms the result). Always display or embed the rendered diagram image inline in your response to the user, accompanied by the playground link.`,
        },
      },
    ],
  },
};
