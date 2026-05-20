import { BookOpenCheck, ChevronLeft, Clock3, FileText, Loader2, Mic, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { useUi } from "../hooks/useUi";
import { DATA_PROVIDER_MODE } from "../lib/env";
import { getHomeworkTemplates, getTemplateLevels, getTemplateTaskTypes } from "../lib/homeworkTemplates";
import { hasTeacherGroupAccess } from "../lib/teacherGroups";
import { generateHomeworkQuestions } from "../services/api/speakingApi";
import { platformApi } from "../services/api/platformApi";
import { getApiToken } from "../services/tokenStorage";
import type { HomeworkTaskType } from "../types";

type CreateMode = "manual" | "template" | "ai";

export function TeacherHomeworkPage() {
  const { id } = useParams();
  const { state, currentTeacher } = useAppStore();
  const { t } = useUi();
  const { showToast } = useToast();
  const token = getApiToken();
  const canUseApi = DATA_PROVIDER_MODE === "api" && Boolean(token);

  const [createMode, setCreateMode] = useState<CreateMode>("manual");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDueAt, setTemplateDueAt] = useState("");
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  const [aiTopic, setAiTopic] = useState("");
  const [aiLevel, setAiLevel] = useState("pre-intermediate");
  const [aiTaskType, setAiTaskType] = useState<HomeworkTaskType>("grammar_quiz");
  const [aiQuestionCount, setAiQuestionCount] = useState("6");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiDueAt, setAiDueAt] = useState("");

  const templates = useMemo(() => getHomeworkTemplates(), []);
  const levels = useMemo(() => getTemplateLevels(), []);
  const taskTypes = useMemo(() => getTemplateTaskTypes(), []);
  const selectedTemplate = useMemo(
    () => templates.find((tmpl) => tmpl.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => {
      if (filterLevel !== "all" && tmpl.level !== filterLevel) return false;
      if (filterType !== "all" && tmpl.taskType !== filterType) return false;
      return true;
    });
  }, [templates, filterLevel, filterType]);

  const group = state.groups.find((entry) => entry.id === id);
  const hasAccess = !!group && !!currentTeacher && hasTeacherGroupAccess(state, currentTeacher, group.id);

  if (!currentTeacher) return null;

  async function handleCreateManual() {
    if (!group || !token) return;
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      showToast({ tone: "error", message: "Название задания слишком короткое." });
      return;
    }

    setCreating(true);
    try {
      await platformApi.createTeacherHomeworkTask(token, {
        groupId: group.id,
        title: trimmedTitle,
        description: description.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });
      setTitle("");
      setDescription("");
      setDueAt("");
      showToast({ tone: "success", message: "Задание создано." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateFromTemplate() {
    if (!group || !token || !selectedTemplate) return;

    setCreatingFromTemplate(true);
    try {
      const questionsText = selectedTemplate.questions.join("\n");
      await platformApi.createTeacherHomeworkTask(token, {
        groupId: group.id,
        title: selectedTemplate.title,
        description: `${selectedTemplate.description}\n\nQuestions:\n${questionsText}`,
        dueAt: templateDueAt ? new Date(templateDueAt).toISOString() : undefined,
      });
      setSelectedTemplateId(null);
      setTemplateDueAt("");
      showToast({ tone: "success", message: "Задание из шаблона создано." });
    } catch {
      showToast({ tone: "error", message: t("msg.serverUnavailable") });
    } finally {
      setCreatingFromTemplate(false);
    }
  }

  async function handleCreateFromAi() {
    if (!group || !token) return;
    const topic = aiTopic.trim();
    if (topic.length < 3) {
      showToast({ tone: "error", message: "Введите тему для генерации." });
      return;
    }

    setAiGenerating(true);
    try {
      const generated = await generateHomeworkQuestions({
        topic,
        level: aiLevel,
        taskType: aiTaskType,
        questionCount: Number(aiQuestionCount) || 6,
        groupTitle: group.title,
      });

      const questionsText = generated
        .map((q, i) => `${i + 1}. ${q.question}${q.sampleAnswer ? `\n   Sample: ${q.sampleAnswer}` : ""}`)
        .join("\n");

      await platformApi.createTeacherHomeworkTask(token, {
        groupId: group.id,
        title: `${topic} — AI Generated`,
        description: questionsText,
        dueAt: aiDueAt ? new Date(aiDueAt).toISOString() : undefined,
      });

      setAiTopic("");
      setAiDueAt("");
      showToast({ tone: "success", message: `Сгенерировано ${generated.length} вопросов.` });
    } catch {
      showToast({ tone: "error", message: "Не удалось сгенерировать вопросы." });
    } finally {
      setAiGenerating(false);
    }
  }

  const taskTypeLabel: Record<HomeworkTaskType, string> = {
    homework: "Writing",
    grammar_quiz: "Grammar Quiz",
    speaking: "Speaking",
    listening: "Listening",
  };

  const taskTypeIcon: Record<HomeworkTaskType, typeof FileText> = {
    homework: FileText,
    grammar_quiz: BookOpenCheck,
    speaking: Mic,
    listening: Clock3,
  };

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
        title={group ? `Homework — ${group.title}` : "Homework"}
        subtitle={group ? "Create and manage assignments for this group" : "Select a group to manage homework"}
        action={group ? <Badge variant="soft">{group.time}</Badge> : undefined}
      />

      {group && !hasAccess ? (
        <Card>
          <CardContent className="p-6 text-sm text-burgundy-700 dark:text-white">{t("teacher.noAccessGroup")}</CardContent>
        </Card>
      ) : null}

      {!canUseApi ? (
        <Card>
          <CardContent className="p-6 text-sm text-charcoal/70 dark:text-zinc-300">
            Homework management requires API mode. Switch your environment to use this feature.
          </CardContent>
        </Card>
      ) : null}

      {hasAccess && canUseApi ? (
        <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as CreateMode)}>
          <TabsList className="mb-4">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                  <FileText className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  Create Homework
                </h3>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 3 Writing" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full resize-y rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-base text-charcoal outline-none transition focus:border-burgundy-300 focus:ring-2 focus:ring-burgundy-100 sm:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-burgundy-700 dark:focus:ring-burgundy-900/40"
                    placeholder="What students need to do..."
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Deadline</label>
                    <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  </div>
                  <Button onClick={() => void handleCreateManual()} disabled={creating || title.trim().length < 3} className="w-full md:w-auto">
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                  <BookOpenCheck className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  From Template
                </h3>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="h-9 rounded-xl border border-burgundy-100 bg-white px-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="all">All Levels</option>
                    {levels.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-9 rounded-xl border border-burgundy-100 bg-white px-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="all">All Types</option>
                    {taskTypes.map((tt) => (
                      <option key={tt} value={tt}>{taskTypeLabel[tt]}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredTemplates.map((tmpl) => {
                    const Icon = taskTypeIcon[tmpl.taskType];
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(isSelected ? null : tmpl.id)}
                        className={`rounded-xl border p-3 text-left text-sm transition ${
                          isSelected
                            ? "border-burgundy-300 bg-burgundy-50 dark:border-burgundy-700 dark:bg-burgundy-900/30"
                            : "border-burgundy-100 bg-white hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-burgundy-700 dark:text-white" />
                          <span className="font-semibold text-charcoal dark:text-zinc-100">{tmpl.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-charcoal/60 dark:text-zinc-400">{tmpl.description}</p>
                        <div className="mt-2 flex gap-2">
                          <Badge variant="soft">{tmpl.level}</Badge>
                          <Badge variant="soft">{taskTypeLabel[tmpl.taskType]}</Badge>
                          <Badge variant="soft">{tmpl.questions.length} Q</Badge>
                        </div>
                        {isSelected ? (
                          <div className="mt-3 space-y-2">
                            <ul className="space-y-1 text-xs text-charcoal/80 dark:text-zinc-300">
                              {tmpl.questions.slice(0, 4).map((q, i) => (
                                <li key={i}>• {q}</li>
                              ))}
                              {tmpl.questions.length > 4 ? (
                                <li className="text-charcoal/50 dark:text-zinc-500">...and {tmpl.questions.length - 4} more</li>
                              ) : null}
                            </ul>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                  {filteredTemplates.length === 0 ? (
                    <p className="rounded-xl border border-burgundy-100 bg-white px-3 py-2 text-sm text-charcoal/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 sm:col-span-2">
                      No templates match your filters.
                    </p>
                  ) : null}
                </div>

                {selectedTemplate ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end rounded-2xl border border-burgundy-100 bg-white/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Deadline</label>
                      <Input type="datetime-local" value={templateDueAt} onChange={(e) => setTemplateDueAt(e.target.value)} />
                    </div>
                    <Button
                      onClick={() => void handleCreateFromTemplate()}
                      disabled={creatingFromTemplate}
                      className="w-full md:w-auto"
                    >
                      {creatingFromTemplate ? "Creating..." : `Create from "${selectedTemplate.title}"`}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <h3 className="inline-flex items-center gap-2 text-lg font-semibold text-charcoal dark:text-zinc-100">
                  <Wand2 className="h-4 w-4 text-burgundy-700 dark:text-white" />
                  AI-Generated Homework
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Topic</label>
                    <Input
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="e.g. Present Perfect, Formal emails..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Level</label>
                    <select
                      value={aiLevel}
                      onChange={(e) => setAiLevel(e.target.value)}
                      className="h-10 w-full rounded-xl border border-burgundy-100 bg-white px-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {levels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Type</label>
                    <select
                      value={aiTaskType}
                      onChange={(e) => setAiTaskType(e.target.value as HomeworkTaskType)}
                      className="h-10 w-full rounded-xl border border-burgundy-100 bg-white px-3 text-sm text-charcoal dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    >
                      {taskTypes.map((tt) => (
                        <option key={tt} value={tt}>{taskTypeLabel[tt]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Questions</label>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={aiQuestionCount}
                      onChange={(e) => setAiQuestionCount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-charcoal dark:text-zinc-100">Deadline</label>
                    <Input type="datetime-local" value={aiDueAt} onChange={(e) => setAiDueAt(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={() => void handleCreateFromAi()}
                  disabled={aiGenerating || aiTopic.trim().length < 3}
                  className="w-full md:w-auto"
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate & Create
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
