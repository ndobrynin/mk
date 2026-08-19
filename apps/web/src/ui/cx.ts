export function cx(...parts: Array<string | undefined | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}
