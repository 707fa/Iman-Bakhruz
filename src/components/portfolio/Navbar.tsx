import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Course", href: "#course" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/5 bg-bg/80 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 md:px-12">
          <a href="#" className="font-display text-lg font-bold text-text">
            F<span className="gradient-text">A</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-3 transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#course"
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-violet-500 hover:shadow-glow"
            >
              Join Course
            </a>
          </div>

          <button onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] bg-bg/95 backdrop-blur-xl md:hidden">
          <div className="flex h-16 items-center justify-between px-6">
            <a href="#" className="font-display text-lg font-bold text-text">F<span className="gradient-text">A</span></a>
            <button onClick={() => setMobileOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="mt-8 flex flex-col items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-xl font-semibold text-text-2 transition-colors hover:text-text"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#course"
              onClick={() => setMobileOpen(false)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-8 py-3 text-sm font-semibold text-white"
            >
              Join Course
            </a>
          </nav>
        </div>
      ) : null}
    </>
  );
}
