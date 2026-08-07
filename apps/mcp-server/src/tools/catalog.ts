import { awsProvider, createArchLex, gcpProvider } from "@archlex/core";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider()],
  defaultProvider: "aws",
});

export interface GetCatalogArgs {
  provider?: "aws" | "gcp" | "all";
}

export async function handleGetCatalog(args: GetCatalogArgs = {}) {
  const { provider = "all" } = args;

  const catalog = archlex.getCatalog(provider);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(catalog, null, 2),
      },
    ],
  };
}
