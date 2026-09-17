/**
 * Turns an article title into a URL-safe slug: lowercase, diacritics
 * stripped, anything that isn't a letter/digit collapsed to a single
 * hyphen, leading/trailing hyphens trimmed. Afaan Oromo titles are plain
 * Latin-alphabet text (no non-Latin script to transliterate), so this
 * simple approach covers the module's actual content.
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 300);
}
