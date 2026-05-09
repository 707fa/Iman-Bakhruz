import type { HomeworkTemplate } from "../types";

const templates: HomeworkTemplate[] = [
  {
    id: "ht-beginner-present-simple",
    title: "Present Simple — Beginner",
    description: "Practice forming affirmative, negative, and question sentences in Present Simple.",
    level: "beginner",
    taskType: "grammar_quiz",
    questions: [
      "Write 3 things you do every morning using Present Simple.",
      "Make these sentences negative: 'She likes pizza.' / 'They play football.'",
      "Write 3 questions using Do/Does about your friend's daily routine.",
      "Fill in: My brother ___ (go) to school at 8 AM every day.",
      "Correct the mistake: 'She don't like coffee.'",
      "Write 2 true sentences about your family using Present Simple.",
      "Change to question: 'He watches TV in the evening.'",
      "Write a short paragraph (4-5 sentences) about your typical Saturday.",
    ],
    autoGrade: true,
  },
  {
    id: "ht-beginner-past-simple",
    title: "Past Simple — Beginner",
    description: "Practice regular and irregular verbs in Past Simple.",
    level: "beginner",
    taskType: "grammar_quiz",
    questions: [
      "Write the Past Simple form of these verbs: go, eat, see, have, make, come.",
      "Write 3 sentences about what you did last weekend.",
      "Make these sentences negative: 'I visited my grandma.' / 'She bought a book.'",
      "Write 3 questions using Did about your partner's last holiday.",
      "Fill in: Yesterday, I ___ (wake) up at 7 and ___ (eat) breakfast.",
      "Correct the mistake: 'I didn't went to school yesterday.'",
      "Write 5 sentences about a famous person's life using Past Simple.",
      "Change to question: 'They played football after school.'",
    ],
    autoGrade: true,
  },
  {
    id: "ht-elementary-present-continuous",
    title: "Present Continuous — Elementary",
    description: "Practice actions happening now and temporary situations.",
    level: "elementary",
    taskType: "grammar_quiz",
    questions: [
      "Describe what 5 people in your family are doing right now using Present Continuous.",
      "Write 3 sentences about temporary situations in your life this week.",
      "Explain the difference between 'I study English' and 'I am studying English'.",
      "Correct the mistakes: 'She cooking dinner.' / 'They is playing outside.'",
      "Write a short email to a friend describing what you are doing on your holiday.",
      "Fill in: Look! The children ___ (play) in the garden. It ___ (rain) outside.",
      "Write 3 Present Continuous questions you would ask someone on a video call.",
      "Change to negative: 'He is working from home today.' / 'We are learning new words.'",
    ],
    autoGrade: true,
  },
  {
    id: "ht-elementary-daily-routine",
    title: "Daily Routine Writing — Elementary",
    description: "Write about your daily routine using Present Simple and time expressions.",
    level: "elementary",
    taskType: "homework",
    questions: [
      "Write a paragraph (8-10 sentences) about your weekday routine from morning to night.",
      "Include at least 5 time expressions (at 7 AM, in the afternoon, etc.).",
      "Describe how your weekend routine is different from your weekday routine.",
    ],
    autoGrade: false,
  },
  {
    id: "ht-pre-intermediate-conditionals",
    title: "First Conditional — Pre-Intermediate",
    description: "Practice real conditionals: if + present, will + verb.",
    level: "pre-intermediate",
    taskType: "grammar_quiz",
    questions: [
      "Write 5 first conditional sentences about possible situations this week.",
      "Complete: If it rains tomorrow, I ___ (stay) at home and ___ (watch) a movie.",
      "Rewrite using 'if': 'I will call you later because I am busy now.'",
      "Write 3 first conditional questions to ask your classmate.",
      "Correct: 'If she will come, we will have dinner together.'",
      "Write a chain of 3 conditional sentences: If I study hard, I will... If I pass, I will... etc.",
    ],
    autoGrade: true,
  },
  {
    id: "ht-pre-intermediate-email-writing",
    title: "Formal Email Writing — Pre-Intermediate",
    description: "Write a formal email requesting information.",
    level: "pre-intermediate",
    taskType: "homework",
    questions: [
      "Write a formal email to a language school asking about their English courses. Include: greeting, reason for writing, 2-3 questions, closing.",
      "Write a reply email confirming your enrollment. Include: reference to their email, confirmation, questions about schedule.",
    ],
    autoGrade: false,
  },
  {
    id: "ht-intermediate-essay-opinion",
    title: "Opinion Essay — Intermediate",
    description: "Write a structured opinion essay with introduction, body, and conclusion.",
    level: "intermediate",
    taskType: "homework",
    questions: [
      "Write an opinion essay (150-200 words) on: 'Online learning is better than classroom learning.' Include: introduction with your opinion, 2 arguments with examples, 1 counter-argument, conclusion.",
      "Rewrite this informal paragraph in a formal academic style: 'I think studying is cool. You learn lots of stuff and it helps you get a good job someday.'",
    ],
    autoGrade: false,
  },
  {
    id: "ht-intermediate-reported-speech",
    title: "Reported Speech — Intermediate",
    description: "Practice converting direct speech to reported speech.",
    level: "intermediate",
    taskType: "grammar_quiz",
    questions: [
      "Convert to reported speech: 'I am studying English,' she said. / 'We will finish tomorrow,' they told us.",
      "Convert to reported speech: 'Do you like pizza?' he asked. / 'Don't be late!' the teacher warned.",
      "Write a short story (6-8 sentences) using at least 4 examples of reported speech.",
      "Correct: 'She told that she is happy.' / 'He asked me where am I going.'",
      "Report this conversation: Tom: 'I have finished my homework.' / Sara: 'Can you help me with mine?'",
    ],
    autoGrade: true,
  },
  {
    id: "ht-beginner-speaking-introduce",
    title: "Introduce Yourself — Speaking (Beginner)",
    description: "Record yourself introducing yourself in English.",
    level: "beginner",
    taskType: "speaking",
    questions: [
      "Say your name, age, and where you are from.",
      "Tell about your family (how many people, what they do).",
      "Say what you like to do in your free time.",
      "Tell why you are learning English.",
    ],
    autoGrade: true,
  },
  {
    id: "ht-elementary-speaking-favourite",
    title: "My Favourite Day — Speaking (Elementary)",
    description: "Describe your favourite day of the week.",
    level: "elementary",
    taskType: "speaking",
    questions: [
      "Which day of the week is your favourite? Why?",
      "What do you usually do on that day from morning to evening?",
      "Is there anything special about this day that makes it different from others?",
      "Would you change anything about this day? What and why?",
    ],
    autoGrade: true,
  },
  {
    id: "ht-pre-intermediate-speaking-holiday",
    title: "Best Holiday — Speaking (Pre-Intermediate)",
    description: "Tell about the best holiday you have had.",
    level: "pre-intermediate",
    taskType: "speaking",
    questions: [
      "Where did you go? When? Who with?",
      "What did you do there? Describe 2-3 activities.",
      "What was the best moment? Why?",
      "Would you go there again? What would you do differently?",
    ],
    autoGrade: true,
  },
  {
    id: "ht-intermediate-speaking-debate",
    title: "Mini Debate — Speaking (Intermediate)",
    description: "Choose a side and argue your position.",
    level: "intermediate",
    taskType: "speaking",
    questions: [
      "Topic: 'Students should choose their own subjects at school.' Do you agree or disagree? Give 3 reasons.",
      "Now argue the opposite side for 30 seconds. Can you think of good points?",
      "Which side was easier to argue? Why?",
    ],
    autoGrade: true,
  },
];

export function getHomeworkTemplates(level?: string): HomeworkTemplate[] {
  if (!level) return templates;
  return templates.filter((t) => t.level === level);
}

export function getHomeworkTemplateById(id: string): HomeworkTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplateLevels(): string[] {
  return [...new Set(templates.map((t) => t.level))];
}

export function getTemplateTaskTypes(): HomeworkTemplate["taskType"][] {
  return ["homework", "grammar_quiz", "speaking", "listening"];
}
