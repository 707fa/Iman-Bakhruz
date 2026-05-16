import { Hero } from "../components/portfolio/Hero";
import { About } from "../components/portfolio/About";
import { TechStack } from "../components/portfolio/TechStack";
import { Projects } from "../components/portfolio/Projects";
import { Experience } from "../components/portfolio/Experience";
import { CourseSection } from "../components/portfolio/CourseSection";
import { Contact } from "../components/portfolio/Contact";
import { Footer } from "../components/portfolio/Footer";
import { Navbar } from "../components/portfolio/Navbar";

export function PortfolioPage() {
  return (
    <div className="noise relative min-h-screen bg-bg text-text">
      <Navbar />
      <Hero />
      <About />
      <TechStack />
      <Projects />
      <Experience />
      <CourseSection />
      <Contact />
      <Footer />
    </div>
  );
}
