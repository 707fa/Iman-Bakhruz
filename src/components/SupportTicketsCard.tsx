import { AlertCircle, Check, CheckCheck, LifeBuoy, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SupportTicket, SupportTicketMessage, SupportTicketStatus, UserRole } from "../types";
import { platformApi } from "../services/api/platformApi";
import { getApiToken, getSessionUserId } from "../services/tokenStorage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface SupportTicketsCardProps {
  role: UserRole;
}

type UiSupportMessage = SupportTicketMessage & {
  localState?: "sending" | "failed";
};

interface SupportChatCacheState {
  activeTicketId: string | null;
  draft: string;
  tickets: SupportTicket[];
  messagesByTicket: Record<string, UiSupportMessage[]>;
}

const SUPPORT_CACHE_LIMIT_PER_TICKET = 120;

function getSupportCacheKey(role: UserRole, userId: string): string {
  return `support-chat-cache-v2:${role}:${userId || "guest"}`;
}

function readSupportCache(cacheKey: string): SupportChatCacheState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupportChatCacheState> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      activeTicketId: typeof parsed.activeTicketId === "string" ? parsed.activeTicketId : null,
      draft: typeof parsed.draft === "string" ? parsed.draft : "",
      tickets: Array.isArray(parsed.tickets) ? (parsed.tickets as SupportTicket[]) : [],
      messagesByTicket:
        parsed.messagesByTicket && typeof parsed.messagesByTicket === "object"
          ? (parsed.messagesByTicket as Record<string, UiSupportMessage[]>)
          : {},
    };
  } catch {
    return null;
  }
}

function trimMessagesForCache(messagesByTicket: Record<string, UiSupportMessage[]>): Record<string, UiSupportMessage[]> {
  const next: Record<string, UiSupportMessage[]> = {};
  Object.entries(messagesByTicket).forEach(([ticketId, messages]) => {
    next[ticketId] = Array.isArray(messages) ? messages.slice(-SUPPORT_CACHE_LIMIT_PER_TICKET) : [];
  });
  return next;
}

function writeSupportCache(cacheKey: string, state: SupportChatCacheState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    cacheKey,
    JSON.stringify({
      ...state,
      messagesByTicket: trimMessagesForCache(state.messagesByTicket),
      tickets: state.tickets.slice(0, 50),
    }),
  );
}

function statusLabel(value: SupportTicketStatus): string {
  if (value === "in_progress") return "In progress";
  if (value === "closed") return "Closed";
  return "Open";
}

function statusClass(value: SupportTicketStatus): string {
  if (value === "in_progress") return "bg-burgundy-50 text-burgundy-700 dark:bg-burgundy-900/30 dark:text-white";
  if (value === "closed") return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";
  return "bg-burgundy-100 text-burgundy-700 dark:bg-burgundy-900/35 dark:text-white";
}

function senderTitle(role: UserRole, message: UiSupportMessage): string {
  if (message.senderType === "student") return role === "student" ? "You" : "Student";
  if (message.senderType === "teacher") return role === "teacher" ? "You" : "Teacher";
  return "Support";
}

