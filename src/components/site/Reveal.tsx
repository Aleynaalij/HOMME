"use client";

import { useEffect, useRef } from "react";

/** Fades children up as they scroll into view. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: {
  children: React.ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Safety net: never leave content hidden if the observer doesn't fire
    const t = setTimeout(() => el.classList.add("in"), 2500);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return (
    // @ts-expect-error — polymorphic ref
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  );
}
