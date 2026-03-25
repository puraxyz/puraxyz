export interface Heading {
  id: string;
  label: string;
  level: 2 | 3;
}

/** Parse ## and ### headings from raw MDX/markdown source.
 *  IDs match what rehype-slug generates (lowercase, hyphens, no special chars). */
export function extractHeadings(source: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of source.split("\n")) {
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const raw = m[2].replace(/[`*_~\[\]()]/g, "").trim();
    const id = raw
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ id, label: raw, level });
  }
  return headings;
}
