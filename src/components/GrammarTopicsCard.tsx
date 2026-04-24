import { BookText, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserRole } from "../types";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface GrammarTopicsCardProps {
  role: UserRole;
}

const levels = ["beginner", "elementary", "pre-intermediate", "intermediate", "upper-intermediate"];

export function GrammarTopicsCard({ role }: GrammarTopicsCardProps) {
  const token = getApiToken();
  const [topics, setTopics] = useState<Array<{ id: string; title: string; description: string; level: string; pptUrl: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("beginner");
  const [pptUrl, setPptUrl] = useState("");

  useEffect(() => {
    if (!token) return;
    let disposed = false;

    const load = async () => {
      setLoading(true);
      try {
        const response = await platformApi.getGrammarTopics(token);
        if (!disposed) setTopics(response);
      } catch {
        if (!disposed) setTopics([]);
      } finally {
        if (!disposed) setLoading(false);
      }
    };

    void load();
    return () => {
      disposed = true;
    };
  }, [token]);

  async function handleCreate() {
    if (!token || !title.trim() || !pptUrl.trim()) return;
    try {
      const created = await platformApi.createGrammarTopic(token, {
        title: title.trim(),
        description: description.trim(),
        level,
        pptUrl: pptUrl.trim(),
      });
      setTopics((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setPptUrl("");
    } catch {
      // Keep form filled on error.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <BookText className="h-5 w-5 text-burgundy-700 dark:text-white" />
          Grammar Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Please log in to see grammar materials.
          </p>
        ) : null}

        {role === "teacher" && token ? (
          <div className="space-y-3 rounded-2xl border border-burgundy-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Present Perfect vs Past Simple" />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short lesson summary" />
            </div>
            <div className="space-y-1.5">
              <Label>PPT URL</Label>
              <Input value={pptUrl} onChange={(event) => setPptUrl(event.target.value)} placeholder="https://..." />
            </div>
            <Button variant="secondary" onClick={() => void handleCreate()} disabled={!title.trim() || !pptUrl.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add topic
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          {loading ? <p className="text-sm text-charcoal/65 dark:text-zinc-400">Loading topics...</p> : null}
          {topics.length === 0 && !loading ? (
            <p className="rounded-2xl border border-burgundy-100 bg-white px-4 py-3 text-sm text-charcoal/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No topics yet.
            </p>
          ) : (
            topics.map((topic) => (
              <article key={topic.id} className="rounded-2xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">{topic.title}</p>
                  <span className="rounded-full bg-burgundy-50 px-2 py-1 text-xs font-semibold text-burgundy-700 dark:bg-burgundy-900/35 dark:text-white">
                    {topic.level}
                  </span>
                </div>
                {topic.description ? <p className="mt-1 text-xs text-charcoal/60 dark:text-zinc-400">{topic.description}</p> : null}
                <a
                  href={topic.pptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-semibold text-burgundy-700 hover:text-burgundy-600 dark:text-white dark:hover:text-white"
                >
                  Open PPT
                </a>
              </article>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

