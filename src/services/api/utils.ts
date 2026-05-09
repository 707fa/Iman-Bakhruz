export function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  return parseJsonSafe(text);
}
