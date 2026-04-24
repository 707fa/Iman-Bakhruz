import { LifeBuoy, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SupportTicket, SupportTicketMessage, SupportTicketStatus, UserRole } from "../types";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface SupportTicketsCardProps {
  role: UserRole;
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

function senderTitle(role: UserRole, message: SupportTicketMessage): string {
  if (message.senderType === "student") return role === "student" ? "You" : "Student";
  if (message.senderType === "teacher") return "Teacher";
  return "Support";
}

export function SupportTicketsCard({ role }: SupportTicketsCardProps) {
  const token = getApiToken();
  const [draft, setDraft] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messagesByTicket, setMessagesByTicket] = useState<Record<string, SupportTicketMessage[]>>({});
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [ticketUpdating, setTicketUpdating] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

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
          setTickets(next);
        }
      } catch {
        if (!disposed) {
          setTickets((prev) => prev);
        }
      } finally {
        if (!disposed) {
          setLoadingTickets(false);
        }
      }
    };

    void loadTickets();
    const intervalId = window.setInterval(() => {
      void loadTickets();
    }, 6000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token]);

  useEffect(() => {
    if (!activeTicket && sortedTickets.length === 0) {
      setActiveTicketId(null);
      return;
    }
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
        if (!disposed) {
          setMessagesByTicket((prev) => ({ ...prev, [activeTicket.id]: next }));
        }
      } catch {
        // keep previous messages
      } finally {
        if (!disposed) {
          setLoadingMessages(false);
        }
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 4000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token, activeTicket?.id]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [activeMessages, activeTicket?.id]);

  async function handleSend() {
    if (!token || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);

    try {
      if (!activeTicket) {
        const created = await platformApi.createSupportTicket(token, text);
        setTickets((prev) => [created, ...prev]);
        setActiveTicketId(created.id);
        const createdMessages = await platformApi.getSupportTicketMessages(token, created.id);
        setMessagesByTicket((prev) => ({ ...prev, [created.id]: createdMessages }));
        setDraft("");
        return;
      }

      const optimistic: SupportTicketMessage = {
        id: `local_${Date.now()}`,
        ticketId: activeTicket.id,
        senderType: "student",
        text,
        source: "web",
        createdAt: new Date().toISOString(),
      };

      setMessagesByTicket((prev) => ({
        ...prev,
        [activeTicket.id]: [...(prev[activeTicket.id] ?? []), optimistic],
      }));
      setDraft("");

      const sent = await platformApi.sendSupportTicketMessage(token, activeTicket.id, text);
      setMessagesByTicket((prev) => ({
        ...prev,
        [activeTicket.id]: (prev[activeTicket.id] ?? []).map((item) => (item.id === optimistic.id ? sent : item)),
      }));
    } catch {
      // keep optimistic message
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
            <aside className="rounded-2xl border border-burgundy-100 bg-white/75 p-2 dark:border-zinc-700 dark:bg-zinc-900/70">
              <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Dialogs</p>
              <div className="space-y-2">
                {loadingTickets && sortedTickets.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs text-charcoal/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    Loading dialogs...
                  </p>
                ) : sortedTickets.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs text-charcoal/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    No dialogs yet.
                  </p>
                ) : (
                  sortedTickets.map((ticket) => {
                    const isActive = ticket.id === activeTicket?.id;
                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setActiveTicketId(ticket.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                          isActive
                            ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/35"
                            : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-charcoal dark:text-zinc-100">#{ticket.id}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(ticket.status)}`}>{statusLabel(ticket.status)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-charcoal/70 dark:text-zinc-300">{ticket.message}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className="grid min-h-[32rem] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-burgundy-100 bg-white/75 p-3 dark:border-zinc-700 dark:bg-zinc-900/70">
              <div className="flex items-center justify-between gap-2 border-b border-burgundy-100 pb-2 dark:border-zinc-700">
                <div>
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                    {role === "teacher" ? "Teacher Support Inbox" : "My Support Chat"}
                  </p>
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">
                    {activeTicket ? new Date(activeTicket.createdAt).toLocaleString() : "Start conversation with support"}
                  </p>
                </div>
                {activeTicket ? (
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(activeTicket.status)}`}>{statusLabel(activeTicket.status)}</span>
                ) : null}
              </div>

              <div ref={viewportRef} className="space-y-3 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white/90 p-3 dark:border-zinc-700 dark:bg-zinc-950/70">
                {loadingMessages && activeMessages.length === 0 ? (
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">Loading messages...</p>
                ) : activeMessages.length === 0 ? (
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">No messages yet.</p>
                ) : (
                  activeMessages.map((message) => {
                    const fromStudent = message.senderType === "student";
                    const mine = role === "student" ? fromStudent : !fromStudent;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm ${
                            fromStudent
                              ? "bg-burgundy-700 text-white shadow-[0_10px_22px_-18px_rgba(120,0,40,0.9)]"
                              : "border border-zinc-200 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <p
                            className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
                              fromStudent ? "text-white/80" : "text-charcoal/60 dark:text-zinc-400"
                            }`}
                          >
                            {senderTitle(role, message)}
                          </p>
                          <p className={`mt-1 whitespace-pre-wrap ${fromStudent ? "text-white" : ""}`}>{message.text}</p>
                          <p className={`mt-1 text-right text-[10px] ${fromStudent ? "text-white/70" : "text-charcoal/55 dark:text-zinc-400"}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {role === "student" || role === "teacher" ? (
                <div className="rounded-2xl border border-burgundy-200/80 bg-white/95 p-2 shadow-[0_14px_30px_-22px_rgba(80,0,20,0.6)] dark:border-zinc-700 dark:bg-zinc-950/95">
                  <div className="flex items-center gap-2">
                    <Input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write your message to support..."
                      className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
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
                      className="h-11 w-11 shrink-0 rounded-full p-0"
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
