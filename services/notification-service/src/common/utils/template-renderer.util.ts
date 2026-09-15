/**
 * Renders `{{placeholder}}` tokens in a template string against a flat
 * data object. Intentionally minimal (no loops/conditionals) — templates
 * are short transactional messages, not full documents.
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
