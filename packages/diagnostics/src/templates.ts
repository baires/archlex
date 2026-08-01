export function interpolate(
  template: string,
  context: Record<string, unknown>,
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : match;
  });
}
