import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppLoadingScreen } from "@/components/AppLoadingScreen";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { DemoVideoSection } from "@/components/landing/DemoVideoSection";
import { ExportSection } from "@/components/landing/ExportSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";
import { CookieBanner } from "@/components/landing/CookieBanner";

export function LandingPage() {
  const { hash } = useLocation();

  // Support deep links like /#pricing (e.g. the /pricing redirect) by scrolling
  // to the matching section once the page has mounted.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <AppLoadingScreen ready={true} />
      <LandingNav />
      <main>
        <HeroSection />
        <FeatureCards />
        <DemoVideoSection />
        <ExportSection />
        <PricingSection />
        <Footer />
      </main>
      <CookieBanner />
    </div>
  );
}
