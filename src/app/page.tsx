import Link from "next/link";
import { brand, mapsEmbed, mapsLink } from "@/lib/config";
import { duration, formatDateShort, formatTime, money } from "@/lib/format";
import { galleryUrl } from "@/lib/gallery";
import { getSiteData, menuGroups } from "@/lib/site";
import { Logo } from "@/components/Logo";
import { Stars } from "@/components/Stars";
import { HoursCard } from "@/components/HoursCard";
import { LiveSection } from "@/components/live";
import { InstallApp } from "@/components/InstallApp";
import { InstagramIcon, PinIcon, TikTokIcon } from "@/components/icons";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WelcomeBack } from "@/components/site/WelcomeBack";
import { ReviewsShowcase } from "@/components/site/ReviewsShowcase";
import { WaitlistForm } from "@/components/site/WaitlistForm";

export const revalidate = 60;

const PILLARS = [
  { title: "A private suite", body: "No crowded shop floor. Just you, the chair and a calm, comfortable space." },
  { title: "On time, every time", body: "Your appointment starts when it says it does. Clients say it in every review." },
  { title: "Every texture", body: "Straight, wavy, curly, coily — two decades of mastering them all." },
  { title: "The whole family", body: "Men, women and kids. Plenty of parents bring the whole crew." },
];

