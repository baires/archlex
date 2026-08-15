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
3. Use shorthand arrows like \`>\` or typed relationships like \`-[writes]->\`.
4. Return only the valid ArchLex DSL source code inside a code block, then call the \`render_diagram\` tool to preview the SVG.`,
        },
      },
    ],
  },
};