function mergeMessages(current: UiSupportMessage[], incoming: UiSupportMessage[]): UiSupportMessage[] {
  const map = new Map<string, UiSupportMessage>();
  [...current, ...incoming].forEach((message) => {
    if (!message.id) return;
    map.set(message.id, { ...(map.get(message.id) ?? {}), ...message });
  });

  return [...map.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function messageReadByPeer(role: UserRole, message: UiSupportMessage): boolean {
  if (message.localState === "sending" || message.localState === "failed") return false;
  if (role === "student") return Boolean(message.readBySupportAt);
  return Boolean(message.readByStudentAt);
}

export function SupportTicketsCard({ role }: SupportTicketsCardProps) {
  const token = getApiToken();
  const userId = getSessionUserId() || "guest";
  const cacheKey = useMemo(() => getSupportCacheKey(role, userId), [role, userId]);
  const hydratedRef = useRef(false);
  const [draft, setDraft] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messagesByTicket, setMessagesByTicket] = useState<Record<string, UiSupportMessage[]>>({});
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketUpdating, setTicketUpdating] = useState(false);
  const [typingHint, setTypingHint] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const latestIncomingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedRef.current) return;
    const cached = readSupportCache(cacheKey);
    if (!cached) {
      hydratedRef.current = true;
      return;
    }

    setDraft(cached.draft);
    setTickets(cached.tickets);
    setMessagesByTicket(cached.messagesByTicket);
    setActiveTicketId(cached.activeTicketId);
    hydratedRef.current = true;
  }, [cacheKey]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeSupportCache(cacheKey, {
      activeTicketId,
      draft,
      tickets,
      messagesByTicket,
    });
  }, [cacheKey, activeTicketId, draft, tickets, messagesByTicket]);

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      }),
    [tickets],
  );

  const activeTicket = useMemo(
    () => sortedTickets.find((ticket) => ticket.id === activeTicketId) ?? sortedTickets[0] ?? null,
    [sortedTickets, activeTicketId],
  );

  const activeMessages = useMemo(
    () => (activeTicket ? messagesByTicket[activeTicket.id] ?? [] : []),
    [activeTicket, messagesByTicket],
  );

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const loadTickets = async () => {
      setLoadingTickets(true);
      try {
        const next = await platformApi.getSupportTickets(token);
        if (!disposed) {
          setTickets((prev) => {
            const map = new Map<string, SupportTicket>();
            prev.forEach((ticket) => map.set(ticket.id, ticket));
            next.forEach((ticket) => map.set(ticket.id, ticket));
            return [...map.values()];
          });
        }
      } finally {
        if (!disposed) setLoadingTickets(false);
      }
    };

    void loadTickets();
    const intervalId = window.setInterval(() => void loadTickets(), 6000);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token]);

  useEffect(() => {
    if (!activeTicket && sortedTickets.length > 0) {
      setActiveTicketId(sortedTickets[0].id);
    }
  }, [activeTicket, sortedTickets]);

  useEffect(() => {
    if (!token || !activeTicket) return;
    let disposed = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const next = await platformApi.getSupportTicketMessages(token, activeTicket.id);
        if (disposed) return;

        const normalized = next as UiSupportMessage[];
        const latestForeign = [...normalized].reverse().find((item) =>
          role === "student" ? item.senderType !== "student" : item.senderType === "student",
        );
        if (latestForeign && latestForeign.id !== latestIncomingIdRef.current) {
          latestIncomingIdRef.current = latestForeign.id;
          setTypingHint(true);
          window.setTimeout(() => setTypingHint(false), 900);
        }

        setMessagesByTicket((prev) => ({
          ...prev,
          [activeTicket.id]: mergeMessages(prev[activeTicket.id] ?? [], normalized),
        }));
      } catch {
        // keep previous messages when API temporarily fails
      } finally {
        if (!disposed) setLoadingMessages(false);
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => void loadMessages(), 3500);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token, activeTicket?.id, role]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [activeMessages, activeTicket?.id, typingHint]);

  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 128);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 128 ? "auto" : "hidden";
  }, [draft]);

  async function handleSend() {
    if (!token || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);

    try {
      if (!activeTicket) {
        const created = await platformApi.createSupportTicket(token, text);
        setTickets((prev) => [created, ...prev]);
        setActiveTicketId(created.id);
        setDraft("");
        return;
      }

      const optimistic: UiSupportMessage = {
        id: `local_${Date.now()}`,
        ticketId: activeTicket.id,
        senderType: role === "teacher" ? "teacher" : "student",
        text,
        source: "web",
        createdAt: new Date().toISOString(),
        localState: "sending",
      };
      setMessagesByTicket((prev) => ({
        ...prev,
        [activeTicket.id]: [...(prev[activeTicket.id] ?? []), optimistic],
      }));
      setDraft("");

      const sent = await platformApi.sendSupportTicketMessage(token, activeTicket.id, text);
      setMessagesByTicket((prev) => ({
        ...prev,
        [activeTicket.id]: mergeMessages(
          (prev[activeTicket.id] ?? []).map((item) => (item.id === optimistic.id ? sent : item)),
          [sent],
        ),
      }));
    } catch {
      if (activeTicket) {
        setMessagesByTicket((prev) => ({
          ...prev,
          [activeTicket.id]: (prev[activeTicket.id] ?? []).map((item) =>
            item.id.startsWith("local_") && item.text === text ? { ...item, localState: "failed" } : item,
          ),
        }));
      }
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: SupportTicketStatus) {
    if (!token || !activeTicket || role !== "teacher" || ticketUpdating) return;
    setTicketUpdating(true);
    try {
      const updated = await platformApi.updateSupportTicket(token, activeTicket.id, status);
      setTickets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setTicketUpdating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-burgundy-700 dark:text-white" />
          Live Support Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Please log in to open support chat.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-burgundy-100 bg-white p-2 shadow-soft dark:border-zinc-800 dark:bg-zinc-950/90">
              <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/55 dark:text-zinc-400">Dialogs</p>
              <div className="space-y-2">
                {loadingTickets && sortedTickets.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-burgundy-50 px-3 py-2 text-xs text-charcoal/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">Loading dialogs...</p>
                ) : sortedTickets.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-burgundy-50 px-3 py-2 text-xs text-charcoal/60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">No dialogs yet.</p>
                ) : (
                  sortedTickets.map((ticket) => {
                    const isActive = ticket.id === activeTicket?.id;
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setActiveTicketId(ticket.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                          isActive
                            ? "border-burgundy-300 bg-burgundy-50 dark:border-[#8a1c1c] dark:bg-[#250909]"
                            : "border-burgundy-100 bg-white hover:border-burgundy-200 hover:bg-burgundy-50/70 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-charcoal dark:text-zinc-100">#{ticket.id}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(ticket.status)}`}>{statusLabel(ticket.status)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 break-words [overflow-wrap:anywhere] text-xs text-charcoal/65 dark:text-zinc-300">{ticket.message}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="grid min-h-[32rem] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-burgundy-100 bg-white p-3 shadow-soft dark:border-zinc-800 dark:bg-zinc-950/90">
              <div className="flex items-center justify-between gap-2 border-b border-burgundy-100 pb-2 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{role === "teacher" ? "Teacher Support Inbox" : "My Support Chat"}</p>
                  <p className="text-xs text-charcoal/55 dark:text-zinc-400">{activeTicket ? new Date(activeTicket.createdAt).toLocaleString() : "Start conversation with support"}</p>
                </div>
                {activeTicket ? <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(activeTicket.status)}`}>{statusLabel(activeTicket.status)}</span> : null}
              </div>

              <div ref={viewportRef} className="space-y-3 overflow-x-hidden overflow-y-auto rounded-2xl border border-burgundy-100 bg-burgundy-50/35 p-3 dark:border-zinc-800 dark:bg-zinc-950">
                {loadingMessages && activeMessages.length === 0 ? (
                  <p className="text-xs text-charcoal/55 dark:text-zinc-400">Loading messages...</p>
                ) : activeMessages.length === 0 ? (
                  activeTicket ? (
                    <div className="flex justify-end transition-all duration-200">
                      <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[#6F0000] px-3 py-2.5 text-sm text-white shadow-[0_10px_22px_-18px_rgba(111,0,0,0.65)]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70">You</p>
                        <p className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-white">{activeTicket.message}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/75">
                          <span>{new Date(activeTicket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-charcoal/55 dark:text-zinc-400">No messages yet.</p>
                  )
                ) : (
                  activeMessages.map((message) => {
                    const mine = role === "student" ? message.senderType === "student" : message.senderType !== "student";
                    const read = mine ? messageReadByPeer(role, message) : false;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"} transition-all duration-200`}>
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2.5 text-sm ${
                            mine
                              ? "rounded-br-md bg-[#6F0000] text-white shadow-[0_10px_22px_-18px_rgba(111,0,0,0.65)]"
                              : "border border-burgundy-100 bg-white text-charcoal shadow-soft dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${mine ? "text-white/70" : "text-charcoal/50 dark:text-zinc-400"}`}>{senderTitle(role, message)}</p>
                          <p className={`mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${mine ? "text-white" : ""}`}>{message.text}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/75" : "text-charcoal/45 dark:text-zinc-500"}`}>
                            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {mine
                              ? message.localState === "sending"
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : message.localState === "failed"
                                  ? <AlertCircle className="h-3 w-3 text-amber-200" />
                                  : read
                                    ? <CheckCheck className="h-3 w-3" />
                                    : <Check className="h-3 w-3" />
                              : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {typingHint ? <p className="text-xs text-charcoal/45 dark:text-zinc-500">Support is typing...</p> : null}
              </div>

              {role === "student" || role === "teacher" ? (
                <div className="rounded-2xl border border-burgundy-100 bg-white p-2 shadow-soft dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-[0_14px_30px_-22px_rgba(0,0,0,0.65)]">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={draftRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write your message to support..."
                      rows={1}
                      className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 text-charcoal shadow-none placeholder:text-charcoal/40 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                    />
                    <Button
                      onClick={() => void handleSend()}
                      disabled={!draft.trim() || sending}
                      className="h-11 w-11 shrink-0 rounded-full border-0 bg-[#6F0000] p-0 text-white hover:bg-[#820000]"
                      aria-label="Send support message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {role === "teacher" && activeTicket ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void handleStatusChange("in_progress")} disabled={ticketUpdating}>
                    In progress
                  </Button>
                  <Button variant="positive" size="sm" onClick={() => void handleStatusChange("closed")} disabled={ticketUpdating}>
                    Close
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
