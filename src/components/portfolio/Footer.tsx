import { Github, Linkedin, Send, Twitter, Heart } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-12">
      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <p className="font-display text-lg font-bold text-text">Farrux Axrorov</p>
              <p className="mt-1 text-sm text-text-3">Full-Stack Developer & Course Creator</p>
            </div>

            <div className="flex gap-3">
              <a href="https://github.com" target="_blank" rel="noopener" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-text-3 transition-all hover:bg-white/[0.06] hover:text-violet-400">
                <Github className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-text-3 transition-all hover:bg-white/[0.06] hover:text-cyan-400">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://t.me" target="_blank" rel="noopener" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-text-3 transition-all hover:bg-white/[0.06] hover:text-blue-400">
                <Send className="h-4 w-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03] text-text-3 transition-all hover:bg-white/[0.06] hover:text-sky-400">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 border-t border-white/5 pt-8">
            <p className="flex items-center gap-1 text-sm text-text-3">
              Built with <Heart className="h-3.5 w-3.5 text-rose-400" /> by Farrux Axrorov
            </p>
            <p className="text-xs text-text-3">© {new Date().getFullYear()} All rights reserved</p>
          </div>
        </ScrollReveal>
      </div>
    </footer>
  );
}
