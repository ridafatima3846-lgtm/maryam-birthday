/* BIRDI — Cinematic video player
   - Plays real video files when present.
   - If a video file is missing, plays a beautiful animated
     "placeholder film" so the experience never breaks.
   Controls: play/pause, seek, volume, speed, fullscreen, PiP,
   captions (when a subtitles file is provided in data.js). */
(function () {
  "use strict";

  var PALETTES = [
    ["#1d1145", "#45107a", "#ff6b9d"],
    ["#120a3c", "#2c2a7e", "#4facfe"],
    ["#0d1b2a", "#1b263b", "#e63946"],
    ["#3b0d11", "#7b1e2e", "#f9a03f"],
    ["#150f2b", "#2f1e5c", "#a75dff"],
    ["#041c22", "#0f4c5c", "#e36414"],
    ["#241a3d", "#5b2a86", "#ff9e9e"],
    ["#1b0f23", "#54204e", "#f5a623"]
  ];

  function seedNum(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  function parseDur(s) {
    if (!s) return 120;
    var p = s.split(":");
    var out = 0;
    for (var i = 0; i < p.length; i++) out = out * 60 + (parseFloat(p[i]) || 0);
    return out || 120;
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60);
    var s = Math.floor(t % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var Player = {
    item: null,
    video: null,
    canvas: null,
    mode: null, // "real" | "film"
    playing: false,
    fakeT: 0,
    fakeDur: 120,
    container: null,
    root: null,
    relatedProvider: null,
    onClose: null,
    overlayEl: null,
    controlsTimer: null,
    rafId: null,
    startGain: 1,

    /* ---------------- open ---------------- */
    open: function (item, opts) {
      opts = opts || {};
      this.item = item;
      this.mode = null;
      this.playing = false;
      this.fakeT = 0;
      this.fakeDur = parseDur(item.duration);

      var overlay = this.overlayEl || this.build();
      overlay.classList.add("active");
      document.body.classList.add("no-scroll");

      this.render(item);
      this.setControlsForMode("waiting");

      /* fade-in of the black stage */
      var shade = overlay.querySelector(".player-shade");
      shade.style.opacity = "1";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { shade.style.opacity = "0"; });
      });

      this.bigPlay(false);
      this.showControls(true);

      if (item.video) {
        this.tryRealVideo(item);
      } else {
        this.enterFilmMode();
      }

      window.BIRDI_MUSIC.duck();
      if (opts.autoplay !== false) this.play();
    },

    build: function () {
      var overlay = el("div", "player-overlay");
      overlay.innerHTML = [
        '<div class="player-stage">',
        '  <div class="p-backdrop"></div>',
        '  <video class="player-video" playsinline preload="auto"></video>',
        '  <canvas class="player-canvas"></canvas>',
        '  <div class="player-shade"></div>',
        '  <div class="p-teaser"></div>',
        '  <div class="player-top">',
        '    <button class="p-btn p-back" title="Back"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg></button>',
        '    <div class="player-brand">NETFLIX</div>',
        '    <div class="player-ep"></div>',
        '  </div>',
        '  <button class="p-bigplay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>',
        '  <div class="player-bottom">',
        '    <div class="p-progress">',
        '      <div class="p-buffer"></div>',
        '      <div class="p-fill"></div>',
        '      <div class="p-knob"></div>',
        '    </div>',
        '    <div class="p-controls">',
        '      <button class="p-btn p-play" title="Play/Pause">',
        '        <svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
        '        <svg class="ic-pause" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
        '      </button>',
        '      <button class="p-btn p-skip p-back10" title="Back 10s"><svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg></button>',
        '      <button class="p-btn p-skip p-fwd10" title="Forward 10s"><svg viewBox="0 0 24 24"><path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/></svg></button>',
        '      <button class="p-btn p-vol" title="Mute">',
        '        <svg class="ic-sound" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
        '        <svg class="ic-mute" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.59 3 3.88-3.88-1.42-1.42L15.17 12l3.88 3.88 1.42-1.42L16.59 12z"/></svg>',
        '      </button>',
        '      <input class="p-volslider" type="range" min="0" max="1" step="0.01" value="1">',
        '      <span class="p-time">00:00 / 00:00</span>',
        '      <span class="p-spacer"></span>',
        '      <button class="p-btn p-cc" title="Captions">CC</button>',
        '      <div class="p-speedwrap">',
        '        <button class="p-btn p-speed" title="Speed">1x</button>',
        '        <div class="p-speedmenu">',
        '          <button data-s="0.5">0.5x</button>',
        '          <button data-s="0.75">0.75x</button>',
        '          <button data-s="1">1x</button>',
        '          <button data-s="1.25">1.25x</button>',
        '          <button data-s="1.5">1.5x</button>',
        '          <button data-s="2">2x</button>',
        '        </div>',
        '      </div>',
        '      <button class="p-btn p-pip" title="Picture in Picture"><svg viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V5c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 0H3V5h18v14z"/></svg></button>',
        '      <button class="p-btn p-full" title="Fullscreen"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>',
        '    </div>',
        '  </div>',
        '  <div class="p-endscreen"></div>',
        '</div>'
      ].join("");

      document.body.appendChild(overlay);
      this.overlayEl = overlay;
      this.root = overlay.querySelector(".player-stage");
      this.video = overlay.querySelector("video");
      this.canvas = overlay.querySelector("canvas");

      /* wire events */
      overlay.querySelector(".p-back").addEventListener("click", this.close.bind(this));
      overlay.querySelector(".p-bigplay").addEventListener("click", function () { Player.toggle(); });
      overlay.querySelector(".p-play").addEventListener("click", function () { Player.toggle(); });

      var v = this.video;
      v.addEventListener("play", function () { Player.onPlay(); });
      v.addEventListener("pause", function () { Player.onPause(); });
      v.addEventListener("timeupdate", function () { if (Player.mode === "real") Player.syncUI(); });
      v.addEventListener("loadedmetadata", function () { if (Player.mode === "real") Player.syncUI(true); });
      v.addEventListener("ended", function () { Player.onEnded(); });
      v.addEventListener("error", function () { if (Player.mode !== "real") Player.enterFilmMode(); });
      v.addEventListener("click", function () { Player.toggle(); });

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay || e.target === overlay.querySelector(".player-stage")) Player.toggle();
      });

      /* controls autohide */
      overlay.addEventListener("mousemove", function () { Player.showControls(); });
      overlay.addEventListener("mouseleave", function () { Player.hideControlsSoon(); });

      var pr = overlay.querySelector(".p-progress");
      pr.addEventListener("mousedown", function (e) { Player.seekFromEvent(e); });
      pr.addEventListener("touchstart", function (e) { Player.seekFromEvent(e); });

      overlay.querySelector(".p-back10").addEventListener("click", function () { Player.seekBy(-10); });
      overlay.querySelector(".p-fwd10").addEventListener("click", function () { Player.seekBy(10); });

      var volSlider = overlay.querySelector(".p-volslider");
      volSlider.addEventListener("input", function () { Player.setVolume(parseFloat(volSlider.value)); });
      overlay.querySelector(".p-vol").addEventListener("click", function () { Player.toggleMute(); });

      overlay.querySelector(".p-full").addEventListener("click", function () { Player.toggleFullscreen(); });
      overlay.querySelector(".p-pip").addEventListener("click", function () { Player.togglePip(); });

      var cc = overlay.querySelector(".p-cc");
      cc.addEventListener("click", function () {
        var tr = v.textTracks && v.textTracks[0];
        if (!tr) return;
        tr.mode = tr.mode === "showing" ? "hidden" : "showing";
        cc.classList.toggle("on", tr.mode === "showing");
      });

      var speedBtn = overlay.querySelector(".p-speed");
      var menu = overlay.querySelector(".p-speedmenu");
      speedBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        menu.classList.toggle("open");
      });
      menu.addEventListener("click", function (e) {
        var b = e.target.closest("[data-s]");
        if (!b) return;
        Player.setSpeed(parseFloat(b.getAttribute("data-s")));
        menu.classList.remove("open");
      });
      overlay.addEventListener("click", function () { menu.classList.remove("open"); });

      document.addEventListener("keydown", this.onKey.bind(this));
      return overlay;
    },

    /* ---------------- rendering ------------- */
    render: function (item) {
      var ep = item.episodeOf ? window.BIRDI_DATA.byId(item.episodeOf) : null;
      var epText = ep ? "S1 • E" + item.episodeNumber : "";
      this.overlayEl.querySelector(".player-ep").textContent = item.episodeNumber ? epText : item.category || "";
      this.overlayEl.querySelector(".player-brand").textContent = window.BIRDI_DATA.CONFIG.brand;
      document.title = item.title + " — " + window.BIRDI_DATA.CONFIG.brand;

      var teaser = this.overlayEl.querySelector(".p-teaser");
      if (item.teaser) {
        this.overlayEl.classList.add("teaser-mode");
        if (teaser) {
          teaser.style.display = "";
          teaser.innerHTML = [
            '<div class="pt-label">NEW PREMIERE</div>',
            '<div class="pt-title">' + String(item.title || "Coming Soon").toUpperCase() + '</div>',
            '<div class="pt-sub">' + String(item.subtitle || "").toUpperCase() + '</div>',
            '<div class="pt-date">' + String(item.release || "") + '</div>'
          ].join("");
        }
      } else {
        this.overlayEl.classList.remove("teaser-mode");
        if (teaser) teaser.style.display = "none";
      }
    },

    /* ---------------- modes ---------------- */
    tryRealVideo: function (item) {
      var self = this;
      this.video.src = item.video;
      var bd = this.overlayEl.querySelector(".p-backdrop");
      if (bd) bd.style.backgroundImage = "url('" + item.video + "')";
      if (item.subtitles) {
        var tr = document.createElement("track");
        tr.kind = "subtitles";
        tr.label = "English";
        tr.srclang = "en";
        tr.src = item.subtitles;
        this.video.appendChild(tr);
      }
      /* become "real" only once we actually get media */
      this.video.addEventListener("loadeddata", function () {
        if (self.mode !== "real") {
          self.enterRealMode();
        }
      }, { once: true });
    },

    enterRealMode: function () {
      this.mode = "real";
      this.canvas.style.display = "none";
      this.video.style.display = "";
      this.setControlsForMode("real");
      if (this.playing) { this.video.play().catch(function () {}); }
      var s = window.BIRDI_STORE.getSpeed();
      if (this.video.playbackRate) this.video.playbackRate = s;
      this.syncUI(true);
      this.playing = true;
      this.video.play().catch(function () {});
      this.updateBigPlay();
    },

    enterFilmMode: function () {
      if (this.mode === "real") return;
      this.mode = "film";
      this.video.removeAttribute("src");
      this.video.load();
      this.video.style.display = "none";
      this.canvas.style.display = "";
      this.setControlsForMode("film");
      this.syncUI(true);
      if (this.playing) this.fakeT += 0.001;
      this.animateFilm();
      this.updateBigPlay();
    },

    setControlsForMode: function (mode) {
      var cc = this.overlayEl.querySelector(".p-cc");
      var pip = this.overlayEl.querySelector(".p-pip");
      var hideCc = mode !== "real" || !(this.video.textTracks && this.video.textTracks.length);
      cc.style.display = hideCc ? "none" : "";
      pip.style.display = mode === "real" ? "" : "none";
    },

    /* ---------------- film animation ---------------- */
    animateFilm: function () {
      var self = this;
      cancelAnimationFrame(this.rafId);
      var c = this.canvas, ctx = c.getContext("2d");
      var W = c.width, H = c.height;
      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      function resize() {
        var r = c.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        c.width = W * DPR; c.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      resize();
      window.addEventListener("resize", resize);

      var item = this.item;
      var pal = PALETTES[Math.floor(seedNum(item.id + "pl") * PALETTES.length)];
      var parts = [];
      for (var i = 0; i < 26; i++) {
        parts.push({
          x: Math.random(), y: Math.random(),
          r: 0.01 + Math.random() * 0.03,
          s: 0.0002 + Math.random() * 0.0006,
          o: 0.08 + Math.random() * 0.2,
          d: Math.random() * Math.PI * 2
        });
      }
      var t0 = performance.now();
      var speed = window.BIRDI_STORE.getSpeed() || 1;

      function draw() {
        if (self.mode !== "film" || !self.overlayEl.classList.contains("active")) return;
        var t = (performance.now() - t0) / 1000;
        var g = ctx.createLinearGradient(0, 0, W * 0.85, H);
        g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        /* drifting light orbs */
        parts.forEach(function (p, idx) {
          var ptime = t * (p.s * 900 * speed) + p.d;
          var x = (p.x + Math.sin(ptime) * 0.06) * W;
          var y = (p.y + Math.cos(ptime * 0.8) * 0.05) * H;
          var r = p.r * Math.min(W, H);
          var rad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
          rad.addColorStop(0, "rgba(255,255,255," + p.o + ")");
          rad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = rad;
          ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();
        });

        /* vignette */
        var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

        if (!item.teaser) {
          /* film text */
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "14px 'Segoe UI', sans-serif";
          ctx.fillText("A NETFLIX ORIGINAL", W / 2, H * 0.3);

          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.font = "bold " + Math.min(W * 0.045, 56) + "px Georgia, serif";
          var title = (item.title || "NETFLIX").toUpperCase();
          var wrap = title.split(" ").slice(0, 3).join(" ");
          ctx.fillText(wrap, W / 2, H * 0.46);

          if (item.subtitle) {
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.font = "bold 16px 'Segoe UI', sans-serif";
            ctx.fillText(String(item.subtitle).toUpperCase(), W / 2, H * 0.56);
            ctx.fillStyle = "rgba(229,9,20,0.95)";
            ctx.font = "bold 20px 'Segoe UI', sans-serif";
            ctx.fillText("RELEASING " + String(item.release || "").toUpperCase(), W / 2, H * 0.63);
          } else if (item.release) {
            ctx.fillStyle = "rgba(255,255,255,0.75)";
            ctx.font = "bold 16px 'Segoe UI', sans-serif";
            ctx.fillText("COMING SOON • RELEASING " + String(item.release).toUpperCase(), W / 2, H * 0.56);
          } else {
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "13px 'Segoe UI', sans-serif";
            ctx.fillText("YOUR VIDEO PLAYS HERE", W / 2, H * 0.56);

            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.font = "12px 'Segoe UI', sans-serif";
            ctx.fillText("Add your file to " + (item.video || item.id + ".mp4"), W / 2, H * 0.62);
          }
        }

        /* soft aperture ring */
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.06, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2); ctx.fill();

        /* film grain */
        ctx.fillStyle = "rgba(255,255,255,0.02)";
        for (var n = 0; n < 40; n++) {
          ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5);
        }

        if (self.playing) {
          self.fakeT += (1 / 60) * speed;
          if (self.fakeT >= self.fakeDur) {
            self.fakeT = self.fakeDur;
            self.onEnded();
          }
          self.syncUI();
        }
        self.rafId = requestAnimationFrame(draw);
      }
      draw();
    },

    /* ---------------- control state ---------------- */
    currentTime: function () {
      if (this.mode === "real") return this.video.currentTime || 0;
      return this.fakeT;
    },
    duration: function () {
      if (this.mode === "real") return this.video.duration || 0;
      return this.fakeDur;
    },

    play: function () {
      this.playing = true;
      if (this.mode === "real") {
        var p = this.video.play();
        if (p && p.catch) p.catch(function () {});
        this.onPlay();
      } else {
        this.onPlay();
      }
      this.updateBigPlay();
    },
    pause: function () {
      this.playing = false;
      if (this.mode === "real") this.video.pause();
      this.onPause();
      this.updateBigPlay();
    },
    toggle: function () {
      if (this.playing) this.pause(); else this.play();
    },
    onPlay: function () {
      this.playing = true;
      this.overlayEl.classList.add("is-playing");
      this.updateBigPlay();
      this.hideControlsSoon();
      window.BIRDI_MUSIC.duck();
    },
    onPause: function () {
      this.playing = false;
      this.overlayEl.classList.remove("is-playing");
      this.updateBigPlay();
      this.showControls(true);
      window.BIRDI_MUSIC.restore();
    },
    updateBigPlay: function () {
      this.bigPlay(!this.playing);
    },
    bigPlay: function (show) {
      this.overlayEl.querySelector(".p-bigplay").classList.toggle("hide", !show);
    },

    seekFromEvent: function (e) {
      var pr = this.overlayEl.querySelector(".p-progress");
      var rect = pr.getBoundingClientRect();
      var frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      this.seekToFrac(frac);
    },
    seekToFrac: function (frac) {
      var dur = this.duration();
      if (this.mode === "real") {
        this.video.currentTime = frac * dur;
      } else {
        this.fakeT = frac * dur;
        this.syncUI();
      }
    },
    seekBy: function (delta) {
      var t = this.currentTime() + delta;
      var dur = this.duration();
      if (t < 0) t = 0;
      if (t > dur) t = dur;
      if (this.mode === "real") this.video.currentTime = t;
      else { this.fakeT = t; this.syncUI(); }
    },

    setVolume: function (v) {
      var icon = this.overlayEl.querySelector(".p-vol");
      icon.classList.toggle("off", v <= 0.01);
      if (this.video) this.video.volume = v;
      if (this.video) this.video.muted = v <= 0.01;
    },
    toggleMute: function () {
      var v = this.video;
      if (!v) return;
      v.muted = !v.muted;
      var icon = this.overlayEl.querySelector(".p-vol");
      icon.classList.toggle("off", v.muted);
      if (v.muted) this.overlayEl.querySelector(".p-volslider").value = 0;
    },

    setSpeed: function (s) {
      window.BIRDI_STORE.setSpeed(s);
      if (this.video) this.video.playbackRate = s;
      this.overlayEl.querySelector(".p-speed").textContent = s + "x";
    },

    toggleFullscreen: function () {
      var stage = this.root;
      if (!document.fullscreenElement) {
        if (stage.requestFullscreen) stage.requestFullscreen();
        else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    },
    togglePip: function () {
      var v = this.video;
      if (!v || !v.requestPictureInPicture) return;
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else v.requestPictureInPicture().catch(function () {});
    },

    syncUI: function (fresh) {
      var dur = this.duration();
      var cur = this.currentTime();
      var frac = dur ? cur / dur : 0;
      if (frac > 1) frac = 1;
      this.overlayEl.querySelector(".p-fill").style.width = (frac * 100) + "%";
      this.overlayEl.querySelector(".p-buffer").style.width = (frac * 100) + "%";
      this.overlayEl.querySelector(".p-knob").style.left = (frac * 100) + "%";
      this.overlayEl.querySelector(".p-time").textContent = fmt(cur) + " / " + fmt(dur);
      if (fresh) this.setSpeed(window.BIRDI_STORE.getSpeed());
    },

    /* ---------------- visibility / end ---------------- */
    showControls: function (keep) {
      var self = this;
      this.overlayEl.classList.add("controls-visible");
      clearTimeout(this.controlsTimer);
      if (keep) return;
      this.controlsTimer = setTimeout(function () {
        if (self.playing) self.overlayEl.classList.remove("controls-visible");
      }, 2600);
    },
    hideControlsSoon: function () {
      var self = this;
      clearTimeout(this.controlsTimer);
      this.controlsTimer = setTimeout(function () {
        if (self.playing) self.overlayEl.classList.remove("controls-visible");
      }, 2200);
    },

    onEnded: function () {
      this.playing = false;
      this.updateBigPlay();
      this.renderEndscreen();
    },

    renderEndscreen: function () {
      var self = this;
      var es = this.overlayEl.querySelector(".p-endscreen");
      es.classList.add("active");
      es.innerHTML = "";
      es.appendChild(el("div", "es-title", "Up Next"));

      var related = this.relatedProvider ? this.relatedProvider(this.item) : [];
      var grid = el("div", "es-grid");
      related.forEach(function (it) {
        var card = el("button", "es-card");
        card.style.backgroundImage = "url(" + (it.poster || "") + ")";
        card.innerHTML = '<div class="es-meta"><span class="es-name">' + it.title + '</span><span class="es-cat">' + (it.category || "") + '</span></div>';
        card.addEventListener("click", function () {
          es.classList.remove("active");
          self.open(it);
        });
        grid.appendChild(card);
      });

      var replay = el("button", "es-replay", "↻ Replay");
      replay.addEventListener("click", function () {
        es.classList.remove("active");
        self.replay();
      });
      var browse = el("button", "es-browse", "Back to Browse");
      browse.addEventListener("click", function () { self.close(); });

      es.appendChild(grid);
      var row = el("div", "es-actions");
      row.appendChild(replay); row.appendChild(browse);
      es.appendChild(row);
    },

    replay: function () {
      this.playing = false;
      if (this.mode === "real") { this.video.currentTime = 0; }
      else this.fakeT = 0;
      this.syncUI();
      this.play();
    },

    onKey: function (e) {
      if (!this.overlayEl.classList.contains("active")) return;
      var tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT") return;
      switch (e.key) {
        case " ": case "k": case "K": e.preventDefault(); this.toggle(); break;
        case "ArrowRight": e.preventDefault(); this.seekBy(10); break;
        case "ArrowLeft": e.preventDefault(); this.seekBy(-10); break;
        case "m": case "M": this.toggleMute(); break;
        case "f": case "F": this.toggleFullscreen(); break;
        case "Escape": this.close(); break;
      }
    },

    close: function () {
      this.playing = false;
      if (this.video) { this.video.pause(); this.video.removeAttribute("src"); this.video.load(); }
      cancelAnimationFrame(this.rafId);
      this.overlayEl.classList.remove("active");
      document.body.classList.remove("no-scroll");
      window.BIRDI_MUSIC.restore();
      document.title = window.BIRDI_DATA.CONFIG.brand + " — " + window.BIRDI_DATA.CONFIG.friendName;
      if (this.onClose) this.onClose();
    }
  };

  window.BIRDI_PLAYER = Player;
})();
