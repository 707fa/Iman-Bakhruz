import { LifeBuoy, Send } from "lucide-react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const loadTickets = async () => {
      setLoading(true);
      try {
        const response = await platformApi.getSupportTickets(token);
        if (!disposed) {
          setTickets(response);
        }
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
          Support Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-xs text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Real support chat is enabled. Student messages are forwarded to Telegram, and Telegram replies sync back here.
        </p>

        {!token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Support center is available in API mode.
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

        <div className="space-y-3">
          {tickets.length === 0 && !loading ? (
            <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No support requests yet.
            </p>
          ) : (
            tickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const messages = messagesByTicket[ticket.id] ?? [];
              const isMessagesLoading = loadingTicketMessages[ticket.id] ?? false;
              const draft = draftByTicket[ticket.id] ?? "";
              const ticketCanSend = ticket.status !== "closed";

              return (
                <article key={ticket.id} className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                    onClick={() => setExpandedTicketId((prev) => (prev === ticket.id ? null : ticket.id))}
                  >
                    <p className="text-xs text-charcoal/60 dark:text-zinc-400">
                      #{ticket.id} • {role === "teacher" ? ticket.studentName : "My support ticket"}
                    </p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}>{statusLabel(ticket.status)}</span>
                  </button>

                  <p className="mt-2 text-xs text-charcoal/55 dark:text-zinc-400">{new Date(ticket.createdAt).toLocaleString()}</p>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3">
                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white/60 p-2 dark:border-zinc-700 dark:bg-zinc-950/60">
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
                                className={`rounded-xl border px-3 py-2 text-sm ${
                                  mine
                                    ? "ml-8 border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/25"
                                    : "mr-8 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                                }`}
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">
                                  {senderTitle(role, item)}
                                </p>
                                <p className="mt-1 text-charcoal dark:text-zinc-100">{item.text}</p>
                                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-charcoal/55 dark:text-zinc-400">
                                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                                  {seen ? <span>{seen}</span> : null}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {ticketCanSend ? (
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <Input
                            value={draft}
                            onChange={(event) => setDraftByTicket((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                            placeholder="Write a message..."
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void sendMessage(ticket);
                              }
                            }}
                          />
                          <Button onClick={() => void sendMessage(ticket)} disabled={!draft.trim()}>
                            <Send className="mr-2 h-4 w-4" />
                            Send
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-charcoal/60 dark:text-zinc-400">This ticket is closed.</p>
                      )}

                      {role === "teacher" ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm" onClick={() => void updateStatus(ticket.id, "in_progress")}>
                            In progress
                          </Button>
                          <Button variant="positive" size="sm" onClick={() => void updateStatus(ticket.id, "closed")}>
                            Close
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
