import { Bot, ImagePlus, Loader2, Mic, Send, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiChatMessage } from "../types";
import { AI_GATEWAY_URL, DATA_PROVIDER_MODE } from "../lib/env";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import { buildImanChatContextPrompt, normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import { normalizeAssistantReply } from "../lib/aiText";
import { ApiError } from "../services/api/http";
import { clearApiToken, getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
import { aiGatewayCheckHomework, mapAiGatewayErrorToMessage } from "../services/api/aiGatewayApi";
import { VoiceScreen } from "./voice/VoiceScreen";
import { ChatFormattedText } from "./ui/ChatFormattedText";
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

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image"));
    image.src = dataUrl;
  });
}

async function optimizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= 2_400_000) return file;

  try {
    const dataUrl = await fileToDataUrl(file);
    const image = await loadImageFromDataUrl(dataUrl);
    const maxSize = 1600;
    const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((nextBlob) => resolve(nextBlob), "image/jpeg", 0.86);
    });
    if (!blob) return file;

    const filename = file.name.replace(/\.[^.]+$/, "") || "homework";
    return new File([blob], `${filename}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
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

function buildInstantAssistantHint(level: ReturnType<typeof normalizeStudentLevelFromGroupTitle>, locale: "ru" | "uz" | "en"): string {
  if (level === "beginner" || level === "elementary") {
    if (locale === "uz") return "Bir soniya, javobni tez tayyorlayapman...";
    if (locale === "en") return "One second, preparing your answer...";
    return "Секунду, готовлю быстрый ответ...";
  }
  return "One second, preparing your answer...";
}

function buildVoiceMixRule(level: ReturnType<typeof normalizeStudentLevelFromGroupTitle>, locale: "ru" | "uz" | "en"): string {
  const support = locale === "en" ? "ru/uz" : locale;
  if (level === "beginner" || level === "elementary") {
    return [
      "Voice tutor rule:",
      "- Understand RU/UZ/EN speech.",
      "- Reply with about 70% simple English and about 30% support language.",
      `- Support language: ${support}.`,
      "- Keep tone warm and human-like.",
    ].join("\n");
  }

  return [
    "Voice tutor rule:",
    "- Understand RU/UZ/EN speech.",
    "- Reply with about 98% English.",
    "- Use support language only for very short clarification when needed.",
    "- Keep tone warm and human-like.",
  ].join("\n");
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
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimersRef = useRef<number[]>([]);
  const { showToast } = useToast();

  const sessionUserId = state.session?.userId;
  const currentGroup = currentStudent ? state.groups.find((item) => item.id === currentStudent.groupId) : null;
  const studentLevel = normalizeStudentLevelFromGroupTitle(currentGroup?.title);
  const aiLanguage = resolveAiFeedbackLanguage(studentLevel, locale);
  const systemContext = buildImanChatContextPrompt({
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
  const imageInputId = useMemo(() => `iman-ai-photo-input-${sessionUserId ?? "guest"}`, [sessionUserId]);

  const speechLang =
    studentLevel === "beginner" || studentLevel === "elementary"
      ? locale === "uz"
        ? "uz-UZ"
        : locale === "en"
          ? "en-US"
          : "ru-RU"
      : "en-US";

  const voice = useVoiceAssistant({
    lang: speechLang,
    onExchange: async (userText) => {
      const assistant = await handleSend(userText, true);
      return assistant || "Let's continue. I'm here to help.";
    },
    onError: (message) => {
      showToast({ message, tone: "error" });
    },
  });

  useEffect(() => {
    if (!canUseApi) return;

    setMessages(readLocalMessages(localStorageKey));

    if (useGatewayMode) {
      setLoading(false);
      return;
    }

    if (!token) return;

    let disposed = false;
    const load = async () => {
      setLoading(true);
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
    writeLocalMessages(localStorageKey, messages);
  }, [localStorageKey, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, sending, typingMessageId]);

  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((timerId) => window.clearInterval(timerId));
      typingTimersRef.current = [];
    };
  }, []);

  function updateMessageText(messageId: string, nextText: string) {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, text: nextText } : message)));
  }

  function typeAssistantReply(messageId: string, fullText: string): Promise<void> {
    const safeText = fullText.trim() || "I could not generate a reply. Please try again.";
    if (safeText.length > 260) {
      updateMessageText(messageId, safeText);
      setTypingMessageId((current) => (current === messageId ? null : current));
      return Promise.resolve();
    }

    const chunkSize = Math.max(5, Math.ceil(safeText.length / 36));
    updateMessageText(messageId, "");
    setTypingMessageId(messageId);

    return new Promise((resolve) => {
      let index = 0;
      const timerId = window.setInterval(() => {
        index = Math.min(safeText.length, index + chunkSize);
        updateMessageText(messageId, safeText.slice(0, index));
        if (index >= safeText.length) {
          window.clearInterval(timerId);
          typingTimersRef.current = typingTimersRef.current.filter((item) => item !== timerId);
          setTypingMessageId((current) => (current === messageId ? null : current));
          resolve();
        }
      }, 10);

      typingTimersRef.current.push(timerId);
    });
  }

function extractAssistantReply(messagesList: AiChatMessage[], fallback = ""): string {
  const latest = [...messagesList].reverse().find((message) => message.role === "assistant" && message.text.trim())?.text ?? fallback;
  return normalizeAssistantReply(latest);
}

  async function applySelectedImage(file: File) {
    try {
      const normalized = await optimizeImageForUpload(file);
      const dataUrl = await fileToDataUrl(normalized);
      setImageFile(normalized);
      setImagePreview(dataUrl);
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

  async function handleSend(voiceText?: string, silentVoiceMode = false): Promise<string | null> {
    const effectiveText = (voiceText ?? text).trim();
    const selectedFile = voiceText ? null : imageFile;
    const selectedPreview = voiceText ? null : imagePreview;
    const canSendNow = Boolean(effectiveText || selectedFile);
    const shouldWriteToChat = !silentVoiceMode;

    if (!canSendNow || sending) return null;
    if (!useGatewayMode && !token) return null;

    setSending(true);

    const responseRule = silentVoiceMode
      ? buildVoiceMixRule(studentLevel, aiLanguage)
      : "Answer fast in 2-5 short lines, simple and clear. If highlighting is needed, use natural text (no noisy symbols).";
    const textWithContext = effectiveText
      ? `[ctx] level=${studentLevel}; lang=${aiLanguage}; voice=${silentVoiceMode ? "1" : "0"} [/ctx]\n${responseRule}\n\n${effectiveText}`
      : "";

    const userMessage: AiChatMessage = {
      id: makeMessageId("u"),
      role: "user",
      text: effectiveText || "Homework photo",
      imageUrl: selectedPreview || undefined,
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: AiChatMessage = {
      id: makeMessageId("a"),
      role: "assistant",
      text: "",
      createdAt: new Date().toISOString(),
    };

    if (shouldWriteToChat) {
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setTypingMessageId(assistantMessage.id);
    }
    if (!voiceText) {
      setText("");
      setImageFile(null);
      setImagePreview(null);
    }

    const quickHint = buildInstantAssistantHint(studentLevel, aiLanguage);
    let quickHintTimer: number | null = null;
    if (shouldWriteToChat) {
      quickHintTimer = window.setTimeout(() => {
        updateMessageText(assistantMessage.id, quickHint);
      }, 140);
    }

    try {
      if (useGatewayMode) {
        try {
          const response = await aiGatewayCheckHomework({
            text: textWithContext || undefined,
            imageFile: selectedFile,
            userId: sessionUserId,
          });

          const finalReply = normalizeAssistantReply(response.result);
          if (shouldWriteToChat) {
            await typeAssistantReply(assistantMessage.id, finalReply);
          }
          return finalReply;
        } catch (gatewayError) {
          // Soft fallback: if gateway is unreachable, try existing backend AI route.
          if (isApiMode && token) {
            try {
              const imageBase64 = selectedFile ? await fileToDataUrl(selectedFile) : undefined;
              const updatedMessages = await platformApi.sendAiMessage(token, {
                text: effectiveText || undefined,
                imageBase64,
                level: studentLevel,
                language: aiLanguage,
                groupTitle: currentGroup?.title,
                groupTime: currentGroup?.time,
                systemContext,
              });
              const finalReply = normalizeAssistantReply(extractAssistantReply(updatedMessages));
              if (shouldWriteToChat) {
                await typeAssistantReply(assistantMessage.id, finalReply);
              }
              if (!silentVoiceMode) {
                showToast({ message: "Gateway unavailable. Backup AI mode enabled.", tone: "info" });
              }
              return finalReply;
            } catch (fallbackError) {
              if (isAuthError(fallbackError)) {
                clearApiToken();
                window.location.assign("/login");
                return null;
              }
              const message = mapBackendAiErrorToMessage(fallbackError);
              if (shouldWriteToChat) {
                updateMessageText(assistantMessage.id, message);
              }
              if (!silentVoiceMode) {
                showToast({ message, tone: "error" });
              }
              return message;
            }
          }

          if (isApiMode && !token) {
            const message = "Please log in again: backend token is required for AI.";
            if (shouldWriteToChat) {
              updateMessageText(assistantMessage.id, message);
            }
            if (!silentVoiceMode) {
              showToast({ message, tone: "error" });
            }
            return message;
          }

          const message = mapAiGatewayErrorToMessage(gatewayError);
          if (shouldWriteToChat) {
            updateMessageText(assistantMessage.id, message);
          }
          if (!silentVoiceMode) {
            showToast({ message, tone: "error" });
          }
          return message;
        }
      }

      const imageBase64 = selectedFile ? await fileToDataUrl(selectedFile) : undefined;
      const updatedMessages = await platformApi.sendAiMessage(token!, {
        text: effectiveText || undefined,
        imageBase64,
        level: studentLevel,
        language: aiLanguage,
        groupTitle: currentGroup?.title,
        groupTime: currentGroup?.time,
        systemContext,
      });
      const finalReply = normalizeAssistantReply(extractAssistantReply(updatedMessages));
      if (shouldWriteToChat) {
        await typeAssistantReply(assistantMessage.id, finalReply);
      }
      return finalReply;
    } catch (error) {
      if (isAuthError(error)) {
        clearApiToken();
        window.location.assign("/login");
        return null;
      }
      const message = useGatewayMode ? mapAiGatewayErrorToMessage(error) : mapBackendAiErrorToMessage(error);
      if (shouldWriteToChat) {
        updateMessageText(assistantMessage.id, message);
      }
      if (!silentVoiceMode) {
        showToast({ message, tone: "error" });
      }
      return message;
    } finally {
      if (quickHintTimer !== null) {
        window.clearTimeout(quickHintTimer);
      }
      setSending(false);
      if (shouldWriteToChat) {
        setTypingMessageId((current) => (current === assistantMessage.id ? null : current));
      }
    }

    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Bot className="h-5 w-5 text-burgundy-700 dark:text-white" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {!canUseApi ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            AI chat requires API login or configured gateway URL.
          </p>
        ) : (
          <>
            <div
              ref={listRef}
              className="h-[58dvh] min-h-[340px] space-y-2 overflow-y-auto rounded-[1.6rem] border border-zinc-800/90 bg-zinc-950/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:h-[62dvh]"
            >
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading chat...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Start chat. You can send a text question or homework photo.
                </p>
              ) : (
                messages.map((message) => {
                  const mine = message.role === "user";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[78%] rounded-2xl px-3 py-2.5 text-sm shadow-[0_16px_32px_-26px_rgba(0,0,0,0.6)]",
                          mine
                            ? "rounded-br-md bg-[#6F0000] text-white"
                            : "border border-zinc-800/95 bg-zinc-900/95 text-zinc-100",
                        ].join(" ")}
                      >
                        <div className={`mb-1 inline-flex items-center gap-1 text-[11px] ${mine ? "text-white/75" : "text-zinc-400"}`}>
                          {mine ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                          {mine ? "You" : "Iman AI"}
                        </div>
                        {message.text ? (
                          <ChatFormattedText
                            text={message.text}
                            className="whitespace-pre-wrap break-words"
                            showCursor={typingMessageId === message.id}
                          />
                        ) : message.role === "assistant" && typingMessageId === message.id ? (
                          <div className="inline-flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Думаю, сейчас отвечу...
                          </div>
                        ) : null}
                        {message.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setImageViewerUrl(message.imageUrl!)}
                            className="mt-2 block text-left"
                            aria-label="Open image preview"
                          >
                            <img src={message.imageUrl} alt="Homework" className="max-h-52 rounded-xl border border-white/20 object-contain transition hover:opacity-95" />
                          </button>
                        ) : null}
                        <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/75" : "text-zinc-500"}`}>
                          {toReadableTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              {sending && !typingMessageId && !voice.open ? (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                    <div className="mb-1 inline-flex items-center gap-1 text-xs text-zinc-400">
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
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2">
                <div className="relative inline-flex">
                  <img src={imagePreview} alt="Selected homework" className="max-h-48 rounded-xl object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/35 bg-black/65 text-white backdrop-blur transition hover:bg-black/80"
                    aria-label="Remove selected photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {imageFile?.name ?? "Pasted image"} {imageFile ? `(${Math.max(1, Math.round(imageFile.size / 1024))} KB)` : ""}
                </p>
              </div>
            ) : null}

            <div className="rounded-[1.65rem] border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-[0_18px_38px_-26px_rgba(0,0,0,0.75)] backdrop-blur">
              <div className="flex items-center gap-1.5">
                <input
                  id={imageInputId}
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    void applySelectedImage(file);
                  }}
                />
                <label
                  htmlFor={imageInputId}
                  className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 transition hover:scale-[1.02] hover:bg-zinc-800"
                  aria-label="Attach photo"
                  onClick={(event) => {
                    event.preventDefault();
                    imageInputRef.current?.click();
                  }}
                >
                  <ImagePlus className="h-5 w-5" />
                </label>

                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Write to Iman Chat..."
                  className="h-11 min-w-0 border-0 bg-transparent px-2.5 text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-0"
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
                  onClick={() => {
                    voice.setOpen(true);
                    if (voice.micMuted) {
                      voice.toggleMic();
                    }
                  }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 transition hover:scale-[1.02] hover:bg-zinc-800"
                  aria-label="Open voice mode"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canSend || sending}
                  className="h-11 w-11 shrink-0 rounded-full border-0 bg-[#6F0000] p-0 text-white hover:bg-[#820000]"
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            <VoiceScreen
              open={voice.open}
              state={voice.state}
              level={voice.visualLevel}
              transcript={voice.transcript}
              micMuted={voice.micMuted}
              audioMuted={voice.audioMuted}
              onToggleMic={voice.toggleMic}
              onToggleAudio={voice.toggleAudio}
              onClose={() => {
                const committed = voice.consumeSessionMessages();
                if (committed.length > 0) {
                  const normalized: AiChatMessage[] = committed
                    .filter((item) => item.text.trim())
                    .map((item) => ({
                      id: makeMessageId(item.role === "assistant" ? "a" : "u"),
                      role: item.role,
                      text: item.text,
                      createdAt: item.createdAt,
                    }));
                  if (normalized.length > 0) {
                    setMessages((prev) => [...prev, ...normalized].slice(-100));
                  }
                }
                void voice.close();
              }}
            />

            {imageViewerUrl ? (
              <div className="fixed inset-0 z-[170] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setImageViewerUrl(null)}>
                <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setImageViewerUrl(null)}
                    className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-black/70 text-white"
                    aria-label="Close image preview"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <img src={imageViewerUrl} alt="Homework preview" className="max-h-[92vh] rounded-2xl border border-white/20 object-contain" />
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
