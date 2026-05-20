import { ChevronRight, Headphones, Play, RotateCcw, Volume2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAppStore } from "../hooks/useAppStore";
import { useToast } from "../hooks/useToast";
import { makeId } from "../lib/utils";
import { pickGatewayVoice } from "../lib/speech";
import type { ListeningAttempt, ListeningExercise } from "../types";

const STORAGE_PREFIX = "iman-listening-v1";

function readListeningAttempts(studentId: string): ListeningAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${studentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item: unknown) => {
      if (!item || typeof item !== "object") return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.exerciseId === "string" && typeof rec.score === "number";
    }) as ListeningAttempt[];
  } catch {
    return [];
  }
}

function writeListeningAttempts(studentId: string, attempts: ListeningAttempt[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${studentId}`, JSON.stringify(attempts));
}

const BUILTIN_EXERCISES: ListeningExercise[] = [
  {
    id: "le-beginner-daily-routine",
    title: "Daily Routine",
    level: "beginner",
    transcript:
      "My name is Sarah. I wake up at seven o'clock every morning. First, I brush my teeth and wash my face. Then I eat breakfast — I usually have toast with jam and a cup of tea. After breakfast, I go to school by bus. My classes start at eight thirty. I have lunch at school at twelve o'clock. In the afternoon, I go home and do my homework. In the evening, I watch TV or read a book. I go to bed at ten o'clock.",
    questions: [
      { id: "q1", question: "What time does Sarah wake up?", options: ["6 o'clock", "7 o'clock", "8 o'clock", "9 o'clock"], correctIndex: 1 },
      { id: "q2", question: "What does she usually have for breakfast?", options: ["Eggs and bacon", "Rice and soup", "Toast with jam and tea", "Cereal and milk"], correctIndex: 2 },
      { id: "q3", question: "How does Sarah go to school?", options: ["By car", "By bus", "On foot", "By bike"], correctIndex: 1 },
      { id: "q4", question: "What does Sarah do in the evening?", options: ["Plays games", "Cooks dinner", "Watches TV or reads", "Goes for a walk"], correctIndex: 2 },
    ],
  },
  {
    id: "le-elementary-shopping",
    title: "Shopping Trip",
    level: "elementary",
    transcript:
      "Last Saturday, I went shopping with my friend Tom. We went to the big shopping centre near our house. First, we visited the bookshop. I bought a new dictionary because I am learning English. Tom bought a science fiction novel. Then we went to the clothes shop. I tried on a blue jacket, but it was too big for me. Tom found a nice T-shirt on sale. After that, we were hungry, so we had lunch at the food court. I ate a pizza and Tom had a burger. We spent about two hours at the shopping centre and then took a taxi home.",
    questions: [
      { id: "q1", question: "Where did they go shopping?", options: ["A small market", "A big shopping centre", "A supermarket", "A street market"], correctIndex: 1 },
      { id: "q2", question: "Why did the narrator buy a dictionary?", options: ["For school", "As a gift", "Learning English", "It was on sale"], correctIndex: 2 },
      { id: "q3", question: "Why didn't the narrator buy the blue jacket?", options: ["Too expensive", "Wrong colour", "Too big", "Not available"], correctIndex: 2 },
      { id: "q4", question: "How did they get home?", options: ["By bus", "On foot", "By taxi", "By train"], correctIndex: 2 },
    ],
  },
  {
    id: "le-preintermediate-travel",
    title: "Travel Experience",
    level: "pre-intermediate",
    transcript:
      "I have always wanted to visit Japan, and last summer my dream finally came true. I flew from London to Tokyo, which took about eleven hours. When I arrived, the first thing I noticed was how clean and organised everything was. I stayed in a small hotel in the Shinjuku area. On the first day, I visited the Meiji Shrine, which is a beautiful and peaceful place in the middle of the city. The next day, I took a bullet train to Kyoto to see the famous temples and gardens. The food was amazing — I tried sushi, ramen, and tempura. The people were very polite and helpful, even though my Japanese was not very good. I would love to go back someday.",
    questions: [
      { id: "q1", question: "How long was the flight from London to Tokyo?", options: ["About 8 hours", "About 11 hours", "About 14 hours", "About 6 hours"], correctIndex: 1 },
      { id: "q2", question: "What was the first thing the narrator noticed about Japan?", options: ["The food", "The people", "How clean and organised it was", "The temples"], correctIndex: 2 },
      { id: "q3", question: "What did the narrator do on the second day?", options: ["Visited Meiji Shrine", "Took a bullet train to Kyoto", "Went shopping", "Ate at a restaurant"], correctIndex: 1 },
      { id: "q4", question: "How did the narrator feel about the people in Japan?", options: ["They were rude", "They were polite and helpful", "They were indifferent", "They were unfriendly"], correctIndex: 1 },
    ],
  },
  {
    id: "le-intermediate-technology",
    title: "Technology in Education",
    level: "intermediate",
    transcript:
      "Technology is changing the way students learn around the world. In many schools, traditional textbooks are being replaced by tablets and laptops. Teachers can now use interactive presentations, educational videos, and online quizzes to make lessons more engaging. Some schools have even introduced virtual reality headsets, allowing students to explore historical sites or scientific concepts in three dimensions. However, not everyone agrees that technology is always beneficial. Critics argue that too much screen time can harm students' attention spans and reduce face-to-face social interaction. Additionally, schools in poorer areas may not have the budget for expensive devices, which could increase the gap between rich and poor students. The key, according to many educators, is finding the right balance — using technology as a tool to enhance learning, not replace the human connection between teachers and students.",
    questions: [
      { id: "q1", question: "What is replacing traditional textbooks in many schools?", options: ["More homework", "Tablets and laptops", "Audio recordings", "Class discussions"], correctIndex: 1 },
      { id: "q2", question: "What can virtual reality headsets help students do?", options: ["Play games in class", "Skip lessons", "Explore historical sites in 3D", "Chat with friends"], correctIndex: 2 },
      { id: "q3", question: "What do critics worry about?", options: ["Technology is too cheap", "Teachers will lose their jobs", "Too much screen time harms attention", "Students prefer textbooks"], correctIndex: 2 },
      { id: "q4", question: "What do many educators say is the key?", options: ["Removing all technology", "Using technology only for tests", "Finding the right balance", "Replacing teachers with AI"], correctIndex: 2 },
    ],
  },
];

type PracticePhase = "select" | "listening" | "answering" | "result";

export function ListeningPracticePage() {
  const { currentStudent } = useAppStore();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<PracticePhase>("select");
  const [exercise, setExercise] = useState<ListeningExercise | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListened, setHasListened] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const previousAttempts = useMemo(
    () => (currentStudent ? readListeningAttempts(currentStudent.id) : []),
    [currentStudent],
  );
  const completedExerciseIds = useMemo(
    () => new Set(previousAttempts.map((a) => a.exerciseId)),
    [previousAttempts],
  );

  function selectExercise(ex: ListeningExercise) {
    setExercise(ex);
    setAnswers({});
    setPhase("listening");
    setHasListened(false);
    setIsPlaying(false);
  }

  function startPlayback() {
    if (!exercise || typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const voiceName = pickGatewayVoice("en-US");
    const chunks = splitTranscript(exercise.transcript, 200);
    let chunkIndex = 0;

    function speakNext() {
      if (chunkIndex >= chunks.length) {
        setIsPlaying(false);
        setHasListened(true);
        return;
      }

      const utt = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utt.lang = "en-US";
      utt.rate = 0.9;
      if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.name === voiceName);
        if (match) utt.voice = match;
      }
      utt.onend = () => {
        chunkIndex++;
        speakNext();
      };
      utt.onerror = () => {
        setIsPlaying(false);
        setHasListened(true);
      };
      utteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    }

    setIsPlaying(true);
    speakNext();
  }

  function stopPlayback() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setHasListened(true);
  }

  function splitTranscript(text: string, maxLen: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
      if (current.length + sentence.length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  function handleAnswer(questionId: string, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function submitAnswers() {
    if (!exercise || !currentStudent) return;

    let correct = 0;
    for (const q of exercise.questions) {
      if (answers[q.id] === q.correctIndex) correct++;
    }
    const score = Math.round((correct / exercise.questions.length) * 100);

    const attempt: ListeningAttempt = {
      id: makeId("la"),
      exerciseId: exercise.id,
      studentId: currentStudent.id,
      score,
      answers: exercise.questions.map((q) => answers[q.id] ?? -1),
      createdAt: new Date().toISOString(),
    };

    const existing = readListeningAttempts(currentStudent.id);
    writeListeningAttempts(currentStudent.id, [attempt, ...existing]);

    setPhase("result");
    showToast({ tone: score >= 70 ? "success" : "error", message: `Score: ${score}% — ${correct}/${exercise.questions.length} correct` });
  }

  function resetPractice() {
    setExercise(null);
    setAnswers({});
    setPhase("select");
    setHasListened(false);
    setIsPlaying(false);
  }

  if (!currentStudent) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listening Practice"
        subtitle="Listen to passages and answer comprehension questions"
        action={
          <Badge variant="soft">
            <Headphones className="mr-1 h-3 w-3" />
            {previousAttempts.length} completed
          </Badge>
        }
      />

      <AnimatePresence mode="wait">
        {phase === "select" ? (
          <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 sm:grid-cols-2">
            {BUILTIN_EXERCISES.map((ex) => {
              const completed = completedExerciseIds.has(ex.id);
              const bestScore = previousAttempts.filter((a) => a.exerciseId === ex.id).reduce((best, a) => Math.max(best, a.score), 0);
              return (
                <Card key={ex.id} className={completed ? "border-green-200 dark:border-green-900" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-2 font-semibold text-charcoal dark:text-zinc-100">
                        <Headphones className="h-4 w-4 text-burgundy-700 dark:text-white" />
                        {ex.title}
                      </h3>
                      <Badge variant="soft">{ex.level}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-charcoal/60 dark:text-zinc-400">
                      {ex.transcript.slice(0, 100)}...
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="soft">{ex.questions.length} questions</Badge>
                        {completed ? (
                          <Badge variant="positive">Best: {bestScore}%</Badge>
                        ) : null}
                      </div>
                      <Button size="sm" onClick={() => selectExercise(ex)}>
                        {completed ? "Retry" : "Start"}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        ) : null}

        {phase === "listening" && exercise ? (
          <motion.div key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">{exercise.title}</h3>
                  <Badge variant="soft">{exercise.level}</Badge>
                </div>

                <div className="flex flex-col items-center gap-4 py-6">
                  <div className={`rounded-full p-4 ${isPlaying ? "bg-burgundy-100 dark:bg-burgundy-900/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                    <Volume2 className={`h-8 w-8 ${isPlaying ? "text-burgundy-700 dark:text-white animate-pulse" : "text-charcoal/40 dark:text-zinc-400"}`} />
                  </div>
                  <p className="text-sm text-charcoal/60 dark:text-zinc-400 text-center">
                    {isPlaying ? "Playing audio... Listen carefully." : "Press play to hear the passage."}
                  </p>
                  <div className="flex gap-2">
                    {!isPlaying ? (
                      <Button onClick={startPlayback}>
                        <Play className="mr-2 h-4 w-4" />
                        Play Audio
                      </Button>
                    ) : (
                      <Button variant="destructive" onClick={stopPlayback}>
                        <X className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    )}
                    {hasListened ? (
                      <Button variant="secondary" onClick={startPlayback}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Replay
                      </Button>
                    ) : null}
                  </div>
                </div>

                {hasListened ? (
                  <div className="rounded-xl border border-burgundy-100 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-charcoal/60 dark:text-zinc-400">Transcript (for reference)</p>
                    <p className="text-sm text-charcoal/80 dark:text-zinc-300 leading-relaxed">{exercise.transcript}</p>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button onClick={() => setPhase("answering")} disabled={!hasListened} className="w-full sm:w-auto">
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Answer Questions
                  </Button>
                  <Button variant="ghost" onClick={resetPractice}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {phase === "answering" && exercise ? (
          <motion.div key="answering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">{exercise.title} — Questions</h3>
                  <Badge variant="soft">
                    {Object.keys(answers).length}/{exercise.questions.length} answered
                  </Badge>
                </div>

                <div className="space-y-5">
                  {exercise.questions.map((q, qIndex) => (
                    <div key={q.id} className="space-y-2">
                      <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                        {qIndex + 1}. {q.question}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = answers[q.id] === optIndex;
                          return (
                            <button
                              key={optIndex}
                              type="button"
                              onClick={() => handleAnswer(q.id, optIndex)}
                              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                                isSelected
                                  ? "border-burgundy-300 bg-burgundy-50 font-semibold text-burgundy-800 dark:border-burgundy-700 dark:bg-burgundy-900/30 dark:text-burgundy-100"
                                  : "border-burgundy-100 bg-white text-charcoal/80 hover:border-burgundy-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}) {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={submitAnswers}
                    disabled={Object.keys(answers).length < exercise.questions.length}
                    className="w-full sm:w-auto"
                  >
                    Submit Answers
                  </Button>
                  <Button variant="ghost" onClick={() => setPhase("listening")}>
                    Back to Listening
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {phase === "result" && exercise ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-charcoal dark:text-zinc-100">Results — {exercise.title}</h3>

                {(() => {
                  let correct = 0;
                  for (const q of exercise.questions) {
                    if (answers[q.id] === q.correctIndex) correct++;
                  }
                  const score = Math.round((correct / exercise.questions.length) * 100);
                  return (
                    <div className={`rounded-xl border p-4 text-center ${score >= 70 ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"}`}>
                      <p className={`text-4xl font-black ${score >= 70 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>{score}%</p>
                      <p className="mt-1 text-sm text-charcoal/70 dark:text-zinc-300">{correct} of {exercise.questions.length} correct</p>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  {exercise.questions.map((q, qIndex) => {
                    const userAnswer = answers[q.id];
                    const isCorrect = userAnswer === q.correctIndex;
                    return (
                      <div key={q.id} className={`rounded-xl border p-3 ${isCorrect ? "border-green-200 dark:border-green-900" : "border-red-200 dark:border-red-900"}`}>
                        <p className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                          {qIndex + 1}. {q.question}
                        </p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, optIndex) => {
                            const isUserChoice = userAnswer === optIndex;
                            const isRightAnswer = optIndex === q.correctIndex;
                            let cls = "text-sm ";
                            if (isRightAnswer) cls += "font-semibold text-green-700 dark:text-green-400";
                            else if (isUserChoice && !isRightAnswer) cls += "text-red-600 line-through dark:text-red-400";
                            else cls += "text-charcoal/60 dark:text-zinc-400";
                            return (
                              <p key={optIndex} className={cls}>
                                {String.fromCharCode(65 + optIndex)}) {opt}
                                {isRightAnswer ? " ✓" : ""}
                                {isUserChoice && !isRightAnswer ? " ✗" : ""}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button onClick={resetPractice}>Back to Exercises</Button>
                  <Button variant="secondary" onClick={() => selectExercise(exercise)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
