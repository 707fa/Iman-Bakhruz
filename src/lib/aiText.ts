const WRAP_QUOTES: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["«", "»"],
];

function stripWrappingQuotes(value: string): string {
  let text = value.trim();
  for (const [left, right] of WRAP_QUOTES) {
    if (text.startsWith(left) && text.endsWith(right) && text.length > 1) {
      text = text.slice(left.length, text.length - right.length).trim();
    }
  }
  return text;
}

export function normalizeAssistantReply(raw: string): string {
  let text = String(raw || "")
    .replace(/\uFFFD/g, "")
    .replace(/\r/g, "")
    .replace(/\\"/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  text = stripWrappingQuotes(text);

  text = text
    .replace(/^IMAN AI:\s*/i, "")
    .replace(/^ASSISTANT:\s*/i, "")
    .replace(/^BOT:\s*/i, "")
    .replace(/```/g, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const duplicate = unique.some(
      (prev) => prev.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() === normalized,
    );
    if (!duplicate) unique.push(line);
  }

  return unique.join("\n").trim() || "I am here to help you with English. Please ask your question again.";
}

