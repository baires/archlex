import type { ResourceTemplateType } from "@modelcontextprotocol/server";

export const RESOURCE_TEMPLATES: readonly ResourceTemplateType[] = [
  {
    name: "ArchLex documentation",
    uriTemplate: "archlex://docs/{+path}",
    description: "Published ArchLex documentation by repository-relative path.",
    mimeType: "text/markdown",
  },
  {
    name: "ArchLex examples",
    uriTemplate: "archlex://examples/{name}",
    description: "Runnable ArchLex examples by name.",
    mimeType: "text/plain",
  },
];

export function listResourceTemplates(): ResourceTemplateType[] {
  return RESOURCE_TEMPLATES.map((template) => ({ ...template }));
}
