// Everything the page says and shows lives here. Specs are illustrative sample
// data — replace them with your own. Colours are in theme.css (the per-laptop
// background tints are below, because they travel with each laptop).

// One sprite sheet holds all six laptops (2 columns x 3 rows). `box` is each
// laptop's tight crop on the sheet: [x, y, width, height] in the sheet's own pixels.
export const SHEET = "https://ik.imagekit.io/Harsh2463/jackets/Six%20Laptops%20Product%20Showcase%20Grid.png?tr=f-webp,q-85";
export const SHEET_SIZE = [1086, 1448];

export const content = {
  brand: { name: "Motion", accent: "Laptop" },
  header: {
    searchPlaceholder: "Search laptops…",
    user: "Ryman Alex",
  },
  // Sizes (1 = default). productSize scales each laptop, ringSize the radius of the
  // ring they stand on, rightSize the width of the card column on the right.
  // (productSize and ringSize apply to the desktop ring; phones size themselves.)
  layout: { productSize: 0.9, ringSize: 0.9, rightSize: 0.75 },
  summary: { cta: "Add to bag", added: "Added" },
  pick: { title: "Pick a machine", hint: "Tap a colour to jump" },
  score: { title: "Performance" },
  specLabels: {
    cpu: "Processor",
    gpu: "Graphics",
    display: "Display",
    memory: "Memory",
    storage: "Storage",
    battery: "Battery",
    build: "Weight & ports",
  },
  sheet: SHEET,
  sheetSize: SHEET_SIZE,
  autoplay: true,
  autoplaySeconds: 5,

  laptops: [
    {
      brand: "ROG", name: "Strix G16", kind: "Gaming", tagline: "Raw power with an RGB light bar.",
      price: 1899, was: 2099, rating: 4.7, reviews: "2.1k", performance: 96,
      accent: "#7c5cff", tint: ["#cdc6f6", "#a9b6e4"], box: [16, 96, 527, 381],
      specs: {
        cpu: { name: "Core i9-14900HX", cores: 24, boost: 5.8 },
        gpu: { name: "GeForce RTX 4070", vram: 8, watts: 140 },
        display: { size: 16, res: "2560 × 1600", hz: 240, panel: "IPS · 100% DCI-P3" },
        memory: { size: 32, type: "DDR5-5600" },
        storage: { size: 1024, type: "NVMe Gen4 SSD", used: 38 },
        battery: { wh: 90, hours: 7 },
        build: { kg: 2.5, ports: ["Thunderbolt 4", "HDMI 2.1", "USB-A ×3", "RJ45", "3.5 mm"] },
      },
    },
    {
      brand: "Acer", name: "Nitro 5", kind: "Gaming", tagline: "The value pick for high frame rates.",
      price: 1099, was: 1299, rating: 4.5, reviews: "3.4k", performance: 84,
      accent: "#e5484d", tint: ["#f1c8c8", "#c9b2b8"], box: [547, 100, 525, 376],
      specs: {
        cpu: { name: "Ryzen 7 7840HS", cores: 8, boost: 5.1 },
        gpu: { name: "GeForce RTX 4060", vram: 8, watts: 115 },
        display: { size: 15.6, res: "1920 × 1080", hz: 165, panel: "IPS · 100% sRGB" },
        memory: { size: 16, type: "DDR5-5600" },
        storage: { size: 512, type: "NVMe Gen4 SSD", used: 46 },
        battery: { wh: 57, hours: 6 },
        build: { kg: 2.5, ports: ["USB-C", "HDMI 2.1", "USB-A ×3", "RJ45", "3.5 mm"] },
      },
    },
    {
      brand: "HP", name: "Victus 15", kind: "Gaming", tagline: "Everyday play without the premium price.",
      price: 949, was: 1099, rating: 4.4, reviews: "1.8k", performance: 78,
      accent: "#f08a24", tint: ["#f5d8bb", "#e3c0a3"], box: [15, 546, 529, 395],
      specs: {
        cpu: { name: "Core i5-13500H", cores: 12, boost: 4.7 },
        gpu: { name: "GeForce RTX 4050", vram: 6, watts: 95 },
        display: { size: 15.6, res: "1920 × 1080", hz: 144, panel: "IPS · anti-glare" },
        memory: { size: 16, type: "DDR5-4800" },
        storage: { size: 512, type: "NVMe SSD", used: 52 },
        battery: { wh: 70, hours: 7 },
        build: { kg: 2.3, ports: ["USB-C", "HDMI 2.1", "USB-A ×3", "RJ45", "3.5 mm"] },
      },
    },
    {
      brand: "Samsung", name: "Galaxy Book6", kind: "Everyday", tagline: "Light, bright and built for the whole day.",
      price: 1349, was: 1499, rating: 4.6, reviews: "960", performance: 82,
      accent: "#2f7bff", tint: ["#bdd3f4", "#a7bede"], box: [547, 547, 524, 393],
      specs: {
        cpu: { name: "Core Ultra 7", cores: 16, boost: 5.0 },
        gpu: { name: "Intel Arc graphics", vram: 0, watts: 28 },
        display: { size: 15.6, res: "1920 × 1080", hz: 120, panel: "AMOLED · 100% DCI-P3" },
        memory: { size: 16, type: "LPDDR5X-7467" },
        storage: { size: 512, type: "NVMe Gen4 SSD", used: 31 },
        battery: { wh: 68, hours: 15 },
        build: { kg: 1.55, ports: ["Thunderbolt 4", "HDMI 2.1", "USB-A ×2", "microSD", "3.5 mm"] },
      },
    },
    {
      brand: "Apple", name: "MacBook Pro 14", kind: "Creator", tagline: "M5 power, all-day battery, a stunning screen.",
      price: 1999, was: 0, rating: 4.9, reviews: "5.6k", performance: 97,
      accent: "#6b7280", tint: ["#d5d9e0", "#bcc3cd"], box: [14, 1018, 529, 372],
      specs: {
        cpu: { name: "Apple M5", cores: 10, boost: 4.4 },
        gpu: { name: "10-core GPU", vram: 0, watts: 40 },
        display: { size: 14.2, res: "3024 × 1964", hz: 120, panel: "Liquid Retina XDR" },
        memory: { size: 16, type: "Unified memory" },
        storage: { size: 1024, type: "SSD", used: 27 },
        battery: { wh: 70, hours: 24 },
        build: { kg: 1.55, ports: ["Thunderbolt 5 ×3", "HDMI", "SDXC", "MagSafe 3", "3.5 mm"] },
      },
    },
    {
      brand: "Lenovo", name: "ThinkPad P1 Gen 7", kind: "Workstation", tagline: "A thin mobile workstation you can trust.",
      price: 2299, was: 2499, rating: 4.7, reviews: "740", performance: 93,
      accent: "#d6334a", tint: ["#eec3ca", "#cbb0b9"], box: [547, 1010, 525, 382],
      specs: {
        cpu: { name: "Core Ultra 9 185H", cores: 16, boost: 5.1 },
        gpu: { name: "RTX 2000 Ada", vram: 8, watts: 65 },
        display: { size: 16, res: "2560 × 1600", hz: 165, panel: "IPS · 100% DCI-P3" },
        memory: { size: 32, type: "LPDDR5X-7467" },
        storage: { size: 1024, type: "NVMe Gen4 SSD", used: 41 },
        battery: { wh: 90, hours: 10 },
        build: { kg: 1.97, ports: ["Thunderbolt 4 ×2", "HDMI 2.1", "USB-A ×2", "SD", "3.5 mm"] },
      },
    },
  ],
};

export default content;
