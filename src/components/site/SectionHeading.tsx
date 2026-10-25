export function SectionHeading({ num, eyebrow, title, accent, align = "left", children }: {
  num?: string; eyebrow: string; title: string; accent?: string; align?: "left" | "center"; children?: React.ReactNode;
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.4em] text-muted ${align === "center" ? "justify-center" : ""}`}>
        {num && <span className="section-num normal-case tracking-normal">{num}</span>}
        {eyebrow}
      </p>
      <h2 className="mt-5 font-display text-[2.6rem] font-medium leading-[1.02] text-ivory md:text-6xl">
        {title} {accent && <em className="text-gold-gradient font-normal italic">{accent}</em>}
      </h2>
      {children && <div className="mt-5 text-base leading-relaxed text-muted md:text-lg">{children}</div>}
    </div>
  );
}
