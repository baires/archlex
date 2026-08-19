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
3. Use named nodes such as \`app: ecs["Next.js"]\` and typed relationships such as \`cdn -[routes]-> app\`. Square brackets label nodes, not edges.
4. Call \`render_diagram\` directly; it already validates. Do not call \`validate_diagram\` first or \`generate_playground_url\` afterward.
5. Return the valid ArchLex DSL source code and display the rendered image inline.`,
        },
      },
    ],
  },
};
