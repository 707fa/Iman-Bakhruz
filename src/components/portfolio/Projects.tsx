import { ExternalLink, Github } from "lucide-react";
import { motion } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const projects = [
  {
    title: "E-Commerce Platform",
    desc: "Full-featured online store with real-time inventory, payment processing, and admin dashboard. Built for scale with microservices architecture.",
    tags: ["React", "Node.js", "PostgreSQL", "Stripe", "Docker"],
    gradient: "from-violet-500/20 to-purple-500/20",
    link: "#",
    github: "#",
  },
  {
    title: "Real-Time Chat App",
    desc: "WebSocket-powered messaging platform with channels, file sharing, and end-to-end encryption. Supports 10k+ concurrent users.",
    tags: ["Next.js", "Socket.io", "Redis", "MongoDB", "AWS"],
    gradient: "from-cyan-500/20 to-blue-500/20",
    link: "#",
    github: "#",
  },
  {
    title: "AI Dashboard",
    desc: "Analytics dashboard with ML-powered insights, real-time data visualization, and automated reporting for business intelligence.",
    tags: ["React", "Python", "TensorFlow", "D3.js", "FastAPI"],
    gradient: "from-rose-500/20 to-pink-500/20",
    link: "#",
    github: "#",
  },
  {
    title: "Education Platform",
    desc: "Online learning platform with live classes, homework system, auto-grading, attendance tracking, and AI-powered tutoring.",
    tags: ["React", "TypeScript", "Node.js", "Tailwind", "OpenAI"],
    gradient: "from-amber-500/20 to-orange-500/20",
    link: "#",
    github: "#",
  },
  {
    title: "FinTech Mobile App",
    desc: "Cross-platform banking application with biometric auth, instant transfers, and real-time transaction monitoring.",
    tags: ["React Native", "Node.js", "PostgreSQL", "Payme", "Click"],
    gradient: "from-emerald-500/20 to-green-500/20",
    link: "#",
    github: "#",
  },
  {
    title: "DevOps Toolkit",
    desc: "CI/CD pipeline manager with Docker orchestration, monitoring dashboards, and automated deployment workflows.",
    tags: ["Go", "Docker", "Kubernetes", "Terraform", "AWS"],
    gradient: "from-violet-500/20 to-cyan-500/20",
    link: "#",
    github: "#",
  },
];

export function Projects() {
  return (
    <section id="projects" className="relative py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/5 blur-[150px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Projects</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-16 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Selected<br />
            <span className="gradient-text">works</span>
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid gap-6 md:grid-cols-2" stagger={0.15}>
          {projects.map((project) => (
            <StaggerItem key={project.title}>
              <motion.div
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-surface transition-all duration-300 hover:border-violet-500/20"
              >
                <div className={`h-48 bg-gradient-to-br ${project.gradient} relative overflow-hidden`}>
                  <div className="noise absolute inset-0" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-6xl font-bold text-white/5">{project.title.charAt(0)}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                </div>

                <div className="p-8">
                  <h3 className="mb-3 text-2xl font-bold text-text">{project.title}</h3>
                  <p className="mb-6 text-sm text-text-3 leading-relaxed">{project.desc}</p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-text-2">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <a href={project.link} className="inline-flex items-center gap-2 text-sm font-medium text-violet-400 transition-colors hover:text-violet-300">
                      <ExternalLink className="h-4 w-4" />
                      Live Demo
                    </a>
                    <a href={project.github} className="inline-flex items-center gap-2 text-sm font-medium text-text-3 transition-colors hover:text-text-2">
                      <Github className="h-4 w-4" />
                      Source
                    </a>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
