import { Bot, ImagePlus, Loader2, Mic, Send, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiChatMessage } from "../types";
import { AI_GATEWAY_URL, DATA_PROVIDER_MODE } from "../lib/env";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { buildImanChatContextPrompt, normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import { normalizeAssistantReply } from "../lib/aiText";
import { ApiError } from "../services/api/http";
import { clearApiToken, getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
import { aiGatewayCheckHomework, mapAiGatewayErrorToMessage } from "../services/api/aiGatewayApi";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { VoiceScreen } from "./voice/VoiceScreen";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ImanAiChatCardProps {
  title?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toSafeRichHtml(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
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

function fileFromClipboardItem(item: DataTransferItem): File | null {
  const blob = item.getAsFile();
  if (!blob) return null;
  const extension = blob.type.includes("png")
    ? "png"
    : blob.type.includes("webp")
      ? "webp"
      : blob.type.includes("jpeg") || blob.type.includes("jpg")
        ? "jpg"
        : "png";
  return new File([blob], `clipboard-${Date.now()}.${extension}`, { type: blob.type || "image/png" });
}

function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function mapBackendAiErrorToMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payload = error.payload as Record<string, unknown> | undefined;
    const code = typeof payload?.code === "string" ? payload.code : "";
    const message = typeof payload?.message === "string" ? payload.message : "";
    const raw = `${code} ${message}`.toUpperCase();

    if (error.status === 402 || raw.includes("PAYMENT_REQUIRED")) {
      return "AI access is paid for this account. Activate subscription or ask teacher to grant full access.";
    }

    if (error.status === 429) {
      return "Too many AI requests. Please wait 1-2 minutes and try again.";
    }

    if (error.status >= 500 || error.status === 408 || error.status === 0) {
      return `AI service is temporarily unavailable. Please retry in 1-2 minutes.`;
    }
  }

  return "Failed to get AI reply. Please retry.";
}

function makeMessageId(prefix: "u" | "a"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getLastAssistantText(messages: AiChatMessage[]): string {
  return (
    messages
      .slice()
      .reverse()
      .find((item) => item.role === "assistant" && item.text.trim().length > 0)?.text ??
    "I'm here. Let's keep practicing."
  );
}

function readLocalMessages(storageKey: string): AiChatMessage[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const normalized: AiChatMessage[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
      if (!role) continue;
      const createdAt = typeof rec.createdAt === "string" ? rec.createdAt : "";
      const text = typeof rec.text === "string" ? rec.text : "";
      const imageUrl = typeof rec.imageUrl === "string" ? rec.imageUrl : undefined;
      if (!text && !imageUrl) continue;

      const next: AiChatMessage = {
        id: typeof rec.id === "string" ? rec.id : makeMessageId(role === "assistant" ? "a" : "u"),
        role,
        text,
        createdAt: createdAt || new Date().toISOString(),
      };
      if (imageUrl) {
        next.imageUrl = imageUrl;
      }
      normalized.push(next);
    }

    return normalized.slice(-80);
  } catch {
    return [];
  }
}

function writeLocalMessages(storageKey: string, messages: AiChatMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-80)));
}

