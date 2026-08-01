/* BIRDI player test — placeholder film mode, controls, seek, endscreen */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..");
const PORT = 8942;
const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("nf"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, t = 6000) { const t0 = Date.now(); while (Date.now() - t0 < t) { try { if (fn()) return true; } catch (e) {} await sleep(60); } return false; }

async function main() {
  await new Promise((r) => server.listen(PORT, r));
  const dom = await JSDOM.fromURL("http://localhost:" + PORT + "/index.html", {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true
  });
  const { window } = dom;
  const doc = window.document;
  const $ = (s) => doc.querySelector(s);
  const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  const results = [];
  const check = (n, ok, d) => { results.push({ n, ok }); console.log((ok ? "  PASS " : "  FAIL ") + n + (d ? "  -- " + d : "")); };

  await waitFor(() => window.BIRDI_APP);
  const Player = window.BIRDI_PLAYER;

  /* fake 2d context so the film renderer runs in jsdom */
  const grad = { addColorStop: () => {} };
  const fakeCtx = () => new Proxy({}, {
    get(t, p) {
      if (p === "canvas") return {};
      if (p === "createLinearGradient" || p === "createRadialGradient") return () => grad;
      if (p in t) return t[p];
      return () => ({});
    },
    set() { return true; }
  });
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", { value: () => fakeCtx() });

  /* drive rAF deterministically (jsdom's built-in cadence is unreliable) */
  const rafCbs = new Map();
  let rafId = 0;
  window.requestAnimationFrame = (cb) => { rafCbs.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { rafCbs.delete(id); };
  const pump = setInterval(() => {
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const cbs = Array.from(rafCbs.values());
    rafCbs.clear();
    cbs.forEach((cb) => { try { cb(now); } catch (e) {} });
  }, 10);

  /* open a video with a MISSING file -> should fall into film mode in a real browser */
  Player.open(window.BIRDI_DATA.byId("our-friendship"), { autoplay: false });
  await waitFor(() => $(".player-overlay") && $(".player-overlay").classList.contains("active"));
  check("player overlay opens", $(".player-overlay").classList.contains("active"));

  check("controls present", !!$(".player-overlay .p-play") && !!$(".player-overlay .p-progress") && !!$(".player-overlay .p-full"));

  /* force film mode (browser would reach it via the video error event) */
  if (Player.mode !== "film") Player.enterFilmMode();
  await sleep(120);
  check("film placeholder mode active", Player.mode === "film", "mode=" + Player.mode);
  check("canvas visible in film mode", $(".player-canvas").style.display !== "none");

  /* play + timeline advances */
  Player.play();
  await sleep(300);
  const t1 = Player.currentTime();
  await sleep(300);
  const t2 = Player.currentTime();
  check("timeline advances while playing", t2 > t1, t1.toFixed(2) + " -> " + t2.toFixed(2));
  check("playing state reflected in UI", $(".player-overlay").classList.contains("is-playing"));

  /* pause stops it */
  Player.pause();
  const t3 = Player.currentTime();
  await sleep(200);
  const t4 = Player.currentTime();
  check("timeline pauses", t4 === t3);

  /* seek */
  Player.seekToFrac(0.5);
  const dur = Player.duration();
  const half = Player.currentTime();
  check("seek works", Math.abs(half - dur * 0.5) < 0.01, "current=" + half.toFixed(2) + " dur=" + dur.toFixed(2));

  /* speed change persists */
  Player.setSpeed(2);
  check("speed control", window.BIRDI_STORE.getSpeed() === 2);

  /* progress UI reflects */
  check("progress bar width updates", parseFloat($(".player-overlay .p-fill").style.width) > 40, $(".player-overlay .p-fill").style.width);

  /* reach the end -> endscreen with related items */
  Player.pause();
  Player.seekToFrac(0.997);
  Player.play();
  await waitFor(() => $(".p-endscreen") && $(".p-endscreen").classList.contains("active"), 8000);
  check("endscreen shows after video", $(".p-endscreen").classList.contains("active"));
  check("endscreen has related items + replay", $$count(".es-card") > 0 && !!$(".es-replay"), "cards=" + $$count(".es-card"));

  /* replay resets and plays */
  click($(".es-replay"));
  await waitFor(() => Player.playing && Player.currentTime() < 1, 4000);
  check("replay restarts timeline", Player.currentTime() < 1 && Player.playing, "t=" + Player.currentTime().toFixed(2));

  /* close */
  clearInterval(pump);
  Player.close();
  await sleep(50);
  check("player closes cleanly", !$(".player-overlay").classList.contains("active"));

  function $$count(sel) { return Array.prototype.slice.call(doc.querySelectorAll(sel)).length; }

  dom.window.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log("\n" + (results.length - failed.length) + "/" + results.length + " player checks passed");
  if (failed.length) { console.log(failed.map((f) => "  FAILED: " + f.n).join("\n")); process.exit(1); }
}

main().catch((e) => { console.error("HARNESS ERROR", e); server.close(); process.exit(1); });
