/* BIRDI — Cinematic opening animation
   Full-screen black with glowing red light streaks that converge
   toward the center, where the BIRDI logo is revealed. */
(function () {
  "use strict";

  var canvas = document.getElementById("introCanvas");
  var logo = document.getElementById("introLogo");
  var flash = document.getElementById("introFlash");
  if (!canvas) return;

  var W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  var ctx = null;
  try { ctx = canvas.getContext("2d"); } catch (e) {}

  var DURATION = 2800;        /* total intro length (ms) */
  var REVEAL_START = 1450;    /* when the logo begins to appear */
  var t0 = performance.now();

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------------- glowing light streaks ---------------- */
  var streaks = [];
  var MAX = 150;

  function spawn() {
    var x, y, side = Math.floor(Math.random() * 4), pad = 40;
    if (side === 0)      { x = rand(-pad, W + pad); y = -pad; }
    else if (side === 1) { x = rand(-pad, W + pad); y = H + pad; }
    else if (side === 2) { x = -pad; y = rand(-pad, H + pad); }
    else                 { x = W + pad; y = rand(-pad, H + pad); }

    var tx = W / 2 + rand(-W * 0.16, W * 0.16);
    var ty = H / 2 + rand(-H * 0.16, H * 0.16);
    var dx = tx - x, dy = ty - y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    streaks.push({
      x: x, y: y,
      nx: dx / d, ny: dy / d,
      speed: rand(W * 1.1, W * 2.4),
      len: rand(0.12, 0.34) * Math.min(W, H),
      w: rand(1.2, 3.6),
      a: rand(0.3, 0.95)
    });
    if (streaks.length > MAX) streaks.shift();
  }

  for (var i = 0; i < 48; i++) spawn();

  function drawStreaks(dt) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      s.x += s.nx * s.speed * dt;
      s.y += s.ny * s.speed * dt;
      if (s.x < -W * 0.4 || s.x > W * 1.4 || s.y < -H * 0.4 || s.y > H * 1.4) {
        streaks.splice(i, 1);
        continue;
      }
      var tx = s.x - s.nx * s.len;
      var ty = s.y - s.ny * s.len;

      var grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
      grad.addColorStop(0, "rgba(229,9,20,0)");
      grad.addColorStop(1, "rgba(255,60,72," + s.a + ")");
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,40,60," + (s.a * 0.22) + ")";
      ctx.lineWidth = s.w * 3.4;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  }

  /* ---------------- center lens bloom ---------------- */
  function drawBloom(t) {
    var p = Math.max(0, Math.min(1, t / REVEAL_START));
    var intensity = 0.1 + p * 0.55;
    var r = Math.min(W, H) * (0.16 + p * 0.3);
    var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    g.addColorStop(0, "rgba(229,9,20," + (intensity * 0.5) + ")");
    g.addColorStop(0.55, "rgba(150,6,16," + (intensity * 0.18) + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(W / 2 - r, H / 2 - r, r * 2, r * 2);
  }

  /* ---------------- cinematic dressing ---------------- */
  function drawVignette() {
    ctx.globalCompositeOperation = "source-over";
    var v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.72);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGrain() {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(255,255,255,0.028)";
    for (var i = 0; i < 70; i++) {
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
  }

  /* ---------------- reveal control ---------------- */
  var revealed = false;
  function checkReveal(t) {
    if (!revealed && t >= REVEAL_START) {
      revealed = true;
      if (logo) logo.classList.add("show");
      if (flash) flash.classList.add("go");
    }
  }

  /* ---------------- frame loop ---------------- */
  var last = performance.now();
  function frame(now) {
    var t = now - t0;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    checkReveal(t);

    /* camera: slow zoom-in with a gentle drift and tilt */
    var camScale = 1 + (t / DURATION) * 0.07;
    var driftX = Math.sin(t * 0.0011) * 5;
    var driftY = Math.cos(t * 0.0009) * 4;
    var rot = Math.sin(t * 0.0006) * 0.004;

    /* fade previous frame -> motion-blur trails */
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    ctx.scale(camScale, camScale);
    ctx.translate(-W / 2 + driftX, -H / 2 + driftY);

    drawStreaks(dt);
    drawBloom(t);

    ctx.restore();
    drawVignette();
    drawGrain();

    if (t < DURATION) {
      requestAnimationFrame(frame);
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.14)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  if (ctx) {
    requestAnimationFrame(frame);
  }

  /* safety: always trigger the logo reveal even without a canvas */
  window.setTimeout(function () { checkReveal(REVEAL_START); }, REVEAL_START);
})();
