import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * GarmentRail — HINA "Little Wardrobe": an interactive clothes-rail hero.
 *
 * One quiet studio wall with a steep diagonal rail. Twelve garments hang on it: the first large at the front-left,
 * the other eleven receding along the rail, each tucked behind the one in front. Browse with the wheel, arrow keys,
 * arrow buttons or a swipe; hover a piece on the rail to see it lifted like a hanger; click a rail piece to bring it
 * to the front; click the front piece (or VIEW DETAILS) to close the rail into a soft blurred stack and slide in a
 * detail panel with three photo tabs.
 *
 * Self-contained: React only. It builds its own DOM, loads Noto Sans from Google Fonts' file host, and your four
 * image sheets by URL. It fills its parent (give the parent a height); below 820 px wide it becomes a normal
 * scrolling block with the info and detail panel under the rail.
 */

const proxy = (u, w) => `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(u)}&w=${w}&q=85`;
const CF = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/";
const GARMENT_SHEET = proxy(CF + "hf_20261113_121624_09fa35c4-680e-46a5-b6a9-8acd429bce67.png", 3312);
const SMOCK_SHEET = proxy(CF + "hf_20261113_121448_68442996-20c3-4f65-8f3d-56d2b6df8152.png", 2048);
const FABRIC_SHEET = proxy(CF + "hf_20261113_132947_dc18692c-66e4-447b-a11e-167b3bcadefb.png", 3312);
const DETAIL_SHEET = proxy(CF + "hf_20261113_132948_27322be0-e8d1-436a-a229-09ef6371cb98.png", 3312);
const FONT_URL = "https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2";

// White silk drapery, like a photographed satin sheet: one long S-shaped fold sweeps across the top and down the
// right-hand third, with a few parallel folds beside it. Each fold is a soft shadow stroke with a bright crest next
// to it, blurred, so the edges stay smooth. Laid over the wall colour (it only adds light and shade).
const RIDGE = "M -80 60 C 420 30 900 120 1170 195 C 1310 235 1340 340 1295 480 C 1240 650 1120 840 1062 1010 C 1012 1170 1040 1300 1230 1480 C 1330 1570 1450 1600 1560 1590";
const CLOTH_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='2000' height='1500' viewBox='0 0 2000 1500' preserveAspectRatio='xMidYMid slice'>" +
  "<defs>" +
  "<filter id='b8' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='8'/></filter>" +
  "<filter id='b22' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='22'/></filter>" +
  "<filter id='b50' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='50'/></filter>" +
  "<filter id='b90' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='90'/></filter>" +
  "</defs>" +
  // broad, very soft shading of the flat cloth
  "<g filter='url(#b90)' fill='#8e86ad'><ellipse cx='300' cy='1380' rx='620' ry='230' opacity='.13'/><ellipse cx='260' cy='620' rx='420' ry='300' opacity='.06'/><ellipse cx='1000' cy='-40' rx='900' ry='160' opacity='.1'/></g>" +
  // the main fold: shadow on its lit side, a darker core, then a bright crest beside it
  "<g fill='none' stroke-linecap='round' stroke-linejoin='round'>" +
  "<path d='" + RIDGE + "' transform='translate(-34 34)' stroke='#8e86ad' stroke-width='84' opacity='.2' filter='url(#b50)'/>" +
  "<path d='" + RIDGE + "' transform='translate(-12 14)' stroke='#7f76a3' stroke-width='26' opacity='.2' filter='url(#b22)'/>" +
  "<path d='" + RIDGE + "' transform='translate(30 -20)' stroke='#ffffff' stroke-width='64' opacity='.85' filter='url(#b22)'/>" +
  "<path d='" + RIDGE + "' transform='translate(70 -40)' stroke='#ffffff' stroke-width='120' opacity='.5' filter='url(#b50)'/>" +
  // parallel folds on the right
  "<path d='M 1540 -60 C 1490 300 1570 620 1500 920 C 1450 1160 1480 1370 1650 1580' stroke='#8e86ad' stroke-width='70' opacity='.15' filter='url(#b50)'/>" +
  "<path d='M 1572 -60 C 1522 300 1602 620 1532 920 C 1482 1160 1512 1370 1682 1580' stroke='#ffffff' stroke-width='54' opacity='.8' filter='url(#b22)'/>" +
  "<path d='M 1790 -60 C 1740 260 1840 540 1790 820 C 1752 1060 1762 1310 1890 1580' stroke='#8e86ad' stroke-width='56' opacity='.13' filter='url(#b50)'/>" +
  "<path d='M 1822 -60 C 1772 260 1872 540 1822 820 C 1784 1060 1794 1310 1922 1580' stroke='#ffffff' stroke-width='46' opacity='.75' filter='url(#b22)'/>" +
  "<path d='M 1960 80 C 1915 380 1995 680 1940 980 C 1915 1130 1935 1300 2020 1480' stroke='#8e86ad' stroke-width='40' opacity='.1' filter='url(#b22)'/>" +
  "</g></svg>";
const CLOTH = "data:image/svg+xml;utf8," + encodeURIComponent(CLOTH_SVG);

const DEFAULT_NAV = ["CLOTHING", "ACCESSORY", "JOURNAL", "ABOUT"];
// "Title line 1 | Title line 2 | Description line 1 | Description line 2 | Material | Colour | Size"
const DEFAULT_PRODUCTS = [
  "SMOCK | DRESS | Soft brushed cotton with hand | smocking. Made for play and naps. | ORGANIC COTTON | PERIWINKLE / BLUSH / CLOUD | 2Y / 4Y / 6Y",
  "MUSLIN | DRESS | Airy double gauze with little | flutter sleeves for warm days. | COTTON MUSLIN | CLOUD WHITE | 2Y / 4Y / 6Y",
  "POINTELLE | CARDIGAN | Fine pointelle knit with wooden | buttons. Light and easy to layer. | COTTON KNIT | BLUSH | 1Y / 2Y / 4Y",
  "DENIM | DUNGAREE | Washed soft denim with a full | skirt and adjustable straps. | COTTON DENIM | PERIWINKLE WASH | 2Y / 4Y / 6Y",
  "RUFFLE | BLOUSE | Crinkled cotton with a wide | ruffle collar and puff sleeves. | COTTON CRINKLE | LILAC GREY | 2Y / 4Y / 6Y",
  "BRODERIE | SMOCK | Broderie anglaise with frilled | shoulders and a roomy cut. | COTTON BRODERIE | CLOUD WHITE | 2Y / 4Y / 6Y",
  "LINEN | PINAFORE | Washed linen with button straps | and two deep patch pockets. | LINEN 100% | BLUSH | 2Y / 4Y / 6Y",
  "SOFT KNIT | JUMPER | Open-stitch cotton knit with a | gentle, easy round neck. | COTTON KNIT | PERIWINKLE | 1Y / 2Y / 4Y",
  "FRILL | DRESS | Pintucked cotton with frilled | shoulders and elastic cuffs. | ORGANIC COTTON | CLOUD WHITE | 2Y / 4Y / 6Y",
  "POCKET | PINAFORE | Soft twill with frilled straps | and pockets for small treasures. | COTTON TWILL | LILAC GREY | 2Y / 4Y / 6Y",
  "GINGHAM | DRESS | Smocked gingham with short | puff sleeves for sunny days. | COTTON GINGHAM | BLUSH / CREAM | 2Y / 4Y / 6Y",
  "QUILTED | VEST | Lightly quilted with wooden | buttons. Warm, never bulky. | COTTON QUILT | PALE PERIWINKLE | 1Y / 2Y / 4Y",
];

