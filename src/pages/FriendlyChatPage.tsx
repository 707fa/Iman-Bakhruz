import { Loader2, MessageCircle, Send, Users2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { UserAvatar } from "../components/UserAvatar";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAppStore } from "../hooks/useAppStore";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { ApiError } from "../services/api/http";
import { platformApi } from "../services/api/platformApi";
import { clearApiToken, getApiToken } from "../services/tokenStorage";
import type { FriendlyChatMessage, FriendlyConversation, UserRole } from "../types";

const FRIENDLY_CHAT_STORAGE_KEY = "result-friendly-chat-v1";

interface LocalConversationEntry {
  id: string;
  userA: string;
  userB: string;
  updatedAt: string;
}

interface LocalFriendlyState {
  conversations: LocalConversationEntry[];
  messages: Record<string, FriendlyChatMessage[]>;
}

interface ChatPeer {
  id: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

function isConversation(item: FriendlyConversation | null): item is FriendlyConversation {
  return item !== null;
}

function toReadableTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function readLocalFriendlyState(): LocalFriendlyState {
  if (typeof window === "undefined") {
    return { conversations: [], messages: {} };
  }

  const raw = window.localStorage.getItem(FRIENDLY_CHAT_STORAGE_KEY);
  if (!raw) return { conversations: [], messages: {} };

  try {
    const parsed = JSON.parse(raw) as Partial<LocalFriendlyState>;
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: parsed.messages && typeof parsed.messages === "object" ? (parsed.messages as Record<string, FriendlyChatMessage[]>) : {},
    };
  } catch {
    return { conversations: [], messages: {} };
  }
}

function writeLocalFriendlyState(state: LocalFriendlyState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FRIENDLY_CHAT_STORAGE_KEY, JSON.stringify(state));
}

function buildLocalConversationId(user1: string, user2: string): string {
  const sorted = [String(user1), String(user2)].sort((a, b) => a.localeCompare(b));
  return `local_${sorted[0]}_${sorted[1]}`;
}

