import { Container, SectionHeader } from './SectionHeader'
import { Accordion } from '@/components/ui/Accordion'
import { FAQ } from '@/content/faq'

export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="border-t border-white/[0.05] py-28 md:py-40">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <SectionHeader
            index="06"
            eyebrow="Questions"
            titleId="faq-title"
            title="Straight answers."
            lede="Each answer is tagged with whether it is available now or depends on how a deployment is configured."
          />
          <Accordion items={FAQ} />
        </div>
      </Container>
    </section>
  )
}
