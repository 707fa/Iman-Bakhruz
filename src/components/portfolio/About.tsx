import { Code2, Globe, Layers, Rocket, Users, Zap } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem, CounterAnimation } from "./ScrollReveal";

const stats = [
  { value: 4, suffix: "+", label: "Years Experience" },
  { value: 50, suffix: "+", label: "Projects Completed" },
  { value: 30, suffix: "+", label: "Happy Clients" },
  { value: 15, suffix: "+", label: "Technologies" },
];

const highlights = [
  { icon: Code2, title: "Clean Code", desc: "Writing maintainable, scalable code that stands the test of time" },
  { icon: Zap, title: "Performance", desc: "Optimized applications that load fast and run smoothly" },
  { icon: Globe, title: "Full-Stack", desc: "End-to-end development from database to pixel-perfect UI" },
  { icon: Layers, title: "Architecture", desc: "Designing robust systems that scale with your business" },
  { icon: Rocket, title: "Delivery", desc: "On-time delivery with clear communication throughout" },
  { icon: Users, title: "Team Player", desc: "Collaborative approach with mentoring and knowledge sharing" },
];

export function About() {
  return (
    <section id="about" className="relative py-32">
      <div className="pointer-events-none absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">About Me</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-6 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Turning ideas into<br />
            <span className="gradient-text">digital reality</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mb-16 max-w-3xl text-lg text-text-2 leading-relaxed md:text-xl">
            I'm Farrux Axrorov, a full-stack developer based in Uzbekistan with a passion for creating
            exceptional web experiences. I specialize in building modern, performant applications using
            React, Next.js, Node.js, and TypeScript. When I'm not coding, I'm teaching others how to
            build amazing things with technology.
          </p>
        </ScrollReveal>

        <StaggerContainer className="mb-20 grid grid-cols-2 gap-4 sm:grid-cols-4" stagger={0.15}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="glass rounded-2xl p-6 text-center transition-all hover:bg-white/[0.06]">
                <p className="mb-2 font-display text-4xl font-bold gradient-text md:text-5xl">
                  <CounterAnimation target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-text-3">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
          {highlights.map((item) => (
            <StaggerItem key={item.title}>
              <div className="group glass rounded-2xl p-8 transition-all duration-300 hover:bg-white/[0.06] hover:border-violet-500/20">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition-colors group-hover:bg-violet-500/20">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-text">{item.title}</h3>
                <p className="text-sm text-text-3 leading-relaxed">{item.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