function createMessageId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function isAuthError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function FriendlyChatPage() {
  const { state, currentStudent, currentTeacher } = useAppStore();
  const { t } = useUi();
  const [searchParams, setSearchParams] = useSearchParams();

  const token = getApiToken();
  const session = state.session;
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [useLocalMode, setUseLocalMode] = useState(!canUseApi);
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const [conversations, setConversations] = useState<FriendlyConversation[]>([]);
  const [messages, setMessages] = useState<FriendlyChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);

  function forceRelogin() {
    clearApiToken();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("result-dashboard-v6");
      window.location.assign("/login");
    }
  }

  useEffect(() => {
    setUseLocalMode(!canUseApi);
    if (!canUseApi) {
      setModeNotice(null);
    }
  }, [canUseApi]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const role = session?.role;
  const subtitle = role === "teacher" ? t("chat.subtitleTeacher") : t("chat.subtitleStudent");

  const currentTeacherId = useMemo(() => {
    if (!currentStudent) return null;
    const group = state.groups.find((item) => item.id === currentStudent.groupId);
    return group?.teacherId ?? null;
  }, [currentStudent, state.groups]);

  const availablePeers = useMemo<ChatPeer[]>(() => {
    if (!session) return [];

    if (session.role === "teacher") {
      const teacher = currentTeacher;
      if (!teacher) return [];
      const groupIds = new Set(teacher.groupIds);
      return state.students
        .filter((student) => groupIds.has(student.groupId))
        .map((student) => ({
          id: student.id,
          fullName: student.fullName,
          role: "student" as const,
          avatarUrl: student.avatarUrl,
        }));
    }

    const studentPeers = state.students
      .filter((student) => student.id !== session.userId)
      .map((student) => ({
        id: student.id,
        fullName: student.fullName,
        role: "student" as const,
        avatarUrl: student.avatarUrl,
      }));

    const teacherId = currentTeacherId;
    const teacher = teacherId ? state.teachers.find((item) => item.id === teacherId) : null;
    if (!teacher) return studentPeers;

    return [
      {
        id: teacher.id,
        fullName: teacher.fullName,
        role: "teacher" as const,
        avatarUrl: teacher.avatarUrl,
      },
      ...studentPeers,
    ];
  }, [session, currentTeacher, currentTeacherId, state.students, state.teachers]);

  function normalizeLocalConversations(list: LocalConversationEntry[], map: Record<string, FriendlyChatMessage[]>): FriendlyConversation[] {
    if (!session) return [];
    const peerMap = new Map(availablePeers.map((peer) => [peer.id, peer]));

    const converted = list
      .filter((entry) => entry.userA === session.userId || entry.userB === session.userId)
      .map((entry) => {
        const peerId = entry.userA === session.userId ? entry.userB : entry.userA;
        const peer = peerMap.get(peerId);
        if (!peer) return null;

        const conversationMessages = map[entry.id] ?? [];
        const lastMessage = conversationMessages.length > 0 ? conversationMessages[conversationMessages.length - 1] : undefined;

        const conversation: FriendlyConversation = {
          id: entry.id,
          updatedAt: entry.updatedAt,
          peer: {
            id: peer.id,
            fullName: peer.fullName,
            role: peer.role,
            avatarUrl: peer.avatarUrl,
          },
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                text: lastMessage.text,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : undefined,
        };

        return conversation;
      })
      .filter(isConversation)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return converted;
  }

  function loadLocalConversations() {
    const local = readLocalFriendlyState();
    const normalized = normalizeLocalConversations(local.conversations, local.messages);
    setConversations(normalized);

    if (!activeConversationId || !normalized.some((item) => item.id === activeConversationId)) {
      setActiveConversationId(normalized[0]?.id ?? null);
    }
  }

  function loadLocalMessages(conversationId: string) {
    const local = readLocalFriendlyState();
    setMessages(local.messages[conversationId] ?? []);
  }

  function ensureLocalConversation(targetUserId: string): string | null {
    if (!session) return null;
    if (!availablePeers.some((peer) => peer.id === targetUserId)) return null;

    const local = readLocalFriendlyState();
    const id = buildLocalConversationId(session.userId, targetUserId);
    const exists = local.conversations.some((entry) => entry.id === id);

    if (!exists) {
      local.conversations.push({
        id,
        userA: session.userId,
        userB: targetUserId,
        updatedAt: new Date().toISOString(),
      });
      local.messages[id] = local.messages[id] ?? [];
      writeLocalFriendlyState(local);
    }

    return id;
  }

  async function startConversationWithTarget(targetId: string) {
    if (!targetId) return;

    if (useLocalMode) {
      const localId = ensureLocalConversation(targetId);
      if (!localId) return;
      loadLocalConversations();
      setActiveConversationId(localId);
      return;
    }

    if (!token) {
      setUseLocalMode(true);
      setModeNotice(t("chat.localMode"));
      const localId = ensureLocalConversation(targetId);
      if (localId) {
        loadLocalConversations();
        setActiveConversationId(localId);
      }
      return;
    }

    try {
      const readyConversation = await platformApi.startFriendlyConversation(token, targetId);
      setConversations((prev) => {
        const exists = prev.some((item) => item.id === readyConversation.id);
        return exists ? prev : [readyConversation, ...prev];
      });
      setActiveConversationId(readyConversation.id);
      setModeNotice(null);
    } catch (apiError) {
      if (isAuthError(apiError)) {
        forceRelogin();
        return;
      }
      setUseLocalMode(true);
      setModeNotice(t("chat.localMode"));
      const localId = ensureLocalConversation(targetId);
      if (localId) {
        loadLocalConversations();
        setActiveConversationId(localId);
      }
    }
  }

  async function loadConversations() {
    setLoadingConversations(true);
    setError(null);

    if (useLocalMode) {
      loadLocalConversations();
      setLoadingConversations(false);
      return;
    }

    if (!token) {
      setUseLocalMode(true);
      loadLocalConversations();
      setLoadingConversations(false);
      return;
    }

    try {
      const data = await platformApi.getFriendlyConversations(token);
      setConversations(data);
      setModeNotice(null);
      if (!activeConversationId && data.length > 0) {
        setActiveConversationId(data[0].id);
      }
    } catch (apiError) {
      if (isAuthError(apiError)) {
        forceRelogin();
        return;
      }
      setUseLocalMode(true);
      setModeNotice(t("chat.localMode"));
      loadLocalConversations();
    } finally {
      setLoadingConversations(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, [token, useLocalMode]);

  useEffect(() => {
    const target = searchParams.get("user");
    if (!target) return;

    let cancelled = false;

    const openTarget = async () => {
      if (cancelled) return;
      await startConversationWithTarget(target);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("user");
      setSearchParams(nextParams, { replace: true });
    };

    void openTarget();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    if (useLocalMode) {
      loadLocalMessages(activeConversationId);
      return;
    }

    if (!token) {
      setUseLocalMode(true);
      loadLocalMessages(activeConversationId);
      return;
    }

    let disposed = false;

    const loadApiMessages = async () => {
      setLoadingMessages(true);
      setError(null);
      try {
        const data = await platformApi.getFriendlyMessages(token, activeConversationId);
        if (!disposed) {
          setMessages(data);
          setModeNotice(null);
        }
      } catch (apiError) {
        if (isAuthError(apiError)) {
          forceRelogin();
          return;
        }
        if (disposed) return;
        setUseLocalMode(true);
        setModeNotice(t("chat.localMode"));
        loadLocalMessages(activeConversationId);
      } finally {
        if (!disposed) {
          setLoadingMessages(false);
        }
      }
    };

    void loadApiMessages();

    return () => {
      disposed = true;
    };
  }, [token, useLocalMode, activeConversationId, t]);

  useEffect(() => {
    if (!messagesListRef.current) return;
    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
  }, [messages, sending]);

  async function handleSend() {
    if (!activeConversationId || !draft.trim() || sending || !session) return;

    const text = draft.trim();
    setSending(true);
    setDraft("");

    if (useLocalMode) {
      const local = readLocalFriendlyState();
      const senderName =
        session.role === "teacher"
          ? currentTeacher?.fullName ?? "Teacher"
          : currentStudent?.fullName ?? "Student";

      const message: FriendlyChatMessage = {
        id: createMessageId(),
        senderId: session.userId,
        senderName,
        senderRole: session.role,
        text,
        createdAt: new Date().toISOString(),
      };

      local.messages[activeConversationId] = [...(local.messages[activeConversationId] ?? []), message];
      local.conversations = local.conversations.map((entry) =>
        entry.id === activeConversationId ? { ...entry, updatedAt: message.createdAt } : entry,
      );

      writeLocalFriendlyState(local);

      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        prev
          .map((item) =>
            item.id === activeConversationId
              ? {
                  ...item,
                  updatedAt: message.createdAt,
                  lastMessage: {
                    id: message.id,
                    text: message.text,
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                  },
                }
              : item,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );

      setSending(false);
      return;
    }

    if (!token) {
      setUseLocalMode(true);
      setModeNotice(t("chat.localMode"));
      setDraft(text);
      setSending(false);
      return;
    }

    try {
      const optimisticMessage: FriendlyChatMessage = {
        id: createMessageId(),
        senderId: session.userId,
        senderName:
          session.role === "teacher"
            ? currentTeacher?.fullName ?? "Teacher"
            : currentStudent?.fullName ?? "Student",
        senderRole: session.role,
        text,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      setConversations((prev) =>
        prev.map((item) =>
          item.id === activeConversationId
            ? {
                ...item,
                updatedAt: optimisticMessage.createdAt,
                lastMessage: {
                  id: optimisticMessage.id,
                  text: optimisticMessage.text,
                  senderId: optimisticMessage.senderId,
                  createdAt: optimisticMessage.createdAt,
                },
              }
            : item,
        ),
      );

      const sent = await platformApi.sendFriendlyMessage(token, activeConversationId, text);
      setMessages((prev) => prev.map((item) => (item.id === optimisticMessage.id ? sent : item)));
      setConversations((prev) =>
        prev.map((item) =>
          item.id === activeConversationId
            ? {
                ...item,
                updatedAt: sent.createdAt,
                lastMessage: {
                  id: sent.id,
                  text: sent.text,
                  senderId: sent.senderId,
                  createdAt: sent.createdAt,
                },
              }
            : item,
        ),
      );
    } catch (apiError) {
      if (isAuthError(apiError)) {
        forceRelogin();
        return;
      }
      setUseLocalMode(true);
      setModeNotice(t("chat.localMode"));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  const canShowTeacherQuickStart = Boolean(role === "student" && currentTeacherId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("chat.title")}
        subtitle={subtitle}
        action={
          canShowTeacherQuickStart ? (
            <Button variant="secondary" onClick={() => void startConversationWithTarget(String(currentTeacherId))}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {t("chat.startWithTeacher")}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.45fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("chat.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingConversations ? (
              <p className="inline-flex items-center gap-2 text-sm text-charcoal/65 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("chat.loading")}
              </p>
            ) : conversations.length === 0 ? (
              <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {t("chat.noConversations")}
              </p>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setActiveConversationId(conversation.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition",
                      active
                        ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30"
                        : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700",
                    ].join(" ")}
                  >
                    <UserAvatar fullName={conversation.peer.fullName} avatarUrl={conversation.peer.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{conversation.peer.fullName}</p>
                      <p className="truncate text-xs text-charcoal/55 dark:text-zinc-400">{conversation.lastMessage?.text ?? t("chat.empty")}</p>
                    </div>
                    <span className="text-[10px] text-charcoal/50 dark:text-zinc-500">{toReadableTime(conversation.updatedAt)}</span>
                  </button>
                );
              })
            )}

            <div className="pt-1">
              <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-charcoal/55 dark:text-zinc-400">
                <Users2 className="h-3.5 w-3.5 text-burgundy-600 dark:text-white" />
                {t("chat.contacts")}
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {availablePeers.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    onClick={() => void startConversationWithTarget(peer.id)}
                    className="flex w-full items-center gap-2 rounded-xl border border-burgundy-100 bg-white px-2.5 py-2 text-left transition hover:border-burgundy-300 hover:bg-burgundy-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-burgundy-700"
                  >
                    <UserAvatar fullName={peer.fullName} avatarUrl={peer.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-charcoal dark:text-zinc-100">{peer.fullName}</p>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-charcoal/50 dark:text-zinc-500">{peer.role}</p>
                    </div>
                  </button>
                ))}
                {availablePeers.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    {t("ui.noData")}
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-[62dvh] min-h-[340px] flex-col gap-3 p-3 sm:h-[70vh] sm:min-h-[420px] sm:p-4">
            {!activeConversation ? (
              <div className="grid flex-1 place-items-center rounded-2xl border border-burgundy-100 bg-white text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                {t("chat.select")}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-burgundy-100 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                  <UserAvatar fullName={activeConversation.peer.fullName} avatarUrl={activeConversation.peer.avatarUrl} size="sm" />
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{activeConversation.peer.fullName}</p>
                </div>

                <div ref={messagesListRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
                  {loadingMessages ? (
                    <p className="inline-flex items-center gap-2 text-sm text-charcoal/65 dark:text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("chat.loading")}
                    </p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-charcoal/65 dark:text-zinc-400">{t("chat.empty")}</p>
                  ) : (
                    messages.map((message) => {
                      const mine = String(message.senderId) === String(session?.userId);
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={[
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                              mine
                                ? "bg-burgundy-700 text-white"
                                : "border border-burgundy-100 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                            ].join(" ")}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.text}</p>
                            <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-charcoal/50 dark:text-zinc-400"}`}>
                              {toReadableTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t("chat.placeholder")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button onClick={() => void handleSend()} disabled={sending || !draft.trim()}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {t("chat.send")}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {modeNotice ? (
        <p className="rounded-2xl border border-burgundy-200 bg-burgundy-50 px-4 py-3 text-sm text-burgundy-700 dark:border-burgundy-800 dark:bg-burgundy-950/35 dark:text-white">
          {modeNotice}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}


