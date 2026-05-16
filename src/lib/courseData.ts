export interface CourseModule {
  id: string;
  title: string;
  lessons: string[];
  icon: string;
}

export const courseModules: CourseModule[] = [
  {
    id: "m1",
    title: "HTML & CSS Fundamentals",
    icon: "🎨",
    lessons: [
      "HTML5 Semantic Structure",
      "CSS Flexbox & Grid Mastery",
      "Responsive Design Principles",
      "CSS Animations & Transitions",
      "Building a Landing Page",
    ],
  },
  {
    id: "m2",
    title: "JavaScript Deep Dive",
    icon: "⚡",
    lessons: [
      "Variables, Types & Operators",
      "Functions & Closures",
      "Async Programming (Promises, async/await)",
      "DOM Manipulation & Events",
      "ES6+ Features & Best Practices",
    ],
  },
  {
    id: "m3",
    title: "React & Next.js",
    icon: "⚛️",
    lessons: [
      "React Components & JSX",
      "State Management & Hooks",
      "React Router & Navigation",
      "Next.js SSR & SSG",
      "Building a Full React App",
    ],
  },
  {
    id: "m4",
    title: "Node.js & Backend",
    icon: "🔧",
    lessons: [
      "Express.js Fundamentals",
      "REST API Design",
      "Authentication & JWT",
      "File Uploads & Processing",
      "Real-time with WebSockets",
    ],
  },
  {
    id: "m5",
    title: "Databases",
    icon: "🗄️",
    lessons: [
      "PostgreSQL Deep Dive",
      "MongoDB & Mongoose",
      "Redis for Caching",
      "Database Design Patterns",
      "Prisma ORM",
    ],
  },
  {
    id: "m6",
    title: "Deployment & DevOps",
    icon: "🚀",
    lessons: [
      "Docker Containerization",
      "CI/CD Pipelines",
      "AWS / Vercel Deployment",
      "Monitoring & Logging",
      "Final Project Deployment",
    ],
  },
];
