import type { SpeakingQuestion } from "../types";
import { normalizeStudentLevelFromGroupTitle, type StudentLevel } from "../lib/studentLevel";

type SpeakingLevel = StudentLevel;

const BEGINNER_QUESTIONS: SpeakingQuestion[] = [
  { id: "b-01", level: "beginner", topic: "Introduce Yourself", prompt: "Please introduce yourself. Tell me your name, age, city, and why you are learning English." },
  { id: "b-02", level: "beginner", topic: "My Family", prompt: "Talk about your family. How many people are there and what do they do?" },
  { id: "b-03", level: "beginner", topic: "My Daily Routine", prompt: "Describe your daily routine from morning to evening with at least six actions." },
  { id: "b-04", level: "beginner", topic: "My Home", prompt: "Describe your home. How many rooms are there and what is your favorite room?" },
  { id: "b-05", level: "beginner", topic: "My School", prompt: "Tell me about your school or learning center and what subjects you like." },
  { id: "b-06", level: "beginner", topic: "My Friend", prompt: "Describe your best friend and explain why this person is important for you." },
  { id: "b-07", level: "beginner", topic: "Food", prompt: "Talk about your favorite food. When do you usually eat it and why do you like it?" },
  { id: "b-08", level: "beginner", topic: "Weekend", prompt: "What do you usually do at the weekend? Describe your last weekend in simple sentences." },
  { id: "b-09", level: "beginner", topic: "Hobbies", prompt: "Talk about your hobbies. What do you do in your free time?" },
  { id: "b-10", level: "beginner", topic: "Weather", prompt: "Describe the weather in your city today and your favorite season." },
  { id: "b-11", level: "beginner", topic: "Clothes", prompt: "Describe what you are wearing now and what clothes you usually wear to class." },
  { id: "b-12", level: "beginner", topic: "Transport", prompt: "How do you usually get to class? Talk about transport in your city." },
  { id: "b-13", level: "beginner", topic: "Shopping", prompt: "Talk about your last shopping experience. What did you buy and where?" },
  { id: "b-14", level: "beginner", topic: "My Room", prompt: "Describe your room and where your important things are located." },
  { id: "b-15", level: "beginner", topic: "My Day Yesterday", prompt: "Tell me what you did yesterday from morning to night." },
  { id: "b-16", level: "beginner", topic: "Plans", prompt: "What are your plans for tomorrow? Say at least five things you will do." },
  { id: "b-17", level: "beginner", topic: "Favorite Teacher", prompt: "Describe your favorite teacher and what makes this teacher special." },
  { id: "b-18", level: "beginner", topic: "Phone Apps", prompt: "Talk about apps on your phone. Which app do you use most and why?" },
  { id: "b-19", level: "beginner", topic: "Morning", prompt: "Describe your morning in detail: when you wake up, what you eat, and how you start your day." },
  { id: "b-20", level: "beginner", topic: "English Goal", prompt: "What is your main English goal this year and how will you achieve it?" },
];

