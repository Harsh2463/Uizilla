// Everything the page says and shows lives here — edit the text, links and
// image URLs, and the whole page updates. Colours are in theme.css.

const CDN = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";

export const content = {
  brand: "ORVANTE",

  // ---- images (any URL or a file in /public, e.g. "/images/hero.webp") ----
  images: {
    hero: CDN + "7dc8b8f3-4ccb-4599-8ce4-7f7c7881bad9.webp", // black-and-white man seen from behind
    studioFeed: CDN + "a9d3641f-d629-46e5-8d2d-5f75386b803d.webp", // the "230+" card
    outNow: CDN + "9340eb08-877d-4d08-91fb-b70754541d98.webp", // "Q Industrial" card
    portrait: CDN + "addecc7d-666f-4342-8290-ed7f7cbbffd6.webp", // trust panel, right card
    avatars: [
      "300f41b1-3de5-4153-afde-06e15e753ad0",
      "bfff4cdf-4fda-4491-ada6-62f3b6236492",
      "943b121e-fe72-479f-93ae-aa8cd1650f69",
      "c673306f-2b81-4c3d-a7d2-3df61d481abb",
      "2e4fcf11-d0fc-4f31-8f7a-dfe751777141",
      "ab458fcd-4c2c-426f-8213-21cc3c7274be",
      "c1fcd833-5ac9-41e9-9352-fead7e64fa24",
      "4c2b3307-e555-4633-949c-efd3b7e09d82",
    ].map((id) => CDN + id + ".webp"),
  },

  // ---- hero ----
  nav: [
    { label: "Home", href: "#top" },
    { label: "Studio", href: "#studio" },
    { label: "Works", href: "#works" },
    { label: "Blog", href: "#blog" },
  ],
  date: { day: "Sunday", range: "17.06 – 27 June 2026" },
  contact: { label: "Contact Us", href: "#contact" },
  title: { lines: ["PURE", "DESIGN"], year: "(’25)" },
  about: {
    label: "(ABOUT)",
    text: ["Building stunning website that", "every brand deserves to be seen."],
    button: { label: "Book A Call", href: "#contact" },
  },
  stats: {
    partners: { value: 400, suffix: "+", label: "Trusted Partner", button: "Book a call" },
    marks: ["Halcyon", "Ostra", "Fenwick", "Monolo", "Kitefly", "Arbor"],
    feed: { tag: "Studio Feed", date: "05/06" },
    projects: { value: 230, suffix: "+", label: "Projects successfully launched worldwide" },
  },
  growth: "True Growth",
  available: { line1: "We’re available", line2: "for you" },
  outNow: { eyebrow: "Out Now", title: "Q Industrial", year: "[2025]", href: "#works" },
  logos: ["Lumon", "Paperfold", "Northwind"],

  // ---- bar ----
  bar: { left: ["EST", "2019"], middle: "SCROLL DOWN", right: "LIVE IN DETAILS" },

  // ---- statement ----
  statement: [
    "We believe the strongest brands are",
    "built through strategy, not just",
    "aesthetics. Every campaign is designed",
    "to capture attention, inspire action, and",
    "create lasting business growth.",
  ],
  statementSub: { text: ["Performance-driven marketing, from", "strategy to execution."], accent: "Built for growing brands." },

  // ---- trusted-by panel ----
  trust: {
    heading: ["Trusted by", "Hundreds of", "Growing", "Businesses"],
    text: [
      "From early-stage startups to established companies,",
      "we partner with brands that want measurable",
      "results and a story worth telling.",
    ],
    collaborations: { value: 56, suffix: "M+", label: "Global Collaborations" },
    awards: {
      value: 10,
      suffix: "+",
      label: "Industry Awards",
      badge: ["BEST GROWTH", "PARTNER", "2026"],
      note: ["Recognised for turning strategy", "into steady, measurable growth."],
    },
  },
};

export default content;
