import { Fragment, type ReactNode } from "react";

interface ChatFormattedTextProps {
  text: string;
  className?: string;
  showCursor?: boolean;
}

const INLINE_TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

function parseInline(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match = INLINE_TOKEN.exec(line);
  let key = 0;

  while (match) {
    const token = match[0];
    const index = match.index;

    if (index > lastIndex) {
      nodes.push(<Fragment key={`text-${key++}`}>{line.slice(lastIndex, index)}</Fragment>);
    }

    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      nodes.push(<strong key={`strong-${key++}`}>{token.slice(2, -2)}</strong>);
    } else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      nodes.push(<em key={`em-${key++}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`code-${key++}`} className="rounded bg-black/10 px-1 py-0.5 text-[0.9em] dark:bg-white/10">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<Fragment key={`fallback-${key++}`}>{token}</Fragment>);
    }

    lastIndex = index + token.length;
    match = INLINE_TOKEN.exec(line);
  }

  if (lastIndex < line.length) {
    nodes.push(<Fragment key={`text-${key++}`}>{line.slice(lastIndex)}</Fragment>);
  }

  INLINE_TOKEN.lastIndex = 0;
  return nodes;
}

export function ChatFormattedText({ text, className, showCursor = false }: ChatFormattedTextProps) {
  const lines = text.split("\n");
  return (
    <p className={className ?? "whitespace-pre-wrap break-words"}>
      {lines.map((line, lineIndex) => (
        <Fragment key={`line-${lineIndex}`}>
          {parseInline(line)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
      {showCursor ? <span className="ml-0.5 inline-block animate-pulse">|</span> : null}
    </p>
  );
}

