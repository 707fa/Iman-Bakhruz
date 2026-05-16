import { Briefcase, GraduationCap } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const experiences = [
  {
    type: "work",
    title: "Senior Full-Stack Developer",
    org: "TechCorp",
    period: "2023 — Present",
    desc: "Leading development of enterprise SaaS platform. Managing team of 5 developers. Architecting microservices and implementing CI/CD pipelines.",
  },
  {
    type: "work",
    title: "Full-Stack Developer",
    org: "StartupHub",
    period: "2021 — 2023",
    desc: "Built and launched 3 products from scratch. Implemented real-time features with WebSockets. Reduced page load time by 60%.",
  },
  {
    type: "work",
    title: "Frontend Developer",
    org: "Digital Agency",
    period: "2020 — 2021",
    desc: "Developed responsive web applications for international clients. Specialized in React and performance optimization.",
  },
  {
    type: "education",
    title: "Computer Science",
    org: "University of IT",
    period: "2017 — 2021",
    desc: "Bachelor's degree in Computer Science. Focus on software engineering, algorithms, and data structures. Graduated with honors.",
  },
];

export function Experience() {
  return (
    <section id="experience" className="relative py-32">
      <div className="pointer-events-none absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-rose-500/5 blur-[120px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">Experience</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-16 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Where I've<br />
            <span className="gradient-text-rose">worked</span>
          </h2>
        </ScrollReveal>

        <StaggerContainer className="relative" stagger={0.2}>
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-cyan-500/30 to-transparent md:left-1/2 md:-translate-x-px" />

          {experiences.map((exp, i) => (
            <StaggerItem key={i} className="relative mb-12 last:mb-0">
              <div className={`flex flex-col md:flex-row ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}>
                <div className={`md:w-1/2 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}>
                  <div className="glass group rounded-2xl p-8 transition-all duration-300 hover:bg-white/[0.06] hover:border-violet-500/20">
                    <div className={`mb-4 flex items-center gap-3 ${i % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                        {exp.type === "work" ? <Briefcase className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                      </div>
                      <span className="text-sm font-medium text-violet-400">{exp.period}</span>
                    </div>

                    <h3 className="mb-1 text-xl font-bold text-text">{exp.title}</h3>
                    <p className="mb-3 text-sm font-medium text-text-3">{exp.org}</p>
                    <p className="text-sm text-text-3 leading-relaxed">{exp.desc}</p>
                  </div>
                </div>

                <div className="absolute left-4 top-8 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-violet-500 bg-bg md:left-1/2">
                  <div className="absolute inset-0.5 rounded-full bg-violet-500/50" />
                </div>

                <div className="hidden md:block md:w-1/2" />
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
