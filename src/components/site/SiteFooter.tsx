import Link from "next/link";
import { brand, mapsLink } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { InstagramIcon, TikTokIcon } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/5 pb-28 md:pb-0">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo className="h-8 w-auto" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted">
              Precision cuts for every texture by {brand.barber} — a private suite experience in Camp Springs, MD.
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Visit</p>
            <address className="mt-4 text-sm not-italic leading-relaxed text-muted">
              {brand.address.map((l) => <span key={l} className="block">{l}</span>)}
            </address>
            <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-ivory underline-offset-4 hover:underline">Directions</a>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Explore</p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li><Link href="/book" className="hover:text-ivory">Book an appointment</Link></li>
              <li><Link href="/#waitlist" className="hover:text-ivory">Join the waitlist</Link></li>
              <li><Link href="/live" className="hover:text-ivory">Watch live</Link></li>
              <li><Link href="/#app" className="hover:text-ivory">Get the app</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">Follow</p>
            <div className="mt-4 flex gap-2">
              <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="btn-line !p-3" aria-label="Instagram"><InstagramIcon /></a>
              <a href={brand.tiktok} target="_blank" rel="noopener noreferrer" className="btn-line !p-3" aria-label="TikTok"><TikTokIcon /></a>
            </div>
          </div>
        </div>
        <div className="hairline mt-14" />
        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-muted/70 md:flex-row">
          <p>© {new Date().getFullYear()} {brand.legalName}. All rights reserved.</p>
          <Link href="/admin" className="hover:text-muted">Owner login</Link>
        </div>
      </div>
    </footer>
  );
}
