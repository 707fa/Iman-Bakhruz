import { Bot, ImagePlus, Loader2, Mic, Send, User, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
      return "AI service is temporarily unavailable. Please retry in 1-2 minutes.";
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const localStorageKey = useMemo(() => `iman-ai-chat-v2:${sessionUserId ?? "guest"}`, [sessionUserId]);
  const teacherQuickPrompts = useMemo(
    () => [
      "Create 5 speaking questions for Elementary on Daily routine.",
      "Check this homework like a teacher and give short feedback.",
      "Build a 15-minute lesson plan for Past Simple.",
      "Give 10 quick vocabulary exercises for Beginner.",
    ],
    [],
  );

  const resizeComposer = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, []);

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
    outputLang: "en-US",
    onExchange: voiceExchange,
    onError: (message) => showToast({ message, tone: "error" }),
  });

  useEffect(() => {
    // Always restore local chat first so refresh/close keeps conversation visible immediately.
    setMessages(
      readLocalMessages(localStorageKey).map((item) =>
        item.role === "assistant" ? { ...item, text: normalizeAssistantReply(item.text) } : item,
      ),
    );

    if (!canUseApi) {
      setLoading(false);
      return;
    }

    if (useGatewayMode) {
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
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, [canUseApi, token, useGatewayMode, localStorageKey, showToast]);

  useEffect(() => {
    writeLocalMessages(localStorageKey, messages);
  }, [localStorageKey, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, sending]);

  useEffect(() => {
    resizeComposer();
  }, [text, resizeComposer]);

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

  const canSend = useMemo(() => Boolean(text.trim() || imageFile), [text, imageFile]);

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
              className="scrollbar-thin h-[62vh] min-h-[360px] space-y-5 overflow-y-auto rounded-3xl border border-burgundy-100/70 bg-white/90 px-3 py-4 sm:px-5 dark:border-zinc-800 dark:bg-zinc-950/75"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-charcoal/65 dark:text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading chat...
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-burgundy-200 bg-burgundy-50 dark:border-burgundy-900/60 dark:bg-burgundy-950/30">
                    <Bot className="h-5 w-5 text-burgundy-700 dark:text-burgundy-200" />
                  </div>
                  <p className="text-base font-semibold text-charcoal dark:text-zinc-100">Start a new message</p>
                  <p className="mt-1 text-sm text-charcoal/65 dark:text-zinc-400">
                    {isTeacherMode
                      ? "Ask for lesson plans, speaking questions, or quick homework review."
                      : "Ask any English question or send homework photo for checking."}
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.role === "user";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[92%] rounded-3xl px-4 py-3 text-[15px] leading-6 sm:max-w-[86%]",
                          mine
                            ? "bg-burgundy-700 text-white shadow-soft"
                            : "border border-zinc-200 bg-zinc-50 text-charcoal dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100",
                        ].join(" ")}
                      >
                        <div className={`mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${mine ? "text-white/80" : "text-charcoal/55 dark:text-zinc-400"}`}>
                          {mine ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                          {mine ? "You" : "Iman AI"}
                        </div>
                        {message.text ? (
                          mine ? (
                            <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          ) : (
                            <p className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: toSafeRichHtml(message.text) }} />
                          )
                        ) : null}
                        {message.imageUrl ? (
                          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block">
                            <img src={message.imageUrl} alt="Homework" className="max-h-56 rounded-2xl border border-white/20 object-contain" />
                          </a>
                        ) : null}
                        <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/75" : "text-charcoal/50 dark:text-zinc-400"}`}>{toReadableTime(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {sending ? (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-charcoal dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
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
              <div className="flex items-start justify-between gap-3 rounded-2xl border border-burgundy-200/70 bg-burgundy-50/70 p-2.5 dark:border-burgundy-900/60 dark:bg-burgundy-950/25">
                <img src={imagePreview} alt="Selected homework" className="max-h-28 rounded-xl object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    setStatusHint(null);
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-burgundy-300 text-burgundy-700 transition hover:bg-burgundy-100 dark:border-burgundy-700 dark:text-burgundy-200 dark:hover:bg-burgundy-900/50"
                  aria-label="Remove selected image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <div className="sticky bottom-0 z-20 rounded-3xl border border-zinc-200 bg-white/96 p-2.5 shadow-soft backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/96">
              <div className="flex items-end gap-2 sm:gap-2.5">
                <label className="inline-flex shrink-0">
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
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-charcoal transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Attach photo"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                </label>

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={isTeacherMode ? "Write teacher request..." : "Message Iman Chat..."}
                  rows={1}
                  className="scrollbar-thin max-h-40 min-h-[40px] w-full resize-none bg-transparent px-2 py-2 text-[15px] text-charcoal outline-none placeholder:text-charcoal/45 dark:text-zinc-100 dark:placeholder:text-zinc-500"
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

                <button
                  type="button"
                  onClick={handleOpenVoice}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-charcoal transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Open voice"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canSend || sending}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-burgundy-700 text-white transition hover:bg-burgundy-600 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>
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
