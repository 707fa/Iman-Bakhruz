const WRAP_QUOTES: Array<[string, string]> = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["«", "»"],
];

function stripWrappingQuotes(value: string): string {
  let text = value.trim();
  for (let index = 0; index < WRAP_QUOTES.length; index += 1) {
    const [left, right] = WRAP_QUOTES[index];
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
    .trim();

  // Keep content readable in chat/voice and remove noisy markdown wrappers.
  text = text
    .replace(/```/g, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .trim();

  return text || "I am here to help you with English. Please ask your question again.";
}
