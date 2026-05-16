import { Mail, MapPin, Phone, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

export function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="relative py-32">
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-600/5 blur-[150px]" />

      <div className="w-full px-6 md:px-12">
        <ScrollReveal>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">Contact</p>
        </ScrollReveal>

        <ScrollReveal>
          <h2 className="mb-16 font-display text-4xl font-bold sm:text-5xl md:text-7xl">
            Let's work<br />
            <span className="gradient-text">together</span>
          </h2>
        </ScrollReveal>

        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <ScrollReveal>
              <p className="mb-8 max-w-xl text-lg text-text-2 leading-relaxed">
                Have a project in mind? Want to learn web development? Let's connect and bring your ideas to life.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-4">
                <a href="mailto:farrux@example.com" className="flex items-center gap-4 rounded-2xl glass p-4 transition-all hover:bg-white/[0.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-3">Email</p>
                    <p className="font-semibold text-text">farrux@example.com</p>
                  </div>
                </a>

                <a href="tel:+998901234567" className="flex items-center gap-4 rounded-2xl glass p-4 transition-all hover:bg-white/[0.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-3">Phone</p>
                    <p className="font-semibold text-text">+998 90 123 45 67</p>
                  </div>
                </a>

                <div className="flex items-center gap-4 rounded-2xl glass p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-text-3">Location</p>
                    <p className="font-semibold text-text">Uzbekistan, Tashkent</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.3} preset="fadeRight">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
                setTimeout(() => setSent(false), 3000);
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-4 text-text outline-none transition-all placeholder:text-text-3 focus:border-violet-500/30 focus:bg-white/[0.05]"
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-4 text-text outline-none transition-all placeholder:text-text-3 focus:border-violet-500/30 focus:bg-white/[0.05]"
                />
              </div>
              <div>
                <textarea
                  rows={5}
                  placeholder="Your Message"
                  className="w-full resize-none rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-4 text-text outline-none transition-all placeholder:text-text-3 focus:border-violet-500/30 focus:bg-white/[0.05]"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-4 text-sm font-semibold text-white transition-all hover:shadow-glow"
              >
                {sent ? "Message Sent!" : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