export default async function Home() {
  const { services, hours, reviews, banner, waitlistEnabled, photos, nextAvailable } = await getSiteData();
  const groups = menuGroups(services);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 5;
  const marquee = services.filter((s) => !s.is_addon).map((s) => s.name);

  return (
    <main className="overflow-x-clip">
      <SiteNav banner={banner} />

      {/* ---------- Hero ---------- */}
      <section className="relative -mt-[4.5rem] flex min-h-[100svh] items-center pt-[4.5rem]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-20%] h-[70vh] w-[110vw] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(201,169,106,0.22),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-bg to-transparent" />
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 text-center md:px-8">
          <p className="float-in flex items-center justify-center gap-3 whitespace-nowrap text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted md:text-[0.7rem] md:tracking-[0.45em]">
            <span className="hairline-left hidden w-10 rotate-180 sm:block" /> Camp Springs, MD <span className="text-gold">✦</span>
            <span className="hidden sm:inline">Signature Salon Suites</span><span className="sm:hidden">Private Suite</span>
            <span className="hairline-left hidden w-10 sm:block" />
          </p>
          <div className="float-in mt-10" style={{ animationDelay: "120ms" }}>
            <Logo href={null} className="mx-auto h-auto w-full max-w-[52rem]" />
          </div>
          <h1 className="float-in mx-auto mt-10 max-w-3xl font-display text-[2.1rem] font-normal leading-[1.08] text-ivory md:text-6xl" style={{ animationDelay: "240ms" }}>
            Precision cuts. <em className="text-gold-gradient italic">Every texture.</em>
          </h1>
          <p className="float-in mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg" style={{ animationDelay: "320ms" }}>
            Two decades behind the chair. Men, women &amp; children — in a private suite where you&apos;re the only appointment that matters.
          </p>

          <div className="float-in mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "400ms" }}>
            <Link href="/book" className="btn-gold w-full sm:w-auto">Book your chair</Link>
            <a href="#menu" className="btn-line w-full sm:w-auto">View the menu</a>
          </div>

          {nextAvailable && (
            <Link href="/book" className="float-in mt-6 inline-flex items-center gap-2.5 rounded-full border border-gold/25 bg-gold/[0.06] px-4 py-2 text-xs text-ivory transition hover:border-gold/60" style={{ animationDelay: "480ms" }}>
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative h-2 w-2 rounded-full bg-ok" /></span>
              Next available <span className="font-semibold">{formatDateShort(nextAvailable)} · {formatTime(nextAvailable)}</span>
            </Link>
          )}

          <WelcomeBack />

          <div className="float-in mx-auto mt-14 grid max-w-2xl grid-cols-3 border-y border-white/8 py-5" style={{ animationDelay: "560ms" }}>
            {[
              { k: avg.toFixed(1), v: <><Stars rating={avg} className="h-2.5 w-2.5" /></> },
              { k: "20+", v: "Years" },
              { k: String(reviews.length), v: "Five-star reviews" },
            ].map((s, i) => (
              <div key={i} className={i ? "border-l border-white/8" : ""}>
                <p className="font-display text-3xl text-ivory md:text-4xl">{s.k}</p>
                <div className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LiveSection />

      {/* ---------- Marquee ---------- */}
      {marquee.length > 0 && (
        <div className="border-y border-white/5 bg-white/[0.015] py-5" aria-hidden>
          <div className="marquee-track">
            {[...marquee, ...marquee, ...marquee, ...marquee].map((m, i) => (
              <span key={i} className="flex items-center gap-8 pr-8 font-display text-2xl italic text-ivory/70 md:text-3xl">
                {m} <span className="text-base not-italic text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- 01 Menu ---------- */}
      <section id="menu" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal><SectionHeading num="01" eyebrow="The menu" title="Services," accent="refined.">Tap any service to book it.</SectionHeading></Reveal>
            <Reveal><Link href="/book" className="btn-line">Book now</Link></Reveal>
          </div>
          <div className="mt-16 grid gap-x-16 gap-y-14 lg:grid-cols-2">
            {groups.map((g, gi) => (
              <Reveal key={g.title} delay={gi * 80} className={g.title === "Finishing touches" ? "lg:col-span-2" : ""}>
                <div className="mb-6 flex items-baseline justify-between border-b border-gold/25 pb-3">
                  <h3 className="font-display text-3xl italic text-gold-soft">{g.title}</h3>
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-muted">{g.note}</span>
                </div>
                <ul className={g.title === "Finishing touches" ? "grid gap-x-16 sm:grid-cols-2" : ""}>
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <Link href={`/book?services=${s.id}`} className="group flex items-baseline py-4">
                        <span>
                          <span className="font-display text-xl text-ivory transition group-hover:text-gold-soft md:text-[1.4rem]">{s.name}</span>
                          <span className="ml-3 text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-muted">{duration(s.duration_min)}</span>
                        </span>
                        <span className="leader" />
                        <span className="font-display text-xl text-ivory md:text-[1.4rem]">
                          {s.price_is_starting && <span className="mr-1 text-xs italic text-muted">from</span>}
                          {g.title === "Finishing touches" && !s.price_is_starting ? "+" : ""}{money(s.price_cents)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 The barber ---------- */}
      <section className="relative border-y border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.3fr] lg:items-center">
          <Reveal>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
              <div className="absolute inset-0 rounded-[2rem] border border-gold/30" />
              <div className="absolute inset-3 flex flex-col items-center justify-center overflow-hidden rounded-[1.6rem] bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,106,0.25),transparent_60%),linear-gradient(180deg,#141210,#080706)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/tash-chair.jpg" alt="Tash cutting a client's hair in her suite at HOMME" loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/30 bg-bg px-5 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.35em] text-gold">
                {brand.barber} · Master barber
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <SectionHeading num="02" eyebrow="Meet your barber" title="Hi, I'm" accent={`${brand.barber}.`} />
            <p className="mt-8 font-display text-2xl leading-snug text-ivory/90 md:text-[1.9rem]">
              “I have over 20 years in the business. I specialize in all haircuts and textures — and stellar customer service.”
            </p>
            <p className="mt-6 max-w-xl leading-relaxed text-muted">
              Whether it&apos;s a crisp fade, a precision cut, a fresh lineup or your little one&apos;s first trim, every client gets the same
              attention to detail. Homme is built on one idea: when you leave the chair, you should feel like the best version of yourself.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-4">
              {[["20+", "Years"], [avg.toFixed(1), "Rating"], [String(reviews.length), "Reviews"], ["All", "Textures"]].map(([k, v]) => (
                <div key={v} className="bg-bg p-5 text-center">
                  <p className="font-display text-3xl text-gold-soft">{k}</p>
                  <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-muted">{v}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- 03 The work ---------- */}
      <section id="work" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Reveal><SectionHeading num="03" eyebrow="Fresh out the chair" title="The" accent="work." /></Reveal>
            <Reveal><a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-line"><InstagramIcon className="h-4 w-4" /> {brand.instagramHandle}</a></Reveal>
          </div>
          {photos.length > 0 ? (
            <div className="mt-14 grid auto-rows-[44vw] grid-cols-2 gap-3 sm:auto-rows-[30vw] md:grid-cols-3 lg:auto-rows-[20rem] lg:grid-cols-4">
              {photos.map((p, i) => (
                <Reveal as="figure" key={p.id} delay={(i % 4) * 70}
                  className={`group relative overflow-hidden rounded-2xl bg-surface ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleryUrl(p.path)} alt={p.caption ?? "Haircut by Tash at HOMME"} loading="lazy"
                    className="h-full w-full object-cover transition duration-[1.2s] group-hover:scale-105" />
                  {p.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-10 font-display text-lg italic text-ivory">{p.caption}</figcaption>
                  )}
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="lux-card mt-14 grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div>
                <p className="font-display text-3xl text-ivory md:text-4xl">See every cut, every week.</p>
                <p className="mt-3 max-w-lg text-muted">Fades, tapers, designs and transformations — follow along on Instagram and TikTok, or catch Tash live from the chair.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-gold"><InstagramIcon className="h-4 w-4" /> Instagram</a>
                <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-line"><TikTokIcon className="h-4 w-4" /> TikTok</a>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ---------- 04 Experience ---------- */}
      <section className="border-y border-white/5 bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-28">
          <Reveal><SectionHeading num="04" eyebrow="The experience" title="Why clients" accent="stay." align="center" /></Reveal>
          <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className="bg-bg p-8">
                <span className="section-num text-2xl">0{i + 1}</span>
                <h3 className="mt-6 font-display text-2xl text-ivory">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 05 Reviews ---------- */}
      <section id="reviews" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <Reveal>
            <SectionHeading num="05" eyebrow="In their words" title="Five stars," accent={`${reviews.length} times over.`} align="center" />
          </Reveal>
          <Reveal className="mt-14"><ReviewsShowcase reviews={reviews} /></Reveal>
        </div>
      </section>

      {/* ---------- Waitlist ---------- */}
      {waitlistEnabled && (
        <section id="waitlist" className="scroll-mt-20 px-5 md:px-8">
          <Reveal className="lux-card relative mx-auto max-w-5xl overflow-hidden p-8 md:p-14">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-gold">The waitlist</p>
                <h2 className="mt-4 font-display text-4xl leading-tight text-ivory md:text-5xl">Fully booked? <em className="text-gold-gradient italic">Get first dibs.</em></h2>
                <p className="mt-4 text-muted">Weekends fill fast. Join the list and you&apos;ll be the first to know the second a chair opens up.</p>
              </div>
              <WaitlistForm compact />
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------- 06 Visit ---------- */}
      <section id="visit" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8 md:py-32">
          <Reveal><SectionHeading num="06" eyebrow="Visit" title="Find" accent="the suite." /></Reveal>
          <div className="mt-14 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <Reveal className="lux-card p-8">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">{brand.suite}</p>
              <address className="mt-4 font-display text-2xl not-italic leading-snug text-ivory">
                {brand.address.map((l) => <span key={l} className="block">{l}</span>)}
              </address>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn-line mt-6 !py-3"><PinIcon /> Get directions</a>
              <div className="hairline my-8" />
              <p className="mb-4 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Hours</p>
              <HoursCard hours={hours} />
            </Reveal>
            <Reveal delay={100} className="lux-card min-h-[420px] overflow-hidden">
              <iframe title="Map to HOMME" src={mapsEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[420px] w-full grayscale invert-[0.92] hue-rotate-180 contrast-[0.9]" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- App + final CTA ---------- */}
      <section id="app" className="scroll-mt-20 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center md:px-8">
          <Reveal>
            <h2 className="font-display text-5xl leading-[1.05] text-ivory md:text-7xl">Your chair is <em className="text-gold-gradient italic">waiting.</em></h2>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/book" className="btn-gold w-full sm:w-auto">Book your chair</Link>
              {waitlistEnabled && <a href="#waitlist" className="btn-line w-full sm:w-auto">Join the waitlist</a>}
            </div>
          </Reveal>
          <Reveal className="mt-16"><InstallApp /></Reveal>
        </div>
      </section>

      <SiteFooter />

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-bg/85 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl md:hidden">
        <Link href="/book" className="btn-gold w-full">
          Book{nextAvailable ? <span className="font-medium normal-case tracking-normal opacity-80">· next {formatDateShort(nextAvailable)} {formatTime(nextAvailable)}</span> : " your chair"}
        </Link>
      </div>
    </main>
  );
}
