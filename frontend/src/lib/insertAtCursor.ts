export function appendToText(current: string, addition: string): string {
  if (!current.trim()) return addition
  const separator = current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n'
  return current + separator + addition
}
