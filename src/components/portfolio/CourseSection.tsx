import { BookOpen, CheckCircle2, Lock, Play, Star } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
import { PaymentModal } from "../PaymentModal";
import { getPaymentState, COURSE_PRICE } from "../../lib/payment";
import { courseModules } from "../../lib/courseData";

export function CourseSection() {
  const [payOpen, setPayOpen] = useState(false);
  const [, setPaymentVersion] = useState(0);
  const payment = getPaymentState();

  function handlePaymentSuccess() {
    setPayOpen(false);
    setPaymentVersion((v) => v + 1);
  }

  return (
    <section id="course" className="relative py-32">
      <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-amber-400">Course</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-6 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Full-Stack<br />
            <span className="gradient-text">Web Development</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="mb-12 max-w-3xl text-lg text-text-2 leading-relaxed md:text-xl">
            Master modern web development from zero to professional. 6 modules, 30+ video lessons,
            hands-on projects, and direct mentorship from Farrux.
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mb-16 grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-6">
              <div className="mb-3 flex items-center gap-2 text-amber-400">
                <Play className="h-5 w-5" />
                <span className="text-sm font-semibold">30+ Lessons</span>
              </div>
              <p className="text-sm text-text-3">Video lectures with practical exercises</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="mb-3 flex items-center gap-2 text-cyan-400">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-semibold">6 Modules</span>
              </div>
              <p className="text-sm text-text-3">From HTML basics to deployment</p>
            </div>
            <div className="glass rounded-2xl p-6">
              <div className="mb-3 flex items-center gap-2 text-violet-400">
                <Star className="h-5 w-5" />
                <span className="text-sm font-semibold">Mentorship</span>
              </div>
              <p className="text-sm text-text-3">Direct support and code reviews</p>
            </div>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={0.12}>
          {courseModules.map((mod, i) => (
            <StaggerItem key={mod.id}>
              <motion.div whileHover={{ y: -4 }} className="group glass relative overflow-hidden rounded-2xl p-6 transition-all hover:bg-white/[0.06]">
                {!payment.paid && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60 backdrop-blur-[2px]">
                    <Lock className="h-8 w-8 text-text-3" />
                  </div>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-3xl">{mod.icon}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-text-3">
                    Module {i + 1}
                  </span>
                </div>
                <h3 className="mb-3 text-lg font-bold text-text">{mod.title}</h3>
                <ul className="space-y-2">
                  {mod.lessons.map((lesson, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-text-3">
                      {payment.paid ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Lock className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{lesson}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {!payment.paid ? (
          <ScrollReveal delay={0.3}>
            <div className="mt-12 text-center">
              <div className="glass-strong inline-block rounded-3xl p-8">
                <p className="mb-2 text-sm text-text-3">One-time payment</p>
                <p className="mb-6 font-display text-5xl font-bold gradient-text">
                  {COURSE_PRICE.toLocaleString()} UZS
                </p>
                <button
                  onClick={() => setPayOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-10 py-4 text-sm font-semibold text-white transition-all hover:shadow-glow hover:brightness-110"
                >
                  <Lock className="h-4 w-4" />
                  Unlock Full Course
                </button>
              </div>
            </div>
          </ScrollReveal>
        ) : (
          <ScrollReveal delay={0.3}>
            <div className="mt-12 text-center">
              <div className="glass-strong inline-flex items-center gap-3 rounded-full px-6 py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-emerald-400">Course Unlocked</span>
                <span className="text-sm text-text-3">• All modules accessible</span>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaymentSuccess} />
    </section>
  );
}