export function ImanAiChatCard({ title = "Iman AI Chat" }: ImanAiChatCardProps) {
  const { state, currentStudent } = useAppStore();
  const { locale } = useUi();
  const token = getApiToken();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { showToast } = useToast();

  const sessionUserId = state.session?.userId;
  const isTeacherMode = state.session?.role === "teacher";
  const currentGroup = currentStudent ? state.groups.find((item) => item.id === currentStudent.groupId) : null;
  const studentLevel = isTeacherMode ? "intermediate" : normalizeStudentLevelFromGroupTitle(currentGroup?.title);
  const aiLanguage = isTeacherMode ? (locale === "uz" ? "uz" : locale === "en" ? "en" : "ru") : resolveAiFeedbackLanguage(studentLevel, locale);
  const systemContext = isTeacherMode
    ? [
        "You are Iman Chat, a teacher assistant for English lessons.",
        "Target user is a teacher in an English center.",
        "Give practical and structured answers for class planning, homework checks, speaking tasks, and student feedback.",
        "Keep answers concise and classroom-ready.",
        "Use bullets and short sections when useful.",
        "Do not use markdown noise like **, __, ```.",
        "Do not duplicate one sentence in multiple languages.",
      ].join("\n")
    : buildImanChatContextPrompt({
        level: studentLevel,
        locale,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
      });
  const isApiMode = DATA_PROVIDER_MODE === "api";
  const useGatewayMode = Boolean(AI_GATEWAY_URL);
  const canUseApi = useGatewayMode || (isApiMode && Boolean(token));
  const localStorageKey = useMemo(
    () => `iman-ai-chat-v2:${sessionUserId ?? "guest"}`,
    [sessionUserId],
  );
  const teacherQuickPrompts = useMemo(
    () => [
      "Сделай 5 speaking вопросов для уровня Elementary на тему Daily routine.",
      "Проверь это домашнее задание как учитель и дай короткий feedback.",
      "Составь 15-минутный план урока для темы Past Simple.",
      "Дай 10 мини-упражнений на vocabulary для Beginner.",
    ],
    [],
  );

  const voiceExchange = useCallback(
    async (userText: string) => {
      const textWithContext = `[CONTEXT]\nlevel=${studentLevel}\nlanguage=${aiLanguage}\ngroup=${currentGroup?.title ?? "-"}\ntime=${currentGroup?.time ?? "-"}\n[/CONTEXT]\n\n${userText}`;

      if (useGatewayMode) {
        try {
          const response = await aiGatewayCheckHomework({
            text: textWithContext,
            userId: sessionUserId,
          });
          return normalizeAssistantReply(response.result);
        } catch {
          if (isApiMode && token) {
            const updatedMessages = await platformApi.sendAiMessage(token, {
              text: userText,
              level: studentLevel,
              language: aiLanguage,
              groupTitle: currentGroup?.title,
              groupTime: currentGroup?.time,
              systemContext,
            });
            return normalizeAssistantReply(getLastAssistantText(updatedMessages));
          }
          throw new Error("Voice gateway error");
        }
      }

      if (!token) {
        throw new Error("No API token");
      }

      const updatedMessages = await platformApi.sendAiMessage(token, {
        text: userText,
        level: studentLevel,
        language: aiLanguage,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
        systemContext,
      });
      return normalizeAssistantReply(getLastAssistantText(updatedMessages));
    },
    [aiLanguage, currentGroup?.time, currentGroup?.title, isApiMode, sessionUserId, studentLevel, systemContext, token, useGatewayMode],
  );

  const voice = useVoiceAssistant({
    lang: aiLanguage === "ru" ? "ru-RU" : aiLanguage === "uz" ? "uz-UZ" : "en-US",
    onExchange: voiceExchange,
    onError: (message) => showToast({ message, tone: "error" }),
  });

  useEffect(() => {
    if (!canUseApi) return;

    if (useGatewayMode) {
      setMessages(
        readLocalMessages(localStorageKey).map((item) =>
          item.role === "assistant" ? { ...item, text: normalizeAssistantReply(item.text) } : item,
        ),
      );
      setStatusHint(null);
      setLoading(false);
      return;
    }

    if (!token) return;

    let disposed = false;
    const load = async () => {
      setLoading(true);
      setStatusHint(null);
      try {
        const history = await platformApi.getAiMessages(token);
        if (!disposed) {
          setMessages(history.map((item) => (item.role === "assistant" ? { ...item, text: normalizeAssistantReply(item.text) } : item)));
        }
      } catch (error) {
        if (!disposed) {
          if (isAuthError(error)) {
            clearApiToken();
            window.location.assign("/login");
            return;
          }
          showToast({ message: mapBackendAiErrorToMessage(error), tone: "error" });
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
  }, [canUseApi, token, useGatewayMode, localStorageKey]);

  useEffect(() => {
    if (!useGatewayMode) return;
    writeLocalMessages(localStorageKey, messages);
  }, [useGatewayMode, localStorageKey, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, sending]);

  async function applySelectedImage(file: File) {
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageFile(file);
      setImagePreview(dataUrl);
      setStatusHint("Photo added. Click Send.");
      showToast({ message: "Photo added.", tone: "success", durationMs: 1800 });
    } catch {
      showToast({ message: "Failed to read the image.", tone: "error" });
    }
  }

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items || items.length === 0) return;
      const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
      if (!imageItem) return;

      const file = fileFromClipboardItem(imageItem);
      if (!file) return;

      event.preventDefault();
      void applySelectedImage(file);
    };

    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  const canSend = useMemo(() => {
    return Boolean((text || "").trim() || imageFile);
  }, [text, imageFile]);

  function handleOpenVoice() {
    voice.setOpen(true);
    window.setTimeout(() => {
      if (voice.micMuted) {
        voice.toggleMic();
      }
    }, 60);
  }

  async function handleCloseVoice() {
    const voiceMessages = voice.consumeSessionMessages();
    await voice.close();

    if (voiceMessages.length === 0) return;

    const syncedMessages: AiChatMessage[] = voiceMessages.map((item, index) => ({
      id: makeMessageId(item.role === "assistant" ? "a" : "u"),
      role: item.role,
      text: normalizeAssistantReply(item.text),
      createdAt: item.createdAt || new Date(Date.now() + index * 10).toISOString(),
    }));

    setMessages((prev) => [...prev, ...syncedMessages].slice(-120));
  }

  async function handleSend() {
    if (!canSend || sending) return;
    if (!useGatewayMode && !token) return;

    setSending(true);
    setStatusHint(null);

    const trimmedText = text.trim();
    const selectedFile = imageFile;
    const selectedPreview = imagePreview;
    const textWithContext = trimmedText
      ? `[CONTEXT]\nlevel=${studentLevel}\nlanguage=${aiLanguage}\ngroup=${currentGroup?.title ?? "-"}\ntime=${currentGroup?.time ?? "-"}\n[/CONTEXT]\n\n${trimmedText}`
      : "";

    try {
      if (useGatewayMode) {
        const userMessage: AiChatMessage = {
          id: makeMessageId("u"),
          role: "user",
          text: trimmedText || "Homework photo",
          imageUrl: selectedPreview || undefined,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setText("");
        setImageFile(null);
        setImagePreview(null);

        try {
          const response = await aiGatewayCheckHomework({
            text: textWithContext || undefined,
            imageFile: selectedFile,
            userId: sessionUserId,
          });

          const assistantMessage: AiChatMessage = {
            id: makeMessageId("a"),
            role: "assistant",
            text: normalizeAssistantReply(response.result),
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStatusHint(null);
          return;
        } catch (gatewayError) {
          // Soft fallback: if gateway is unreachable, try existing backend AI route.
          if (isApiMode && token) {
            try {
              const imageBase64 = selectedFile ? await fileToDataUrl(selectedFile) : undefined;
              const updatedMessages = await platformApi.sendAiMessage(token, {
                text: trimmedText || undefined,
                imageBase64,
                level: studentLevel,
                language: aiLanguage,
                groupTitle: currentGroup?.title,
                groupTime: currentGroup?.time,
                systemContext,
              });
              setMessages(updatedMessages.map((item) => (item.role === "assistant" ? { ...item, text: normalizeAssistantReply(item.text) } : item)));
              setStatusHint("Gateway unavailable. Switched to backend AI.");
              showToast({ message: "Gateway unavailable. Backup AI mode enabled.", tone: "info" });
              return;
            } catch (fallbackError) {
              if (isAuthError(fallbackError)) {
                clearApiToken();
                window.location.assign("/login");
                return;
              }
              showToast({ message: mapBackendAiErrorToMessage(fallbackError), tone: "error" });
              return;
            }
          }

          if (isApiMode && !token) {
            showToast({ message: "Please log in again: backend token is required for AI.", tone: "error" });
            return;
          }

          showToast({ message: mapAiGatewayErrorToMessage(gatewayError), tone: "error" });
          return;
        }
      }

      const imageBase64 = selectedFile ? await fileToDataUrl(selectedFile) : undefined;
      const updatedMessages = await platformApi.sendAiMessage(token!, {
        text: trimmedText || undefined,
        imageBase64,
        level: studentLevel,
        language: aiLanguage,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
        systemContext,
      });
      setMessages(updatedMessages.map((item) => (item.role === "assistant" ? { ...item, text: normalizeAssistantReply(item.text) } : item)));
      setText("");
      setImageFile(null);
      setImagePreview(null);
      setStatusHint(null);
    } catch (error) {
      if (isAuthError(error)) {
        clearApiToken();
        window.location.assign("/login");
        return;
      }
      showToast({
        message: useGatewayMode ? mapAiGatewayErrorToMessage(error) : mapBackendAiErrorToMessage(error),
        tone: "error",
      });
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
        {!canUseApi ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            AI chat requires API login or configured gateway URL.
          </p>
        ) : (
          <>
            {isTeacherMode ? (
              <div className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-charcoal/60 dark:text-zinc-400">Teacher quick prompts</p>
                <div className="flex flex-wrap gap-2">
                  {teacherQuickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setText(prompt)}
                      className="rounded-full border border-burgundy-100 bg-burgundy-50 px-3 py-1 text-xs font-semibold text-burgundy-700 transition hover:border-burgundy-300 dark:border-burgundy-900/70 dark:bg-burgundy-950/35 dark:text-burgundy-100 dark:hover:border-burgundy-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {statusHint ? (
              <p className="rounded-xl border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-xs font-semibold text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-burgundy-100">
                {statusHint}
              </p>
            ) : null}

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
                  {isTeacherMode
                    ? "Начните teacher chat: спросите план урока, проверку задания или speaking-вопросы."
                    : "Start chat. You can send a text question or homework photo."}
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
                        {message.text ? (
                          mine ? (
                            <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          ) : (
                            <p
                              className="whitespace-pre-wrap break-words"
                              dangerouslySetInnerHTML={{ __html: toSafeRichHtml(message.text) }}
                            />
                          )
                        ) : null}
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
              {sending ? (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
                    <div className="mb-1 inline-flex items-center gap-1 text-xs text-charcoal/55 dark:text-zinc-400">
                      <Bot className="h-3.5 w-3.5" />
                      Iman AI
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI is typing...
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {imagePreview ? (
              <div className="rounded-2xl border border-burgundy-100 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950">
                <img src={imagePreview} alt="Selected homework" className="max-h-48 rounded-xl object-contain" />
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={isTeacherMode ? "Напишите запрос как преподаватель..." : "Write question or homework comment..."}
                onPaste={(event) => {
                  const items = event.clipboardData?.items;
                  if (!items || items.length === 0) return;
                  const imageItem = Array.from(items).find((item) => item.type.startsWith("image/"));
                  if (!imageItem) return;
                  const file = fileFromClipboardItem(imageItem);
                  if (!file) return;
                  event.preventDefault();
                  void applySelectedImage(file);
                }}
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
                    void applySelectedImage(file);
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

              <Button variant="secondary" type="button" onClick={handleOpenVoice}>
                <Mic className="mr-2 h-4 w-4" />
                Voice
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <VoiceScreen
        open={voice.open}
        state={voice.state}
        level={voice.visualLevel}
        transcript={voice.transcript}
        micMuted={voice.micMuted}
        audioMuted={voice.audioMuted}
        onToggleMic={voice.toggleMic}
        onToggleAudio={voice.toggleAudio}
        onClose={() => void handleCloseVoice()}
      />
    </Card>
  );
}
