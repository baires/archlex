import type { Diagnostic } from "@cloudmer/model";
import type * as Monaco from "monaco-editor";

export interface CodeAction {
  title: string;
  edit: {
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    text: string;
  };
  kind: string;
  isPreferred?: boolean;
}

const COMMON_SERVICES = ["lambda", "rds", "s3", "ec2", "vpc", "dynamodb"];

export function getCodeActionsForDiagnostic(
  diagnostic: Diagnostic,
  sourceText: string,
): CodeAction[] {
  switch (diagnostic.code) {
    case "CM-PARSE-MISSING-ENDPOINT":
      return COMMON_SERVICES.map((service, index) => ({
        title: `Add '${service}'`,
        edit: {
          range: {
            startLineNumber: diagnostic.span.end.line,
            startColumn: diagnostic.span.end.column,
            endLineNumber: diagnostic.span.end.line,
            endColumn: diagnostic.span.end.column,
          },
          text: ` ${service}`,
        },
        kind: "quickfix",
        isPreferred: index === 0,
      }));

    case "CM-STRUCT-INVALID-DIRECTIVE": {
      const match = diagnostic.remediation?.match(/Use one of: (.+)/);
      if (!match) return [];

      const validValues = match[1].split(", ");
      return validValues.map((value, index) => ({
        title: `Change to '${value}'`,
        edit: {
          range: {
            startLineNumber: diagnostic.span.start.line,
            startColumn: diagnostic.span.start.column,
            endLineNumber: diagnostic.span.end.line,
            endColumn: diagnostic.span.end.column,
          },
          text: value,
        },
        kind: "quickfix",
        isPreferred: index === 0,
      }));
    }

    case "CM-STRUCT-DUPLICATE-DIRECTIVE":
    case "CM-STRUCT-LATE-DIRECTIVE": {
      return [
        {
          title: "Remove this directive",
          edit: {
            range: {
              startLineNumber: diagnostic.span.start.line,
              startColumn: 1,
              endLineNumber: diagnostic.span.end.line + 1,
              endColumn: 1,
            },
            text: "",
          },
          kind: "quickfix",
          isPreferred: true,
        },
      ];
    }

    default:
      return [];
  }
}

export function registerCodeActionsProvider(
  monaco: typeof Monaco,
  diagnostics: readonly Diagnostic[],
): Monaco.IDisposable {
  return monaco.languages.registerCodeActionProvider("cloudmer", {
    provideCodeActions(model, range, context) {
      const actions: Monaco.languages.CodeAction[] = [];

      for (const marker of context.markers) {
        const diagnostic = diagnostics.find(
          (d) =>
            d.span.start.line === marker.startLineNumber &&
            d.span.start.column === marker.startColumn,
        );

        if (!diagnostic) continue;

        const lineText = model.getLineContent(marker.startLineNumber);
        const codeActions = getCodeActionsForDiagnostic(diagnostic, lineText);

        for (const action of codeActions) {
          actions.push({
            title: action.title,
            diagnostics: [marker],
            kind: action.kind,
            isPreferred: action.isPreferred,
            edit: {
              edits: [
                {
                  resource: model.uri,
                  versionId: model.getVersionId(),
                  textEdit: {
                    range: new monaco.Range(
                      action.edit.range.startLineNumber,
                      action.edit.range.startColumn,
                      action.edit.range.endLineNumber,
                      action.edit.range.endColumn,
                    ),
                    text: action.edit.text,
                  },
                },
              ],
            },
          });
        }
      }

      return {
        actions,
        dispose: () => {},
      };
    },
  });
}
