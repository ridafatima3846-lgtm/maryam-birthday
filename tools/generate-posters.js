/* =====================================================================
   BIRDI — Poster / artwork generator
   ---------------------------------------------------------------
   Generates cinematic placeholder posters (SVG) for every content item,
   plus the hero backdrop, logo and profile avatar.

   Run:  node tools/generate-posters.js
   Re-run after editing js/data.js or adding new items.

   Replace any generated SVG later with real photos by simply editing
   the `poster` field in js/data.js.
   ===================================================================== */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "posters");
const DATA = require(path.join(ROOT, "js", "data.js"));

fs.mkdirSync(OUT, { recursive: true });

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* deterministic pseudo-random from a string seed */
function seedNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

/* Curated cinematic gradient palettes [top, mid, bottom accent] */
const PALETTES = [
  ["#1d1145", "#45107a", "#ff6b9d"],
  ["#120a3c", "#2c2a7e", "#4facfe"],
  ["#0d1b2a", "#1b263b", "#e63946"],
  ["#3b0d11", "#7b1e2e", "#f9a03f"],
  ["#150f2b", "#2f1e5c", "#a75dff"],
  ["#041c22", "#0f4c5c", "#e36414"],
  ["#241a3d", "#5b2a86", "#ff9e9e"],
  ["#102a43", "#243b53", "#7fb3d5"],
  ["#1b0f23", "#54204e", "#f5a623"],
  ["#002642", "#024b70", "#e59500"],
  ["#251231", "#6a1b5c", "#ff4d6d"],
  ["#06292e", "#0e4f52", "#4fd1c5"]
];

function paletteFor(id) {
  const p = PALETTES[Math.floor(seedNum(id + "pal") * PALETTES.length)];
  return p;
}

