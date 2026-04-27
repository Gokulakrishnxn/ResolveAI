import { Hero } from '@/components/marketing/hero';
import { MetricsStrip } from '@/components/marketing/metrics-strip';
import { FeaturesGrid } from '@/components/marketing/features-grid';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { CaseStudy } from '@/components/marketing/case-study';
import { Pricing } from '@/components/marketing/pricing';
import { Faq } from '@/components/marketing/faq';
import { FinalCta } from '@/components/marketing/final-cta';

export default function HomePage(): JSX.Element {
  return (
    <>
      <Hero />
      <MetricsStrip />
      <FeaturesGrid />
      <HowItWorks />
      <CaseStudy />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}
