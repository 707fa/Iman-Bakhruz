import { LifeBuoy, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { SupportTicketStatus, UserRole } from "../types";
import { getApiToken } from "../services/tokenStorage";
import { platformApi } from "../services/api/platformApi";
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

export function SupportTicketsCard({ role }: SupportTicketsCardProps) {
  const token = getApiToken();
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      message: string;
      teacherReply?: string;
      teacherReplyAt?: string;
      status: SupportTicketStatus;
      studentName: string;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const load = async () => {
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

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 12000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [token]);

  async function createTicket() {
    if (!token || role !== "student" || !message.trim()) return;
    try {
      const created = await platformApi.createSupportTicket(token, message.trim());
      setTickets((prev) => [created, ...prev]);
      setMessage("");
    } catch {
      // Keep user input unchanged if failed.
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
          Teacher Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-xs text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          If phone notifications do not arrive, write your issue here. The admin gets full request details in Telegram automatically.
        </p>

        {!token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Support center is available in API mode.
          </p>
        ) : null}

        {role === "student" && token ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your question to teacher..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createTicket();
                }
              }}
            />
            <Button onClick={() => void createTicket()} disabled={!message.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
          </div>
        ) : null}

        {loading ? <p className="text-sm text-charcoal/65 dark:text-zinc-400">Loading requests...</p> : null}

        <div className="space-y-2">
          {tickets.length === 0 && !loading ? (
            <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No support requests yet.
            </p>
          ) : (
            tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-charcoal/60 dark:text-zinc-400">
                    {role === "teacher" ? ticket.studentName : "My request"}
                  </p>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(ticket.status)}`}>
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-charcoal dark:text-zinc-100">{ticket.message}</p>
                <p className="mt-1 text-xs text-charcoal/55 dark:text-zinc-400">{new Date(ticket.createdAt).toLocaleString()}</p>

                {ticket.teacherReply ? (
                  <div className="mt-3 rounded-xl border border-burgundy-200 bg-burgundy-50/60 px-3 py-2 text-sm dark:border-burgundy-800 dark:bg-burgundy-900/25">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-burgundy-700 dark:text-burgundy-200">Teacher reply</p>
                    <p className="mt-1 text-charcoal dark:text-zinc-100">{ticket.teacherReply}</p>
                    {ticket.teacherReplyAt ? (
                      <p className="mt-1 text-[11px] text-charcoal/55 dark:text-zinc-400">{new Date(ticket.teacherReplyAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                ) : null}

                {role === "teacher" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void updateStatus(ticket.id, "in_progress")}>
                      In progress
                    </Button>
                    <Button variant="positive" size="sm" onClick={() => void updateStatus(ticket.id, "closed")}>
                      Close
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
