import type { Service } from "./types";

export type MenuGroup = { title: string; note: string; items: Service[] };

/** Restaurant-style menu sections. */
export function menuGroups(services: Service[]): MenuGroup[] {
  const addons = services.filter((s) => s.is_addon);
  const main = services.filter((s) => !s.is_addon);
  const grooming = main.filter((s) => /beard|shape/i.test(s.name));
  const cuts = main.filter((s) => !grooming.includes(s));
  return [
    { title: "Cuts", note: "Every texture, every age", items: cuts },
    { title: "Grooming", note: "Lineups, shape-ups & beards", items: grooming },
    { title: "Finishing touches", note: "Add to any service", items: addons },
  ].filter((g) => g.items.length);
}
