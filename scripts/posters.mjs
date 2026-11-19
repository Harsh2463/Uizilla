// Photographs every component for its home-page card: opens /poster/<slug> in
// headless Edge or Chrome (driven over the DevTools protocol), waits in real
// time so images and videos have loaded, and saves public/posters/<slug>.webp.
//
//   npm run dev                                    (in one terminal)
//   npm run posters                                (in another) — all components
//   npm run posters -- round-carousel text-path    — only these
//
// Env: SITE (default http://localhost:5173), BROWSER (path to msedge/chrome), WAIT (ms, default 6000).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const site = process.env.SITE || "http://localhost:5173";
const wait = Number(process.env.WAIT || 6000);
const port = 9333;
const candidates = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const exe = candidates.find((p) => fs.existsSync(p));
if (!exe) throw new Error("No Edge/Chrome found — set BROWSER=<path>");

const lib = path.resolve("src/library");
const all = fs.readdirSync(lib).filter((s) => fs.existsSync(path.join(lib, s, "meta.jsx")));
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : all;
const out = path.resolve("public/posters");
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "posters-"));
const SCROLLED = new Set(["scroll-highlight"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const proc = spawn(exe, [
  "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--mute-audio",
  "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
      if (r.ok) return r.json();
    } catch { /* not up yet */ }
    await sleep(300);
  }
  throw new Error("browser did not start");
}

async function shot(slug) {
  const tab = await connect();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  };
  const send = (method, params = {}) => new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width: 640, height: 480, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${site}/poster/${slug}` });
  await sleep(wait);
  // components that only reveal themselves as they are scrolled get a few turns of the wheel
  if (SCROLLED.has(slug)) {
    for (let i = 0; i < 6; i++) {
      await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 320, y: 240, deltaX: 0, deltaY: 90 });
      await sleep(250);
    }
    await sleep(800);
  }
  const r = await send("Page.captureScreenshot", { format: "png" });
  ws.close();
  await fetch(`http://127.0.0.1:${port}/json/close/${tab.id}`).catch(() => {});
  return Buffer.from(r.result.data, "base64");
}

try {
  for (const slug of slugs) {
    try {
      const png = await shot(slug);
      const file = path.join(out, `${slug}.webp`);
      await sharp(png).resize(640, 480).webp({ quality: 74 }).toFile(file);
      console.log("ok  ", slug, Math.round(fs.statSync(file).size / 1024) + " kB");
    } catch (e) {
      console.log("FAIL", slug, e.message.split("\n")[0]);
    }
  }
} finally {
  proc.kill();
  await sleep(500);
  fs.rmSync(profile, { recursive: true, force: true });
}
