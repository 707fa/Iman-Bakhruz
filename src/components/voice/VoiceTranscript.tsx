import type { VoiceTranscriptItem } from "../../types/voice";

interface VoiceTranscriptProps {
  items: VoiceTranscriptItem[];
}

export function VoiceTranscript({ items }: VoiceTranscriptProps) {
  const last = items.slice(-2);

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-black/28 px-3 py-2.5 backdrop-blur-xl">
      {last.length === 0 ? (
        <p className="text-center text-xs text-zinc-500">Speak to Iman...</p>
      ) : (
        <div className="space-y-1">
          {last.map((item) => (
            <p key={item.id} className={`truncate text-xs sm:text-sm ${item.role === "user" ? "text-burgundy-100" : "text-zinc-200"}`}>
              <span className="mr-1 text-zinc-500">{item.role === "user" ? "You:" : "Iman:"}</span>
              {item.text}
              {item.partial ? <span className="ml-1 animate-pulse text-zinc-400">...</span> : null}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
