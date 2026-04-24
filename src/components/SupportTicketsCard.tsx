import { LifeBuoy, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function seenLabel(role: UserRole, message: SupportTicketMessage): string | null {
  if (role === "student" && message.senderType === "student") {
    return message.readBySupportAt ? "Seen by support" : "Delivered";
  }
  if (role === "teacher" && (message.senderType === "teacher" || message.senderType === "support")) {
    return message.readByStudentAt ? "Seen by student" : "Delivered";
  }
  return null;
}

export function SupportTicketsCard({ role }: SupportTicketsCardProps) {
  const token = getApiToken();
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [messagesByTicket, setMessagesByTicket] = useState<Record<string, SupportTicketMessage[]>>({});
  const [draftByTicket, setDraftByTicket] = useState<Record<string, string>>({});
  const [loadingTicketMessages, setLoadingTicketMessages] = useState<Record<string, boolean>>({});
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const loadTickets = async () => {
      setLoading(true);
      try {
        const response = await platformApi.getSupportTickets(token);
        if (!disposed) setTickets(response);
      } catch {
        if (!disposed) setTickets([]);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void loadTickets();
    const intervalId = window.setInterval(() => {
      void loadTickets();
    }, 12000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token]);

  useEffect(() => {
    if (expandedTicketId) return;
    if (tickets.length === 0) return;
    setExpandedTicketId(tickets[0].id);
  }, [expandedTicketId, tickets]);

  useEffect(() => {
    if (!token || !expandedTicketId) return;
    let disposed = false;

    const loadMessages = async () => {
      setLoadingTicketMessages((prev) => ({ ...prev, [expandedTicketId]: true }));
      try {
        const messages = await platformApi.getSupportTicketMessages(token, expandedTicketId);
        if (!disposed) {
          setMessagesByTicket((prev) => ({ ...prev, [expandedTicketId]: messages }));
        }
      } catch {
        if (!disposed) {
          setMessagesByTicket((prev) => ({ ...prev, [expandedTicketId]: prev[expandedTicketId] ?? [] }));
        }
      } finally {
        if (!disposed) {
          setLoadingTicketMessages((prev) => ({ ...prev, [expandedTicketId]: false }));
        }
      }
    };

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 8000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token, expandedTicketId]);

  useEffect(() => {
    if (!messagesViewportRef.current) return;
    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [expandedTicketId, messagesByTicket]);

  async function createTicket() {
    if (!token || role !== "student" || !newTicketMessage.trim()) return;
    try {
      const created = await platformApi.createSupportTicket(token, newTicketMessage.trim());
      setTickets((prev) => [created, ...prev]);
      setNewTicketMessage("");
      setExpandedTicketId(created.id);
    } catch {
      // Keep message on error.
    }
  }

  async function updateStatus(ticketId: string, status: SupportTicketStatus) {
    if (!token || role !== "teacher") return;
    try {
      const updated = await platformApi.updateSupportTicket(token, ticketId, status);
      setTickets((prev) => prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
    } catch {
      // No-op
    }
  }

  async function sendMessage(ticket: SupportTicket) {
    if (!token) return;
    const draft = (draftByTicket[ticket.id] ?? "").trim();
    if (!draft || ticket.status === "closed") return;
    try {
      const message = await platformApi.sendSupportTicketMessage(token, ticket.id, draft);
      setMessagesByTicket((prev) => ({ ...prev, [ticket.id]: [...(prev[ticket.id] ?? []), message] }));
      setDraftByTicket((prev) => ({ ...prev, [ticket.id]: "" }));
    } catch {
      // Keep draft text.
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
        <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-xs text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Real support chat is enabled. Student messages are forwarded to Telegram, and Telegram replies sync back here.
        </p>

        {!token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Please log in to open support chat.
          </p>
        ) : null}

        {role === "student" && token ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={newTicketMessage}
              onChange={(event) => setNewTicketMessage(event.target.value)}
              placeholder="Describe your problem to support..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createTicket();
                }
              }}
            />
            <Button onClick={() => void createTicket()} disabled={!newTicketMessage.trim()}>
              <Send className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-charcoal/65 dark:text-zinc-400">Loading support chats...</p> : null}

        <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-burgundy-100 bg-white/70 p-2 dark:border-zinc-700 dark:bg-zinc-900/60">
            <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Tickets</p>
            <div className="space-y-2">
              {tickets.map((ticket) => {
                const isActive = expandedTicketId === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30"
                        : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                    onClick={() => setExpandedTicketId(ticket.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-charcoal dark:text-zinc-100">#{ticket.id}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(ticket.status)}`}>{statusLabel(ticket.status)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-charcoal/70 dark:text-zinc-300">{ticket.message}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-burgundy-100 bg-white/70 p-3 dark:border-zinc-700 dark:bg-zinc-900/60">
            {!expandedTicketId ? (
              <p className="p-4 text-sm text-charcoal/65 dark:text-zinc-400">Select a ticket to open chat.</p>
            ) : (
              (() => {
                const activeTicket = tickets.find((item) => item.id === expandedTicketId) ?? null;
                if (!activeTicket) {
                  return <p className="p-4 text-sm text-charcoal/65 dark:text-zinc-400">Ticket not found.</p>;
                }
                const messages = messagesByTicket[activeTicket.id] ?? [];
                const isMessagesLoading = loadingTicketMessages[activeTicket.id] ?? false;
                const draft = draftByTicket[activeTicket.id] ?? "";
                const ticketCanSend = activeTicket.status !== "closed";

                return (
                  <div className="grid min-h-[32rem] grid-rows-[auto_minmax(0,1fr)_auto] gap-3">
                    <div className="flex items-center justify-between gap-2 border-b border-burgundy-100 pb-2 dark:border-zinc-700">
                      <div>
                        <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                          Ticket #{activeTicket.id} {role === "teacher" ? ` • ${activeTicket.studentName}` : ""}
                        </p>
                        <p className="text-xs text-charcoal/60 dark:text-zinc-400">{new Date(activeTicket.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(activeTicket.status)}`}>{statusLabel(activeTicket.status)}</span>
                    </div>

                    <div
                      ref={messagesViewportRef}
                      className="space-y-2 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white/90 p-3 dark:border-zinc-700 dark:bg-zinc-950/70"
                    >
                      {isMessagesLoading ? (
                        <p className="px-2 py-1 text-xs text-charcoal/60 dark:text-zinc-400">Loading messages...</p>
                      ) : messages.length === 0 ? (
                        <p className="px-2 py-1 text-xs text-charcoal/60 dark:text-zinc-400">No messages yet.</p>
                      ) : (
                        messages.map((item) => {
                          const mine = (role === "student" && item.senderType === "student") || (role === "teacher" && item.senderType === "teacher");
                          const seen = seenLabel(role, item);
                          return (
                            <div
                              key={item.id}
                              className={`max-w-[84%] rounded-2xl px-3 py-2.5 text-sm ${
                                mine
                                  ? "ml-auto bg-burgundy-700 text-white shadow-[0_10px_22px_-18px_rgba(120,0,40,0.9)]"
                                  : "mr-auto border border-zinc-200 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${mine ? "text-white/80" : "text-charcoal/60 dark:text-zinc-400"}`}>
                                {senderTitle(role, item)}
                              </p>
                              <p className={`mt-1 whitespace-pre-wrap ${mine ? "text-white" : ""}`}>{item.text}</p>
                              <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${mine ? "text-white/70" : "text-charcoal/55 dark:text-zinc-400"}`}>
                                <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                {seen ? <span>{seen}</span> : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {ticketCanSend ? (
                      <div className="rounded-2xl border border-burgundy-200/80 bg-white/95 p-2 shadow-[0_14px_30px_-22px_rgba(80,0,20,0.6)] dark:border-zinc-700 dark:bg-zinc-950/95">
                        <div className="flex items-end gap-2">
                          <textarea
                            value={draft}
                            onChange={(event) => setDraftByTicket((prev) => ({ ...prev, [activeTicket.id]: event.target.value }))}
                            placeholder="Write a message..."
                            rows={1}
                            className="max-h-36 min-h-[44px] flex-1 resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal outline-none transition placeholder:text-charcoal/45 focus:border-burgundy-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendMessage(activeTicket);
                              }
                            }}
                          />
                          <Button
                            onClick={() => void sendMessage(activeTicket)}
                            disabled={!draft.trim()}
                            className="h-11 w-11 shrink-0 rounded-full p-0"
                            aria-label="Send support message"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-charcoal/60 dark:text-zinc-400">This ticket is closed.</p>
                    )}

                    {role === "teacher" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => void updateStatus(activeTicket.id, "in_progress")}>
                          In progress
                        </Button>
                        <Button variant="positive" size="sm" onClick={() => void updateStatus(activeTicket.id, "closed")}>
                          Close
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            )}
          </section>
        </div>

        <div className="space-y-3 lg:hidden">
          {tickets.length === 0 && !loading ? (
            <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No support requests yet.
            </p>
          ) : (
            <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-xs text-charcoal/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              Mobile uses compact layout. Open a ticket to chat.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
