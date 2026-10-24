export const brand = {
  name: "HOMME",
  legalName: "Homme LLC",
  tagline: "Who's your barber?",
  barber: "Tash",
  bio: "Hey, this is Tash the barber with Homme LLC! I have over 20 years in the business. I specialize in all haircuts and textures, as well as stellar customer service. I service men, women, and children.",
  suite: "Homme — Signature Salon Suites",
  address: ["6355 Old Branch Avenue", "Suite 3", "Camp Springs, MD 20748"],
  mapsQuery: "6355 Old Branch Avenue Suite 3, Camp Springs, MD 20748",
  instagram: "https://www.instagram.com/homme_llc",
  instagramHandle: "@homme_llc",
  tiktok: "https://www.tiktok.com/@hommellc",
  tiktokHandle: "@hommellc",
  timezone: "America/New_York",
};

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.mapsQuery)}`;
export const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(brand.mapsQuery)}&output=embed`;