// Sprite boxes on the garment sheet: x, y, width, height of the visible garment (with its hook) and the hook stem x.
const SPR = [
  { x: 120, y: 54, w: 560, h: 742, hx: 404 },
  { x: 982, y: 56, w: 508, h: 708, hx: 1244 },
  { x: 1792, y: 62, w: 558, h: 588, hx: 2067 },
  { x: 2638, y: 54, w: 514, h: 726, hx: 2893 },
  { x: 110, y: 865, w: 596, h: 652, hx: 406 },
  { x: 938, y: 869, w: 610, h: 650, hx: 1234 },
  { x: 1844, y: 855, w: 456, h: 718, hx: 2067 },
  { x: 2614, y: 861, w: 570, h: 630, hx: 2895 },
  { x: 112, y: 1661, w: 592, h: 712, hx: 407 },
  { x: 996, y: 1661, w: 492, h: 716, hx: 1237 },
  { x: 1832, y: 1663, w: 478, h: 714, hx: 2067 },
  { x: 2682, y: 1673, w: 434, h: 630, hx: 2894 },
];
const FAB_COLS = [[0, 805], [836, 1638], [1668, 2476], [2506, 3311]];
const FAB_ROWS = [[0, 803], [834, 1633], [1664, 2479]];
const DET_COLS = [[0, 811], [842, 1640], [1671, 2470], [2501, 3311]];
const DET_ROWS = [[0, 804], [835, 1635], [1668, 2479]];

