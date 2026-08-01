/* BIRDI — Application controller
   Router, screen rendering, search, My List, memories,
   birthday special, secret surprise and final message. */
(function () {
  "use strict";

  var DATA = window.BIRDI_DATA;
  var Store = window.BIRDI_STORE;
  var Music = window.BIRDI_MUSIC;
  var Player = window.BIRDI_PLAYER;

  var CONFIG = DATA.CONFIG;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function snippet(s, n) {
    s = s || "";
    return s.length > (n || 110) ? s.slice(0, n) + "…" : s;
  }

  /* deterministic hash seed (like the poster generator) */
  function seedNum(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  var App = {
    currentScreen: null,
    photoIndex: 0,

    /* Preview mode: when the site is opened with "?preview=1" (or the hash
       "#preview"), every page is unlocked so you can check everything.
       Normal visitors still see only the coming-soon teaser until release. */
    preview: (location.search || "").indexOf("preview") !== -1 || (location.hash || "").indexOf("preview") !== -1,

    /* ================= INIT ================= */
    init: function () {
      this.wireNav();
      this.wireSearch();
      this.wireMusic();
      this.buildSearchIndex();
      Player.relatedProvider = function (item) { return App.related(item); };
      Player.onClose = function () {
        if ((location.hash || "").indexOf("#/play") === 0) {
          location.hash = App.playerFrom || "#/home";
        }
      };
      window.addEventListener("hashchange", this.route.bind(this));

      /* everyday banner */
      var bn = $("#allBannerText");
      if (bn) {
        var bannerText = (CONFIG.banner || "").trim();
        bn.textContent = bannerText;
        $("#allBanner").style.display = bannerText ? "" : "none";
      }

      /* login gate first, then the cinematic intro */
      this.wireLogin();
    },

    /* ================= LOGIN GATE ================= */
    wireLogin: function () {
      var self = this;
      if (this.preview) {
        /* preview mode (?preview=1) skips the login screen */
        this.runIntro();
        return;
      }
      var el = $("#login");
      var input = $("#loginPass");
      var btn = $("#loginBtn");
      var err = $("#loginError");
      var PASS = String(CONFIG.loginPass || "Maryam12");

      function attempt() {
        if ((input.value || "").trim() === PASS) {
          if (err) err.textContent = "";
          if (el) {
            el.classList.add("done");
            window.setTimeout(function () { el.style.display = "none"; }, 800);
          }
          self.runIntro();
        } else {
          if (err) err.textContent = "Wrong password. Try again.";
          if (input) {
            input.value = "";
            input.classList.remove("shake");
            void input.offsetWidth; /* restart animation */
            input.classList.add("shake");
            input.focus();
          }
        }
      }

      if (btn) btn.addEventListener("click", attempt);
      if (input) {
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
        window.setTimeout(function () { input.focus(); }, 300);
      }
    },

    /* cinematic intro + loader sequence (after login or in preview) */
    runIntro: function () {
      var loader = $("#loader");
      if (window.CinematicIntro) window.CinematicIntro.start();
      window.setTimeout(function () {
        loader.classList.add("done");
        window.setTimeout(function () {
          loader.style.display = "none";
          if (!location.hash || location.hash === "#") location.hash = "#/home";
          else App.route();
        }, 850);
      }, 2900);
    },

    /* ================= NAV ================= */
    wireNav: function () {
      $$("[data-route]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          App.closeMobileMenu();
          App.navigate(a.getAttribute("data-route"));
        });
      });
      $("#searchBtn").addEventListener("click", function () { App.openSearch(); });
      $("#profileBtn").addEventListener("click", function () { App.navigate("profile"); });
      $("#musicBtn").addEventListener("click", function () {
        var unmuted = Music.toggle();
        App.updateMusicIcon(unmuted);
      });
      $("#menuBtn").addEventListener("click", function () { App.toggleMobileMenu(); });
      $(".mobile-menu").addEventListener("click", function () { App.closeMobileMenu(); });
      $("#brandLogo").addEventListener("click", function () { App.navigate("home"); });
      $("#secretTeaser").querySelector(".btn-play").addEventListener("click", function () { App.openSecret(); });
      window.addEventListener("scroll", function () {
        $("#navbar").classList.toggle("scrolled", window.scrollY > 24);
      });
    },

    navigate: function (route) {
      location.hash = "#/" + route;
    },

    route: function () {
      if (CONFIG.locked && !this.preview) {
        document.body.classList.add("locked");
        var nav = $("#navbar"); if (nav) nav.style.display = "none";
        this.showScreen("soon", this.renderSoon);
        return;
      }
      var hash = (location.hash || "").replace(/^#\/?/, "");
      var parts = hash.split("/").filter(Boolean);
      var r = parts[0] || "home";
      if (Player.overlayEl && Player.overlayEl.classList.contains("active") && r !== "play") {
        Player.close();
      }
      switch (r) {
        case "profile": this.showScreen("profile", this.renderProfile); break;
        case "memories": this.showScreen("memories", this.renderMemories); break;
        case "videos": this.showScreen("videos", this.renderVideos); break;
        case "list": this.showScreen("list", this.renderList); break;
        case "birthday": this.showScreen("birthday", this.renderBirthday); break;
        case "final": this.showScreen("final", this.renderFinal); break;
        case "details": if (parts[1]) this.showScreen("details", function () { App.renderDetails(parts[1]); }); break;
        case "photo": if (parts[1]) this.showScreen("photo", function () { App.renderPhoto(parts[1]); }); break;
        case "play": if (parts[1]) this.openPlayer(parts[1]); break;
        default: this.showScreen("home", this.renderHome); break;
      }
    },

    showScreen: function (name, renderFn) {
      var scr = $("#screen-" + name);
      if (!scr) { scr = $("#screen-home"); name = "home"; }
      $$(".screen").forEach(function (s) { s.classList.remove("active"); });
      scr.classList.add("active", "entering");
      window.setTimeout(function () { scr.classList.remove("entering"); }, 60);
      if (window.scrollTo) window.scrollTo(0, 0);
      this.currentScreen = name;
      this.updateNav(name);
      document.title = CONFIG.brand + " — " + CONFIG.friendName;
      if (renderFn) renderFn();
    },

    updateNav: function (name) {
      var map = { home: "home", memories: "memories", videos: "videos", birthday: "birthday", list: "list" };
      var active = map[name] || "";
      $$(".nav-links a").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("data-route") === active);
      });
    },

    /* ================= COMING SOON (locked teaser) ================= */
    renderSoon: function () {
      var cs = CONFIG.comingSoon || {};
      var src = cs.image || "assets/photos/pic1.jpeg";
      var bg = $("#soonBg"); if (bg) bg.src = src;
      var bd = $("#soonBackdrop"); if (bd) bd.src = src;
      var lbl = $("#soonLabel"); if (lbl) lbl.textContent = cs.label || "NEW PREMIERE";
      var dt = $("#soonDate"); if (dt) dt.textContent = cs.date || "14 AUGUST";
      var nt = $("#soonNote"); if (nt) nt.textContent = cs.note || "";
      var pb = $("#soonPlay");
      if (pb) {
        pb.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> ' + (cs.playLabel || "WATCH TEASER");
        pb.onclick = function () { App.openPlayer(cs.playId || "coming-soon"); };
      }
      document.title = CONFIG.brand + " — Coming Soon";
    },

    /* ================= HOME ================= */
    renderHome: function () {
      var hero = $("#screen-home .hero");
      var h = CONFIG.hero;
      hero.querySelector(".hero-bg").style.backgroundImage = "url(" + h.bg + ")";
      hero.querySelector(".hero-line1").textContent = h.line1;
      hero.querySelector(".hero-title").textContent = h.line2;
      hero.querySelector(".hero-tagline").textContent = h.tagline;
      hero.querySelector(".hero-desc").textContent = h.description;
      var playBtn = hero.querySelector(".btn-play");
      playBtn.querySelector("span").textContent = h.playLabel || "PLAY";
      playBtn.onclick = function () { App.openPlayer(h.playId); };
      var infoBtn = hero.querySelector(".btn-info");
      if (h.moreId) {
        infoBtn.style.display = "";
        infoBtn.onclick = function () { App.navigate("details/" + h.moreId); };
      } else {
        infoBtn.style.display = "none";
      }

      var rowsWrap = $("#screen-home .rows");
      rowsWrap.innerHTML = "";
      DATA.ROWS.forEach(function (row) {
        rowsWrap.appendChild(App.buildRow(row));
      });
    },

    buildRow: function (row) {
      var sec = document.createElement("section");
      sec.className = "row";
      sec.innerHTML = '<h2 class="row-title">' + esc(row.title) + '</h2>' +
        '<div class="row-track"></div>' +
        '<button class="row-arrow row-left" aria-label="Scroll left"><svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg></button>' +
        '<button class="row-arrow row-right" aria-label="Scroll right"><svg viewBox="0 0 24 24"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg></button>';

      var track = sec.querySelector(".row-track");
      row.items.forEach(function (id) {
        var item = DATA.byId(id);
        if (item) track.appendChild(App.buildCard(item));
      });
      App.wireRowScroll(sec);
      return sec;
    },

    wireRowScroll: function (sec) {
      var track = sec.querySelector(".row-track");
      var left = sec.querySelector(".row-left");
      var right = sec.querySelector(".row-right");
      function update() {
        var max = track.scrollWidth - track.clientWidth - 4;
        left.style.display = track.scrollLeft > 8 ? "" : "none";
        right.style.display = max > 8 ? "" : "none";
      }
      update();
      track.addEventListener("scroll", update);
      window.addEventListener("resize", update);
      left.addEventListener("click", function () { track.scrollBy({ left: -track.clientWidth * 0.85, behavior: "smooth" }); });
      right.addEventListener("click", function () { track.scrollBy({ left: track.clientWidth * 0.85, behavior: "smooth" }); });
    },

    /* ================= CARDS ================= */
    buildCard: function (item) {
      var card = document.createElement("div");
      card.className = "card";
      card.setAttribute("data-id", item.id);

      var badge = "";
      if (item.type === "photo") badge = "PHOTO";
      else if (item.type === "series") badge = "SERIES";
      else if (item.type === "special") badge = "SPECIAL";
      else if (item.episodeNumber) badge = "EP " + item.episodeNumber;
      else badge = "VIDEO";

      card.innerHTML =
        '<div class="card-poster" style="background-image:url(' + esc(item.poster || item.id + ".svg") + ')">' +
        '  <span class="card-type">' + badge + '</span>' +
        '  <div class="card-hover">' +
        '    <button class="card-play" title="Play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
        '    <div class="card-info">' +
        '      <h4>' + esc(item.title) + '</h4>' +
        '      <p>' + esc(snippet(item.description, 90)) + '</p>' +
        '    </div>' +
        '    <button class="card-list">' + (Store.inList(item.id) ? "✓ In My List" : "+ My List") + '</button>' +
        '  </div>' +
        '</div>' +
        '<div class="card-meta">' +
        '  <span class="card-meta-cat">' + esc(item.category || "") + '</span>' +
        '  <span class="card-meta-dur">' + esc(item.duration || (item.type === "photo" ? (item.date || "") : "")) + '</span>' +
        '</div>';

      var go = function (e) {
        e.stopPropagation();
        if (item.type === "photo") App.navigate("photo/" + item.id);
        else if (item.episodeNumber && item.episodeOf) App.openPlayer(item.id);
        else App.navigate("details/" + item.id);
      };
      card.addEventListener("click", go);
      card.querySelector(".card-play").addEventListener("click", function (e) { e.stopPropagation(); App.openPlayer(item.id); });
      card.querySelector(".card-list").addEventListener("click", function (e) {
        e.stopPropagation();
        App.toggleList(item.id);
      });
      return card;
    },

    toggleList: function (id) {
      var added = Store.toggleList(id);
      $$("[data-id='" + id + "'] .card-list").forEach(function (b) {
        b.textContent = added ? "✓ In My List" : "+ My List";
      });
      var d = $("#screen-details .d-list");
      if (d && d.getAttribute("data-id") === id) d.textContent = added ? "✓ In My List" : "+ My List";
      var bd = $("#screen-birthday");
      if (bd) $$("[data-list-btn='" + id + "']").forEach(function (b) {
        b.textContent = added ? "✓ In My List" : "+ My List";
      });
      if (this.currentScreen === "list") this.renderList();
    },

    /* ================= DETAILS ================= */
    renderDetails: function (id) {
      var item = DATA.byId(id);
      if (!item) { App.navigate("home"); return; }
      var wrap = $("#screen-details .details-wrap");
      var match = 92 + Math.floor(seedNum(item.id) * 7);

      var typeLabel = item.type === "series" ? "Series" : (item.type === "special" ? "Special" : "Film");
      var subTitle = item.category || "";
      var meta = [typeLabel + " • " + (item.category || ""), item.duration || "", item.year || item.date || ""]
        .filter(Boolean).join("   •   ");

      var extra = "";
      if (item.type === "series") {
        extra = '<div class="d-episodes"><h3>Episodes</h3><div class="ep-list">' +
          item.episodes.map(function (epId) {
            var ep = DATA.byId(epId);
            if (!ep) return "";
            return '<button class="ep-item" data-ep="' + epId + '">' +
              '<span class="ep-num">' + ep.episodeNumber + '</span>' +
              '<span class="ep-thumb" style="background-image:url(' + esc(ep.poster) + ')"><i></i></span>' +
              '<span class="ep-body"><span class="ep-title">' + esc(ep.title) + '</span>' +
              '<span class="ep-desc">' + esc(ep.description) + '</span>' +
              '<span class="ep-dur">' + esc(ep.duration) + '</span></span>' +
              '</button>';
          }).join("") + '</div></div>';
      }

      var videoBlock = "";
      if (item.video) {
        videoBlock =
          '<div class="d-video">' +
          '  <video class="d-vid" src="' + esc(item.video) + '" preload="metadata" playsinline></video>' +
          '  <div class="d-video-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>' +
          '  <button class="d-video-full" title="Fullscreen"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>' +
          '</div>';
      }

      wrap.innerHTML =
        '<div class="details-bg" style="background-image:url(' + esc(item.bg || item.poster) + ')"></div>' +
        '<div class="details-top"><button class="btn-back" id="detailsBack"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button></div>' +
        '<div class="details-content">' +
        videoBlock +
        '  <div class="d-badge">NETFLIX</div>' +
        '  <h1 class="d-title">' + esc(item.title) + '</h1>' +
        '  <div class="d-meta"><span class="d-match">' + match + '% Match</span> <span class="d-meta-txt">' + esc(meta) + '</span></div>' +
        '  <p class="d-desc">' + esc(item.description) + '</p>' +
        '  <div class="d-actions">' +
        '    <button class="btn btn-play d-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Play</button>' +
        '    <button class="btn btn-ghost d-list" data-id="' + item.id + '" data-list-btn="' + item.id + '">' +
          (Store.inList(item.id) ? "✓ In My List" : "+ My List") + '</button>' +
        '  </div>' +
        extra +
        '</div>';

      $("#detailsBack").addEventListener("click", function () {
        if (window.history.length > 1) history.back();
        else App.navigate("home");
      });
      wrap.querySelector(".d-play").addEventListener("click", function () { App.openPlayer(item.id); });
      wrap.querySelector(".d-list").addEventListener("click", function () { App.toggleList(item.id); });
      $$(".ep-item", wrap).forEach(function (btn) {
        btn.addEventListener("click", function () { App.openPlayer(btn.getAttribute("data-ep")); });
      });

      var dvid = wrap.querySelector(".d-vid");
      if (dvid) {
        var dbox = wrap.querySelector(".d-video");
        var dplay = wrap.querySelector(".d-video-play");
        var videoBroken = false;
        dvid.addEventListener("error", function () { videoBroken = true; });
        function toggleInline() {
          if (videoBroken) { App.openPlayer(item.id); return; }
          if (dvid.paused) {
            dvid.play().catch(function () { App.openPlayer(item.id); });
            dplay.classList.add("playing");
          } else {
            dvid.pause();
            dplay.classList.remove("playing");
          }
        }
        dplay.addEventListener("click", toggleInline);
        dvid.addEventListener("click", toggleInline);
        dvid.addEventListener("pause", function () { dplay.classList.remove("playing"); });
        dvid.addEventListener("ended", function () { dplay.classList.remove("playing"); });
        wrap.querySelector(".d-video-full").addEventListener("click", function () {
          if (dbox.requestFullscreen) dbox.requestFullscreen();
          else if (dbox.webkitRequestFullscreen) dbox.webkitRequestFullscreen();
        });
      }

      /* related row under content */
      var related = App.related(item, 8);
      var relatedWrap = document.createElement("div");
      relatedWrap.className = "row related-row";
      relatedWrap.innerHTML = '<h2 class="row-title">More Like This</h2><div class="row-track"></div>';
      var track = relatedWrap.querySelector(".row-track");
      related.forEach(function (it) { track.appendChild(App.buildCard(it)); });
      wrap.appendChild(relatedWrap);
    },

    /* ================= PHOTO SLIDESHOW ================= */
    renderPhoto: function (id) {
      var item = DATA.byId(id);
      if (!item) { App.navigate("memories"); return; }
      this.photoIndex = 0;
      var wrap = $("#screen-photo .photo-wrap");
      var base = (item.images && item.images.length) ? item.images : [item.poster];
      var poster = item.poster || "assets/posters/logo.svg";
      var images = base.slice();
      var pending = base.length;
      wrap.innerHTML =
        '<div class="photo-top"><button class="btn-back" id="photoBack"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back to Memories</button></div>' +
        '<div class="photo-stage">' +
        '  <button class="photo-nav photo-prev">‹</button>' +
        '  <button class="photo-nav photo-next">›</button>' +
        '  <div class="photo-img"></div>' +
        '  <div class="photo-caption">' +
        '    <span class="photo-count"></span>' +
        '    <h2>' + esc(item.title) + '</h2>' +
        '    <span class="photo-date">' + esc(item.date || "") + '</span>' +
        '    <p>' + esc(item.description) + '</p>' +
        '  </div>' +
        '</div>';

      $("#photoBack").addEventListener("click", function () {
        if (window.history.length > 1) history.back();
        else App.navigate("memories");
      });
      var img = wrap.querySelector(".photo-img");
      var count = wrap.querySelector(".photo-count");
      function show(i) {
        App.photoIndex = (i + images.length) % images.length;
        img.style.opacity = "0";
        window.setTimeout(function () {
          img.style.backgroundImage = "url(" + esc(images[App.photoIndex]) + ")";
          img.style.opacity = "1";
        }, 240);
        count.textContent = (App.photoIndex + 1) + " / " + images.length;
      }
      wrap.querySelector(".photo-next").addEventListener("click", function () { show(App.photoIndex + 1); });
      wrap.querySelector(".photo-prev").addEventListener("click", function () { show(App.photoIndex - 1); });
      document.addEventListener("keydown", function photoKeys(e) {
        if (!$("#screen-photo").classList.contains("active")) return;
        if (e.key === "ArrowRight") show(App.photoIndex + 1);
        if (e.key === "ArrowLeft") show(App.photoIndex - 1);
      });

      if (!base.length) {
        images = [poster];
        show(0);
        return;
      }
      base.forEach(function (src, i) {
        var probe = new Image();
        probe.onload = function () { images[i] = src; done(); };
        probe.onerror = function () { images[i] = poster; done(); };
        probe.src = src;
      });
      function done() {
        pending--;
        if (pending === 0) show(0);
      }
    },

    /* ================= MEMORIES ================= */
    renderMemories: function () {
      var cats = ["All", "Childhood", "Friendship", "University", "Trips", "Funny Moments", "Special Days", "Random Memories", "Birthday Memories"];
      var chips = $("#screen-memories .mem-chips");
      chips.innerHTML = cats.map(function (c, i) {
        return '<button class="mem-chip' + (i === 0 ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
      }).join("");

      function draw(cat) {
        var items = DATA.ITEMS.filter(function (it) {
          return cat === "All" || it.mcat === cat;
        });
        var grid = $("#screen-memories .mem-grid");
        grid.innerHTML = "";
        items.forEach(function (it) { grid.appendChild(App.buildCard(it)); });
      }
      draw("All");

      $$(".mem-chip", chips).forEach(function (chip) {
        chip.addEventListener("click", function () {
          $$(".mem-chip", chips).forEach(function (c) { c.classList.remove("active"); });
          chip.classList.add("active");
          draw(chip.getAttribute("data-cat"));
        });
      });
    },

    /* ================= VIDEOS ================= */
    renderVideos: function () {
      var grid = $("#screen-videos .vid-grid");
      grid.innerHTML = "";
      DATA.allVideos().forEach(function (it) { grid.appendChild(App.buildCard(it)); });
    },

    /* ================= MY LIST ================= */
    renderList: function () {
      var grid = $("#screen-list .list-grid");
      var empty = $("#screen-list .list-empty");
      var list = Store.getMyList();
      grid.innerHTML = "";
      var items = list.map(DATA.byId).filter(Boolean);
      if (items.length) {
        empty.style.display = "none";
        items.forEach(function (it) {
          var c = App.buildCard(it);
          var rm = document.createElement("button");
          rm.className = "list-remove";
          rm.textContent = "✕ Remove";
          rm.addEventListener("click", function () {
            Store.removeFromList(it.id);
            App.renderList();
          });
          c.appendChild(rm);
          grid.appendChild(c);
        });
      } else {
        empty.style.display = "";
      }
    },

    /* ================= BIRTHDAY SPECIAL ================= */
    renderBirthday: function () {
      var b = CONFIG.birthday;
      var item = DATA.byId(b.playId);
      var finale = DATA.byId("the-final-surprise");
      var wrap = $("#screen-birthday .bday-wrap");

      wrap.innerHTML =
        '<div class="bday-bg" style="background-image:url(' + esc(item.poster) + ')"></div>' +
        '<div class="bday-content">' +
        '  <span class="bday-kicker">★ ' + esc(b.kicker) + ' ★</span>' +
        '  <h1 class="bday-title">' + esc(b.title) + '</h1>' +
        '  <h2 class="bday-heading">' + esc(b.heading) + '</h2>' +
        '  <p class="bday-desc">' + esc(b.description) + '</p>' +
        '  <div class="d-actions">' +
        '    <button class="btn btn-play bday-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> PLAY THE BIRTHDAY MOVIE</button>' +
        '  </div>' +
        '  <div class="bday-extra">' +
        '    <button class="btn btn-ghost" id="bdayFinale">★ Watch the Final Surprise</button>' +
        '  </div>' +
        '</div>' +
        '<div class="row related-row"><h2 class="row-title">Keep Watching</h2><div class="row-track"></div></div>';

      wrap.querySelector(".bday-play").addEventListener("click", function () { App.openPlayer(b.playId); });
      $("#bdayFinale").addEventListener("click", function () { App.openPlayer("the-final-surprise"); });

      var track = wrap.querySelector(".related-row .row-track");
      DATA.ITEMS.filter(function (it) {
        return it.mcat === "Birthday Memories" && it.id !== b.playId;
      }).forEach(function (it) { track.appendChild(App.buildCard(it)); });
    },

    /* ================= PROFILE ================= */
    renderProfile: function () {
      var p = CONFIG.profile;
      $("#screen-profile .profile-avatar").src = p.avatar;
      $("#screen-profile .profile-name").textContent = p.name;
      $("#screen-profile .profile-sub").textContent = p.subtitle;
      var btn = $("#screen-profile .profile-start");
      btn.onclick = function () {
        Store.setProfileEntered(true);
        App.navigate("home");
      };
      var hint = $("#screen-profile .profile-hint");
      hint.innerHTML = "This experience is locked for <b>" + esc(p.name) + "</b> only.";
      var card = $("#profileCard");
      card.onclick = function () {
        Store.setProfileEntered(true);
        App.navigate("home");
      };
    },

    /* ================= FINAL ================= */
    renderFinal: function () {
      var f = CONFIG.final;
      var wrap = $("#screen-final .final-wrap");
      wrap.innerHTML =
        '<div class="final-hearts"></div>' +
        '<div class="final-inner">' +
        '  <span class="final-kicker">THE ENDING OF THIS STORY</span>' +
        '  <h1 class="final-title">' + esc(f.title) + ' <span class="final-heart">❤</span></h1>' +
        '  <div class="final-lines">' +
            f.lines.map(function (l) { return '<p class="final-line">' + esc(l) + '</p>'; }).join("") +
        '  </div>' +
        '  <p class="final-sub">' + esc(f.sub) + ' • ' + esc(f.brand) + '</p>' +
        '  <div class="final-actions">' +
        '    <button class="btn btn-play" id="finalReplay"><svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg> Replay the Story</button>' +
        '    <button class="btn btn-ghost" id="finalStart">Start Again</button>' +
        '  </div>' +
        '</div>';

      $("#finalReplay").addEventListener("click", function () { App.navigate("home"); });
      $("#finalStart").addEventListener("click", function () { App.navigate("profile"); });

      /* line-by-line cinematic reveal */
      var lines = $$(".final-line", wrap);
      lines.forEach(function (l, i) {
        l.style.opacity = "0";
        l.style.transitionDelay = (0.6 + i * 0.9) + "s";
      });
      window.setTimeout(function () {
        lines.forEach(function (l) { l.style.opacity = "1"; });
        App.floatHearts($(".final-hearts"));
      }, 300);
    },

    floatHearts: function (container) {
      var symbols = ["❤", "✨", "🎬", "💛", "⭐"];
      for (var i = 0; i < 26; i++) {
        var s = document.createElement("span");
        s.className = "floating-sym";
        s.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        s.style.left = (Math.random() * 100) + "%";
        s.style.animationDelay = (Math.random() * 8) + "s";
        s.style.fontSize = (12 + Math.random() * 26) + "px";
        container.appendChild(s);
      }
    },

    /* ================= SECRET SURPRISE ================= */
    openSecret: function () {
      var sec = CONFIG.secret;
      var overlay = $("#secretOverlay");
      overlay.innerHTML =
        '<div class="secret-backdrop"></div>' +
        '<div class="secret-card" id="secretCard">' +
        '  <span class="secret-label">★ ' + esc(sec.label) + ' ★</span>' +
        '  <h2 class="secret-hint">' + esc(sec.hint) + '</h2>' +
        '  <button class="btn btn-play secret-open">Tap to Open</button>' +
        '</div>' +
        '<div class="secret-reveal" id="secretReveal">' +
        '  <h2 class="secret-title">' + esc(sec.title) + '</h2>' +
        '  <div class="secret-msg">' + sec.message.map(function (m) { return "<p>" + esc(m) + "</p>"; }).join("") + '</div>' +
        '  <p class="secret-sign">' + esc(sec.signoff) + '</p>' +
        '  <button class="btn btn-play" id="secretToFinal">See the Final Message ❤</button>' +
        '</div>';
      overlay.classList.add("active");
      document.body.classList.add("no-scroll");

      overlay.querySelector(".secret-open").addEventListener("click", function () {
        var card = $("#secretCard");
        var reveal = $("#secretReveal");
        card.classList.add("revealed");
        window.setTimeout(function () {
          card.style.display = "none";
          reveal.classList.add("show");
          App.burstConfetti();
        }, 500);
      });
      $("#secretToFinal").addEventListener("click", function () {
        overlay.classList.remove("active");
        document.body.classList.remove("no-scroll");
        App.navigate("final");
      });
      overlay.querySelector(".secret-backdrop").addEventListener("click", function () {
        overlay.classList.remove("active");
        document.body.classList.remove("no-scroll");
      });
    },

    burstConfetti: function () {
      var c = $("#confetti");
      if (!c) {
        c = document.createElement("canvas");
        c.id = "confetti";
        c.className = "confetti-canvas";
        document.body.appendChild(c);
      }
      c.style.display = "";
      var ctx = c.getContext && c.getContext("2d");
      if (!ctx) return;
      var W = c.width = window.innerWidth;
      var H = c.height = window.innerHeight;
      var parts = [];
      var colors = ["#ff6b9d", "#c445a0", "#6a2cff", "#ffd166", "#06d6a0", "#ffffff"];
      for (var i = 0; i < 160; i++) {
        parts.push({
          x: Math.random() * W, y: -20 - Math.random() * H * 0.3,
          w: 6 + Math.random() * 8, h: 8 + Math.random() * 12,
          vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          c: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() > 0.5
        });
      }
      var frames = 0;
      (function tick() {
        ctx.clearRect(0, 0, W, H);
        parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.r += p.vr;
          if (p.y > H + 30) { p.y = -20; p.x = Math.random() * W; }
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          if (p.rot) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        });
        frames++;
        if (frames < 260) requestAnimationFrame(tick);
        else c.style.display = "none";
      })();
    },

    /* ================= SEARCH ================= */
    buildSearchIndex: function () {
      this.searchIndex = [];
      DATA.ITEMS.forEach(function (it) {
        var text = [it.title, it.category, it.description, it.date, it.year,
          (it.tags || []).join(" "), it.type, it.episodeNumber ? "episode episode " + it.episodeNumber : "",
          it.mcat, it.episodeOf ? "our story series" : ""].join(" ").toLowerCase();
        this.searchIndex.push({ item: it, text: text });
      }, this);
    },

    openSearch: function () {
      var o = $("#searchOverlay");
      o.classList.add("active");
      document.body.classList.add("no-scroll");
      var inp = $("#searchInput");
      inp.value = "";
      this.renderSearchResults("");
      window.setTimeout(function () { inp.focus(); }, 120);
    },
    closeSearch: function () {
      $("#searchOverlay").classList.remove("active");
      document.body.classList.remove("no-scroll");
    },

    wireSearch: function () {
      var inp = $("#searchInput");
      inp.addEventListener("input", function () { App.renderSearchResults(inp.value.trim()); });
      inp.addEventListener("keydown", function (e) { if (e.key === "Escape") App.closeSearch(); });
      $("#searchClose").addEventListener("click", function () { App.closeSearch(); });

      var chips = ["Birthday", "Memories", "Friendship", "Videos", "Photos", "Episodes"];
      chips.forEach(function (c) {
        var b = document.createElement("button");
        b.className = "search-chip";
        b.textContent = c;
        b.addEventListener("click", function () {
          inp.value = c;
          App.renderSearchResults(c);
        });
        $("#searchChips").appendChild(b);
      });
    },

    renderSearchResults: function (q) {
      var grid = $("#searchResults");
      var ql = q.toLowerCase();
      var results = [];
      if (!q) {
        results = DATA.ITEMS.slice(0, 12);
      } else {
        results = this.searchIndex.filter(function (e) {
          return e.text.indexOf(ql) !== -1;
        }).map(function (e) { return e.item; });
      }
      grid.innerHTML = "";
      if (!results.length) {
        grid.innerHTML = '<div class="search-none">No moments found for "' + esc(q) + '". Try another word.</div>';
        return;
      }
      results.forEach(function (it) { grid.appendChild(App.buildCard(it)); });
    },

    /* ================= PLAYER ================= */
    openPlayer: function (id) {
      var item = DATA.byId(id);
      if (!item) return;
      this.playerFrom = location.hash || "#/home";
      Music.duck();
      Player.open(item, { autoplay: true });
      document.title = item.title + " — " + CONFIG.brand;
    },

    related: function (item, limit) {
      var ids = [];
      DATA.ROWS.forEach(function (row) {
        if (row.items.indexOf(item.id) !== -1) {
          row.items.forEach(function (i) { if (ids.indexOf(i) === -1) ids.push(i); });
        }
      });
      /* for episodes also pull in the parent series and siblings */
      if (item.episodeOf) {
        var par = DATA.byId(item.episodeOf);
        if (par) par.episodes.forEach(function (i) { if (ids.indexOf(i) === -1) ids.push(i); });
        if (par && ids.indexOf(par.id) === -1) ids.push(par.id);
      }
      ids = ids.filter(function (i) { return i !== item.id; });
      if (ids.length < 4) {
        DATA.ITEMS.forEach(function (it) { if (it.id !== item.id && ids.indexOf(it.id) === -1) ids.push(it.id); });
      }
      var out = ids.slice(0, limit || 8).map(DATA.byId).filter(Boolean);
      return out;
    },

    /* ================= MUSIC ================= */
    updateMusicIcon: function (unmuted) {
      var b = $("#musicBtn");
      b.classList.toggle("muted", !unmuted);
      b.setAttribute("aria-label", unmuted ? "Mute" : "Unmute");
    },

    wireMusic: function () {
      App.updateMusicIcon(!Store.isMuted());
    },

    /* ================= MOBILE MENU ================= */
    toggleMobileMenu: function () {
      $("#mobileMenu").classList.toggle("open");
    },
    closeMobileMenu: function () {
      $("#mobileMenu").classList.remove("open");
    },

    /* ================= FIRST INTERACTION → MUSIC ================= */
    armMusic: function () {
      var done = false;
      var arm = function () {
        if (done) return;
        done = true;
        Music.start();
        App.updateMusicIcon(!Store.isMuted());
        window.removeEventListener("pointerdown", arm);
        window.removeEventListener("keydown", arm);
      };
      window.addEventListener("pointerdown", arm);
      window.addEventListener("keydown", arm);
    }
  };

  window.BIRDI_APP = App;

  document.addEventListener("DOMContentLoaded", function () {
    App.armMusic();
    App.init();
  });
})();
