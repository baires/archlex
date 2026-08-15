import {
  awsProvider,
  createArchLex,
  gcpProvider,
  k8sProvider,
} from "@archlex/core";

const archlex = createArchLex({
  providers: [awsProvider(), gcpProvider(), k8sProvider()],
  defaultProvider: "aws",
});

export interface GetCatalogArgs {
  provider?: "aws" | "gcp" | "k8s" | "all";
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
