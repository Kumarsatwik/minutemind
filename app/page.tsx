import HeroSection from "./components/landing/HeroSection";
import FeaturesSection from "./components/landing/FeatureSection";
import IntegrationsSection from "./components/landing/IntegrationsSection";
import MoreFeaturesSection from "./components/landing/MoreFeaturesSection";
import Footer from "./components/landing/Footer";
import HowItWorksSection from "./components/landing/HowItWorksSection";
import StatsSection from "./components/landing/StatsSection";
import CTASection from "./components/landing/CTASection";

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <HeroSection />
      <FeaturesSection />
      <IntegrationsSection />
      <HowItWorksSection />
      <StatsSection />
      <MoreFeaturesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
