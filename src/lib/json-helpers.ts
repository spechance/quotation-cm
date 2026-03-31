// SQLite stores arrays as JSON strings. These helpers handle serialization.

export function toJsonString(arr: string[]): string {
  return JSON.stringify(arr);
}

export function fromJsonString(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
