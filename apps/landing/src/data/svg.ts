/** Keep inline theme/direction variants independent without changing semantic IDs. */
export function scopeSvg(
  svg: string,
  prefix: string,
  description: string,
): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  let scoped = svg;
  for (const id of ids) {
    scoped = scoped
      .replaceAll(` id="${id}"`, ` id="${prefix}${id}"`)
      .replaceAll(`href="#${id}"`, `href="#${prefix}${id}"`)
      .replaceAll(`url(#${id})`, `url(#${prefix}${id})`)
      .replaceAll(
        `aria-describedby="${id}"`,
        `aria-describedby="${prefix}${id}"`,
      );
  }
  const escaped = description
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return scoped
    .replaceAll(' tabindex="0"', "")
    .replace('role="graphics-document"', 'role="img"')
    .replace(
      'aria-label="ArchLex Architecture Diagram"',
      `aria-label="${escaped}"`,
    );
}
