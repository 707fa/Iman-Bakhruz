import { Bot, ImagePlus, Loader2, Send, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiChatMessage } from "../types";
import { API_BASE_URL, DATA_PROVIDER_MODE } from "../lib/env";
import { ApiError } from "../services/api/http";
import { clearApiToken, getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ImanAiChatCardProps {
  title?: string;
}

function toReadableTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Failed to read image"));
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function ImanAiChatCard({ title = "Iman AI Chat" }: ImanAiChatCardProps) {
  const token = getApiToken();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const isApiMode = DATA_PROVIDER_MODE === "api";
  const canUseApi = isApiMode && Boolean(token);

  useEffect(() => {
    if (!canUseApi || !token) return;
    let disposed = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const history = await platformApi.getAiMessages(token);
        if (!disposed) setMessages(history);
      } catch (error) {
        if (!disposed) {
          if (isAuthError(error)) {
            clearApiToken();
            window.location.assign("/login");
            return;
          }
          setError(`AI chat unavailable. Check backend/API (${API_BASE_URL}).`);
          setMessages([]);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, [canUseApi, token]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, sending]);

  const canSend = useMemo(() => {
    return Boolean((text || "").trim() || imageBase64);
  }, [text, imageBase64]);

  async function handleSend() {
    if (!token || !canSend || sending) return;
    setSending(true);
    setError(null);
    try {
      const updatedMessages = await platformApi.sendAiMessage(token, {
        text: text.trim() || undefined,
        imageBase64: imageBase64 || undefined,
      });
      setMessages(updatedMessages);
      setText("");
      setImageBase64(null);
    } catch (error) {
      if (isAuthError(error)) {
        clearApiToken();
        window.location.assign("/login");
        return;
      }
      setError(`Failed to get AI reply. Check backend/API (${API_BASE_URL}).`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Bot className="h-5 w-5 text-burgundy-700 dark:text-white" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isApiMode ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            AI chat is available only in API mode.
          </p>
        ) : !token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Re-login in API mode to get a valid backend token. Backend should have `AI_PROVIDER=gemini` and `GEMINI_API_KEY`.
          </p>
        ) : (
          <>
            <div
              ref={listRef}
              className="h-80 space-y-2 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-charcoal/65 dark:text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading chat...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-charcoal/65 dark:text-zinc-400">
                  Start chat. You can send a text question or homework photo.
                </p>
              ) : (
                messages.map((message) => {
                  const mine = message.role === "user";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-burgundy-700 text-white"
                            : "border border-burgundy-100 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
                        ].join(" ")}
                      >
                        <div className={`mb-1 inline-flex items-center gap-1 text-xs ${mine ? "text-white/75" : "text-charcoal/55 dark:text-zinc-400"}`}>
                          {mine ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                          {mine ? "You" : "Iman AI"}
                        </div>
                        {message.text ? <p className="whitespace-pre-wrap break-words">{message.text}</p> : null}
                        {message.imageUrl ? (
                          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                            <img src={message.imageUrl} alt="Homework" className="max-h-52 rounded-xl border border-white/20 object-contain" />
                          </a>
                        ) : null}
                        <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/75" : "text-charcoal/50 dark:text-zinc-400"}`}>
                          {toReadableTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {error ? (
              <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-sm text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
                {error}
              </p>
            ) : null}

            {imageBase64 ? (
              <div className="rounded-2xl border border-burgundy-100 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
                <img src={imageBase64} alt="Selected homework" className="max-h-48 rounded-xl object-contain" />
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Write question or homework comment..."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />

              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void (async () => {
                      try {
                        const dataUrl = await fileToDataUrl(file);
                        setImageBase64(dataUrl);
                      } catch {
                        setError("Failed to read image.");
                      }
                    })();
                  }}
                />
                <Button asChild variant="secondary" type="button">
                  <span>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Photo
                  </span>
                </Button>
              </label>

              <Button onClick={() => void handleSend()} disabled={!canSend || sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