const ELEMENTARY_QUESTIONS: SpeakingQuestion[] = [
  { id: "e-01", level: "elementary", topic: "Introduce Yourself Better", prompt: "Introduce yourself and explain how English can change your future." },
  { id: "e-02", level: "elementary", topic: "Family Traditions", prompt: "Describe one tradition in your family and why it is important." },
  { id: "e-03", level: "elementary", topic: "A Busy Day", prompt: "Describe a busy day in your life and explain what was difficult." },
  { id: "e-04", level: "elementary", topic: "Favorite Place", prompt: "Talk about your favorite place in your city and why people should visit it." },
  { id: "e-05", level: "elementary", topic: "Healthy Lifestyle", prompt: "What do you do to stay healthy? Mention food, sleep, and physical activity." },
  { id: "e-06", level: "elementary", topic: "Last Weekend", prompt: "Describe your last weekend using past tense and explain your feelings." },
  { id: "e-07", level: "elementary", topic: "Future Plan", prompt: "Describe your plan for next month and what result you want." },
  { id: "e-08", level: "elementary", topic: "Learning English", prompt: "What methods help you learn English faster? Give practical examples." },
  { id: "e-09", level: "elementary", topic: "Book or Movie", prompt: "Talk about a book or movie you enjoyed and explain what you learned from it." },
  { id: "e-10", level: "elementary", topic: "Travel", prompt: "Describe a place you want to travel to and explain why." },
  { id: "e-11", level: "elementary", topic: "Technology", prompt: "How does technology help students today? Mention both advantages and one disadvantage." },
  { id: "e-12", level: "elementary", topic: "School Memory", prompt: "Share a memorable moment from school and explain why you remember it." },
  { id: "e-13", level: "elementary", topic: "Role Model", prompt: "Who is your role model and what qualities do you want to copy?" },
  { id: "e-14", level: "elementary", topic: "My Group", prompt: "Describe your English group and how classmates help each other." },
  { id: "e-15", level: "elementary", topic: "Problem Solving", prompt: "Describe a small problem you had recently and how you solved it." },
  { id: "e-16", level: "elementary", topic: "Useful Skill", prompt: "What is one skill every student should learn today and why?" },
  { id: "e-17", level: "elementary", topic: "Daily English", prompt: "How can you use English every day outside the classroom?" },
  { id: "e-18", level: "elementary", topic: "Music", prompt: "Talk about music you like and how music can help language learning." },
  { id: "e-19", level: "elementary", topic: "Motivation", prompt: "What motivates you when learning becomes difficult?" },
  { id: "e-20", level: "elementary", topic: "One Year Later", prompt: "Imagine yourself one year later with better English. Describe your life." },
];

const PRE_INTERMEDIATE_QUESTIONS: SpeakingQuestion[] = [
  { id: "pi-01", level: "pre-intermediate", topic: "Self Growth", prompt: "Describe how your personality has changed in the last two years." },
  { id: "pi-02", level: "pre-intermediate", topic: "Important Decision", prompt: "Talk about an important decision you made and what happened after that." },
  { id: "pi-03", level: "pre-intermediate", topic: "Study Strategy", prompt: "Explain your personal strategy for studying difficult topics." },
  { id: "pi-04", level: "pre-intermediate", topic: "Free Time", prompt: "How do you usually spend free time in a productive way?" },
  { id: "pi-05", level: "pre-intermediate", topic: "Online Learning", prompt: "Discuss the pros and cons of learning online." },
  { id: "pi-06", level: "pre-intermediate", topic: "Confidence", prompt: "What helps students become more confident speakers?" },
  { id: "pi-07", level: "pre-intermediate", topic: "Teamwork", prompt: "Describe a time when teamwork helped you succeed." },
  { id: "pi-08", level: "pre-intermediate", topic: "Discipline", prompt: "Why is discipline important for language learning?" },
  { id: "pi-09", level: "pre-intermediate", topic: "Travel Experience", prompt: "Describe a travel experience that taught you something new." },
  { id: "pi-10", level: "pre-intermediate", topic: "Daily Stress", prompt: "How do students deal with stress before exams?" },
  { id: "pi-11", level: "pre-intermediate", topic: "City Life", prompt: "Compare life in a big city and a small town." },
  { id: "pi-12", level: "pre-intermediate", topic: "Career", prompt: "Describe your dream career and what steps you are taking now." },
  { id: "pi-13", level: "pre-intermediate", topic: "Social Media", prompt: "How does social media influence young people?" },
  { id: "pi-14", level: "pre-intermediate", topic: "Morning vs Night", prompt: "Are you more productive in the morning or at night? Explain." },
  { id: "pi-15", level: "pre-intermediate", topic: "Role of Teacher", prompt: "What makes a teacher effective and respected?" },
  { id: "pi-16", level: "pre-intermediate", topic: "Smart Goals", prompt: "How can students set realistic goals and stay consistent?" },
  { id: "pi-17", level: "pre-intermediate", topic: "Failure", prompt: "Describe a failure you faced and what you learned from it." },
  { id: "pi-18", level: "pre-intermediate", topic: "Good Habits", prompt: "What habits improve English speaking the fastest?" },
  { id: "pi-19", level: "pre-intermediate", topic: "Books", prompt: "Why should teenagers read books in English?" },
  { id: "pi-20", level: "pre-intermediate", topic: "Future Education", prompt: "How do you think education will change in the next 10 years?" },
];

