import Link from "next/link";
import { getServerClient } from "@/lib/supabase";
import { brand, mapsEmbed, mapsLink } from "@/lib/config";
import { duration, money } from "@/lib/format";
import type { BusinessHours, Review, Service } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { Stars } from "@/components/Stars";
import { HoursCard } from "@/components/HoursCard";
import { ReviewsList } from "@/components/ReviewsList";
import { LiveBanner, LiveNavLink, LiveSection } from "@/components/live";
import { ChevronRightIcon, ClockIcon, InstagramIcon, PinIcon, TikTokIcon } from "@/components/icons";

export const revalidate = 60;

async function getData() {
  const sb = getServerClient();
  const [services, hours, reviews] = await Promise.all([
    sb.from("services").select("*").eq("active", true).order("sort_order"),
    sb.from("business_hours").select("*").order("weekday"),
    sb.from("reviews").select("*").eq("published", true).order("created_at", { ascending: false }),
  ]);
  return {
    services: (services.data ?? []) as Service[],
    hours: (hours.data ?? []) as BusinessHours[],
    reviews: (reviews.data ?? []) as Review[],
  };
}

export default async function Home() {
  const { services, hours, reviews } = await getData();
  const main = services.filter((s) => !s.is_addon);
  const addons = services.filter((s) => s.is_addon);
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 5;

  return (
    <main className="pb-28 md:pb-0">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo className="h-7 w-auto" />
          <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#services" className="hover:text-fg">Services</a>
            <a href="#reviews" className="hover:text-fg">Reviews</a>
            <a href="#visit" className="hover:text-fg">Visit</a>
            <LiveNavLink />
          </nav>
          <Link href="/book" className="btn-primary !px-5 !py-2.5 !text-[0.7rem]">Book</Link>
        </div>
        <LiveBanner />
      </header>

      {/* Hero */}
      <section className="grain relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 text-center md:pb-28 md:pt-24">
          <Logo href={null} className="mx-auto h-auto w-full max-w-3xl" />
          <p className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            Precision cuts for every texture — men, women &amp; children. <span className="text-fg">20+ years</span> behind the chair.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <Stars rating={avg} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted">· {reviews.length} reviews</span>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/book" className="btn-primary w-full sm:w-auto">Book an appointment</Link>
            <div className="flex gap-3">
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost" aria-label="Instagram">
                <InstagramIcon /> <span className="text-xs">{brand.instagramHandle}</span>
              </a>
              <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost" aria-label="TikTok">
                <TikTokIcon /> <span className="text-xs">{brand.tiktokHandle}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <LiveSection />

      {/* About */}
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-[1fr_2fr] md:items-center">
          <div>
            <p className="eyebrow">Meet your barber</p>
            <h2 className="mt-3 font-display text-5xl font-bold">{brand.barber}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><PinIcon /> Camp Springs, MD</p>
          </div>
          <p className="text-lg leading-relaxed text-fg/85 md:text-xl">{brand.bio}</p>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="eyebrow">Menu</p>
        <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Services</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {main.map((s) => (
            <Link key={s.id} href={`/book?service=${s.id}`} className="card group flex items-center justify-between p-5 transition hover:border-gold/60">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                  <span className="text-fg">{s.price_is_starting ? "from " : ""}{money(s.price_cents)}</span>
                  <span className="h-3 w-px bg-line" />
                  <ClockIcon className="h-3.5 w-3.5" /> {duration(s.duration_min)}
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted transition group-hover:text-gold">
                Book <ChevronRightIcon />
              </span>
            </Link>
          ))}
        </div>
        {addons.length > 0 && (
          <>
            <h3 className="mt-12 text-sm font-semibold uppercase tracking-[0.25em] text-muted">Add-ons</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {addons.map((s) => (
                <div key={s.id} className="rounded-2xl border border-line px-5 py-4">
                  <p className="font-semibold">{s.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {s.price_is_starting ? "from " : "+"}{money(s.price_cents)} · {duration(s.duration_min)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Reviews */}
      <section id="reviews" className="scroll-mt-20 border-t border-line bg-surface/30">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">What clients say</p>
              <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Reviews</h2>
            </div>
            <div className="text-right">
              <p className="font-display text-5xl font-bold">{avg.toFixed(1)}</p>
              <p className="text-sm text-muted"><Stars rating={avg} /> {reviews.length} reviews</p>
            </div>
          </div>
          <div className="mt-10">
            <ReviewsList reviews={reviews} />
          </div>
        </div>
      </section>

      {/* Visit */}
      <section id="visit" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <p className="eyebrow">Visit</p>
        <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">Location &amp; Hours</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="card p-7">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em]">{brand.suite}</h3>
            <address className="mt-3 not-italic leading-relaxed text-fg/85">
              {brand.address.map((l) => <span key={l} className="block">{l}</span>)}
            </address>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline">
              Get directions <ChevronRightIcon />
            </a>
            <div className="my-6 h-px bg-line" />
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em]">Hours</h3>
            <HoursCard hours={hours} />
          </div>
          <div className="card min-h-[360px] overflow-hidden">
            <iframe
              title="Map to HOMME"
              src={mapsEmbed}
              className="h-full min-h-[360px] w-full grayscale invert-[0.92] hue-rotate-180"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-12 text-center">
          <Logo className="h-8 w-auto" />
          <div className="flex gap-3">
            <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost !p-3" aria-label="Instagram"><InstagramIcon /></a>
            <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-ghost !p-3" aria-label="TikTok"><TikTokIcon /></a>
          </div>
          <p className="text-xs text-muted">© {new Date().getFullYear()} {brand.legalName}. All rights reserved.</p>
          <Link href="/admin" className="text-xs text-muted/50 hover:text-muted">Owner login</Link>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 p-4 backdrop-blur-xl md:hidden">
        <Link href="/book" className="btn-primary w-full">Book an appointment</Link>
      </div>
    </main>
  );
}