/* simple width-aware word wrap (approx measure) */
function wrap(text, maxWidth, fontSize) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  const meas = (s) => s.length * fontSize * 0.6;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (meas(test) <= maxWidth || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

function tspanLines(lines, fontSize, lh, caps) {
  let out = "";
  const step = fontSize * lh;
  const startY = -((lines.length - 1) * step) / 2;
  lines.forEach((ln, i) => {
    out += `<tspan x="50%" y="${(startY + i * step).toFixed(1)}"${i ? "" : ""}>${esc(caps ? ln.toUpperCase() : ln)}</tspan>`;
  });
  return out;
}

function bokeh(id, count, maxR, opacity) {
  const rnd = (seedPart, a, b) => a + seedNum(id + seedPart) * (b - a);
  let out = "";
  for (let i = 0; i < count; i++) {
    const cx = rnd("cx" + i, 0, 100);
    const cy = rnd("cy" + i, 0, 100);
    const r = rnd("r" + i, 0.02, maxR);
    const o = rnd("o" + i, 0, opacity).toFixed(2);
    out += `<circle cx="${cx.toFixed(1)}%" cy="${cy.toFixed(1)}%" r="${r.toFixed(2)}%" fill="#ffffff" opacity="${o}"/>`;
  }
  return out;
}

/* ---------- portrait card poster (2:3) ---------- */
function posterSVG(item) {
  const id = item.id;
  const [c1, c2, c3] = paletteFor(id);
  const W = 1600, H = 2400;
  const titleSize = item.type === "special" ? 150 : 132;
  const lines = wrap(item.title.toUpperCase(), W - 320, titleSize);
  const subLines = wrap(item.category, W - 400, 46);
  const rnd = (a, b) => a + seedNum(id + "p" + a) * (b - a);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="0.55" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%">
      <stop offset="0.6" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${rnd(18,30)}%" cy="${rnd(14,26)}%" r="34%" fill="${c3}" opacity="0.28"/>
  <circle cx="${rnd(70,84)}%" cy="${rnd(64,80)}%" r="42%" fill="${c1}" opacity="0.4"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${bokeh(id + "post", 14, 1.4, 0.16)}
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
  <g font-family="${SANS}" letter-spacing="8" fill="#ffffff" opacity="0.55" font-size="34">
    <text x="70" y="96" fill="#e50914" opacity="0.95" font-weight="bold">NETFLIX</text>
    <text x="${W - 70}" y="96" text-anchor="end" opacity="0.7">★ HD</text>
  </g>
  <g font-family="${SERIF}" fill="#ffffff" text-anchor="middle" font-weight="bold" font-size="${titleSize}">
    ${tspanLines(lines, titleSize, 1.16, false)}
  </g>
  <g text-anchor="middle" font-family="${SANS}">
    <rect x="${W / 2 - 130}" y="${H - 370}" width="260" height="4" rx="2" fill="#ffffff" opacity="0.3"/>
    <text x="${W / 2}" y="${H - 260}" fill="#ffffff" opacity="0.82" font-size="46" letter-spacing="6">${esc(item.category.toUpperCase())}</text>
    <text x="${W / 2}" y="${H - 180}" fill="#ffffff" opacity="0.5" font-size="40" letter-spacing="4">${esc(item.year || item.date || "")}</text>
  </g>
  <text x="${W / 2}" y="${H - 70}" text-anchor="middle" font-family="${SANS}" font-size="34" letter-spacing="6" fill="#ffffff" opacity="0.4">A NETFLIX STORY</text>
</svg>`;
}

/* ---------- hero backdrop (16:9) ---------- */
function heroSVG() {
  const cfg = DATA.CONFIG;
  const [c1, c2, c3] = ["#160a0c", "#33080c", "#a50d15"];
  const W = 1920, H = 1080;
  const nameSize = 210;
  const nameLines = wrap(cfg.hero.line2, W - 500, nameSize);
  const rnd = (a, b) => a + seedNum("hero" + a) * (b - a);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="hbg" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="0.5" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="hglow" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hvig" cx="50%" cy="50%" r="80%">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.5"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#hbg)"/>
  <circle cx="${rnd(15,30)}%" cy="${rnd(18,30)}%" r="30%" fill="${c3}" opacity="0.3"/>
  <circle cx="${rnd(70,86)}%" cy="${rnd(62,82)}%" r="38%" fill="${c1}" opacity="0.45"/>
  <circle cx="${rnd(45,60)}%" cy="${rnd(60,75)}%" r="24%" fill="${c3}" opacity="0.2"/>
  <rect width="${W}" height="${H}" fill="url(#hglow)"/>
  ${bokeh("hero", 26, 1.1, 0.22)}
  <rect width="${W}" height="${H}" fill="url(#hvig)"/>
  <g font-family="${SANS}" letter-spacing="10" fill="#ffffff" opacity="0.6" font-size="40">
    <text x="80" y="110">NETFLIX</text>
  </g>
  <g text-anchor="middle">
    <text y="${H / 2 - 120}" x="${W / 2}" font-family="${SANS}" fill="#ffffff" opacity="0.85" font-size="52" letter-spacing="14">${esc(cfg.hero.line1)}</text>
    <g font-family="${SERIF}" fill="#ffffff" font-weight="bold" font-size="${nameSize}">
      ${tspanLines(nameLines, nameSize, 1.1, false)}
    </g>
    <text y="${H / 2 + 205}" x="${W / 2}" font-family="${SANS}" fill="#ffffff" opacity="0.75" font-size="42" letter-spacing="4">${esc(cfg.hero.tagline)}</text>
  </g>
</svg>`;
}

/* ---------- logo (NETFLIX wordmark) ---------- */
function logoSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="180" viewBox="0 0 800 180">
  <text x="12" y="150" font-family="Arial, Helvetica, sans-serif" font-size="138" font-weight="800" letter-spacing="4" fill="#e50914">NETFLIX</text>
</svg>`;
}

/* ---------- NETFLIX N icon ---------- */
function NETFLIXNSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
  <g stroke="#e50914" stroke-width="13" stroke-linecap="round" fill="none">
    <line x1="18" y1="10" x2="18" y2="130"/>
    <line x1="18" y1="22" x2="122" y2="118"/>
    <line x1="18" y1="40" x2="122" y2="136"/>
    <line x1="18" y1="58" x2="122" y2="154"/>
    <line x1="18" y1="76" x2="122" y2="172"/>
    <line x1="122" y1="10" x2="122" y2="130"/>
  </g>
</svg>`;
}

/* ---------- avatar ---------- */
function avatarSVG() {
  const cfg = DATA.CONFIG;
  const letter = (cfg.friendName || "R").charAt(0).toUpperCase();
  const [c1, c2, c3] = ["#33080c", "#8a0d14", "#e50914"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="300" fill="url(#av)"/>
  <circle cx="300" cy="300" r="252" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="6"/>
  <circle cx="300" cy="300" r="218" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="4"/>
  <text x="300" y="398" text-anchor="middle" font-family="${SERIF}" font-size="260" font-weight="bold" fill="#ffffff">${esc(letter)}</text>
  <text x="300" y="472" text-anchor="middle" font-family="${SANS}" font-size="40" letter-spacing="10" fill="#ffffff" opacity="0.7">NETFLIX</text>
</svg>`;
}

/* ---------- main ---------- */
const items = DATA.ITEMS;
let written = 0;
for (const it of items) {
  const file = path.join(OUT, it.id + ".svg");
  fs.writeFileSync(file, posterSVG(it), "utf8");
  written++;
}

fs.writeFileSync(path.join(OUT, "hero.svg"), heroSVG(), "utf8");
fs.writeFileSync(path.join(OUT, "logo.svg"), logoSVG(), "utf8");
fs.writeFileSync(path.join(OUT, "NETFLIX.svg"), logoSVG(), "utf8");
fs.writeFileSync(path.join(OUT, "NETFLIX-n.svg"), NETFLIXNSVG(), "utf8");
fs.writeFileSync(path.join(OUT, "avatar.svg"), avatarSVG(), "utf8");

console.log("Generated " + (written + 5) + " SVG artworks in assets/posters/");
