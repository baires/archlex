---
"@archlex/model": minor
"@archlex/parser": minor
"@archlex/core": minor
"@archlex/cli": minor
---

Add `theme` DSL directive for light/dark rendering

The `theme` directive allows specifying `light` or `dark` theme directly in ArchLex source:

```archlex
provider aws
theme light
rds > ecs
```

- Parser now recognizes `theme` as a reserved word and accepts both `theme dark` and `theme: dark` syntax (optional colon, consistent with other directives)
- Core extracts the theme directive and passes it through the render pipeline with precedence: explicit API/CLI option > source directive > renderer default (`dark`)
- CLI `--theme` flag no longer defaults to `dark`, allowing source directives to take effect
- Playground syncs the theme toggle to reflect valid source directives
- `ThemeName` type exported from `@archlex/model` for type safety
