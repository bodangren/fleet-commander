/**
 * Builds a query string with an encoded project parameter
 * @param project - Project name to encode
 * @returns Query string (e.g., "?project=foo") or empty string if project is falsy
 */
export function joinQuery(project?: string | null): string {
  return project ? `?project=${encodeURIComponent(project)}` : ''
}
