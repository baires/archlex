import type { CloudGraph, Diagnostic } from "@cloudmer/model";

export interface ServiceDefinitionInput {
  id: string;
  displayName: string;
  category: string;
  aliases?: string[];
  iconKey?: string;
  iconSvg?: string;
}

export interface ServiceDefinition extends ServiceDefinitionInput {
  aliases: string[];
}

export function defineService(
  input: ServiceDefinitionInput,
): ServiceDefinition {
  return {
    ...input,
    aliases: input.aliases ?? [],
  };
}

export interface SemanticRuleInput {
  code: string;
  severity: "error" | "warning" | "info";
  summary: string;
  validate(graph: CloudGraph): readonly Diagnostic[];
}

export function defineRule(input: SemanticRuleInput): SemanticRuleInput {
  return input;
}