const INTERMEDIATE_QUESTIONS: SpeakingQuestion[] = [
  { id: "i-01", level: "intermediate", topic: "Identity", prompt: "How do language and culture shape personal identity?" },
  { id: "i-02", level: "intermediate", topic: "Leadership", prompt: "What qualities define a strong leader in modern society?" },
  { id: "i-03", level: "intermediate", topic: "AI and Learning", prompt: "How can AI improve student learning, and what risks should schools avoid?" },
  { id: "i-04", level: "intermediate", topic: "Motivation Systems", prompt: "Are rankings and rewards effective for long-term student motivation?" },
  { id: "i-05", level: "intermediate", topic: "Public Speaking", prompt: "What are the best methods to overcome fear of public speaking?" },
  { id: "i-06", level: "intermediate", topic: "Success", prompt: "Is success more about talent or consistency? Defend your view." },
  { id: "i-07", level: "intermediate", topic: "Digital Balance", prompt: "How can students keep a healthy balance between online and offline life?" },
  { id: "i-08", level: "intermediate", topic: "Travel and Mindset", prompt: "How does traveling influence a person's mindset and communication style?" },
  { id: "i-09", level: "intermediate", topic: "Exam Pressure", prompt: "What are practical ways to reduce exam anxiety while keeping high performance?" },
  { id: "i-10", level: "intermediate", topic: "Lifelong Learning", prompt: "Why is lifelong learning essential in the modern job market?" },
  { id: "i-11", level: "intermediate", topic: "Global Communication", prompt: "How does English connect people from different backgrounds?" },
  { id: "i-12", level: "intermediate", topic: "Competition", prompt: "Can competition be unhealthy in education? Explain with examples." },
  { id: "i-13", level: "intermediate", topic: "Critical Thinking", prompt: "Why should schools teach critical thinking as a core skill?" },
  { id: "i-14", level: "intermediate", topic: "Discipline vs Inspiration", prompt: "Which is more important for progress: discipline or inspiration?" },
  { id: "i-15", level: "intermediate", topic: "Mistakes", prompt: "How should students use mistakes as a tool for improvement?" },
  { id: "i-16", level: "intermediate", topic: "Mentorship", prompt: "How can a mentor change a student's academic and personal trajectory?" },
  { id: "i-17", level: "intermediate", topic: "Education System", prompt: "What should be changed in modern education to prepare students for real life?" },
  { id: "i-18", level: "intermediate", topic: "Time Management", prompt: "Describe an advanced time management system that works for students." },
  { id: "i-19", level: "intermediate", topic: "Values", prompt: "What values should every young person build before adulthood?" },
  { id: "i-20", level: "intermediate", topic: "Future Vision", prompt: "Describe your 5-year vision and explain how English supports that vision." },
];

export const SPEAKING_QUESTIONS_BY_LEVEL: Record<SpeakingLevel, SpeakingQuestion[]> = {
  beginner: BEGINNER_QUESTIONS,
  elementary: ELEMENTARY_QUESTIONS,
  "pre-intermediate": PRE_INTERMEDIATE_QUESTIONS,
  intermediate: INTERMEDIATE_QUESTIONS,
};

export const SPEAKING_QUESTIONS: SpeakingQuestion[] = Object.values(SPEAKING_QUESTIONS_BY_LEVEL).flat();

export function normalizeSpeakingLevelFromGroupTitle(groupTitle?: string): SpeakingLevel {
  return normalizeStudentLevelFromGroupTitle(groupTitle);
}

export function getSpeakingQuestionsForLevel(level: SpeakingLevel): SpeakingQuestion[] {
  return SPEAKING_QUESTIONS_BY_LEVEL[level] ?? SPEAKING_QUESTIONS_BY_LEVEL.beginner;
}
