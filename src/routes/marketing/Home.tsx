import { Hero } from '@/components/marketing/Hero'
import { ProblemSection } from '@/components/marketing/ProblemSection'
import { FlowSection } from '@/components/marketing/FlowSection'
import { SecuritySection } from '@/components/marketing/SecuritySection'
import { DeveloperSection } from '@/components/marketing/DeveloperSection'
import { CapabilitiesSection } from '@/components/marketing/CapabilitiesSection'
import { FaqSection } from '@/components/marketing/FaqSection'
import { FinalCta } from '@/components/marketing/FinalCta'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Home() {
  useDocumentTitle(null)
  return (
    <>
      <Hero />
      <ProblemSection />
      <FlowSection />
      <SecuritySection />
      <DeveloperSection />
      <CapabilitiesSection />
      <FaqSection />
      <FinalCta />
    </>
  )
}
