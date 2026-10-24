import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "h-8 w-auto", href = "/" }: { className?: string; href?: string | null }) {
  const img = <Image src="/brand/homme-logo.png" alt="HOMME — Who's your barber?" width={1000} height={231} className={className} priority />;
  return href ? <Link href={href} aria-label="HOMME home">{img}</Link> : img;
}
