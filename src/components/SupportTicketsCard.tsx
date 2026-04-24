import { LifeBuoy, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SupportTicket, SupportTicketStatus, UserRole } from "../types";
import { useAppStore } from "../hooks/useAppStore";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

interface SupportTicketsCardProps {
  role: UserRole;
}

function readLocalSupportTickets(storageKey: string): SupportTicket[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SupportTicket[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSupportTickets(storageKey: string, tickets: SupportTicket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(tickets.slice(-300)));
}

function mergeTicketsStable(...groups: SupportTicket[][]): SupportTicket[] {
  const map = new Map<string, SupportTicket>();
  for (const group of groups) {
    for (const ticket of group) {
      const existing = map.get(ticket.id);
      if (!existing) {
        map.set(ticket.id, ticket);
        continue;
      }
      const existingUpdated = new Date(existing.updatedAt || existing.createdAt).getTime();
      const nextUpdated = new Date(ticket.updatedAt || ticket.createdAt).getTime();
      if (nextUpdated >= existingUpdated) {
        map.set(ticket.id, ticket);
      }
    }
  }
  return Array.from(map.values());
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

export function SupportTicketsCard({ role }: SupportTicketsCardProps) {
  const { state } = useAppStore();
  const token = getApiToken();
  const [draft, setDraft] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sessionUserId = state.session?.userId ?? "guest";
  const supportStorageKey = useMemo(() => `support-chat-v2:${sessionUserId}`, [sessionUserId]);

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
      }),
    [tickets],
  );

  const activeTicket = useMemo(
    () => sortedTickets.find((ticket) => ticket.id === expandedTicketId) ?? sortedTickets[sortedTickets.length - 1] ?? null,
    [expandedTicketId, sortedTickets],
  );

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await platformApi.getSupportTickets(token);
        if (!disposed) {
          const local = readLocalSupportTickets(supportStorageKey);
          setTickets((prev) => {
            const merged = mergeTicketsStable(prev, local, response);
            writeLocalSupportTickets(supportStorageKey, merged);
            return merged;
          });
        }
      } catch {
        if (!disposed) {
          setTickets((prev) => mergeTicketsStable(prev, readLocalSupportTickets(supportStorageKey)));
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token, supportStorageKey]);

  useEffect(() => {
    writeLocalSupportTickets(supportStorageKey, tickets);
  }, [supportStorageKey, tickets]);

  useEffect(() => {
    if (!activeTicket) return;
    setExpandedTicketId(activeTicket.id);
  }, [activeTicket?.id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [sortedTickets, loading]);

  async function createTicket() {
    if (!token || role !== "student" || !draft.trim()) return;
    const text = draft.trim();
    const now = new Date().toISOString();
    const optimisticTicket: SupportTicket = {
      id: `local_${Date.now()}`,
      studentId: sessionUserId,
      studentName: "You",
      teacherId: "",
      teacherName: "",
      message: text,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };

    setTickets((prev) => [...prev, optimisticTicket]);
    setDraft("");
    setExpandedTicketId(optimisticTicket.id);

    try {
      const created = await platformApi.createSupportTicket(token, text);
      setTickets((prev) => prev.map((item) => (item.id === optimisticTicket.id ? created : item)));
      setExpandedTicketId(created.id);
    } catch {
      // keep optimistic local message when backend is slow/unavailable
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
        ) : null}

        {!token ? null : (
          <div className="grid gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-burgundy-100 bg-white/75 p-2 dark:border-zinc-700 dark:bg-zinc-900/70">
              <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Dialogs</p>
              <div className="space-y-2">
                {sortedTickets.length === 0 ? (
                  <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-xs text-charcoal/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                    No dialogs yet.
                  </p>
                ) : (
                  sortedTickets
                    .slice()
                    .reverse()
                    .map((ticket) => {
                      const isActive = ticket.id === activeTicket?.id;
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setExpandedTicketId(ticket.id)}
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

              <div ref={listRef} className="space-y-3 overflow-y-auto rounded-2xl border border-burgundy-100 bg-white/90 p-3 dark:border-zinc-700 dark:bg-zinc-950/70">
                {loading ? (
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">Loading dialog...</p>
                ) : sortedTickets.length === 0 ? (
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">No messages yet.</p>
                ) : (
                  sortedTickets.map((ticket) => {
                    const mine = role === "student";
                    return (
                      <div key={ticket.id} className="space-y-1">
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-sm ${
                            mine
                              ? "ml-auto bg-burgundy-700 text-white shadow-[0_10px_22px_-18px_rgba(120,0,40,0.9)]"
                              : "mr-auto border border-zinc-200 bg-white text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${mine ? "text-white/80" : "text-charcoal/60 dark:text-zinc-400"}`}>
                            {mine ? "You" : ticket.studentName || "Student"}
                          </p>
                          <p className={`mt-1 whitespace-pre-wrap ${mine ? "text-white" : ""}`}>{ticket.message}</p>
                          <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-charcoal/55 dark:text-zinc-400"}`}>
                            {new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className={`max-w-[85%] ${mine ? "ml-auto" : "mr-auto"} text-[11px] text-charcoal/55 dark:text-zinc-400`}>
                          Support status: {statusLabel(ticket.status)} {ticket.id.startsWith("local_") ? "• syncing..." : ""}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {role === "student" ? (
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
                          void createTicket();
                        }
                      }}
                    />
                    <Button
                      onClick={() => void createTicket()}
                      disabled={!draft.trim()}
                      className="h-11 w-11 shrink-0 rounded-full p-0"
                      aria-label="Send support message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : activeTicket ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void updateStatus(activeTicket.id, "in_progress")}>
                    In progress
                  </Button>
                  <Button variant="positive" size="sm" onClick={() => void updateStatus(activeTicket.id, "closed")}>
                    Close
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-charcoal/60 dark:text-zinc-400">Select dialog to manage status.</p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
