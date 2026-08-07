export interface GeneratePlaygroundUrlArgs {
  source: string;
}

export async function handleGeneratePlaygroundUrl(
  args: GeneratePlaygroundUrlArgs,
) {
  const { source } = args;

  if (!source || typeof source !== "string") {
    throw new Error("Missing or invalid required parameter 'source'.");
  }

  const encodedSource = encodeURIComponent(source);
  const playgroundUrl = `https://playground.archlex.dev/?code=${encodedSource}`;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            url: playgroundUrl,
          },
          null,
          2,
        ),
      },
    ],
  };
}
