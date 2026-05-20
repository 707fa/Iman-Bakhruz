import { ChevronLeft, Megaphone, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { UserAvatar } from "../components/UserAvatar";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { hasTeacherGroupAccess } from "../lib/teacherGroups";
import { makeId } from "../lib/utils";
import type { GroupAnnouncement } from "../types";

const STORAGE_PREFIX = "iman-announcements-v1";

function readAnnouncements(groupId: string): GroupAnnouncement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${groupId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.text === "string" && typeof rec.teacherId === "string";
    }) as GroupAnnouncement[];
  } catch {
    return [];
  }
}

function writeAnnouncements(groupId: string, announcements: GroupAnnouncement[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${groupId}`, JSON.stringify(announcements));
}

export function TeacherAnnouncementsPage() {
  const { id } = useParams();
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const group = state.groups.find((entry) => entry.id === id);
  const hasAccess = !!group && !!currentTeacher && hasTeacherGroupAccess(state, currentTeacher, group.id);

  const announcements = useMemo(() => (group ? readAnnouncements(group.id) : []), [group]);

  if (!currentTeacher) return null;

  async function handleSend() {
    if (!group || !currentTeacher) return;
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      showToast({ tone: "error", message: "Message is too short." });
      return;
    }

    setSending(true);
    try {
      const announcement: GroupAnnouncement = {
        id: makeId("ann"),
        groupId: group.id,
        teacherId: currentTeacher.id,
        teacherName: currentTeacher.fullName,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      const existing = readAnnouncements(group.id);
      writeAnnouncements(group.id, [announcement, ...existing]);
      setText("");
      showToast({ tone: "success", message: "Announcement sent." });
    } catch {
      showToast({ tone: "error", message: "Failed to send announcement." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/teacher/groups">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("teacher.backToGroups")}
          </Button>
        </Link>
      </div>

      <PageHeader
        title={group ? `Announcements — ${group.title}` : "Announcements"}
        subtitle={group ? "Send messages to all students in this group" : "Select a group"}
        action={group ? <Badge variant="soft">{announcements.length}</Badge> : undefined}
      />

      {group && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {hasAccess ? (
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
              <Megaphone className="h-4 w-4 text-burgundy-700 dark:text-white" />
              New Announcement
            </h3>

            <div className="space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                placeholder="Write your announcement here..."
              />
            </div>

            <Button onClick={() => void handleSend()} disabled={sending || text.trim().length < 3} className="w-full sm:w-auto">
              {sending ? "Sending..." : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {hasAccess ? (
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
                No announcements yet.
              </CardContent>
            </Card>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserAvatar fullName={ann.teacherName} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{ann.teacherName}</p>
                      <p className="text-xs text-charcoal/50 dark:text-zinc-500">{new Date(ann.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-charcoal/80 dark:text-zinc-300 leading-relaxed">{ann.text}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StudentAnnouncementsPage() {
  const { state, currentStudent } = useAppStore();

  if (!currentStudent) return null;

  const group = state.groups.find((item) => item.id === currentStudent.groupId);
  const announcements = group ? readAnnouncements(group.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle={group ? `Messages from your teacher in ${group.title}` : "No group assigned"}
        action={group ? <Badge variant="soft">{announcements.length}</Badge> : undefined}
      />

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
            No announcements from your teacher yet.
          </CardContent>
        </Card>
      ) : (
        announcements.map((ann) => (
          <Card key={ann.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserAvatar fullName={ann.teacherName} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{ann.teacherName}</p>
                  <p className="text-xs text-charcoal/50 dark:text-zinc-500">{new Date(ann.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-charcoal/80 dark:text-zinc-300 leading-relaxed">{ann.text}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
