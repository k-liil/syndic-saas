import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingResultBand from "@/components/landing/LandingResultBand";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden bg-[#0a1a36]">
      <LandingNav />
      <LandingHero />
      <LandingStats />
      <LandingFeatures />
      <LandingTestimonials />
      <LandingHowItWorks />
      <LandingResultBand />
      <LandingFAQ />
      <LandingFinalCTA />
      <LandingFooter />
    </main>
  );
}
