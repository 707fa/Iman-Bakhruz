import { ArrowLeft, CheckCircle2, Clock, Lock, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollReveal, StaggerContainer, StaggerItem } from "../components/portfolio/ScrollReveal";
import { Navbar } from "../components/portfolio/Navbar";
import { getPaymentState, COURSE_PRICE } from "../lib/payment";
import { courseModules } from "../lib/courseData";

export function CoursePage() {
  const payment = getPaymentState();

  if (!payment.paid) {
    return (
      <div className="noise relative min-h-screen bg-bg text-text">
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong max-w-lg rounded-3xl p-12 text-center"
          >
            <Lock className="mx-auto mb-6 h-16 w-16 text-text-3" />
            <h2 className="mb-4 text-3xl font-bold text-text">Course Locked</h2>
            <p className="mb-6 text-text-3">
              Purchase the Full-Stack Web Development course to access all modules and lessons.
            </p>
            <p className="mb-8 font-display text-4xl font-bold gradient-text">
              {COURSE_PRICE.toLocaleString()} UZS
            </p>
            <Link
              to="/#course"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 text-sm font-semibold text-white"
            >
              <Lock className="h-4 w-4" />
              Go to Course Page
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="noise relative min-h-screen bg-bg text-text">
      <Navbar />
      <div className="w-full px-6 pt-24 pb-16 md:px-12">
        <ScrollReveal>
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-text-3 hover:text-text">
            <ArrowLeft className="h-4 w-4" />
            Back to Portfolio
          </Link>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Full Access Granted</span>
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
              Full-Stack<br />
              <span className="gradient-text">Web Development</span>
            </h1>
            <p className="max-w-2xl text-lg text-text-2">
              Your complete journey from beginner to professional developer. Start from Module 1 and work your way through.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="space-y-6" stagger={0.12}>
          {courseModules.map((mod, i) => (
            <StaggerItem key={mod.id}>
              <motion.div whileHover={{ x: 4 }} className="glass rounded-2xl p-8 transition-all hover:bg-white/[0.06] hover:border-violet-500/20">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{mod.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-violet-400">Module {i + 1}</p>
                      <h3 className="text-2xl font-bold text-text">{mod.title}</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-text-3">
                    {mod.lessons.length} lessons
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mod.lessons.map((lesson, j) => (
                    <div
                      key={j}
                      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-violet-500/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 transition-colors group-hover:bg-violet-500/20">
                        <Play className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">{lesson}</p>
                        <div className="flex items-center gap-1 text-xs text-text-3">
                          <Clock className="h-3 w-3" />
                          <span>~15 min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </div>
  );
}
