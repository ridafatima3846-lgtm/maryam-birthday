/* BIRDI smoke test — runs the site in jsdom over a local HTTP server.
   Two modes:
     - default (no ?preview) -> COMING SOON teaser locked, nothing else opens
     - ?preview=1           -> full site unlocked for preview               */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const PORT = 8941;

const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".json": "application/json", ".mp4": "video/mp4",
  ".jpg": "image/jpeg", ".png": "image/png", ".webm": "video/webm", ".vtt": "text/vtt"
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? "  PASS " : "  FAIL ") + name + (detail ? "  -- " + detail : ""));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 6000, step = 80) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (fn()) return true; } catch (e) {}
    await sleep(step);
  }
  return false;
}

async function openSite(url) {
  return JSDOM.fromURL(url, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true });
}

/* ---------------- COMING SOON (locked) mode ---------------- */
async function runLockedSuite() {
  const dom = await openSite("http://localhost:" + PORT + "/index.html");
  const { window } = dom;
  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const click = (el) => { const e = new window.MouseEvent("click", { bubbles: true, cancelable: true }); el.dispatchEvent(e); };
  const hash = () => (window.location.hash || "").replace(/^#\/?/, "");

  await waitFor(() => window.BIRDI_APP && (($("#screen-soon") && $("#screen-soon").classList.contains("active")) || ($("#screen-home") && $("#screen-home").classList.contains("active"))), 12000);
  const App = window.BIRDI_APP;
  const CONFIG = window.BIRDI_DATA.CONFIG;

  if (!CONFIG.locked) {
    check("locked: not locked — full site opens by default", $("#screen-home").classList.contains("active"), "hash=" + hash());
    dom.window.close();
    return;
  }

  check("locked: intro lands on coming soon screen", $("#screen-soon").classList.contains("active"), "hash=" + hash());
  check("locked: coming soon title present", ($(".soon-title").textContent || "").toUpperCase().indexOf("COMING SOON") !== -1, $(".soon-title").textContent);
  check("locked: date shown", ($(".soon-date").textContent || "").toUpperCase().indexOf((CONFIG.comingSoon.date || "").toUpperCase()) !== -1, $(".soon-date").textContent);
  check("locked: picture set", !!$("#soonBg") && ($("#soonBg").getAttribute("src") || "").length > 0, $("#soonBg").getAttribute("src"));
  check("locked: navbar hidden", doc.body.classList.contains("locked") && $("#navbar").style.display === "none");

  App.navigate("memories");
  await sleep(150);
  check("locked: memories page stays locked", $("#screen-soon").classList.contains("active") && !$("#screen-memories").classList.contains("active"));

  App.navigate("profile");
  await sleep(150);
  check("locked: profile stays locked too", $("#screen-soon").classList.contains("active") && !$("#screen-profile").classList.contains("active"));

  App.navigate("video/play/the-birthday-movie");
  await sleep(150);
  check("locked: player stays locked too", $("#screen-soon").classList.contains("active") && !$("#screen-details").classList.contains("active"));

  click($("#soonPlay"));
  await waitFor(() => window.BIRDI_PLAYER.overlayEl && window.BIRDI_PLAYER.overlayEl.classList.contains("active"));
  check("locked: teaser video opens from coming soon", window.BIRDI_PLAYER.overlayEl.classList.contains("active"));
  window.BIRDI_PLAYER.close();

  check("locked: music duck/restore api exists", typeof window.BIRDI_MUSIC.duck === "function");

  dom.window.close();
}

/* ---------------- FULL SITE (preview mode) ---------------- */
async function runFullSuite() {
  const dom = await openSite("http://localhost:" + PORT + "/index.html?preview=1");
  const { window } = dom;
  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const $$ = (s) => Array.prototype.slice.call(doc.querySelectorAll(s));
  const click = (el) => { const e = new window.MouseEvent("click", { bubbles: true, cancelable: true }); el.dispatchEvent(e); };
  const hash = () => (window.location.hash || "").replace(/^#\/?/, "");

  await waitFor(() => window.BIRDI_APP && $("#screen-home") && $("#screen-home").classList.contains("active"), 12000);
  const App = window.BIRDI_APP;
  const Store = window.BIRDI_STORE;

  check("preview: intro finishes and lands on home screen", hash() === "home", "hash=" + hash());
  check("preview: navbar visible", !doc.body.classList.contains("locked") && $("#navbar").style.display !== "none");

  // ---- profile gate (reachable via the avatar button)
  App.navigate("profile");
  await waitFor(() => $("#screen-profile").classList.contains("active"));
  check("preview: profile shows friend name", $("#screen-profile .profile-name").textContent === "Maryam");
  check("preview: profile shows subtitle", $("#screen-profile .profile-sub").textContent === "Today's special viewer");
  click($(".profile-start"));
  await waitFor(() => $("#screen-home").classList.contains("active"));
  check("preview: profile -> home transition", $("#screen-home").classList.contains("active"));

  check("preview: hero title renders", ($(".hero-title").textContent || "").indexOf("COMING SOON") !== -1, $(".hero-title").textContent);
  check("preview: hero uses photo bg", (($("#screen-home .hero-bg").style.backgroundImage || "").indexOf("pic1") !== -1), $("#screen-home .hero-bg").style.backgroundImage);
  check("preview: hero play button labeled watch teaser", (($(".hero .btn-play span") || {}).textContent || "").indexOf("WATCH TEASER") !== -1, ($(".hero .btn-play span") || {}).textContent);

  const rows = $$(".row-track").length;
  check("preview: all 9 rows rendered", rows === 9, "rows=" + rows);

  const cards = $$("#screen-home .card").length;
  check("preview: home cards rendered", cards >= 15, "cards=" + cards);

  // ---- details page
  click($$("#screen-home .card")[1]); // open second card
  await waitFor(() => $("#screen-details").classList.contains("active"));
  check("preview: card -> details page", $("#screen-details").classList.contains("active"));
  check("preview: details has play + list + back", !!$("#screen-details .d-play") && !!$("#screen-details .d-list") && !!$("#detailsBack"));

  // ---- my list toggle from details
  const listId = $("#screen-details .d-list").getAttribute("data-id");
  click($("#screen-details .d-list"));
  check("preview: my list toggled", Store.inList(listId), "id=" + listId);

  // ---- my list page
  App.navigate("list");
  await waitFor(() => $("#screen-list").classList.contains("active"));
  check("preview: my list page shows saved item", $$("#screen-list .card").length > 0);
  const rmBtn = $("#screen-list .list-remove");
  if (rmBtn) {
    click(rmBtn);
    check("preview: my list remove works", !Store.inList(listId));
  }

  // ---- memories page + filter
  App.navigate("memories");
  await waitFor(() => $("#screen-memories").classList.contains("active"));
  const chips = $$(".mem-chip").length;
  check("preview: memories filter chips", chips === 9, "chips=" + chips);
  click($$(".mem-chip")[1]); // Childhood
  await sleep(150);
  check("preview: memory filter narrows results", $$("#screen-memories .mem-grid .card").length > 0);

  // ---- photo slideshow
  App.navigate("photo/summer-trip");
  await waitFor(() => $("#screen-photo").classList.contains("active"));
  check("preview: photo slideshow opens", $("#screen-photo").classList.contains("active"));
  check("preview: photo caption has title", ($("#screen-photo .photo-caption h2") || {}).textContent === "Summer Trip");

  // ---- series episodes on details
  App.navigate("details/our-story");
  await waitFor(() => $("#screen-details").classList.contains("active"));
  const eps = $$(".ep-item").length;
  check("preview: series shows 6 episodes", eps === 6, "episodes=" + eps);

  // ---- birthday special
  App.navigate("birthday");
  await waitFor(() => $("#screen-birthday").classList.contains("active"));
  check("preview: birthday page renders title", ($(".bday-title") || {}).textContent === "The Birthday Movie");
  check("preview: birthday page play button", !!$("#screen-birthday .bday-play"));

  // ---- search
  App.openSearch();
  await waitFor(() => $("#searchOverlay").classList.contains("active"));
  const inp = $("#searchInput");
  inp.value = "friendship";
  inp.dispatchEvent(new window.Event("input", { bubbles: true }));
  await sleep(150);
  const found = $$("#searchResults .card").some((c) => c.getAttribute("data-id") === "our-friendship");
  check("preview: search finds friendship", found);
  App.closeSearch();

  // ---- final screen
  App.navigate("final");
  await waitFor(() => $("#screen-final").classList.contains("active"));
  check("preview: final screen renders", ($(".final-title") || {}).textContent.indexOf("HAPPY BIRTHDAY") !== -1);
  check("preview: final lines present", $$(".final-line").length === 3);

  // ---- secret overlay
  App.openSecret();
  await waitFor(() => $("#secretOverlay").classList.contains("active"));
  check("preview: secret overlay opens", $("#secretOverlay").classList.contains("active"));
  click($(".secret-open"));
  await sleep(700);
  check("preview: secret reveal shows", $("#secretReveal").classList.contains("show"));
  $("#secretToFinal").click();
  await sleep(120);
  check("preview: secret -> final", $("#screen-final").classList.contains("active"));

  // ---- music engine state helpers
  check("preview: music duck/restore api exists", typeof window.BIRDI_MUSIC.duck === "function");

  dom.window.close();
}

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  await runLockedSuite();
  await runFullSuite();
  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
  if (failed.length) { console.log(failed.map((f) => "  FAILED: " + f.name).join("\n")); process.exit(1); }
}

main().catch((e) => { console.error("HARNESS ERROR", e); server.close(); process.exit(1); });
