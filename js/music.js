/* BIRDI — background music engine
   Uses a real audio file when CONFIG.audio is set,
   otherwise plays a gentle procedurally-synthesised ambient theme
   (so the site is fully alive even with no music file).
   Music starts on first user interaction, respects mute,
   and ducks automatically while a video plays. */
(function () {
  "use strict";

  var CONFIG = window.BIRDI_DATA.CONFIG;
  var Store = window.BIRDI_STORE;

  var ctx = null;
  var master = null;
  var audioEl = null;
  var timerId = null;
  var started = false;
  var synthStarted = false;
  var ducked = false;
  var baseGain = 0.11;

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = Store.isMuted() ? 0 : baseGain;
    master.connect(ctx.destination);
    return ctx;
  }

  /* --- procedural ambient theme ----------------------------------- */
  var chordIdx = 0;
  var chords = [
    [220.00, 261.63, 329.63, 392.00], // Am
    [174.61, 220.00, 261.63, 329.63], // F
    [196.00, 246.94, 293.66, 392.00], // G
    [130.81, 196.00, 261.63, 329.63]  // C
  ];

  function note(freq, start, dur, vol, type, filterFreq) {
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    var lp = ctx.createFilter();
    lp.type = "lowpass";
    lp.frequency.value = filterFreq || 1200;
    osc.type = type || "sine";
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() * 10 - 5);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(lp).connect(g).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.1);
  }

  function scheduleChord(when) {
    var chord = chords[chordIdx % chords.length];
    chordIdx++;
    var dur = 9.5;
    chord.forEach(function (f, i) {
      note(f, when, dur, 0.05 + i * 0.006, "sine");
      note(f * 2, when, dur, 0.012, "sine");
    });
    note(chord[0] / 2, when, dur, 0.05, "sine");
    /* gentle bell melody, sparse */
    var t = when + 2.4;
    var scale = [440, 523.25, 659.25, 783.99, 659.25, 523.25];
    for (var i = 0; i < 3; i++) {
      var f = scale[Math.floor(Math.random() * scale.length)];
      note(f, t + i * 1.7, 2.6, 0.02, "sine", 2600);
    }
  }

  function startSynth() {
    if (synthStarted) return;
    synthStarted = true;
    var when = ctx.currentTime + 0.1;
    scheduleChord(when);
    timerId = setInterval(function () {
      if (!started) return;
      var t = ctx.currentTime + 0.05;
      scheduleChord(t + 0.3);
    }, 9000);
  }

  /* --- public API ------------------------------------------------ */
  var Music = {
    start: function () {
      if (started) return;
      started = true;
      var c = ensureCtx();
      if (!c) return;
      if (c.state === "suspended") c.resume();

      if (CONFIG.audio) {
        if (!audioEl) {
          audioEl = new Audio(CONFIG.audio);
          audioEl.loop = true;
          audioEl.volume = Store.isMuted() ? 0 : baseGain * 1.6;
          audioEl.addEventListener("error", function () {
            audioEl = null;
            if (!synthStarted) startSynth();
          });
        }
        audioEl.play().catch(function () {
          if (audioEl && audioEl.networkState === 3) {
            audioEl = null;
            if (!synthStarted) startSynth();
          }
        });
      } else {
        startSynth();
      }
    },

    toggle: function () {
      var mute = Store.isMuted();
      Store.setMuted(!mute);
      if (ctx && master) master.gain.value = !mute ? baseGain : 0;
      if (audioEl) audioEl.volume = !mute ? baseGain * 1.6 : 0;
      return !mute;
    },

    duck: function () {
      if (ducked) return;
      ducked = true;
      if (ctx && master) master.gain.value = (Store.isMuted() ? 0 : baseGain * 0.15);
      if (audioEl) audioEl.volume = Store.isMuted() ? 0 : baseGain * 0.2;
    },

    restore: function () {
      if (!ducked) return;
      ducked = false;
      if (ctx && master) master.gain.value = Store.isMuted() ? 0 : baseGain;
      if (audioEl) audioEl.volume = Store.isMuted() ? 0 : baseGain * 1.6;
    }
  };

  window.BIRDI_MUSIC = Music;
})();