const HOOKS = [352, 440, 505, 565, 620, 670, 716, 758, 796, 831, 863, 893];
const SCALE_TABLE = [[352, 0.94], [435, 0.905], [545, 0.83], [670, 0.7], [778, 0.57], [878, 0.445], [958, 0.33], [1045, 0.19]];
const railY = (x) => 5 + 0.641 * (x - 330);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const scaleAt = (x) => {
  if (x <= SCALE_TABLE[0][0]) return SCALE_TABLE[0][1];
  for (let i = 1; i < SCALE_TABLE.length; i++) {
    if (x <= SCALE_TABLE[i][0]) {
      const [x0, y0] = SCALE_TABLE[i - 1];
      const [x1, y1] = SCALE_TABLE[i];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return SCALE_TABLE[SCALE_TABLE.length - 1][1];
};
const slotX = (j) => {
  if (j < 0) return 352 + j * 120;
  if (j >= 11) return HOOKS[11];
  const a = Math.floor(j);
  return lerp(HOOKS[a], HOOKS[a + 1], j - a);
};
const slotScale = (j) => (j <= 0 ? 0.93 : j < 1 ? lerp(0.93, scaleAt(HOOKS[1]), j) : scaleAt(slotX(j)));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num2 = (n) => String(n).padStart(2, "0");

const CSS = `
@font-face{font-family:"HinaNoto";src:url(${FONT_URL}) format("woff2");font-weight:100 900;font-display:swap}
.hn{--ease:cubic-bezier(.2,.75,.2,1);--ns:1;position:relative;width:100%;height:100%;min-height:520px;overflow:hidden;font-family:"HinaNoto","Noto Sans",system-ui,sans-serif;font-weight:400;color:var(--ink);background:var(--wall);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-transform:uppercase;box-sizing:border-box}
.hn *,.hn *::before,.hn *::after{box-sizing:border-box;margin:0}
.hn button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-transform:inherit;letter-spacing:inherit}
.hn a{color:inherit;text-decoration:none}
.hn .sheet{position:relative;width:100%;height:100%}
.hn.sm .sheet{height:auto;min-height:100%}
.hn .wall{overflow:hidden;position:absolute;inset:0;background:radial-gradient(70% 80% at 80% 40%,color-mix(in srgb,var(--wall) 88%,white) 0%,transparent 70%),linear-gradient(90deg,color-mix(in srgb,var(--wall) 94%,black) 0%,color-mix(in srgb,var(--wall) 97.5%,black) 30%,var(--wall) 60%,color-mix(in srgb,var(--wall) 94%,white) 100%)}
/* cloth texture: the lit, draped folds of the image above, laid over the wall */
.hn .wall::before{content:"";position:absolute;inset:0;pointer-events:none;background:url("${CLOTH}") center/cover no-repeat}
.hn.sm .wall::before{background-position:80% 40%}
.hn .stage{position:absolute;inset:0;overflow:hidden}
.hn .frame{position:absolute;left:50%;top:50%;width:1440px;height:900px;transform-origin:0 0}
.hn .rail{position:absolute;left:0;top:0;width:1440px;height:900px;overflow:visible;transition:clip-path .7s cubic-bezier(.65,0,.25,1)}
.hn.detail .rail{clip-path:inset(0 46% 0 0)}
.hn .floor{position:absolute;width:600px;height:60px;background:radial-gradient(ellipse at center,rgba(70,60,90,.14),transparent 70%);pointer-events:none}
.hn .gm{position:absolute;left:0;top:0;pointer-events:none;background-repeat:no-repeat;background-size:3312px 2480px;transition:transform .55s var(--ease),opacity .35s ease,filter .55s ease;will-change:transform}
.hn.slow .gm{transition:transform .7s cubic-bezier(.65,0,.25,1),opacity .55s ease,filter .55s ease}
.hn .ui{position:absolute;inset:0;z-index:300;pointer-events:none}
.hn .ui>*{pointer-events:auto}
.hn .ln{display:block;white-space:nowrap}
.hn .rv{overflow:hidden}
.hn .sw{transition:opacity .22s ease,transform .32s var(--ease)}
.hn .sw.out{opacity:0;transform:translateY(5px)}
/* info column */
.hn .info{position:absolute;left:1118px;top:198px;width:310px;transition:transform .75s cubic-bezier(.65,0,.2,1)}
.hn .cnt{font-size:11px;letter-spacing:.18em;color:var(--muted);height:18px}
.hn .ttl{margin-top:28px;font-size:31px;font-weight:300;letter-spacing:.14em;line-height:35px;min-height:70px}
.hn .rule{width:20px;height:1px;background:var(--muted);opacity:.7;margin-top:36px}
.hn .desc{margin-top:24px;width:300px;font-size:13px;letter-spacing:.088em;line-height:24px;color:var(--muted);text-transform:none}
.hn .specs{margin-top:54px;font-size:10px;letter-spacing:.16em;line-height:27px}
.hn .sr{display:flex}
.hn .sl{width:117px;flex:none}
.hn .sv{color:var(--value);letter-spacing:.14em}
.hn .view{margin-top:50px;display:inline-flex;align-items:center;gap:14px;font-size:11px;letter-spacing:.2em}
.hn .view span{padding-bottom:7px;border-bottom:1px solid var(--ink)}
.hn .view svg{width:10px;height:10px;flex:none}
/* pager */
.hn .pager{position:absolute;left:1118px;top:752px;width:270px;display:flex;align-items:center;justify-content:space-between;font-size:11px;letter-spacing:.18em;transition:transform .75s cubic-bezier(.65,0,.2,1),width .75s cubic-bezier(.65,0,.2,1)}
.hn .pager button{width:38px;height:24px;display:flex;align-items:center;justify-content:center}
.hn .pager svg{width:36px;height:12px;opacity:.55}
.hn.detail .info,.hn.detail .pager{transform:translateX(-328px)}
.hn.detail .pager{width:596px}
/* left index, footer, hint */
.hn .idx{position:absolute;left:40px;top:250px;font-size:10px;letter-spacing:.18em;color:var(--muted);display:flex;flex-direction:column;align-items:flex-start}
.hn .idx .tr{display:block;width:1px;height:77px;background:color-mix(in srgb,var(--ink) 18%,transparent);margin:12px 0 19px;position:relative;overflow:hidden}
.hn .idx .tr b{position:absolute;inset:0;background:var(--ink);transform-origin:top;transition:transform .55s var(--ease)}
.hn .footer{position:absolute;left:53px;top:866px;font-size:10px;letter-spacing:.225em;color:var(--muted)}
.hn .hint{position:absolute;left:723px;top:866px;font-size:9.2px;letter-spacing:.2em;color:var(--muted);display:flex;align-items:center}
.hn .hint svg{width:20px;height:10px;margin:0 14px}
/* detail panel */
.hn .panel{position:absolute;left:1098px;top:118px;width:292px;height:700px;opacity:0;pointer-events:none;transform:translateX(46px);transition:opacity .45s ease,transform .7s var(--ease)}
.hn.detail .panel{opacity:1;pointer-events:auto;transform:none;transition-delay:.32s}
.hn .back{position:absolute;right:0;top:0;display:flex;align-items:center;gap:12px;font-size:9.5px;letter-spacing:.2em}
.hn .back svg{width:9px;height:9px}
.hn .pt{position:absolute;left:0;top:52px;width:270px;display:flex;justify-content:space-between;font-size:9.5px;letter-spacing:.2em;color:var(--muted)}
.hn .tabs{position:absolute;left:0;top:80px;width:270px;display:flex;border-bottom:1px solid color-mix(in srgb,var(--ink) 14%,transparent);font-size:8.5px;letter-spacing:.16em;color:var(--muted)}
.hn .tabs button{flex:1;position:relative;padding:0 0 10px;text-align:left;white-space:nowrap}
.hn .tabs button.on{color:var(--ink)}
.hn .tabs button.on::after{content:"";position:absolute;left:0;right:14px;bottom:-1px;height:1px;background:var(--ink)}
.hn .pimg{position:absolute;left:0;top:110px;width:270px;height:470px;background:#F0EAF0;overflow:hidden}
.hn .pl{position:absolute;opacity:0;transition:opacity .45s ease,transform .9s var(--ease);background-repeat:no-repeat;transform-origin:0 0}
.hn .pl.on{opacity:1}
.hn .cap{position:absolute;left:0;top:596px;width:270px;font-size:11px;letter-spacing:.06em;line-height:20px;color:var(--muted);text-transform:none}
.hn .ptrack{position:absolute;right:0;top:80px;width:1px;height:520px;background:color-mix(in srgb,var(--ink) 12%,transparent)}
.hn .ptrack i{position:absolute;left:-1px;top:0;width:3px;height:120px;border-radius:2px;background:color-mix(in srgb,var(--ink) 45%,transparent);transition:transform .5s var(--ease)}
/* nav (pinned to the component edges) */
.hn .nav{position:absolute;left:0;right:0;top:0;height:calc(42px * var(--ns));z-index:400;font-size:calc(10.5px * var(--ns));letter-spacing:.19em;pointer-events:none}
.hn .nav>*{pointer-events:auto}
.hn .wm{position:absolute;left:calc(57px * var(--ns));top:calc(9px * var(--ns));font-size:calc(24px * var(--ns));font-weight:300;letter-spacing:.56em;line-height:1}
.hn .links{position:absolute;left:50%;top:calc(14px * var(--ns));transform:translateX(-50%);display:flex;gap:calc(35px * var(--ns));white-space:nowrap}
.hn .links a{position:relative}
.hn .links a.on::after{content:"";position:absolute;left:0;right:.2em;bottom:-2px;height:1px;background:var(--ink)}
.hn .navr{position:absolute;right:calc(54px * var(--ns));top:calc(14px * var(--ns));display:flex;align-items:center;gap:calc(34px * var(--ns))}
.hn .menu{display:flex;align-items:center;gap:calc(21px * var(--ns))}
.hn .burger{display:block;width:calc(25px * var(--ns));height:calc(13px * var(--ns));position:relative}
.hn .burger b{position:absolute;left:0;right:0;height:1px;background:var(--ink)}
.hn .burger b:nth-child(1){top:0}.hn .burger b:nth-child(2){top:calc(6px * var(--ns))}.hn .burger b:nth-child(3){top:calc(12px * var(--ns))}
.hn .below{display:none}
/* before the entrance runs */
.hn.pre .gm,.hn.pre .rail,.hn.pre .nav,.hn.pre .idx,.hn.pre .footer,.hn.pre .hint,.hn.pre .pager,.hn.pre .rule,.hn.pre .view{opacity:0}
.hn.pre .ln{transform:translateY(105%);opacity:0}
/* phones and small containers: the rail on top, then the info, the thumbnails and the pager */
.hn .srch svg{display:none}
.hn .snext,.hn .spg,.hn .sphoto,.hn .thumbs,.hn .sclose{display:none}
.hn.sm{height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch}
.hn.sm .stage{position:relative;inset:auto;transition:height .7s cubic-bezier(.65,0,.25,1)}
.hn.sm .frame{left:0;top:0;transition:transform .7s cubic-bezier(.65,0,.25,1)}
.hn.sm .nav{height:64px;font-size:10.5px}
.hn.sm .wm{left:28px;top:24px;font-size:24px;letter-spacing:.5em}
.hn.sm .links,.hn.sm .stx{display:none}
.hn.sm .navr{right:24px;top:26px;gap:20px}
.hn.sm.detail .srch svg{display:block;width:20px;height:20px}
.hn.sm .menu{font-size:0;gap:0}
.hn.sm .burger{width:26px;height:14px}
.hn.sm .burger b:nth-child(2){top:6px}
.hn.sm .burger b:nth-child(3){top:12px}
.hn.sm .footer,.hn.sm .hint{display:none}
.hn.sm .idx{position:absolute;left:14px;top:31%;z-index:6;font-size:11px;color:var(--ink)}
.hn.sm .idx>span:first-child{font-weight:500}
.hn.sm .idx>span:last-child{color:color-mix(in srgb,var(--ink) 40%,transparent)}
.hn.sm .idx .tr{height:36px;margin:10px 0 14px}
.hn.sm .snext{display:flex;position:absolute;right:6px;top:44%;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.88);box-shadow:0 4px 14px rgba(70,60,90,.12);align-items:center;justify-content:center;z-index:7}
.hn.sm .snext svg{width:14px;height:14px}
.hn.sm.detail .snext{display:none}
.hn.sm .sphoto{display:block;position:absolute;inset:0;opacity:0;pointer-events:none;z-index:4;background-repeat:no-repeat;background-color:#F0EAF0;transition:opacity .5s ease}
.hn.sm.detail .sphoto.on{opacity:1}
.hn.sm.detail .spg{display:flex;position:absolute;left:0;right:0;bottom:8px;padding:0 44px;z-index:7;align-items:center;justify-content:space-between}
.hn.sm.detail .sclose{display:flex;position:absolute;right:14px;top:72px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(70,60,90,.12);align-items:center;justify-content:center;z-index:7}
.hn .sclose svg{width:13px;height:13px}
.hn .sc{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(70,60,90,.12)}
.hn .sc svg{width:16px;height:16px}
.hn .sctr{display:flex;flex-direction:column;align-items:center;gap:12px;font-size:11px;letter-spacing:.18em}
.hn .dots{display:flex;gap:8px}
.hn .dots i{width:7px;height:7px;border-radius:50%;background:color-mix(in srgb,var(--ink) 18%,transparent)}
.hn .dots i.on{background:var(--ink)}
.hn.sm .below{display:block;position:relative;z-index:5;padding:14px 30px 44px}
.hn.sm .info,.hn.sm .pager{position:static;width:auto;transform:none!important}
.hn.sm .cnt{height:auto;font-size:11px;letter-spacing:.2em;color:var(--muted)}
.hn.sm .ttl{margin-top:16px;font-size:44px;line-height:46px;letter-spacing:.12em;min-height:92px}
.hn.sm .rule{margin-top:20px;width:34px}
.hn.sm .desc{margin-top:22px;width:auto;font-size:15px;line-height:22px;letter-spacing:.04em;color:var(--value)}
.hn.sm.detail .desc{color:var(--ink)}
.hn.sm .specs{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;font-size:10px;line-height:20px}
.hn.sm .specs .rv{overflow:visible}
.hn.sm .specs .rv:nth-child(1){grid-column:1;grid-row:1 / span 2}
.hn.sm .specs .rv:nth-child(2){grid-column:2;grid-row:1;border-left:1px solid color-mix(in srgb,var(--ink) 18%,transparent);padding-left:22px}
.hn.sm .specs .rv:nth-child(3){grid-column:2;grid-row:2;border-left:1px solid color-mix(in srgb,var(--ink) 18%,transparent);padding-left:22px;margin-top:10px}
.hn.sm.detail .specs{grid-template-columns:1fr 1fr 1fr}
.hn.sm.detail .specs .rv:nth-child(1){grid-column:1;grid-row:1}
.hn.sm.detail .specs .rv:nth-child(2){grid-column:2;grid-row:1;padding-left:14px}
.hn.sm.detail .specs .rv:nth-child(3){grid-column:3;grid-row:1;margin-top:0;padding-left:14px}
.hn.sm .sr{flex-direction:column;white-space:normal}
.hn.sm .sl{width:auto;letter-spacing:.16em;color:var(--muted)}
.hn.sm .sv{font-size:11px;margin-top:4px;letter-spacing:.12em;line-height:18px}
.hn.sm .view{display:flex;width:100%;justify-content:center;margin-top:30px;height:48px;border:1px solid var(--ink);border-radius:12px;gap:14px;letter-spacing:.3em;font-size:11px}
.hn.sm .view span{border:0;padding:0}
.hn.sm .panel{position:static;display:none;width:auto;height:auto;margin-top:26px;padding-top:18px;border-top:1px solid color-mix(in srgb,var(--ink) 10%,transparent);opacity:1;transform:none;pointer-events:auto}
.hn.sm.detail .panel{display:block}
.hn.sm .panel>*{position:static;width:auto}
.hn.sm .back{display:flex;justify-content:flex-start;margin:0 0 20px;gap:14px}
.hn.sm .pt,.hn.sm .pimg,.hn.sm .cap,.hn.sm .ptrack{display:none}
.hn.sm .tabs{margin:0;font-size:9px;letter-spacing:.14em}
.hn.sm .tabs button{padding:0 0 12px}
.hn.sm .thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:22px}
.hn.sm .th{aspect-ratio:1;border-radius:12px;background-color:#EAE4EA;background-repeat:no-repeat;overflow:hidden;border:1.5px solid transparent}
.hn.sm .th.on{border-color:var(--ink)}
.hn.sm .pager{margin-top:34px;width:100%!important}
.hn.sm .pager svg{width:70px}
.hn.rm *{transition:none!important;animation:none!important}
`;

function buildHtml(P) {
  const links = (Array.isArray(P.navLinks) ? P.navLinks : DEFAULT_NAV).slice(0, 4);
  const arrow = `<svg viewBox="0 0 36 12" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 6h35M30 1l5 5-5 5" /></svg>`;
  const gms = SPR.map((p, i) => `<div class="gm" data-k="gm" data-i="${i}" style="width:${p.w}px;height:${p.h}px;transform-origin:${p.hx - p.x}px 0"></div>`).join("");
  const poly = [[250, railY(250) - 9], [1062, railY(1062) - 2.6], [1065, railY(1065) + 2.8], [250, railY(250) + 9]].map((a) => a.map((v) => +v.toFixed(2)).join(",")).join(" ");
  return `
<div class="sheet"><div class="wall"></div>
<nav class="nav" data-k="nav">
  <a class="wm" href="#" data-k="wm"></a>
  <div class="links" data-k="links">${links.map((l, i) => `<a href="#" class="${i === 0 ? "on" : ""}">${esc(l)}</a>`).join("")}</div>
  <div class="navr"><span class="srch"><i class="stx" style="font-style:normal">SEARCH</i><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8.5" cy="8.5" r="6"/><path d="M13 13l5 5"/></svg></span><span class="menu">MENU<i class="burger"><b></b><b></b><b></b></i></span></div>
</nav>
<div class="stage" data-k="stage">
  <div class="frame" data-k="frame">
    <svg class="rail" data-k="rail" viewBox="0 0 1440 900"><defs><linearGradient id="hnTube" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F3F1F5"/><stop offset="1" stop-color="#C9C5D0"/></linearGradient></defs><polygon points="${poly}" fill="url(#hnTube)"/></svg>
    <div class="floor" data-k="floor"></div>
    ${gms}
    <div class="ui" data-k="ui">
      <div class="idx" data-k="idx"><span data-k="idxn">01</span><i class="tr"><b data-k="fill"></b></i><span>12</span></div>
      <div class="info" data-k="info">
        <div class="rv"><span class="ln sw cnt" data-k="cnt">01 / 12</span></div>
        <div class="ttl"><div class="rv"><span class="ln sw" data-k="t1"></span></div><div class="rv"><span class="ln sw" data-k="t2"></span></div></div>
        <div class="rule" data-k="rule"></div>
        <div class="desc"><div class="rv"><span class="ln sw" data-k="d1"></span></div><div class="rv"><span class="ln sw" data-k="d2"></span></div></div>
        <div class="specs">
          <div class="rv"><span class="ln sr" data-k="r0"><span class="sl">MATERIAL</span><span class="sv sw" data-k="v0"></span></span></div>
          <div class="rv"><span class="ln sr" data-k="r1"><span class="sl">COLOUR</span><span class="sv sw" data-k="v1"></span></span></div>
          <div class="rv"><span class="ln sr" data-k="r2"><span class="sl">SIZE</span><span class="sv sw" data-k="v2"></span></span></div>
        </div>
        <button class="view" data-k="view"><span>VIEW DETAILS</span><svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 9L9 1M3 1h6v6"/></svg></button>
      </div>
      <div class="pager" data-k="pager"><button data-k="pp" aria-label="Previous piece" style="transform:scaleX(-1)">${arrow}</button><span class="sw" data-k="cnt2">01 / 12</span><button data-k="pn" aria-label="Next piece">${arrow}</button></div>
      <div class="thumbs" data-k="thumbs"><button class="th on" data-k="th" data-t="0"></button><button class="th" data-k="th" data-t="1"></button><button class="th" data-k="th" data-t="2"></button><button class="th" data-k="th" data-t="3"></button></div>
      <div class="footer" data-k="footer"></div>
      <div class="hint" data-k="hint">CLICK TO PEEK<svg viewBox="0 0 20 10" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 5h18M4 2L1 5l3 3M16 2l3 3-3 3"/></svg>CLICK AGAIN TO FOLLOW</div>
      <div class="panel" data-k="panel">
        <button class="back" data-k="back"><span>BACK TO COLLECTION</span><svg viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1"><path d="M1 1l7 7M8 1L1 8"/></svg></button>
        <div class="pt"><span data-k="tabname">ON HANGER</span><span data-k="tabn">01 / 03</span></div>
        <div class="tabs" data-k="tabs"><button data-t="0" class="on">01 / ON HANGER</button><button data-t="1">02 / FABRIC</button><button data-t="2">03 / DETAIL</button></div>
        <div class="pimg" data-k="pimg"><div class="pl on" data-k="pl0"></div><div class="pl" data-k="pl1"></div><div class="pl" data-k="pl2"></div></div>
        <div class="cap" data-k="cap"></div>
        <div class="ptrack"><i data-k="thumb"></i></div>
      </div>
    </div>
  </div>
  <div class="sphoto" data-k="sphoto"></div>
  <button class="snext" data-k="snext" aria-label="Next piece"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4.5 1.5L10 7l-5.500 5.500"/></svg></button>
  <button class="sclose" data-k="sclose" aria-label="Close details"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2l10 10M12 2L2 12"/></svg></button>
  <div class="spg" data-k="spg">
    <button class="sc" data-k="sprev" aria-label="Previous photo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 8H2M6.500 3.500L2 8l4.500 4.500"/></svg></button>
    <div class="sctr"><span data-k="sctr">01 / 03</span><div class="dots" data-k="dots"><i class="on"></i><i></i><i></i></div></div>
    <button class="sc" data-k="snext2" aria-label="Next photo"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 8h12M9.500 3.500L14 8l-4.500 4.500"/></svg></button>
  </div>
</div>
<div class="below" data-k="below"></div>
</div>`;
}

export default function GarmentRail({
  brand = "HINA",
  collection = "LITTLE WARDROBE",
  navLinks = DEFAULT_NAV,
  products = DEFAULT_PRODUCTS,
  garmentSheet = GARMENT_SHEET,
  smockSheet = SMOCK_SHEET,
  fabricSheet = FABRIC_SHEET,
  detailSheet = DETAIL_SHEET,
  wall = "#ECE6EB",
  ink = "#32333F",
  muted = "#6A6B80",
  value = "#7173A6",
  intro = true,
  wheelBrowse = true,
  style = {},
}) {
  const rootRef = useRef(null);
  const propsRef = useRef({});
  propsRef.current = { brand, collection, navLinks, products, garmentSheet, smockSheet, fabricSheet, detailSheet, intro, wheelBrowse };
  const apiRef = useRef({});

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const P = () => propsRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover)").matches;
    root.innerHTML = buildHtml(P());
    root.classList.toggle("rm", reduced);
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    const qa = (k) => Array.from(root.querySelectorAll(`[data-k="${k}"]`));
    const stage = q("stage"), frame = q("frame"), ui = q("ui"), below = q("below"), rail = q("rail"), floor = q("floor");
    const info = q("info"), pager = q("pager"), panel = q("panel"), footer = q("footer"), idx = q("idx"), thumbs = q("thumbs"), sphoto = q("sphoto");
    const gms = qa("gm");
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    let cur = 0;
    let detail = false;
    let hoverSlot = 0;
    let tab = 0;
    let phone = false;
    let scale = 1;
    let lastStep = 0;
    let pointerIn = false;
    const st = SPR.map((_, i) => ({ slot: i, op: 1, z: null }));
    const slotOf = (i) => (i - cur + 12) % 12;

    // ── texts ──
    const prod = (i) => {
      const p = String((P().products || [])[i] || "").split("|").map((x) => x.trim());
      return { t1: p[0] || "", t2: p[1] || "", d1: p[2] || "", d2: p[3] || "", m: p[4] || "", c: p[5] || "", z: p[6] || "" };
    };
    const swapEls = ["cnt", "t1", "t2", "d1", "d2", "v0", "v1", "v2", "cnt2"].map(q);
    const writeTexts = () => {
      const d = prod(cur);
      q("cnt").textContent = phone && !detail ? `/ NO. ${num2(cur + 1)}` : `${num2(cur + 1)} / 12`;
      q("cnt2").textContent = `${num2(cur + 1)} / 12`;
      q("t1").textContent = d.t1;
      q("t2").textContent = d.t2;
      q("d1").textContent = d.d1;
      q("d2").textContent = d.d2;
      q("v0").textContent = d.m;
      q("v1").textContent = d.c;
      q("v2").textContent = d.z;
    };
    const writeIndex = () => {
      q("idxn").textContent = num2(cur + 1);
      q("fill").style.transform = `scaleY(${(cur + 1) / 12})`;
    };
    const writeStatic = () => {
      const p = P();
      q("wm").textContent = p.brand;
      footer.textContent = `${p.brand} · ${p.collection} | 07`;
      const links = (Array.isArray(p.navLinks) ? p.navLinks : DEFAULT_NAV).slice(0, 4);
      q("links").innerHTML = links.map((l, i) => `<a href="#" class="${i === 0 ? "on" : ""}">${esc(l)}</a>`).join("");
      gms.forEach((g, i) => {
        g.style.backgroundImage = `url("${p.garmentSheet}")`;
        g.style.backgroundPosition = `${-SPR[i].x}px ${-SPR[i].y}px`;
      });
    };
    const swapTexts = () => {
      swapEls.forEach((e) => e && e.classList.add("out"));
      later(() => {
        writeTexts();
        swapEls.forEach((e) => e && e.classList.remove("out"));
      }, 140);
      writeIndex();
    };

    // ── placement ──
    const apply = (i) => {
      const p = SPR[i];
      const s = st[i];
      const j = s.slot;
      let X = slotX(j);
      let S = slotScale(j);
      let dx = 0, dy = 0, rot = 0, mult = 1;
      const back = detail && j >= 1;
      if (back) {
        X = 352 + (X - 352) * 0.36;
        S = scaleAt(X);
      }
      if (!detail && hoverSlot >= 1 && j >= 1) {
        if (Math.round(j) === hoverSlot) { dx = 38 * S; dy = 6; rot = -6; mult = 1.035; }
        else if (j > hoverSlot) dx = 18 * S;
      }
      const el = gms[i];
      el.style.transform = `translate(${X - (p.hx - p.x) + dx}px,${railY(X) - 9 * S + dy}px) rotate(${rot}deg) scale(${S * mult})`;
      el.style.opacity = back ? 0.62 : s.op;
      el.style.filter = back ? "blur(7px) saturate(.55) brightness(1.04)" : "none";
      el.style.zIndex = s.z != null ? s.z : 100 - Math.round(j);
    };
    const applyAll = () => {
      for (let i = 0; i < 12; i++) apply(i);
      const fy = railY(352) + SPR[cur].h * 0.93 - 26;
      floor.style.left = "52px";
      floor.style.top = `${fy}px`;
    };
    const relayout = () => {
      for (let i = 0; i < 12; i++) {
        if (st[i].slot === -1.3 && st[i].op === 0) continue; // waiting to be jumped to the far end
        st[i].slot = slotOf(i);
        st[i].op = 1;
        st[i].z = null;
      }
    };
    const noTransition = (el, fn) => {
      el.style.transition = "none";
      fn();
      void el.offsetWidth;
      el.style.transition = "";
    };

    const next = (force) => {
      const now = performance.now();
      if (!force && now - lastStep < 95) return;
      lastStep = now;
      const old = cur;
      cur = (cur + 1) % 12;
      hoverSlot = 0;
      st[old].slot = -1.3;
      st[old].op = 0;
      relayout();
      applyAll();
      swapTexts();
      refreshMedia();
      later(() => {
        if (st[old].slot !== -1.3) return;
        noTransition(gms[old], () => {
          st[old].slot = slotOf(old);
          st[old].op = 0;
          apply(old);
        });
        st[old].op = 1;
        apply(old);
      }, 360);
    };
    const prev = () => {
      const now = performance.now();
      if (now - lastStep < 95) return;
      lastStep = now;
      const pi = (cur + 11) % 12;
      noTransition(gms[pi], () => {
        st[pi].slot = -1.3;
        st[pi].op = 0;
        st[pi].z = 200;
        apply(pi);
      });
      cur = pi;
      hoverSlot = 0;
      st[pi].z = 200;
      for (let i = 0; i < 12; i++) {
        if (i === pi) { st[i].slot = 0; st[i].op = 1; continue; }
        if (st[i].slot === -1.3 && st[i].op === 0) continue;
        st[i].slot = slotOf(i);
        st[i].op = 1;
        st[i].z = null;
      }
      applyAll();
      later(() => { st[pi].z = null; apply(pi); }, 700);
      swapTexts();
      refreshMedia();
    };

    // ── detail panel ──
    const SMOCK_CELLS = { back: [0, 0], fabric: [0, 1041], detail: [1041, 0] };
    const CAPS = ["Hung on a little wooden hanger.", "Soft to the touch, washed for comfort.", "Small touches, sewn to last."];
    const TABS = ["ON HANGER", "FABRIC", "DETAIL"];
    const fillPanel = () => {
      const box = q("pimg");
      const bw = box.clientWidth;
      const bh = box.clientHeight;
      if (!bw || !bh) return;
      const p = P();
      const i = cur;
      for (let t = 0; t < 3; t++) {
        const L = q(`pl${t}`);
        L.style.cssText = "";
        L.style.backgroundImage = "";
        const cover = (src, sheetW, sheetH, cx, cy, cw, ch) => {
          const k = Math.max(bw / cw, bh / ch);
          L.style.left = "0px"; L.style.top = "0px"; L.style.width = `${bw}px`; L.style.height = `${bh}px`;
          L.style.backgroundImage = `url("${src}")`;
          L.style.backgroundSize = `${sheetW * k}px ${sheetH * k}px`;
          L.style.backgroundPosition = `${-cx * k + (bw - cw * k) / 2}px ${-cy * k + (bh - ch * k) / 2}px`;
        };
        if (i === 0) {
          if (t === 0) {
            const k = bw / 990;
            const hgt = 1007 * k;
            L.style.left = "0px"; L.style.width = `${bw}px`; L.style.height = `${hgt}px`; L.style.top = `${(bh - hgt) / 2}px`;
            L.style.backgroundImage = `url("${p.smockSheet}")`;
            L.style.backgroundSize = `${2048 * k}px ${2048 * k}px`;
            L.style.backgroundPosition = "0px 0px";
          } else {
            const [cx, cy] = t === 1 ? SMOCK_CELLS.fabric : SMOCK_CELLS.detail;
            cover(p.smockSheet, 2048, 2048, cx + 6, cy + 6, 995, 995);
          }
        } else if (t === 0) {
          const sp = SPR[i];
          const k = Math.min((0.9 * bw) / sp.w, (0.88 * bh) / sp.h);
          L.style.left = "0px"; L.style.top = "0px"; L.style.width = `${sp.w}px`; L.style.height = `${sp.h}px`;
          L.style.backgroundImage = `url("${p.garmentSheet}")`;
          L.style.backgroundSize = "3312px 2480px";
          L.style.backgroundPosition = `${-sp.x}px ${-sp.y}px`;
          L.dataset.tf = `translate(${(bw - sp.w * k) / 2}px,${(bh - sp.h * k) / 2}px) scale(${k})`;
          L.style.transform = L.dataset.tf;
        } else {
          const cols = t === 1 ? FAB_COLS : DET_COLS;
          const rows = t === 1 ? FAB_ROWS : DET_ROWS;
          const c = cols[i % 4], r = rows[Math.floor(i / 4)];
          cover(t === 1 ? p.fabricSheet : p.detailSheet, 3312, 2480, c[0] + 6, r[0] + 6, c[1] - c[0] - 12, r[1] - r[0] - 12);
        }
      }
      setTab(tab, true);
    };
    function setTab(t, quiet) {
      tab = t;
      [0, 1, 2].forEach((k) => {
        const L = q(`pl${k}`);
        L.classList.toggle("on", k === t);
        if (L.dataset.tf) L.style.transform = k === t ? L.dataset.tf : `${L.dataset.tf}`;
      });
      qa("tabs")[0].querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.t) === t));
      q("tabname").textContent = TABS[t];
      q("tabn").textContent = `${num2(t + 1)} / 03`;
      q("cap").textContent = CAPS[t];
      q("thumb").style.transform = `translateY(${t * 200}px)`;
      if (phone) fillPhone();
      void quiet;
    }
    // ── phone media: thumbnails, the stage photo and its dots ──
    const SMOCK_FLAT = [1041, 1041];
    function bgFor(i, t, bw, bh) {
      const p = P();
      const cover = (img, sw, sh, cx, cy, cw, ch, z) => {
        const k = Math.max(bw / cw, bh / ch) * (z || 1);
        return { img, size: `${sw * k}px ${sh * k}px`, pos: `${-cx * k + (bw - cw * k) / 2}px ${-cy * k + (bh - ch * k) / 2}px` };
      };
      if (i === 0) {
        const cell = [[0, 0], SMOCK_CELLS.fabric, SMOCK_CELLS.detail, SMOCK_FLAT][t];
        return cover(p.smockSheet, 2048, 2048, cell[0] + 6, cell[1] + 6, 995, 995);
      }
      if (t === 0) {
        const sp = SPR[i];
        const k = Math.min((0.9 * bw) / sp.w, (0.88 * bh) / sp.h);
        return { img: p.garmentSheet, size: `${3312 * k}px ${2480 * k}px`, pos: `${-sp.x * k + (bw - sp.w * k) / 2}px ${-sp.y * k + (bh - sp.h * k) / 2}px` };
      }
      const cols = t === 1 ? FAB_COLS : DET_COLS;
      const rows = t === 1 ? FAB_ROWS : DET_ROWS;
      const c = cols[i % 4], r0 = rows[Math.floor(i / 4)];
      return cover(t === 1 ? p.fabricSheet : p.detailSheet, 3312, 2480, c[0] + 6, r0[0] + 6, c[1] - c[0] - 12, r0[1] - r0[0] - 12, t === 3 ? 1.8 : 1);
    }
    function fillPhone() {
      if (!phone) return;
      // the thumbnails are the current piece and the next three on the rail (not detail shots)
      qa("th").forEach((el, t) => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w) return;
        const i = (cur + t) % 12;
        const sp = SPR[i];
        const k = Math.min((0.92 * w) / sp.w, (0.92 * h) / sp.h);
        el.style.backgroundImage = `url("${P().garmentSheet}")`;
        el.style.backgroundSize = `${3312 * k}px ${2480 * k}px`;
        el.style.backgroundPosition = `${-sp.x * k + (w - sp.w * k) / 2}px ${-sp.y * k + (h - sp.h * k) / 2}px`;
        el.classList.toggle("on", t === 0);
      });
      const sw = stage.clientWidth, sh = stage.clientHeight;
      if (sw && sh && tab > 0) {
        const b = bgFor(cur, tab, sw, sh);
        sphoto.style.backgroundImage = `url("${b.img}")`;
        sphoto.style.backgroundSize = b.size;
        sphoto.style.backgroundPosition = b.pos;
      }
      sphoto.classList.toggle("on", tab > 0);
      q("sctr").textContent = `${num2(tab + 1)} / 03`;
      q("dots").querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === tab));
    }
    function phoneFrame() {
      if (!phone) return;
      const cw = root.clientWidth || 375;
      const base = Math.max(300, cw * 0.95);
      if (!detail) {
        scale = cw / 1110;
        stage.style.height = `${base}px`;
        frame.style.transform = `translate(${0.36 * cw - 352 * scale}px,${100 - 11 * scale}px) scale(${scale})`;
      } else {
        scale = cw / 880;
        stage.style.height = `${base + 70}px`;
        frame.style.transform = `translate(${cw / 2 - 352 * scale}px,${64 - 11 * scale}px) scale(${scale})`;
      }
    }
    const refreshMedia = () => {
      if (phone) fillPhone();
      else if (detail) fillPanel();
    };
    const setDetail = (on) => {
      if (detail === on) return;
      detail = on;
      hoverSlot = 0;
      root.classList.toggle("detail", on);
      root.classList.add("slow");
      later(() => root.classList.remove("slow"), 760);
      applyAll();
      writeTexts();
      phoneFrame();
      if (on) {
        tab = 0;
        refreshMedia();
        if (phone) later(() => root.scrollTo({ top: root.scrollTop + panel.getBoundingClientRect().top - root.getBoundingClientRect().top - 12, behavior: reduced ? "auto" : "smooth" }), 60);
      }
    };

    // ── geometry / hit testing ──
    const geom = (i) => {
      const p = SPR[i];
      const j = slotOf(i);
      const X = slotX(j);
      const S = slotScale(j);
      const left = X - (p.hx - p.x) * S;
      const right = X + (p.x + p.w - p.hx) * S;
      const top = railY(X) - 9 * S;
      return { left, right, top, bottom: top + p.h * S };
    };
    const hit = (e) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / scale;
      const py = (e.clientY - r.top) / scale;
      const f = geom((cur) % 12);
      if (px >= f.left + 30 && px <= f.right - 20 && py >= f.top + 60 && py <= f.bottom) return { front: true, slot: 0 };
      if (detail) return null;
      for (let s = 1; s <= 11; s++) {
        const g = geom((cur + s) % 12);
        if (g.right - 6 >= px) {
          if (py >= g.top + 40 && py <= g.bottom - 10 && px > f.right - 20) return { front: false, slot: s };
          return null;
        }
      }
      return null;
    };

    // ── input ──
    const onMove = (e) => {
      if (phone || !canHover || detail) { if (hoverSlot) { hoverSlot = 0; applyAll(); } return; }
      const h = hit(e);
      stage.style.cursor = h ? "pointer" : "";
      const ns = h && !h.front ? h.slot : 0;
      if (ns !== hoverSlot) { hoverSlot = ns; applyAll(); }
    };
    const onLeave = () => { stage.style.cursor = ""; if (hoverSlot) { hoverSlot = 0; applyAll(); } };
    const onClick = (e) => {
      const h = hit(e);
      if (!h) return;
      if (h.front) { setDetail(!detail); return; }
      hoverSlot = h.slot;
      applyAll();
      const n = h.slot;
      later(() => { for (let k = 0; k < n; k++) later(() => next(true), k * 120); }, 260);
    };
    let acc = 0;
    const onWheel = (e) => {
      if (phone || !P().wheelBrowse) return;
      e.preventDefault();
      acc += e.deltaY + e.deltaX;
      while (acc > 40) { acc -= 40; next(); }
      while (acc < -40) { acc += 40; prev(); }
    };
    const onKey = (e) => {
      if (!pointerIn && !root.contains(document.activeElement)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") setDetail(false);
    };
    let tx = 0;
    const onTS = (e) => { tx = e.touches[0].clientX; };
    const onTE = (e) => {
      const dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : tx) - tx;
      if (dx < -36) next(); else if (dx > 36) prev();
    };
    // on the phone, a tap anywhere on the stage closes the detail view; otherwise it behaves like a desktop click
    const onTap = (e) => {
      if (!phone) return;
      if (detail) setDetail(false);
      else onClick(e);
    };
    const listen = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); return () => t.removeEventListener(ev, fn, opt); };
    const offs = [
      listen(stage, "mousemove", onMove),
      listen(stage, "mouseleave", onLeave),
      listen(stage, "click", (e) => (phone ? onTap(e) : onClick(e))),
      listen(stage, "wheel", onWheel, { passive: false }),
      listen(stage, "touchstart", onTS, { passive: true }),
      listen(stage, "touchend", onTE, { passive: true }),
      listen(root, "mouseenter", () => { pointerIn = true; }),
      listen(root, "mouseleave", () => { pointerIn = false; }),
      listen(window, "keydown", onKey),
      listen(q("pn"), "click", () => next()),
      listen(q("pp"), "click", () => prev()),
      listen(q("view"), "click", () => setDetail(!detail)),
      listen(q("back"), "click", () => setDetail(false)),
      listen(q("tabs"), "click", (e) => { const b = e.target.closest("button"); if (b) setTab(Number(b.dataset.t)); }),
      listen(q("nav"), "click", (e) => { if (e.target.closest("a")) e.preventDefault(); }),
      listen(q("snext"), "click", (e) => { e.stopPropagation(); next(); }),
      listen(q("sclose"), "click", (e) => { e.stopPropagation(); setDetail(false); }),
      listen(q("sprev"), "click", (e) => { e.stopPropagation(); setTab((tab + 2) % 3); }),
      listen(q("snext2"), "click", (e) => { e.stopPropagation(); setTab((tab + 1) % 3); }),
      listen(thumbs, "click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const n = Number(b.dataset.t);
        for (let k = 0; k < n; k++) later(() => next(true), k * 120); // bring that piece to the front
      }),
    ];

    // ── scaling / layout mode ──
    const moveBlocks = () => {
      if (phone) {
        below.append(info, panel, thumbs, pager);
        stage.appendChild(idx);
      } else {
        ui.insertBefore(idx, ui.firstChild);
        ui.insertBefore(info, footer);
        ui.insertBefore(pager, footer);
        ui.appendChild(thumbs);
        ui.appendChild(panel);
      }
    };
    const measure = () => {
      const cw = root.clientWidth || 1200;
      const was = phone;
      phone = cw <= 820;
      root.classList.toggle("sm", phone);
      root.style.setProperty("--ns", String(Math.max(0.62, Math.min(1, cw / 1440))));
      if (!phone) {
        const ch = root.clientHeight || 800;
        scale = Math.min(Math.max(cw / 1440, ch / 900), ch / 870, cw / 1380);
        stage.style.height = "";
        frame.style.left = "50%";
        frame.style.transform = `translate(${-720 * scale}px,${-450 * scale}px) scale(${scale})`;
      } else {
        frame.style.left = "0px";
        phoneFrame();
      }
      if (phone !== was) { moveBlocks(); writeTexts(); }
      refreshMedia();
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(root);
    offs.push(listen(window, "resize", measure));

    // ── entrance ──
    const runIntro = () => {
      const E = "cubic-bezier(.2,.75,.2,1)";
      const an = (el, kf, dur, delay) => el && el.animate(kf, { duration: dur, delay, easing: E, fill: "backwards" });
      root.classList.remove("pre");
      an(rail, [{ opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0 0 0)" }], 1000, 100);
      an(q("nav"), [{ opacity: 0 }, { opacity: 1 }], 900, 200);
      gms.forEach((g, i) => an(g, [{ opacity: 0, translate: "0 -14px" }, { opacity: 1, translate: "0 0" }], 900, 250 + slotOf(i) * 35));
      ["cnt", "t1", "t2", "d1", "d2", "r0", "r1", "r2"].forEach((k, n) =>
        an(q(k), [{ transform: "translateY(105%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], 1000, 650 + n * 70));
      ["idx", "rule", "view", "pager", "footer", "hint"].forEach((k, n) => an(q(k), [{ opacity: 0 }, { opacity: 1 }], 900, 900 + n * 70));
    };

    // ── start ──
    writeStatic();
    writeTexts();
    writeIndex();
    measure();
    applyAll();
    const useIntro = P().intro && !reduced;
    if (useIntro) {
      root.classList.add("pre");
      requestAnimationFrame(() => requestAnimationFrame(runIntro));
      later(() => root.classList.remove("pre"), 4000);
    }

    apiRef.current.sync = () => {
      writeStatic();
      writeTexts();
      applyAll();
      refreshMedia();
    };

    return () => {
      timers.forEach(clearTimeout);
      offs.forEach((f) => f());
      if (ro) ro.disconnect();
      root.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the content in step with edited props (the engine owns the DOM, so it is updated, not re-rendered)
  useEffect(() => {
    if (apiRef.current.sync) apiRef.current.sync();
  }, [brand, collection, navLinks, products, garmentSheet, smockSheet, fabricSheet, detailSheet]);

  return (
    <>
      <style>{CSS}</style>
      <div ref={rootRef} className="hn" style={{ "--wall": wall, "--ink": ink, "--muted": muted, "--value": value, ...style }} />
    </>
  );
}
