import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Bot,
  Brain,
  CheckCircle2,
  CopyPlus,
  Gamepad2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  UsersRound,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { Card, type LearningCard } from "./Card";
import { GameBoard, type AnswerCheckResult, type CardGamePlayer } from "./GameBoard";
import { useAppStore } from "../hooks/useAppStore";
import { useSocket } from "../hooks/useSocket";
import { Button } from "./ui/button";

type ArenaTab = "homework" | "lobby" | "ketka" | "speed" | "memory" | "emoji";
type InviteStatus = "pending" | "accepted" | "declined";

interface LocalPlayer extends CardGamePlayer {
  isHuman?: boolean;
  groupId?: string;
}

interface GameInvite {
  studentId: string;
  status: InviteStatus;
  inviteId?: string;
  fromStudentId?: string;
  fromStudentName?: string;
}

interface KetkaOnlineStudent {
  studentId: string;
  fullName: string;
  groupId: string;
}

interface KetkaInvitePayload {
  inviteId: string;
  fromStudentId: string;
  fromStudentName: string;
  toStudentId: string;
  toStudentName: string;
  groupId: string;
  accepted?: boolean;
}

const STORAGE_KEY = "ketka-homework-deck-v2";

const fallbackDeck: LearningCard[] = [
  { id: "seed-car", word: "car", translation: "машина", hintText: "fast transport", hintEmoji: "🚗" },
  { id: "seed-honest", word: "honest", translation: "честный", hintText: "does not lie", hintEmoji: "🤝" },
  { id: "seed-journey", word: "journey", translation: "путешествие", hintText: "long trip", hintEmoji: "🧭" },
  { id: "seed-brave", word: "brave", translation: "смелый", hintText: "not afraid", hintEmoji: "🛡️" },
];

const aiWords = [
  ["confident", "уверенный", "believes in himself", "🦁"],
  ["schedule", "расписание", "lessons and time", "🗓️"],
  ["improve", "улучшать", "make better", "📈"],
  ["polite", "вежливый", "good manners", "🙏"],
  ["choice", "выбор", "one of options", "🎯"],
] satisfies Array<[string, string, string, string]>;

function readDeck(): LearningCard[] {
  if (typeof window === "undefined") return fallbackDeck;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallbackDeck;
  try {
    const parsed = JSON.parse(raw) as LearningCard[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallbackDeck;
  } catch {
    return fallbackDeck;
  }
}

function saveDeck(cards: LearningCard[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function levenshtein(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, row) => [row, ...Array(b.length).fill(0)]);
  for (let column = 1; column <= b.length; column += 1) rows[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + cost,
      );
    }
  }

  return rows[a.length][b.length];
}

function aiCheckTranslation(answerText: string, expectedTranslation: string): AnswerCheckResult {
  const answer = normalizeText(answerText);
  const expected = normalizeText(expectedTranslation);
  const distance = levenshtein(answer, expected);
  const maxAllowedDistance = expected.length <= 4 ? 1 : 2;
  const isCorrect = answer.length > 0 && (answer === expected || distance <= maxAllowedDistance);

  return {
    isCorrect,
    answerText: answerText.trim(),
    distance,
    message: isCorrect
      ? distance === 0
        ? "AI принял ответ как точный."
        : `AI принял: похоже на правильный перевод, опечаток примерно ${distance}.`
      : `AI не принял: ответ слишком далеко от перевода. Ошибок примерно ${distance}.`,
  };
}

function isStudentOnline(studentId: string): boolean {
  if (studentId === "demo-madina") return false;
  return true;
}

function cloneDeckForOpponent(deck: LearningCard[], name: string): LearningCard[] {
  const safeDeck = deck.length ? deck : fallbackDeck;
  return shuffle(safeDeck)
    .slice(0, Math.min(8, Math.max(3, safeDeck.length)))
    .map((card, index) => ({
      ...card,
      id: `${name}-${index}-${card.id}`,
    }));
}

