/* BIRDI — local storage layer (My List, session flags) */
(function () {
  "use strict";

  var KEY_LIST = "birdi.myList";
  var KEY_PROFILE = "birdi.profileEntered";
  var KEY_MUTED = "birdi.muted";
  var KEY_SPEED = "birdi.speed";

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  var Store = {
    getMyList: function () { return read(KEY_LIST) || []; },
    inList: function (id) { return this.getMyList().indexOf(id) !== -1; },
    toggleList: function (id) {
      var list = this.getMyList();
      var i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      write(KEY_LIST, list);
      return i === -1;
    },
    removeFromList: function (id) {
      var list = this.getMyList();
      var i = list.indexOf(id);
      if (i !== -1) list.splice(i, 1);
      write(KEY_LIST, list);
    },
    profileEntered: function () { return read(KEY_PROFILE) === true; },
    setProfileEntered: function (v) { write(KEY_PROFILE, !!v); },
    isMuted: function () { return read(KEY_MUTED) === true; },
    setMuted: function (v) { write(KEY_MUTED, !!v); },
    getSpeed: function () { return read(KEY_SPEED) || 1; },
    setSpeed: function (v) { write(KEY_SPEED, v); }
  };

  window.BIRDI_STORE = Store;
})();
