import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowDown, Github, Linkedin, Send } from "lucide-react";
import { TextReveal } from "./ScrollReveal";

export function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, 150]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  return (
    <motion.section style={{ opacity, y }} className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px] animate-gradient"
          style={{
            background: `radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)`,
            transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px)`,
          }}
        />
        <div
          className="absolute right-1/4 bottom-1/4 h-[500px] w-[500px] rounded-full opacity-20 blur-[100px] animate-gradient"
          style={{
            background: `radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)`,
            transform: `translate(${-mousePos.x * 30}px, ${-mousePos.y * 30}px)`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-15 blur-[80px]"
          style={{
            background: `radial-gradient(circle, rgba(244,63,94,0.4) 0%, transparent 70%)`,
          }}
        />
      </div>

      <div className="noise pointer-events-none absolute inset-0" />

      <div className="relative z-10 w-full px-6 text-center md:px-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-text-2">Available for projects</span>
        </motion.div>

        <h1 className="mb-4 font-display text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl">
          <TextReveal text="Farrux" className="block" />
          <TextReveal text="Axrorov" delay={0.3} className="gradient-text block" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mx-auto mb-8 max-w-2xl text-xl text-text-2 sm:text-2xl md:text-3xl"
        >
          Full-Stack Developer &{" "}
          <span className="gradient-text font-semibold">Course Creator</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mx-auto mb-12 max-w-xl text-base text-text-3 sm:text-lg"
        >
          Building digital experiences that push boundaries. Specializing in React, Node.js, and modern web technologies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a href="#contact" className="group relative inline-flex items-center gap-2 rounded-full bg-violet-600 px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-glow">
            <Send className="h-4 w-4" />
            Get in Touch
          </a>
          <a href="#projects" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-sm font-semibold text-text transition-all hover:bg-white/10">
            View Projects
          </a>
          <div className="flex gap-3">
            <a href="https://github.com" target="_blank" rel="noopener" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-2 transition-all hover:bg-white/10 hover:text-violet-400">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-2 transition-all hover:bg-white/10 hover:text-cyan-400">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ArrowDown className="h-6 w-6 text-text-3" />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
