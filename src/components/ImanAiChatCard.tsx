import { Bot, ImagePlus, Loader2, Mic, MicOff, Send, User, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiChatMessage } from "../types";
import { AI_GATEWAY_URL, DATA_PROVIDER_MODE } from "../lib/env";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { buildImanChatContextPrompt, normalizeStudentLevelFromGroupTitle, resolveAiFeedbackLanguage } from "../lib/studentLevel";
import { ApiError } from "../services/api/http";
import { clearApiToken, getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
import { aiGatewayCheckHomework, mapAiGatewayErrorToMessage } from "../services/api/aiGatewayApi";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface ImanAiChatCardProps {
  title?: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
    SpeechRecognition?: SpeechRecognitionConstructorLike;
  }
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
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimersRef = useRef<number[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldResumeListeningRef = useRef(false);
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

  const speechLang = locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU";

  function pickNaturalVoice(lang: string): SpeechSynthesisVoice | null {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    const langBase = lang.toLowerCase().slice(0, 2);
    const sameLanguage = voices.filter((voice) => voice.lang.toLowerCase().startsWith(langBase));
    const pool = sameLanguage.length > 0 ? sameLanguage : voices;

    const preferred = pool.find((voice) => /natural|neural|google|microsoft|siri|yandex/i.test(voice.name));
    return preferred ?? pool.find((voice) => voice.default) ?? pool[0] ?? null;
  }

  function speakAssistantText(textToSpeak: string) {
    if (!("speechSynthesis" in window)) return;
    const cleaned = textToSpeak.trim();
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = speechLang;
    utterance.rate = 0.97;
    utterance.pitch = 1;
    const voice = pickNaturalVoice(speechLang);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setVoiceSpeaking(true);
    utterance.onend = () => {
      setVoiceSpeaking(false);
      if (shouldResumeListeningRef.current && voiceOpen) {
        try {
          recognitionRef.current?.start();
          setVoiceListening(true);
        } catch {
          setVoiceListening(false);
        }
      }
    };
    utterance.onerror = () => {
      setVoiceSpeaking(false);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopVoiceListening() {
    shouldResumeListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // noop
    }
    setVoiceListening(false);
  }

  function startVoiceListening() {
    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setVoiceError("Voice input is not supported in this browser.");
      return;
    }

    setVoiceError(null);
    const recognition = new RecognitionCtor();
    recognition.lang = speechLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;
        if (result.isFinal) {
          finalText += `${finalText ? " " : ""}${transcript}`;
        } else {
          interim += `${interim ? " " : ""}${transcript}`;
        }
      }

      if (interim) {
        setVoiceTranscript(interim);
      }

      if (finalText) {
        setVoiceTranscript(finalText);
        shouldResumeListeningRef.current = true;
        try {
          recognition.stop();
        } catch {
          // noop
        }
        setVoiceListening(false);
        void handleSend(finalText);
      }
    };

    recognition.onerror = () => {
      setVoiceError("Could not recognize voice. Check microphone permission.");
      setVoiceListening(false);
    };

    recognition.onend = () => {
      if (!shouldResumeListeningRef.current) {
        setVoiceListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setVoiceListening(true);
      setVoiceTranscript("");
    } catch {
      setVoiceError("Could not start microphone.");
      setVoiceListening(false);
    }
  }

  useEffect(() => {
    if (!canUseApi) return;

    if (useGatewayMode) {
      setMessages(readLocalMessages(localStorageKey));
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
    if (!useGatewayMode) return;
    writeLocalMessages(localStorageKey, messages);
  }, [useGatewayMode, localStorageKey, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, sending, typingMessageId]);

  useEffect(() => {
    return () => {
      typingTimersRef.current.forEach((timerId) => window.clearInterval(timerId));
      typingTimersRef.current = [];
      stopVoiceListening();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function updateMessageText(messageId: string, nextText: string) {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, text: nextText } : message)));
  }

  function typeAssistantReply(messageId: string, fullText: string): Promise<void> {
    const safeText = fullText.trim() || "I could not generate a reply. Please try again.";
    const chunkSize = Math.max(2, Math.ceil(safeText.length / 100));
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
      }, 18);

      typingTimersRef.current.push(timerId);
    });
  }

  function extractAssistantReply(messagesList: AiChatMessage[], fallback = ""): string {
    return [...messagesList].reverse().find((message) => message.role === "assistant" && message.text.trim())?.text ?? fallback;
  }

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

  async function handleSend(voiceText?: string) {
    const effectiveText = (voiceText ?? text).trim();
    const selectedFile = voiceText ? null : imageFile;
    const selectedPreview = voiceText ? null : imagePreview;
    const canSendNow = Boolean(effectiveText || selectedFile);

    if (!canSendNow || sending) return;
    if (!useGatewayMode && !token) return;

    setSending(true);
    setStatusHint(null);

    const textWithContext = effectiveText
      ? `[CONTEXT]\nlevel=${studentLevel}\nlanguage=${aiLanguage}\ngroup=${currentGroup?.title ?? "-"}\ntime=${currentGroup?.time ?? "-"}\n[/CONTEXT]\n\n${effectiveText}`
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

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setTypingMessageId(assistantMessage.id);
    if (!voiceText) {
      setText("");
      setImageFile(null);
      setImagePreview(null);
    }

    try {
      if (useGatewayMode) {
        try {
          const response = await aiGatewayCheckHomework({
            text: textWithContext || undefined,
            imageFile: selectedFile,
            userId: sessionUserId,
          });

          const providerTail =
            response.provider && response.provider !== "cache"
              ? `\n\n[${response.provider}${response.cached ? " | cache" : ""}]`
              : response.cached
                ? "\n\n[cache]"
                : "";

          const finalReply = `${response.result}${providerTail}`;
          await typeAssistantReply(assistantMessage.id, finalReply);
          speakAssistantText(finalReply);
          setStatusHint(null);
          return;
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
              const finalReply = extractAssistantReply(updatedMessages);
              await typeAssistantReply(assistantMessage.id, finalReply);
              speakAssistantText(finalReply);
              setStatusHint("Gateway unavailable. Switched to backend AI.");
              showToast({ message: "Gateway unavailable. Backup AI mode enabled.", tone: "info" });
              return;
            } catch (fallbackError) {
              if (isAuthError(fallbackError)) {
                clearApiToken();
                window.location.assign("/login");
                return;
              }
              const message = mapBackendAiErrorToMessage(fallbackError);
              updateMessageText(assistantMessage.id, message);
              showToast({ message, tone: "error" });
              return;
            }
          }

          if (isApiMode && !token) {
            const message = "Please log in again: backend token is required for AI.";
            updateMessageText(assistantMessage.id, message);
            showToast({ message, tone: "error" });
            return;
          }

          const message = mapAiGatewayErrorToMessage(gatewayError);
          updateMessageText(assistantMessage.id, message);
          showToast({ message, tone: "error" });
          return;
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
      const finalReply = extractAssistantReply(updatedMessages);
      await typeAssistantReply(assistantMessage.id, finalReply);
      speakAssistantText(finalReply);
      setStatusHint(null);
    } catch (error) {
      if (isAuthError(error)) {
        clearApiToken();
        window.location.assign("/login");
        return;
      }
      const message = useGatewayMode ? mapAiGatewayErrorToMessage(error) : mapBackendAiErrorToMessage(error);
      updateMessageText(assistantMessage.id, message);
      showToast({ message, tone: "error" });
    } finally {
      setSending(false);
      setTypingMessageId((current) => (current === assistantMessage.id ? null : current));
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
      <CardContent className="relative space-y-3">
        {!canUseApi ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            AI chat requires API login or configured gateway URL.
          </p>
        ) : (
          <>
            {useGatewayMode ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                Gateway mode: queue + cache + fallback active
              </p>
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
                        {message.text ? (
                          <p className="whitespace-pre-wrap break-words">
                            {message.text}
                            {typingMessageId === message.id ? <span className="ml-0.5 inline-block animate-pulse">|</span> : null}
                          </p>
                        ) : message.role === "assistant" && typingMessageId === message.id ? (
                          <div className="inline-flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Думаю, сейчас отвечу...
                          </div>
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
              {sending && !typingMessageId ? (
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
                placeholder="Write question or homework comment..."
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

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (voiceOpen) {
                    setVoiceOpen(false);
                    stopVoiceListening();
                    return;
                  }
                  setVoiceOpen(true);
                  startVoiceListening();
                }}
              >
                {voiceListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                Voice
              </Button>
            </div>

            {voiceOpen ? (
              <div className="pointer-events-auto absolute bottom-24 right-4 z-20 flex items-center gap-3 rounded-2xl border border-burgundy-300/60 bg-white/95 px-3 py-2 shadow-lg dark:border-burgundy-800 dark:bg-zinc-900/95">
                <button
                  type="button"
                  onClick={() => {
                    if (voiceListening) {
                      stopVoiceListening();
                    } else {
                      startVoiceListening();
                    }
                  }}
                  className={`grid h-12 w-12 place-items-center rounded-full border transition ${
                    voiceListening
                      ? "border-burgundy-400 bg-burgundy-600 text-white animate-pulse"
                      : "border-burgundy-200 bg-burgundy-50 text-burgundy-700 dark:border-burgundy-700 dark:bg-burgundy-900/40 dark:text-burgundy-100"
                  }`}
                  aria-label={voiceListening ? "Stop voice input" : "Start voice input"}
                >
                  {voiceListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <div className="min-w-[11rem] max-w-[16rem]">
                  <p className="text-xs font-semibold text-charcoal dark:text-zinc-100">
                    {voiceSpeaking ? "Iman is speaking..." : voiceListening ? "Listening..." : "Voice paused"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-charcoal/70 dark:text-zinc-400">
                    {voiceTranscript || voiceError || "Say your question in microphone"}
                  </p>
                </div>
                <Volume2 className={`h-4 w-4 ${voiceSpeaking ? "text-burgundy-700" : "text-charcoal/40 dark:text-zinc-500"}`} />
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