function findNextPlayerIndex(players: LocalPlayer[], currentIndex: number): number {
  if (players.length === 0) return 0;
  for (let offset = 1; offset <= players.length; offset += 1) {
    const nextIndex = (currentIndex + offset) % players.length;
    if ((players[nextIndex]?.cards.length ?? 0) > 0) return nextIndex;
  }
  return currentIndex;
}

export function MultiplayerKetka() {
  const { state, currentStudent, awardGamePoints } = useAppStore();
  const socket = useSocket();
  const [tab, setTab] = useState<ArenaTab>("homework");
  const [deck, setDeck] = useState<LearningCard[]>(() => readDeck());
  const [form, setForm] = useState({ word: "", translation: "", hintText: "", hintEmoji: "" });
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<GameInvite[]>([]);
  const [onlineStudentIds, setOnlineStudentIds] = useState<Set<string>>(new Set());
  const [socketNotice, setSocketNotice] = useState("");
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [tablePile, setTablePile] = useState<LearningCard[]>([]);
  const [lastAnswer, setLastAnswer] = useState<AnswerCheckResult | null>(null);
  const [memoryOpened, setMemoryOpened] = useState<string[]>([]);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);

  useEffect(() => {
    saveDeck(deck);
  }, [deck]);

  useEffect(() => {
    if (!socket || !currentStudent?.id || !currentStudent.groupId) {
      setOnlineStudentIds(new Set());
      return;
    }

    socket.emit("KETKA_REGISTER_STUDENT", {
      studentId: currentStudent.id,
      fullName: currentStudent.fullName,
      groupId: currentStudent.groupId,
    });

    const handleOnlineStudents = (payload: { groupId: string; students: KetkaOnlineStudent[] }) => {
      if (payload.groupId !== currentStudent.groupId) return;
      setOnlineStudentIds(new Set(payload.students.map((student) => student.studentId)));
    };

    const handleInviteReceived = (payload: KetkaInvitePayload) => {
      if (payload.groupId !== currentStudent.groupId || payload.toStudentId !== currentStudent.id) return;
      setIncomingInvites((current) => [
        {
          studentId: payload.fromStudentId,
          fromStudentId: payload.fromStudentId,
          fromStudentName: payload.fromStudentName,
          inviteId: payload.inviteId,
          status: "pending",
        },
        ...current.filter((invite) => invite.inviteId !== payload.inviteId),
      ]);
      setTab("lobby");
      setSocketNotice(`${payload.fromStudentName} sent you a Ketka invite.`);
    };

    const handleInviteAccepted = (payload: KetkaInvitePayload) => {
      if (payload.fromStudentId === currentStudent.id) {
        setInvites((current) =>
          current.map((invite) => (invite.inviteId === payload.inviteId || invite.studentId === payload.toStudentId ? { ...invite, status: "accepted" } : invite)),
        );
        setSocketNotice(`${payload.toStudentName} accepted your Ketka invite.`);
      }
    };

    const handleInviteDeclined = (payload: KetkaInvitePayload) => {
      if (payload.fromStudentId === currentStudent.id) {
        setInvites((current) =>
          current.map((invite) => (invite.inviteId === payload.inviteId || invite.studentId === payload.toStudentId ? { ...invite, status: "declined" } : invite)),
        );
        setSocketNotice(`${payload.toStudentName} declined your Ketka invite.`);
      }
    };

    socket.on("KETKA_ONLINE_STUDENTS", handleOnlineStudents);
    socket.on("KETKA_INVITE_RECEIVED", handleInviteReceived);
    socket.on("KETKA_INVITE_ACCEPTED", handleInviteAccepted);
    socket.on("KETKA_INVITE_DECLINED", handleInviteDeclined);

    return () => {
      socket.off("KETKA_ONLINE_STUDENTS", handleOnlineStudents);
      socket.off("KETKA_INVITE_RECEIVED", handleInviteReceived);
      socket.off("KETKA_INVITE_ACCEPTED", handleInviteAccepted);
      socket.off("KETKA_INVITE_DECLINED", handleInviteDeclined);
    };
  }, [socket, currentStudent?.id, currentStudent?.groupId, currentStudent?.fullName]);

  const classmates = useMemo(() => {
    const myGroupId = currentStudent?.groupId;
    const sameGroup = state.students
      .filter((student) => student.id !== currentStudent?.id && (!myGroupId || student.groupId === myGroupId))
      .map((student) => ({ ...student, isConnected: socket ? onlineStudentIds.has(student.id) : isStudentOnline(student.id) }));
    const fallback = [
      { id: "demo-aisha", fullName: "Aisha Demo", groupId: myGroupId ?? "", isConnected: true },
      { id: "demo-umar", fullName: "Umar Demo", groupId: myGroupId ?? "", isConnected: true },
      { id: "demo-madina", fullName: "Madina Demo", groupId: myGroupId ?? "", isConnected: false },
    ];
    return sameGroup.length ? sameGroup : fallback;
  }, [currentStudent, onlineStudentIds, socket, state.students]);

  const onlineClassmates = classmates.filter((student) => student.isConnected);
  const offlineCount = classmates.length - onlineClassmates.length;
  const acceptedInvites = invites.filter((invite) => invite.status === "accepted");
  const currentPlayer = players[currentPlayerIndex];
  const currentAnswererIndex = players.length > 1 ? findNextPlayerIndex(players, currentPlayerIndex) : -1;
  const answerer = currentAnswererIndex >= 0 && currentAnswererIndex !== currentPlayerIndex ? players[currentAnswererIndex] : null;
  const activeCard = currentPlayer?.cards[0] ?? null;
  const canStart = acceptedInvites.length >= 1 && acceptedInvites.length <= 3 && deck.length > 0;

  function addCard() {
    if (!form.word.trim() || !form.translation.trim()) return;
    setDeck((current) => [
      {
        id: makeId("card"),
        word: form.word.trim(),
        translation: form.translation.trim(),
        hintText: form.hintText.trim() || undefined,
        hintEmoji: form.hintEmoji.trim() || undefined,
      },
      ...current,
    ]);
    setForm({ word: "", translation: "", hintText: "", hintEmoji: "" });
  }

  function addAiCards() {
    setDeck((current) => [
      ...aiWords.map(([word, translation, hintText, hintEmoji]) => ({
        id: makeId("ai"),
        word,
        translation,
        hintText,
        hintEmoji,
      })),
      ...current,
    ]);
  }

  function sendInvite(studentId: string) {
    const student = onlineClassmates.find((item) => item.id === studentId);
    if (!student || acceptedInvites.length >= 3) return;

    if (socket) {
      socket.emit("KETKA_SEND_INVITE", { toStudentId: studentId }, (reply: { ok: boolean; error?: string; invite?: KetkaInvitePayload }) => {
        if (!reply.ok || !reply.invite) {
          setSocketNotice(reply.error ?? "Could not send invite.");
          return;
        }

        setInvites((current) => {
          const existing = current.find((invite) => invite.studentId === studentId);
          const nextInvite: GameInvite = {
            studentId,
            inviteId: reply.invite?.inviteId,
            status: "pending",
          };
          if (existing) {
            return current.map((invite) => (invite.studentId === studentId ? nextInvite : invite));
          }
          return [...current, nextInvite];
        });
        setSocketNotice(`Invite sent to ${student.fullName}.`);
      });
      return;
    }

    setInvites((current) => {
      const existing = current.find((invite) => invite.studentId === studentId);
      if (existing) {
        return current.map((invite) => (invite.studentId === studentId ? { ...invite, status: "pending" } : invite));
      }
      return [...current, { studentId, status: "pending" }];
    });
  }

  function answerInvite(studentId: string, status: "accepted" | "declined") {
    setInvites((current) => current.map((invite) => (invite.studentId === studentId ? { ...invite, status } : invite)));
  }

  function respondIncomingInvite(invite: GameInvite, accepted: boolean) {
    if (!invite.inviteId || !socket) return;

    socket.emit("KETKA_RESPOND_INVITE", { inviteId: invite.inviteId, accepted }, (reply: { ok: boolean; error?: string }) => {
      if (!reply.ok) {
        setSocketNotice(reply.error ?? "Could not respond to invite.");
        return;
      }

      setIncomingInvites((current) => current.filter((item) => item.inviteId !== invite.inviteId));
      setSocketNotice(accepted ? `You accepted ${invite.fromStudentName}'s invite.` : `You declined ${invite.fromStudentName}'s invite.`);
    });
  }

  function startKetka() {
    const me: LocalPlayer = {
      playerId: currentStudent?.id ?? "me",
      playerName: currentStudent?.fullName ?? "Me",
      cards: shuffle(deck).map((card) => ({ ...card, id: `me-${card.id}` })),
      deckSize: deck.length,
      score: 0,
      isHuman: true,
      isConnected: true,
      groupId: currentStudent?.groupId,
    };
    const opponents = acceptedInvites.map((invite) => {
      const student = onlineClassmates.find((item) => item.id === invite.studentId);
      const name = student?.fullName ?? "Player";
      const cards = cloneDeckForOpponent(deck, name);
      return {
        playerId: invite.studentId,
        playerName: name,
        cards,
        deckSize: cards.length,
        score: 0,
        isConnected: true,
        groupId: student?.groupId,
      };
    });

    setPlayers([me, ...opponents]);
    setWinnerName("");
    setWinnerId("");
    setTablePile([]);
    setLastAnswer(null);
    setCurrentPlayerIndex(0);
    setTab("ketka");
  }

  function checkAnswer(cardId: string, answerText: string): AnswerCheckResult {
    const card = players.flatMap((player) => player.cards).find((item) => item.id === cardId) ?? activeCard;
    if (!card) {
      return { isCorrect: false, answerText, distance: 999, message: "AI не нашел карточку для проверки." };
    }
    return aiCheckTranslation(answerText, card.translation);
  }

  function resolveAnswer(cardId: string, correct: boolean, answerText = "") {
    const check = activeCard ? aiCheckTranslation(answerText, activeCard.translation) : null;
    setLastAnswer(
      check && check.isCorrect === correct
        ? check
        : {
            isCorrect: correct,
            answerText: answerText.trim() || "устный ответ",
            distance: check?.distance ?? 0,
            message: correct ? "Ответ принят вручную." : "Ответ не принят вручную.",
          },
    );
    const next = players.map((player) => ({ ...player, cards: [...player.cards] }));
    const presenter = next[currentPlayerIndex];
    const answererIndex = findNextPlayerIndex(next, currentPlayerIndex);
    const cardIndex = presenter?.cards.findIndex((card) => card.id === cardId) ?? -1;
    if (!presenter || cardIndex === -1) return;

    const [card] = presenter.cards.splice(cardIndex, 1);
    if (correct) {
      presenter.score = (presenter.score ?? 0) + 1;
      setTablePile((currentPile) => [...currentPile, card]);
    } else {
      const answerPlayer = next[answererIndex];
      if (answerPlayer) {
        const takenCards = [...tablePile, card].map((item) => ({
          ...item,
          id: `${answerPlayer.playerId}-taken-${makeId(item.id)}`,
        }));
        answerPlayer.cards.push(...takenCards);
      }
      setTablePile([]);
    }

    const nextPlayers = next.map((player) => ({ ...player, deckSize: player.cards.length }));
    const nextWinner = nextPlayers.find((player) => player.cards.length === 0);
    const nextWinnerGroupId = nextWinner?.groupId ?? state.students.find((student) => student.id === nextWinner?.playerId)?.groupId ?? currentStudent?.groupId ?? "";
    setPlayers(nextPlayers);
    setCurrentPlayerIndex(findNextPlayerIndex(nextPlayers, currentPlayerIndex));

    if (nextWinner && !winnerId) {
      setWinnerName(nextWinner.playerName);
      setWinnerId(nextWinner.playerId);
      if (nextWinnerGroupId) {
        awardGamePoints(nextWinner.playerId, nextWinnerGroupId, {
          value: 5,
          label: "Ketka Classic win +5",
        });
      }
    }
  }

  const memoryCards = useMemo(
    () =>
      shuffle(
        deck.slice(0, 6).flatMap((card) => [
          { id: `${card.id}-word`, pair: card.id, label: card.word },
          { id: `${card.id}-translation`, pair: card.id, label: card.translation },
        ]),
      ),
    [deck],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-burgundy-100 bg-[radial-gradient(circle_at_top_left,rgba(128,0,32,0.18),transparent_35%),linear-gradient(135deg,#111014,#1a1114_45%,#08080b)] p-5 text-white shadow-lift sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">Ketka Arena</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Онлайн кетка для английского</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold text-white/65">
              Ученики делают карточки как домашку, на уроке отправляют приглашение онлайн-соперникам, отвечают с AI-проверкой и играют до нуля карточек.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/10 p-2 backdrop-blur-xl">
            <Stat label="Cards" value={deck.length} />
            <Stat label="Online" value={onlineClassmates.length} />
            <Stat label="Mode" value="2-4" />
          </div>
        </div>
      </section>

      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <TabButton active={tab === "homework"} onClick={() => setTab("homework")} icon={<CopyPlus className="h-4 w-4" />}>Homework cards</TabButton>
        <TabButton active={tab === "lobby"} onClick={() => setTab("lobby")} icon={<UsersRound className="h-4 w-4" />}>Online lobby</TabButton>
        <TabButton active={tab === "ketka"} onClick={() => setTab("ketka")} icon={<Gamepad2 className="h-4 w-4" />}>Ketka classic</TabButton>
        <TabButton active={tab === "speed"} onClick={() => setTab("speed")} icon={<Zap className="h-4 w-4" />}>Speed</TabButton>
        <TabButton active={tab === "memory"} onClick={() => setTab("memory")} icon={<Brain className="h-4 w-4" />}>Memory</TabButton>
        <TabButton active={tab === "emoji"} onClick={() => setTab("emoji")} icon={<Sparkles className="h-4 w-4" />}>Emoji hint</TabButton>
      </nav>

      {tab === "homework" ? (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <Panel title="Создать домашнюю карточку" subtitle="Ученик сам пишет слово, подсказку, emoji и перевод. Это его homework deck для игры.">
            <CardForm form={form} setForm={setForm} onAdd={addCard} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={addAiCards} variant="secondary">
                <Bot className="mr-2 h-4 w-4" />
                AI ideas
              </Button>
              <Button type="button" onClick={() => setDeck([])} variant="ghost">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear deck
              </Button>
            </div>
          </Panel>

          <Panel title="Моя стопка карточек" subtitle="Карточки выглядят как настоящие листочки: front с английским словом и hint, back с переводом.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {deck.map((card) => (
                  <motion.div key={card.id} layout>
                    <Card card={card} compact />
                    <button
                      type="button"
                      onClick={() => setDeck((current) => current.filter((item) => item.id !== card.id))}
                      className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                    >
                      Remove
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === "lobby" ? (
        <Panel title="Онлайн лобби и приглашения" subtitle="Играть можно только с теми, кто сейчас онлайн. Сначала отправь запрос, потом ученик принимает или отказывает.">
          {socketNotice ? (
            <div className="mb-4 rounded-3xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-900 dark:border-cyan-900/40 dark:bg-cyan-950/30 dark:text-cyan-100">
              {socketNotice}
            </div>
          ) : null}

          {incomingInvites.length > 0 ? (
            <div className="mb-4 grid gap-3">
              {incomingInvites.map((invite) => (
                <div key={invite.inviteId ?? invite.studentId} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/25">
                  <p className="flex items-center text-sm font-black text-emerald-900 dark:text-emerald-100">
                    <BellRing className="mr-2 h-4 w-4" />
                    {invite.fromStudentName ?? "Student"} wants to play Ketka with you.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => respondIncomingInvite(invite, true)}
                      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white"
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respondIncomingInvite(invite, false)}
                      className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!socket ? (
            <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
              Socket is not connected yet. Real online invites will work when the backend is available.
            </div>
          ) : null}

          <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {offlineCount > 0
              ? `${offlineCount} ученик(ов) сейчас offline, поэтому кнопка игры с ними не показывается как доступная.`
              : "Все ученики из списка сейчас online."}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {onlineClassmates.map((student) => {
              const invite = invites.find((item) => item.studentId === student.id);
              return (
                <div key={student.id} className="rounded-3xl border border-burgundy-100 bg-white p-4 shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{student.fullName}</p>
                      <p className="mt-1 inline-flex items-center text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                        <Wifi className="mr-1.5 h-3.5 w-3.5" />
                        online
                      </p>
                    </div>
                    <InviteBadge status={invite?.status} />
                  </div>

                  {!invite ? (
                    <Button type="button" onClick={() => sendInvite(student.id)} className="mt-4 w-full">
                      <Send className="mr-2 h-4 w-4" />
                      Send request
                    </Button>
                  ) : invite.status === "pending" ? (
                    <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900/40 dark:bg-cyan-950/30">
                      <p className="flex items-center text-sm font-black text-cyan-900 dark:text-cyan-100">
                        <BellRing className="mr-2 h-4 w-4" />
                        Уведомление пришло ученику
                      </p>
                      {!socket ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => answerInvite(student.id, "accepted")}
                          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => answerInvite(student.id, "declined")}
                          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white"
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          Decline
                        </button>
                      </div>
                      ) : (
                        <p className="mt-2 text-xs font-bold text-cyan-800 dark:text-cyan-100">Waiting for accept or decline on the other device.</p>
                      )}
                    </div>
                  ) : (
                    <Button type="button" onClick={() => sendInvite(student.id)} variant="secondary" className="mt-4 w-full">
                      Send again
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {offlineCount > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {classmates.filter((student) => !student.isConnected).map((student) => (
                <span key={student.id} className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                  <WifiOff className="mr-1.5 h-3.5 w-3.5" />
                  {student.fullName} offline
                </span>
              ))}
            </div>
          ) : null}

          <Button type="button" disabled={!canStart} onClick={startKetka} className="mt-5 w-full">
            <Gamepad2 className="mr-2 h-4 w-4" />
            Start with {acceptedInvites.length + 1} player(s)
          </Button>
        </Panel>
      ) : null}

      {tab === "ketka" ? (
        players.length > 0 ? (
          <div className="overflow-hidden rounded-[2rem]">
            {winnerName ? (
              <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100">
                <p className="font-black">Победитель: {winnerName}. У него 0 карточек, +5 баллов добавлено в рейтинг, если это реальный ученик.</p>
              </div>
            ) : null}
            <GameBoard
              players={players}
              currentPlayerTurn={currentPlayer?.playerId ?? ""}
              activeAnswererId={answerer?.playerId}
              currentCard={activeCard}
              localPlayerId={currentStudent?.id ?? "me"}
              tablePileCount={tablePile.length}
              lastAnswer={lastAnswer}
              onCheckAnswer={checkAnswer}
              onCardAnswered={resolveAnswer}
            />
          </div>
        ) : (
          <Panel title="Сначала собери онлайн комнату" subtitle="Перейди в Online lobby, отправь запрос 1-3 ученикам и дождись accept.">
            <Button type="button" onClick={() => setTab("lobby")}>Open lobby</Button>
          </Panel>
        )
      ) : null}

      {tab === "speed" ? (
        <Panel title="Speed Translation" subtitle="Быстро выбери правильный перевод. Хорошая разминка перед Ketka Classic.">
          <SpeedGame deck={deck} index={speedIndex} setIndex={setSpeedIndex} score={speedScore} setScore={setSpeedScore} />
        </Panel>
      ) : null}

      {tab === "memory" ? (
        <Panel title="Memory Match" subtitle="Найди пары: английское слово и русский перевод.">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {memoryCards.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMemoryOpened((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.slice(-1), item.id])}
                className="min-h-24 rounded-3xl border border-burgundy-100 bg-white p-4 text-lg font-black shadow-soft transition hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-950"
              >
                {memoryOpened.includes(item.id) ? item.label : "Ketka"}
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {tab === "emoji" ? (
        <Panel title="Emoji Hint" subtitle="Смотри только emoji и подсказку, угадывай английское слово.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deck.slice(0, 9).map((card) => (
              <div key={card.id} className="rounded-[2rem] border border-burgundy-100 bg-white p-5 text-center shadow-soft dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-5xl">{card.hintEmoji ?? "💡"}</p>
                <p className="mt-3 text-sm font-bold text-charcoal/60 dark:text-zinc-400">{card.hintText ?? "No hint"}</p>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-black text-burgundy-700 dark:text-burgundy-200">Show answer</summary>
                  <p className="mt-2 text-2xl font-black">{card.word}</p>
                </details>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function CardForm({ form, setForm, onAdd }: {
  form: { word: string; translation: string; hintText: string; hintEmoji: string };
  setForm: (next: { word: string; translation: string; hintText: string; hintEmoji: string }) => void;
  onAdd: () => void;
}) {
  return (
    <div className="grid gap-3">
      <TextInput label="English word" value={form.word} onChange={(word) => setForm({ ...form, word })} placeholder="car" />
      <TextInput label="Hint text" value={form.hintText} onChange={(hintText) => setForm({ ...form, hintText })} placeholder="fast / transport" />
      <TextInput label="Hint emoji" value={form.hintEmoji} onChange={(hintEmoji) => setForm({ ...form, hintEmoji })} placeholder="🚗" />
      <TextInput label="Back side translation" value={form.translation} onChange={(translation) => setForm({ ...form, translation })} placeholder="машина" />
      <Button type="button" onClick={onAdd} className="mt-1">
        <Plus className="mr-2 h-4 w-4" />
        Add to my deck
      </Button>
    </div>
  );
}

function SpeedGame({ deck, index, setIndex, score, setScore }: {
  deck: LearningCard[];
  index: number;
  setIndex: (next: number) => void;
  score: number;
  setScore: (next: number) => void;
}) {
  const card = deck[index % Math.max(deck.length, 1)] ?? fallbackDeck[0];
  const options = useMemo(() => shuffle([card.translation, ...shuffle(deck.filter((item) => item.id !== card.id)).slice(0, 3).map((item) => item.translation)]), [card, deck]);

  function choose(option: string) {
    if (option === card.translation) setScore(score + 1);
    setIndex((index + 1) % Math.max(deck.length, 1));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card card={card} compact />
      <div className="grid gap-3">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-charcoal/50 dark:text-zinc-500">Score: {score}</p>
        {options.map((option) => (
          <button key={option} type="button" onClick={() => choose(option)} className="rounded-3xl border border-burgundy-100 bg-white px-5 py-4 text-left text-xl font-black shadow-soft transition hover:-translate-y-1 hover:border-burgundy-300 dark:border-zinc-800 dark:bg-zinc-950">
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-burgundy-100 bg-white p-5 shadow-soft dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <h2 className="text-2xl font-black text-charcoal dark:text-white">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-charcoal/60 dark:text-zinc-400">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-charcoal/45 dark:text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-burgundy-100 bg-burgundy-50/45 px-4 py-3 text-sm font-bold text-charcoal outline-none transition placeholder:text-charcoal/30 focus:border-burgundy-400 focus:ring-4 focus:ring-burgundy-200/45 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
      />
    </label>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-burgundy-700 bg-burgundy-700 text-white shadow-soft"
          : "border-burgundy-100 bg-white text-charcoal hover:border-burgundy-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function InviteBadge({ status }: { status?: InviteStatus }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        accepted
      </span>
    );
  }

  if (status === "declined") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-900/30 dark:text-red-200">
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
        declined
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
        <BellRing className="mr-1.5 h-3.5 w-3.5" />
        pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
      <Trophy className="mr-1.5 h-3.5 w-3.5" />
      ready
    </span>
  );
}
