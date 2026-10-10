import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ImageFrame from '@/components/ui/ImageFrame'
import { Display, Eyebrow, Rule } from '@/components/ui/Editorial'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal'

/**
 * Landing sections. Photography is the structural element, not decoration —
 * `class.jpeg` is the only true panorama in the asset set, so it carries the
 * full-bleed band, and `Tennis.jpeg` closes the page.
 */

/** Full-bleed panoramic band. */
export function PhotoBand() {
  return (
    <section className="relative">
      <ImageFrame
        src="/landing/class.jpeg"
        alt="A graduating cohort photographed together in front of the campus mural"
        ratio="auto"
        overlay
        priority
        className="h-[62vh] min-h-[380px] w-full sm:h-[70vh]"
        imgClassName="object-[50%_38%]"
      >
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-5 pb-10 sm:px-6 sm:pb-14">
            <Reveal className="max-w-2xl">
              <Eyebrow className="text-white/70">The community</Eyebrow>
              <p className="mt-4 font-display text-display text-white">
                One campus.
                <br />
                One place to pass things on.
              </p>
            </Reveal>
          </div>
        </div>
      </ImageFrame>
    </section>
  )
}

const STEPS = [
  {
    n: '01',
    title: 'List what you are done with',
    body: 'A photo, a price, two honest lines. If you have no idea what to charge, the price assistant reads your title, category and condition and suggests a fair range.',
  },
  {
    n: '02',
    title: 'It gets checked before anyone bites',
    body: 'Every listing is scored for the usual campus scams — advance payment, contact-me-off-platform, prices too good to be real — and flagged for moderation when it looks wrong.',
  },
  {
    n: '03',
    title: 'Meet between lectures',
    body: 'Contact details only unlock for signed-in students. Agree a spot on campus, inspect the thing in your hands, and hand over the money in person.',
  },
]

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1600px] px-5 py-20 sm:px-6 sm:py-28">
      <Reveal className="max-w-2xl">
        <Eyebrow accent>How it works</Eyebrow>
        <Display className="mt-4 max-w-[15ch]">Three steps, no shipping labels</Display>
      </Reveal>

      <RevealGroup
        staggerChildren={0.09}
        className="mt-14 grid gap-px border-t border-border sm:mt-16 lg:grid-cols-3 lg:border-l"
      >
        {STEPS.map((step) => (
          <RevealItem
            key={step.n}
            className="group relative border-b border-border bg-background p-7 transition-colors duration-300 hover:bg-primary-subtle sm:p-9 lg:border-r"
          >
            {/* The numeral is the graphic. No icons, no cards. */}
            <span className="font-display text-[3.5rem] leading-none text-border-strong transition-colors duration-300 group-hover:text-primary sm:text-[4.5rem]">
              {step.n}
            </span>
            <h3 className="mt-6 text-heading font-semibold tracking-tight text-foreground">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  )
}

export function ClosingCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-[1600px] items-stretch gap-0 lg:grid-cols-2">
        <Reveal variant="fade" className="group relative min-h-[320px] lg:min-h-[540px]">
          <ImageFrame
            src="/landing/Tennis.jpeg"
            alt="The college table tennis team holding their medals and the tournament trophy"
            ratio="auto"
            zoom
            priority
            className="h-full w-full"
            imgClassName="object-[46%_50%]"
          />
        </Reveal>

        <Reveal className="flex flex-col justify-center px-5 py-16 sm:px-10 sm:py-20 lg:px-16">
          <Eyebrow accent>Get started</Eyebrow>
          <Display className="mt-4">
            Somebody on
            <br />
            campus wants
            <br />
            your old stuff
          </Display>
          <Rule accent className="mt-8" />
          <p className="mt-8 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            Registration needs a college email and a mobile number, because the
            whole point is that the person on the other end is a real student
            here.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">
                Create an account
                <ArrowRight className="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/login">I already have one</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-heading text-foreground">
            Campus<span className="text-primary-ink">Market</span>
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <p className="text-xs text-muted-foreground">
            A student project, not a company.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link to="/marketplace" className="transition-colors hover:text-foreground">
            Marketplace
          </Link>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link to="/register" className="transition-colors hover:text-foreground">
            Register
          </Link>
        </nav>
      </div>
    </footer>
  )
}
