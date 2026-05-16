import { ScrollReveal } from "./ScrollReveal";

const techRows = [
  [
    { name: "React", color: "#61DAFB" },
    { name: "Next.js", color: "#ffffff" },
    { name: "TypeScript", color: "#3178C6" },
    { name: "Node.js", color: "#339933" },
    { name: "Python", color: "#3776AB" },
    { name: "Tailwind CSS", color: "#06B6D4" },
    { name: "PostgreSQL", color: "#4169E1" },
    { name: "MongoDB", color: "#47A248" },
    { name: "Docker", color: "#2496ED" },
    { name: "AWS", color: "#FF9900" },
    { name: "Git", color: "#F05032" },
    { name: "Figma", color: "#F24E1E" },
    { name: "Redis", color: "#DC382D" },
    { name: "GraphQL", color: "#E10098" },
  ],
  [
    { name: "Vue.js", color: "#4FC08D" },
    { name: "Prisma", color: "#2D3748" },
    { name: "Express", color: "#000000" },
    { name: "React Native", color: "#61DAFB" },
    { name: "Svelte", color: "#FF3E00" },
    { name: "Go", color: "#00ADD8" },
    { name: "Supabase", color: "#3ECF8E" },
    { name: "Vercel", color: "#000000" },
    { name: "Stripe", color: "#635BFF" },
    { name: "Sentry", color: "#362D59" },
    { name: "Jest", color: "#C21325" },
    { name: "Webpack", color: "#8DD6F9" },
    { name: "Nginx", color: "#009639" },
    { name: "Linux", color: "#FCC624" },
  ],
];

export function TechStack() {
  return (
    <section id="skills" className="relative overflow-hidden py-32">
      <div className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/8 blur-[120px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Tech Stack</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-16 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Technologies I<br />
            <span className="gradient-text">work with</span>
          </h2>
        </ScrollReveal>
      </div>

      <div className="space-y-4">
        {techRows.map((row, rowIndex) => (
          <div key={rowIndex} className="relative overflow-hidden">
            <div className={`flex w-max ${rowIndex === 0 ? "marquee" : "marquee-reverse"}`}>
              {[...row, ...row].map((tech, i) => (
                <div
                  key={`${tech.name}-${i}`}
                  className="group mx-2 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06]"
                >
                  <span
                    className="h-3 w-3 rounded-full transition-transform group-hover:scale-125"
                    style={{ backgroundColor: tech.color }}
                  />
                  <span className="whitespace-nowrap text-sm font-medium text-text-2 group-hover:text-text">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg to-transparent" />
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-bg to-transparent" />
    </section>
  );
}
