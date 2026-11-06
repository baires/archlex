import { awsProvider, createArchLex } from "@archlex/core";
import { reviewSources } from "./site";
import { scopeSvg } from "./svg";

const engine = createArchLex({ providers: [awsProvider()] });

interface ReviewState {
  state: "valid" | "warning";
  variants: { theme: "light" | "dark"; direction: "LR" | "TB"; svg: string }[];
  diagnostic:
    | ReturnType<typeof engine.prepare>["diagnostics"][number]
    | undefined;
}

export async function buildReview(): Promise<readonly ReviewState[]> {
  const states = await Promise.all(
    (["valid", "warning"] as const).map(async (state) => {
      const prepared = engine.prepare(reviewSources[state]);
      const warnings = prepared.diagnostics.filter(
        (item) => item.severity === "warning",
      );
      const errors = prepared.diagnostics.filter(
        (item) => item.severity === "error",
      );
      if (
        errors.length ||
        (state === "valid"
          ? warnings.length !== 0
          : warnings.length !== 1 ||
            warnings[0]?.code !== "AWS-RELATIONSHIP-INVALID-ENDPOINT-001")
      ) {
        throw new Error(
          "Landing review example no longer matches provider rules.",
        );
      }
      const variants = await Promise.all(
        (["light", "dark"] as const).flatMap((theme) =>
          (["LR", "TB"] as const).map(async (direction) => {
            const result = await engine.renderPrepared(prepared, {
              theme,
              direction,
            });
            const prefix = `${state}-${theme}-${direction}-`;
            const svg = scopeSvg(
              result.svg,
              prefix,
              "API Gateway invokes an order handler in Lambda, which writes to an Orders table in DynamoDB.",
            ).replace(
              "which writes to an Orders",
              state === "warning"
                ? "which has an unsupported invokes connection to an Orders"
                : "which writes to an Orders",
            );
            return { theme, direction, svg };
          }),
        ),
      );
      return { state, variants, diagnostic: warnings[0] };
    }),
  );
  return states;
}
