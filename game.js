(function () {
  "use strict";

  /* =========================================================
     CHARACTERS
  ========================================================= */
  var CHARACTERS = [
    { name: "Marley", color: "#ff5d5d", dark: "#c73f3f" },
    { name: "Miral",  color: "#4ec9ff", dark: "#2f96c4" },
    { name: "John",   color: "#7ee08a", dark: "#4bab58" },
    { name: "Paul",   color: "#ffd23f", dark: "#cc9f1c" },
    { name: "Marmar", color: "#ff8fd8", dark: "#c95fab" },
    { name: "Miko",   color: "#b98cff", dark: "#8a5ee0" },
    { name: "Mariam", color: "#ffb26b", dark: "#d1813a" },
    { name: "Gloria", color: "#2b3a67", dark: "#1a2547", cute: true }
  ];

  var selectedCharacter = 0;
  var gloriaImg = new Image();
  gloriaImg.src = "gloria-chibi.png";

  /* =========================================================
     SOUND (SFX only — no background music)
  ========================================================= */
  var Sound = {
    ctx: null,
    muted: false,
    init: function () {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume();
        return;
      }
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.ctx = null; }
    },
    tone: function (freq, dur, type, vol, slideTo, delay) {
      if (this.muted || !this.ctx) return;
      var t = this.ctx.currentTime + (delay || 0);
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    jump: function () { this.tone(280, 0.14, "square", 0.14, 640); },
    step: function () { this.tone(170, 0.05, "triangle", 0.05); },
    death: function () { this.tone(220, 0.35, "sawtooth", 0.20, 50); },
    win: function () {
      var s = this;
      [523, 659, 784, 1047].forEach(function (f, i) { s.tone(f, 0.16, "square", 0.12, 0, i * 0.1); });
    },
    star: function () { this.tone(880, 0.09, "square", 0.10); this.tone(1320, 0.12, "square", 0.10, 0, 0.08); },
    warn: function () { this.tone(920, 0.06, "square", 0.09); },
    click: function () { this.tone(620, 0.05, "square", 0.08); },
    spawn: function () { this.tone(150, 0.4, "sawtooth", 0.16, 80); },
    fake: function () { this.tone(180, 0.25, "square", 0.14, 90); },
    land: function () { this.tone(140, 0.08, "triangle", 0.10, 70); },
    fall: function () { this.tone(600, 0.45, "square", 0.08, 120); },
    doorOpen: function () {
      this.tone(180, 0.18, "sawtooth", 0.08, 320);
      this.tone(520, 0.14, "square", 0.10, 780, 0.16);
    },
    gameover: function () {
      // dark, rough, frightening descending growl
      var s = this;
      if (s.muted || !s.ctx) return;
      var t = s.ctx.currentTime;
      var o = s.ctx.createOscillator();
      var g = s.ctx.createGain();
      var lfo = s.ctx.createOscillator();
      var lfoG = s.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(85, t);
      o.frequency.exponentialRampToValueAtTime(32, t + 1.3);
      lfo.type = "square";
      lfo.frequency.setValueAtTime(9, t);
      lfoG.gain.setValueAtTime(22, t);
      lfo.connect(lfoG);
      lfoG.connect(o.frequency);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      o.connect(g);
      g.connect(s.ctx.destination);
      o.start(t); lfo.start(t);
      o.stop(t + 1.45); lfo.stop(t + 1.45);
    },
    devil: function () {
      var s = this;
      s.tone(90, 0.5, "sawtooth", 0.18, 45);
      s.tone(65, 0.6, "square", 0.12, 40, 0.1);
    }
  };

  /* =========================================================
     SAVE SYSTEM (v2: star currency, hints, lives-free progress)
  ========================================================= */
  var SAVE_KEY = "td3_save_v2";
  var save = { stars: {}, done: {}, balance: 0, unlocked: [1, 0, 0], hints: {}, muted: false };
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d.stars) save.stars = d.stars;
        if (d.done) save.done = d.done;
        if (typeof d.balance === "number") save.balance = d.balance;
        if (d.unlocked) save.unlocked = d.unlocked;
        if (d.hints) save.hints = d.hints;
        if (typeof d.muted === "boolean") save.muted = d.muted;
        return;
      }
      // migrate from v1
      var old = localStorage.getItem("td3_save_v1");
      if (old) {
        var o = JSON.parse(old);
        if (o.stars) save.stars = o.stars;
        if (o.unlocked) save.unlocked = o.unlocked;
        save.balance = Math.floor((o.points || 0) / 30);
        persistSave();
      }
    } catch (e) {}
  }
  function persistSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function starKey(z, l) { return z + "-" + l; }
  loadSave();

  /* =========================================================
     DOM
  ========================================================= */
  var mainMenu = document.getElementById("mainMenu");
  var characterSelect = document.getElementById("characterSelect");
  var gameScreen = document.getElementById("gameScreen");
  var playBtn = document.getElementById("playBtn");
  var menuMuteBtn = document.getElementById("menuMuteBtn");
  var menuStarsVal = document.getElementById("menuStarsVal");
  var charGrid = document.getElementById("charGrid");
  var startBtn = document.getElementById("startBtn");
  var canvas = document.getElementById("gameCanvas");
  var ctx = canvas.getContext("2d");
  var hudLevel = document.getElementById("hudLevel");
  var hudLives = document.getElementById("hudLives");
  var hudStars = document.getElementById("hudStars");
  var pauseBtn = document.getElementById("pauseBtn");
  var muteBtn = document.getElementById("muteBtn");
  var readyOverlay = document.getElementById("readyOverlay");
  var readyTitle = document.getElementById("readyTitle");
  var readySub = document.getElementById("readySub");
  var levelCompleteOverlay = document.getElementById("levelCompleteOverlay");
  var lcStars = document.getElementById("lcStars");
  var lcTries = document.getElementById("lcTries");
  var lcPoints = document.getElementById("lcPoints");
  var nextLevelBtn = document.getElementById("nextLevelBtn");
  var lcMapBtn = document.getElementById("lcMapBtn");
  var zoneCompleteOverlay = document.getElementById("zoneCompleteOverlay");
  var paulSplit = document.getElementById("paulSplit");
  var zoneTitle = document.getElementById("zoneTitle");
  var zoneSub = document.getElementById("zoneSub");
  var zoneNextBtn = document.getElementById("zoneNextBtn");
  var pauseOverlay = document.getElementById("pauseOverlay");
  var gameOverOverlay = document.getElementById("gameOverOverlay");
  var gameOverSub = document.getElementById("gameOverSub");
  var gameOverStars = document.getElementById("gameOverStars");
  var retryBtn = document.getElementById("retryBtn");
  var gameOverMapBtn = document.getElementById("gameOverMapBtn");
  var resumeBtn = document.getElementById("resumeBtn");
  var restartBtn = document.getElementById("restartBtn");
  var pauseMapBtn = document.getElementById("pauseMapBtn");
  var hintBtn = document.getElementById("hintBtn");
  var hintText = document.getElementById("hintText");
  var btnLeft = document.getElementById("btnLeft");
  var btnRight = document.getElementById("btnRight");
  var btnJump = document.getElementById("btnJump");

  /* =========================================================
     SCREEN NAVIGATION
  ========================================================= */
  function highestUnlockedLevel() {
    var u = save.unlocked[0] || 1;
    return Math.max(0, Math.min(9, u - 1));
  }

  function showScreen(el) {
    [mainMenu, characterSelect, gameScreen].forEach(function (s) { s.classList.add("hidden"); });
    el.classList.remove("hidden");
    if (el === mainMenu) menuStarsVal.textContent = save.balance;
  }

  // apply saved sound preference
  Sound.muted = !!save.muted;

  function refreshMuteBtns() {
    muteBtn.textContent = Sound.muted ? "🔇" : "🔊";
    menuMuteBtn.textContent = Sound.muted ? "🔇 SOUND OFF" : "🔊 SOUND ON";
  }
  refreshMuteBtns();

  playBtn.addEventListener("click", function () {
    Sound.init();
    Sound.click();
    showScreen(characterSelect);
  });

  menuMuteBtn.addEventListener("click", function () {
    Sound.init();
    Sound.muted = !Sound.muted;
    save.muted = Sound.muted;
    persistSave();
    refreshMuteBtns();
    if (!Sound.muted) Sound.click();
  });

  var cards = Array.prototype.slice.call(charGrid.querySelectorAll(".char-card"));
  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      Sound.init();
      Sound.click();
      cards.forEach(function (c) { c.classList.remove("selected"); });
      card.classList.add("selected");
      selectedCharacter = parseInt(card.getAttribute("data-char"), 10);
      startBtn.disabled = false;
      startBtn.textContent = "START GAME";
    });
  });

  startBtn.addEventListener("click", function () {
    Sound.init();
    Sound.click();
    startLevel(0, highestUnlockedLevel());
  });

  lcMapBtn.addEventListener("click", function () {
    Sound.click();
    levelCompleteOverlay.classList.add("hidden");
    showScreen(mainMenu);
  });

  pauseMapBtn.addEventListener("click", function () {
    Sound.click();
    paused = false;
    pauseOverlay.classList.add("hidden");
    showScreen(mainMenu);
  });

  muteBtn.addEventListener("click", function () {
    Sound.init();
    Sound.muted = !Sound.muted;
    save.muted = Sound.muted;
    persistSave();
    refreshMuteBtns();
    if (!Sound.muted) Sound.click();
  });

  var HINT_BASE = 5;
  function hintCost() {
    var bought = save.hints[starKey(curZone, curLevel)] || 0;
    return Math.min(HINT_BASE * (bought + 1), 15);
  }
  function refreshHintBtn() {
    hintBtn.textContent = "💡 HINT (" + hintCost() + " ⭐)";
  }

  /* =========================================================
     WORLD MAP
  ========================================================= */
  var ZONE_META = [
    { name: "Devil's Gauntlet", emoji: "🔥" }
  ];


  /* =========================================================
     TOUCH DETECTION
  ========================================================= */
  function isTouchDevice() {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  }
  if (isTouchDevice()) {
    document.body.classList.add("touch-mode");
  }
  var YOFF = isTouchDevice() ? 90 : 0;

  /* =========================================================
     CANVAS / RESIZE
  ========================================================= */
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var DESIGN_HEIGHT = 600;
  var SCALE = 1;

  function resizeCanvas() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    SCALE = (canvas.height / DESIGN_HEIGHT);
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", function () { setTimeout(resizeCanvas, 200); });
  resizeCanvas();

  /* =========================================================
     INPUT
  ========================================================= */
  var input = { left: false, right: false, jump: false, jumpPressed: false };

  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
    if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
      if (!input.jump) input.jumpPressed = true;
      input.jump = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
    if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") input.jump = false;
  });

  function bindTouchBtn(el, onDown, onUp) {
    el.addEventListener("touchstart", function (e) { e.preventDefault(); Sound.init(); onDown(); }, { passive: false });
    el.addEventListener("touchend", function (e) { e.preventDefault(); onUp(); }, { passive: false });
    el.addEventListener("touchcancel", function (e) { e.preventDefault(); onUp(); }, { passive: false });
    el.addEventListener("mousedown", function (e) { e.preventDefault(); onDown(); });
    el.addEventListener("mouseup", function (e) { e.preventDefault(); onUp(); });
    el.addEventListener("mouseleave", function () { onUp(); });
  }
  bindTouchBtn(btnLeft, function () { input.left = true; }, function () { input.left = false; });
  bindTouchBtn(btnRight, function () { input.right = true; }, function () { input.right = false; });
  bindTouchBtn(btnJump, function () {
    if (!input.jump) input.jumpPressed = true;
    input.jump = true;
  }, function () { input.jump = false; });

  pauseBtn.addEventListener("click", function () {
    if (!levelActive) return;
    Sound.click();
    paused = !paused;
    pauseOverlay.classList.toggle("hidden", !paused);
    if (!paused) {
      hintText.classList.add("hidden");
    } else {
      hintBoughtThisOpen = false;
      hintText.classList.add("hidden");
      refreshHintBtn();
    }
  });
  resumeBtn.addEventListener("click", function () {
    Sound.click();
    paused = false;
    pauseOverlay.classList.add("hidden");
    hintText.classList.add("hidden");
  });
  restartBtn.addEventListener("click", function () {
    Sound.click();
    paused = false;
    pauseOverlay.classList.add("hidden");
    hintText.classList.add("hidden");
    startLevel(curZone, curLevel);
  });
  nextLevelBtn.addEventListener("click", function () {
    Sound.click();
    levelCompleteOverlay.classList.add("hidden");
    advanceLevel();
  });
  hintBtn.addEventListener("click", function () {
    if (hintBoughtThisOpen) return; // prevent duplicate charges
    var cost = hintCost();
    if (save.balance >= cost) {
      save.balance -= cost;
      var k = starKey(curZone, curLevel);
      save.hints[k] = (save.hints[k] || 0) + 1;
      persistSave();
      hintBoughtThisOpen = true;
      hintText.textContent = "💡 " + level.hint;
      hintText.classList.remove("hidden");
      hintBtn.textContent = "💡 HINT SHOWN";
      Sound.star();
    } else {
      hintText.textContent = "Not enough stars! You need " + cost + " ⭐ (you have " + save.balance + ").";
      hintText.classList.remove("hidden");
      Sound.click();
    }
  });
  zoneNextBtn.addEventListener("click", function () {
    Sound.click();
    zoneCompleteOverlay.classList.add("hidden");
    paulSplit.classList.remove("play");
    showScreen(mainMenu);
  });

  /* =========================================================
     LEVELS — 10-level gauntlet (1 easy + 9 brutal)
     GY = 520. P(x,y,w,h) helper.
  ========================================================= */
  var GY = 520;
  var DEATH_Y = 640;

  function P(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }
  function S(x, y) { return { x: x, y: y, got: false }; }

  var ZONES = [
    /* ================= ZONE 1 : Green Hills ================= */
    {
      bg: "#14231a",
      levels: [
        { name: "First Steps", width: 2200, hint: "Just run and jump to the door!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 700, 80), P(820, GY, 400, 80), P(1340, GY, 860, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(1000, 410), S(1550, 410), S(1900, 410)],
          door: P(2060, GY - 90, 60, 90) },
        { name: "Watch the Gaps", width: 2400, hint: "Keep your speed — jump each gap without stopping!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(520, GY, 220, 80), P(860, GY, 220, 80), P(1200, GY, 220, 80), P(1540, GY, 860, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(630, 410), S(1310, 410), S(1900, 410)],
          door: P(2260, GY - 90, 60, 90) },
        { name: "Spiky Surprise", width: 2600, hint: "Spikes pop up when you get close — step near, back off, then sprint past!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 300, 80), P(1140, GY, 300, 80), P(1560, GY, 1040, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 850, y: GY, w: 36, h: 32, orient: "up", triggerDist: 120 }, { x: 1250, y: GY, w: 36, h: 32, orient: "up", triggerDist: 120 }],
          fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(500, 410), S(1350, 410), S(2000, 410)],
          door: P(2460, GY - 90, 60, 90) },
        { name: "Shaky Ground", width: 2600, hint: "Cracked orange platforms collapse — keep moving!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(620, GY, 260, 80), P(1000, GY, 260, 80), P(1380, GY, 260, 80), P(1760, GY, 840, 80)],
          moving: [],
          crumble: [{ x: 750, y: GY, w: 110, h: 24 }, { x: 1510, y: GY, w: 110, h: 24 }],
          fake: [],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(800, 410), S(1560, 410), S(2100, 410)],
          door: P(2460, GY - 90, 60, 90) },
        { name: "Liar Floor", width: 2600, hint: "Some floors look solid but vanish — hop lightly to test them!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 300, 80), P(1140, GY, 300, 80), P(1560, GY, 1040, 80)],
          moving: [], crumble: [],
          fake: [{ x: 860, y: GY, w: 120, h: 24 }, { x: 1280, y: GY, w: 120, h: 24 }],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(500, 410), S(1450, 410), S(2000, 410)],
          door: P(2460, GY - 90, 60, 90) },
        { name: "Moving Day", width: 2800, hint: "Ride the moving platforms — time your jumps!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(900, GY, 300, 80), P(1600, GY, 1200, 80)],
          moving: [{ x: 620, y: GY - 90, w: 110, h: 20, axis: "x", range: 130, speed: 1.2, phase: 0 }, { x: 1300, y: GY - 90, w: 110, h: 20, axis: "y", range: 80, speed: 1.3, phase: 0 }],
          crumble: [], fake: [],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(675, 330), S(1355, 330), S(2200, 410)],
          door: P(2660, GY - 90, 60, 90) },
        { name: "From Above", width: 2800, hint: "Spikes drop from the ceiling — run under them fast!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 400, 80), P(1240, GY, 400, 80), P(1760, GY, 1040, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [],
          fallingSpikes: [{ x: 850, y: 30, w: 34, h: 34, triggerDist: 150 }, { x: 1400, y: 30, w: 34, h: 34, triggerDist: 150 }, { x: 1950, y: 30, w: 34, h: 34, triggerDist: 150 }],
          saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(900, 410), S(1450, 410), S(2300, 410)],
          door: P(2660, GY - 90, 60, 90) },
        { name: "Don't Look Back", width: 3000, hint: "A devil is chasing you — never stop running!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 300, 80), P(1140, GY, 300, 80), P(1560, GY, 300, 80), P(1980, GY, 1020, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [], saws: [],
          chasers: [{ triggerX: 700, x: 300, y: 350, speed: 240 }],
          walls: [], fakeDoor: null,
          stars: [S(1000, 410), S(1700, 410), S(2500, 410)],
          door: P(2860, GY - 90, 60, 90) },
        { name: "Spin Cycle", width: 3000, hint: "Jump between the spinning saws — watch their rhythm!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(620, GY, 300, 80), P(1040, GY, 300, 80), P(1460, GY, 1540, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [],
          saws: [{ x: 560, y: 445, r: 20, axis: "x", range: 50, speed: 1.6, phase: 0 }, { x: 980, y: 445, r: 20, axis: "x", range: 50, speed: 1.8, phase: 1 }],
          chasers: [], walls: [], fakeDoor: null,
          stars: [S(770, 410), S(1300, 410), S(2200, 410)],
          door: P(2860, GY - 90, 60, 90) },
        { name: "Green Gauntlet", width: 3400, hint: "Everything at once — stay calm and keep moving!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 450, 80), P(570, GY, 220, 80), P(910, GY, 220, 80), P(1250, GY, 220, 80), P(1610, GY, 220, 80), P(1950, GY, 1450, 80)],
          moving: [],
          crumble: [{ x: 680, y: GY, w: 100, h: 24 }],
          fake: [{ x: 1360, y: GY, w: 100, h: 24 }],
          spikes: [{ x: 1000, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }, { x: 1700, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }],
          fallingSpikes: [{ x: 2100, y: 30, w: 34, h: 34, triggerDist: 150 }],
          saws: [],
          chasers: [{ triggerX: 2000, x: 1650, y: 350, speed: 245 }],
          walls: [], fakeDoor: null,
          stars: [S(730, 410), S(1830, 410), S(2700, 410)],
          door: P(3260, GY - 90, 60, 90) }
      ]
    },

    /* ================= ZONE 2 : Devil's Factory ================= */
    {
      bg: "#241214",
      levels: [
        { name: "Assembly Line", width: 3000, hint: "Chain the moving platforms together!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(800, GY, 250, 80), P(1450, GY, 250, 80), P(2100, GY, 900, 80)],
          moving: [{ x: 520, y: GY - 90, w: 110, h: 20, axis: "x", range: 120, speed: 1.3, phase: 0 }, { x: 1150, y: GY - 90, w: 110, h: 20, axis: "x", range: 130, speed: 1.4, phase: 1 }, { x: 1800, y: GY - 90, w: 110, h: 20, axis: "y", range: 80, speed: 1.5, phase: 0.5 }],
          crumble: [], fake: [],
          spikes: [{ x: 900, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }],
          fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(575, 330), S(1215, 330), S(2500, 410)],
          door: P(2860, GY - 90, 60, 90) },
        { name: "Grinder", width: 3200, hint: "The saws are faster now — jump right after one passes!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(620, GY, 260, 80), P(1000, GY, 260, 80), P(1380, GY, 260, 80), P(1760, GY, 1440, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [],
          saws: [{ x: 560, y: 445, r: 20, axis: "x", range: 55, speed: 1.8, phase: 0 }, { x: 940, y: 445, r: 20, axis: "x", range: 55, speed: 2.0, phase: 1 }, { x: 1320, y: 445, r: 20, axis: "x", range: 55, speed: 2.2, phase: 0.5 }],
          chasers: [], walls: [], fakeDoor: null,
          stars: [S(750, 410), S(1250, 410), S(2400, 410)],
          door: P(3060, GY - 90, 60, 90) },
        { name: "Chase Sequence", width: 3400, hint: "The devil is faster — take the risky jumps!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(620, GY, 240, 80), P(980, GY, 240, 80), P(1340, GY, 240, 80), P(1700, GY, 240, 80), P(2060, GY, 1340, 80)],
          moving: [],
          crumble: [{ x: 1100, y: GY, w: 100, h: 24 }, { x: 1820, y: GY, w: 100, h: 24 }],
          fake: [],
          spikes: [], fallingSpikes: [], saws: [],
          chasers: [{ triggerX: 400, x: 100, y: 350, speed: 252 }],
          walls: [], fakeDoor: null,
          stars: [S(800, 410), S(1550, 410), S(2700, 410)],
          door: P(3260, GY - 90, 60, 90) },
        { name: "Fake Out", width: 3200, hint: "That first door is FAKE — it kills! Run past it!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 700, 80), P(820, GY, 300, 80), P(1240, GY, 300, 80), P(1660, GY, 300, 80), P(2300, GY, 900, 80)],
          moving: [], crumble: [],
          fake: [{ x: 970, y: GY, w: 110, h: 24 }],
          spikes: [{ x: 1350, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }],
          fallingSpikes: [], saws: [], chasers: [], walls: [],
          fakeDoor: P(2150, GY - 90, 60, 90),
          stars: [S(500, 410), S(1400, 410), S(2700, 410)],
          door: P(3060, GY - 90, 60, 90) },
        { name: "Double Trouble", width: 3400, hint: "Spikes above AND below — watch both!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 450, 80), P(570, GY, 220, 80), P(910, GY, 220, 80), P(1250, GY, 220, 80), P(1590, GY, 220, 80), P(1930, GY, 1470, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 1000, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }, { x: 1680, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }],
          fallingSpikes: [{ x: 1350, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2050, y: 30, w: 34, h: 34, triggerDist: 140 }],
          saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(680, 410), S(1760, 410), S(2600, 410)],
          door: P(3260, GY - 90, 60, 90) },
        { name: "Saw Maze", width: 3400, hint: "Vertical saws guard the path — slip through the gaps!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 480, 80), P(600, GY, 240, 80), P(960, GY, 240, 80), P(1320, GY, 240, 80), P(1680, GY, 240, 80), P(2040, GY, 1360, 80)],
          moving: [{ x: 1080, y: GY - 90, w: 100, h: 20, axis: "y", range: 80, speed: 1.4, phase: 0 }],
          crumble: [], fake: [],
          spikes: [], fallingSpikes: [],
          saws: [{ x: 720, y: 380, r: 20, axis: "y", range: 90, speed: 2.0, phase: 0 }, { x: 1440, y: 380, r: 20, axis: "y", range: 90, speed: 2.2, phase: 1 }, { x: 1800, y: 380, r: 20, axis: "y", range: 90, speed: 2.4, phase: 0.5 }],
          chasers: [], walls: [], fakeDoor: null,
          stars: [S(1080, 330), S(1560, 410), S(2700, 410)],
          door: P(3260, GY - 90, 60, 90) },
        { name: "Collapse", width: 3400, hint: "Half the floor is lying — memorize the safe path!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(520, GY, 200, 80), P(840, GY, 200, 80), P(1160, GY, 200, 80), P(1480, GY, 200, 80), P(1800, GY, 1600, 80)],
          moving: [],
          crumble: [{ x: 620, y: GY, w: 100, h: 24 }, { x: 1260, y: GY, w: 100, h: 24 }],
          fake: [{ x: 940, y: GY, w: 100, h: 24 }, { x: 1580, y: GY, w: 100, h: 24 }],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(670, 410), S(1420, 410), S(2600, 410)],
          door: P(3260, GY - 90, 60, 90) },
        { name: "The Wall", width: 3600, hint: "The walls crush — pass when they lift!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 400, 80), P(1240, GY, 400, 80), P(1760, GY, 1840, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 850, y: GY, w: 36, h: 32, orient: "up", triggerDist: 110 }],
          fallingSpikes: [], saws: [], chasers: [],
          walls: [{ x: 1000, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.2, phase: 0 }, { x: 1500, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.4, phase: 0.8 }],
          fakeDoor: null,
          stars: [S(1100, 410), S(2000, 410), S(2900, 410)],
          door: P(3460, GY - 90, 60, 90) },
        { name: "Relentless", width: 4000, hint: "Full sprint the whole way — don't look back!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 500, 80), P(620, GY, 220, 80), P(960, GY, 220, 80), P(1300, GY, 220, 80), P(1640, GY, 220, 80), P(1980, GY, 220, 80), P(2320, GY, 220, 80), P(2660, GY, 1340, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [],
          saws: [{ x: 900, y: 445, r: 18, axis: "x", range: 50, speed: 2.2, phase: 0 }],
          chasers: [{ triggerX: 250, x: -80, y: 350, speed: 264 }],
          walls: [], fakeDoor: null,
          stars: [S(1200, 410), S(2200, 410), S(3300, 410)],
          door: P(3860, GY - 90, 60, 90) },
        { name: "Factory Boss", width: 4200, hint: "The final test of the factory — use everything!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(520, GY, 180, 80), P(820, GY, 180, 80), P(1120, GY, 180, 80), P(1420, GY, 180, 80), P(1720, GY, 200, 80), P(2040, GY, 200, 80), P(2360, GY, 1840, 80)],
          moving: [],
          crumble: [], fake: [],
          spikes: [{ x: 900, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 1800, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [{ x: 1300, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2200, y: 30, w: 34, h: 34, triggerDist: 140 }],
          saws: [{ x: 760, y: 445, r: 18, axis: "x", range: 50, speed: 2.4, phase: 0 }, { x: 1600, y: 380, r: 20, axis: "y", range: 90, speed: 2.2, phase: 1 }],
          chasers: [{ triggerX: 1500, x: 1150, y: 350, speed: 252 }],
          walls: [{ x: 2500, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.3, phase: 0.4 }],
          fakeDoor: null,
          stars: [S(1000, 410), S(2150, 410), S(3300, 410)],
          door: P(4060, GY - 90, 60, 90) }
      ]
    },

    /* ================= ZONE 3 : Hell's Gate ================= */
    {
      bg: "#160b0b",
      levels: [
        { name: "Welcome to Hell", width: 3200, hint: "Tighter jumps, faster spikes — welcome to hell!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 350, 80), P(470, GY, 180, 80), P(770, GY, 180, 80), P(1070, GY, 180, 80), P(1370, GY, 1830, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 850, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 1150, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(560, 410), S(1230, 410), S(2200, 410)],
          door: P(3060, GY - 90, 60, 90) },
        { name: "Hot Floor", width: 3400, hint: "Every other tile is a trap — plan two jumps ahead!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(520, GY, 160, 80), P(800, GY, 160, 80), P(1080, GY, 160, 80), P(1360, GY, 160, 80), P(1640, GY, 1760, 80)],
          moving: [],
          crumble: [{ x: 880, y: GY, w: 90, h: 24 }, { x: 1440, y: GY, w: 90, h: 24 }],
          fake: [{ x: 600, y: GY, w: 90, h: 24 }, { x: 1160, y: GY, w: 90, h: 24 }],
          spikes: [], fallingSpikes: [], saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(700, 410), S(1520, 410), S(2500, 410)],
          door: P(3260, GY - 90, 60, 90) },
        { name: "Saw Storm", width: 3600, hint: "Blazing fast saws — jump the instant one passes!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 450, 80), P(570, GY, 220, 80), P(910, GY, 220, 80), P(1250, GY, 220, 80), P(1590, GY, 2010, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [],
          saws: [{ x: 510, y: 445, r: 18, axis: "x", range: 50, speed: 2.6, phase: 0 }, { x: 850, y: 445, r: 18, axis: "x", range: 50, speed: 2.8, phase: 1 }, { x: 1190, y: 445, r: 18, axis: "x", range: 50, speed: 3.0, phase: 0.5 }],
          chasers: [], walls: [], fakeDoor: null,
          stars: [S(680, 410), S(1420, 410), S(2600, 410)],
          door: P(3460, GY - 90, 60, 90) },
        { name: "Devil's Due", width: 3800, hint: "Two devils now — the second one is faster!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 450, 80), P(570, GY, 200, 80), P(890, GY, 200, 80), P(1210, GY, 200, 80), P(1530, GY, 2270, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [], fallingSpikes: [], saws: [],
          chasers: [{ triggerX: 300, x: -50, y: 350, speed: 258 }, { triggerX: 1800, x: 1450, y: 350, speed: 262 }],
          walls: [], fakeDoor: null,
          stars: [S(700, 410), S(1650, 410), S(2800, 410)],
          door: P(3660, GY - 90, 60, 90) },
        { name: "False Hope", width: 3800, hint: "The obvious door is death — the real one is further!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 600, 80), P(720, GY, 250, 80), P(1090, GY, 250, 80), P(1460, GY, 250, 80), P(2200, GY, 1600, 80)],
          moving: [{ x: 1830, y: GY - 90, w: 100, h: 20, axis: "x", range: 120, speed: 1.5, phase: 0 }],
          crumble: [], fake: [],
          spikes: [{ x: 1200, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [], saws: [], chasers: [], walls: [],
          fakeDoor: P(1950, GY - 90, 60, 90),
          stars: [S(500, 410), S(1580, 410), S(3000, 410)],
          door: P(3660, GY - 90, 60, 90) },
        { name: "Free Fall", width: 3800, hint: "Only moving platforms — don't fall!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 400, 80), P(520, GY, 180, 80), P(1500, GY, 180, 80), P(2500, GY, 1300, 80)],
          moving: [{ x: 820, y: GY - 90, w: 100, h: 20, axis: "x", range: 140, speed: 1.4, phase: 0 }, { x: 1150, y: GY - 90, w: 100, h: 20, axis: "y", range: 90, speed: 1.5, phase: 1 }, { x: 1900, y: GY - 90, w: 100, h: 20, axis: "x", range: 140, speed: 1.6, phase: 0.5 }, { x: 2200, y: GY - 90, w: 100, h: 20, axis: "y", range: 90, speed: 1.7, phase: 1.5 }],
          crumble: [], fake: [],
          spikes: [],
          fallingSpikes: [{ x: 1000, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2050, y: 30, w: 34, h: 34, triggerDist: 140 }],
          saws: [], chasers: [], walls: [], fakeDoor: null,
          stars: [S(890, 330), S(1970, 330), S(3100, 410)],
          door: P(3660, GY - 90, 60, 90) },
        { name: "No Mercy", width: 4000, hint: "Tiny platforms, zero forgiveness!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 300, 80), P(420, GY, 150, 80), P(690, GY, 150, 80), P(960, GY, 150, 80), P(1230, GY, 150, 80), P(1500, GY, 150, 80), P(1770, GY, 150, 80), P(2040, GY, 1960, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 1020, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 1830, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [],
          saws: [{ x: 360, y: 445, r: 18, axis: "x", range: 45, speed: 2.8, phase: 0 }, { x: 1170, y: 445, r: 18, axis: "x", range: 45, speed: 3.0, phase: 1 }],
          chasers: [], walls: [], fakeDoor: null,
          stars: [S(800, 410), S(1900, 410), S(3000, 410)],
          door: P(3860, GY - 90, 60, 90) },
        { name: "Nightmare Fuel", width: 4200, hint: "Chaser + saws + falling spikes — pure chaos!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 350, 80), P(470, GY, 160, 80), P(750, GY, 160, 80), P(1030, GY, 160, 80), P(1310, GY, 160, 80), P(1590, GY, 180, 80), P(1890, GY, 180, 80), P(2190, GY, 2010, 80)],
          moving: [], crumble: [],
          fake: [{ x: 1750, y: GY, w: 90, h: 24 }],
          spikes: [],
          fallingSpikes: [{ x: 1150, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2000, y: 30, w: 34, h: 34, triggerDist: 140 }],
          saws: [{ x: 690, y: 445, r: 18, axis: "x", range: 45, speed: 2.8, phase: 0 }, { x: 1470, y: 380, r: 20, axis: "y", range: 90, speed: 2.6, phase: 1 }],
          chasers: [{ triggerX: 500, x: 150, y: 350, speed: 260 }],
          walls: [], fakeDoor: null,
          stars: [S(900, 410), S(2050, 410), S(3200, 410)],
          door: P(4060, GY - 90, 60, 90) },
        { name: "Last Breath", width: 4400, hint: "Almost there — the walls are the real boss!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 320, 80), P(440, GY, 150, 80), P(710, GY, 150, 80), P(980, GY, 150, 80), P(1250, GY, 150, 80), P(1520, GY, 150, 80), P(1790, GY, 150, 80), P(2060, GY, 150, 80), P(2330, GY, 2070, 80)],
          moving: [], crumble: [], fake: [],
          spikes: [{ x: 1400, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 2150, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [],
          saws: [],
          chasers: [{ triggerX: 1200, x: 850, y: 350, speed: 262 }],
          walls: [{ x: 1100, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.5, phase: 0 }, { x: 1900, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.6, phase: 0.7 }],
          fakeDoor: null,
          stars: [S(1250, 410), S(2400, 410), S(3400, 410)],
          door: P(4260, GY - 90, 60, 90) },
        { name: "The Devil Himself", width: 4800, hint: "EVERYTHING. Good luck — you'll need it!",
          spawn: { x: 60, y: GY - 60 },
          platforms: [P(0, GY, 320, 80), P(440, GY, 150, 80), P(710, GY, 150, 80), P(980, GY, 150, 80), P(1250, GY, 150, 80), P(1520, GY, 180, 80), P(1820, GY, 150, 80), P(2090, GY, 150, 80), P(2360, GY, 180, 80), P(2660, GY, 150, 80), P(2930, GY, 1870, 80)],
          moving: [],
          crumble: [],
          fake: [{ x: 2930, y: GY, w: 90, h: 24 }],
          spikes: [{ x: 1050, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 1900, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }, { x: 2730, y: GY, w: 34, h: 30, orient: "up", triggerDist: 100 }],
          fallingSpikes: [{ x: 1350, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2200, y: 30, w: 34, h: 34, triggerDist: 140 }, { x: 2800, y: 30, w: 34, h: 34, triggerDist: 140 }],
          saws: [{ x: 650, y: 445, r: 18, axis: "x", range: 45, speed: 3.0, phase: 0 }, { x: 1680, y: 380, r: 20, axis: "y", range: 90, speed: 2.8, phase: 1 }, { x: 2520, y: 445, r: 18, axis: "x", range: 45, speed: 3.0, phase: 0.5 }],
          chasers: [{ triggerX: 300, x: -50, y: 350, speed: 260 }, { triggerX: 2000, x: 1650, y: 350, speed: 272 }],
          walls: [{ x: 2450, y: GY - 220, w: 26, h: 220, range: 190, speed: 1.5, phase: 0.3 }],
          fakeDoor: P(4400, GY - 90, 60, 90),
          stars: [S(1200, 410), S(2600, 410), S(3900, 410)],
          door: P(4660, GY - 90, 60, 90) }
      ]
    }
  ];
  /* v6: no map — single 10-level gauntlet. Level 1 easy, rest brutal. */
  (function () {
    var easyFirst = ZONES[0].levels[0];
    var brutal = ZONES[2].levels.slice(1, 10);
    ZONES = [{ bg: "#160b0b", levels: [easyFirst].concat(brutal) }];
  })();

  /* =========================================================
     PHYSICS CONSTANTS
  ========================================================= */
  var GRAVITY = 2400;
  var JUMP_VELOCITY = -840;
  var MOVE_SPEED = 300;
  var FRICTION_GROUND = 2400;
  var PLAYER_W = 30;
  var PLAYER_H = 46;

  /* =========================================================
     GAME STATE
  ========================================================= */
  var curZone = 0, curLevel = 0;
  var level = null;
  var player = null;
  var camera = { x: 0, y: 0 };
  var lives = 5;
  var MAX_LIVES = 5;
  var starsGot = 0;
  var levelActive = false;
  var paused = false;
  var lastTime = 0;
  var stepTimer = 0;
  var hintBoughtThisOpen = false;
  var fallWhistled = false;

  function updateLivesHUD() {
    var h = "";
    for (var i = 0; i < MAX_LIVES; i++) h += i < lives ? "❤" : "🖤";
    hudLives.textContent = h;
  }

  function startLevel(z, l) {
    curZone = z; curLevel = l;
    level = cloneLevel(ZONES[z].levels[l]);
    lives = MAX_LIVES;
    updateLivesHUD();
    starsGot = 0;
    stepTimer = 0;
    hintBoughtThisOpen = false;
    hudLevel.textContent = "LV " + (l + 1) + " · " + level.name;
    hudStars.textContent = "★ 0/3";
    refreshHintBtn();
    resetPlayer();
    camera.x = 0;
    camera.y = 0;
    levelActive = true;
    paused = false;
    levelCompleteOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    hintText.classList.add("hidden");
    showScreen(gameScreen);
    resizeCanvas();
    showReady("LEVEL " + (l + 1) + " · " + level.name);
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function cloneLevel(raw) {
    return JSON.parse(JSON.stringify(raw));
  }

  function resetPlayer() {
    player = {
      x: level.spawn.x, y: level.spawn.y, w: PLAYER_W, h: PLAYER_H,
      vx: 0, vy: 0, grounded: false, facing: 1, standingOn: null, alive: true
    };
    level.moving.forEach(function (m) { m.baseX = m.x; m.baseY = m.y; m.t = m.phase || 0; });
    level.walls.forEach(function (w) { w.baseY = w.y; w.t = w.phase || 0; });
    level.crumble.forEach(function (c) { c.state = "idle"; c.timer = 0; c.gone = false; });
    level.fake.forEach(function (f) { f.state = "idle"; f.timer = 0; f.gone = false; });
    level.spikes.forEach(function (s) { s.state = "idle"; s.timer = 0; });
    level.fallingSpikes.forEach(function (f) { f.state = "idle"; f.timer = 0; f.curY = f.y; f.vy = 0; });
    level.saws.forEach(function (s) { s.baseX = s.x; s.baseY = s.y; s.t = s.phase || 0; s.angle = 0; });
    level.chasers.forEach(function (c) { c.active = false; c.cx = c.x; c.cy = c.y; c.wob = Math.random() * 6.28; });
    level.stars.forEach(function (s) { s.got = false; });
    fallWhistled = false;
  }

  var READY_SUBS = [
    "Watch your step...", "Trust nothing.", "The floor lies.",
    "Don't look back...", "It sees you.", "Run.",
    "No mercy.", "Faster. FASTER.", "Stay sharp.", "One way out."
  ];

  function showReady(name) {
    readyTitle.textContent = name;
    readySub.textContent = READY_SUBS[Math.floor(Math.random() * READY_SUBS.length)];
    readyOverlay.classList.remove("hidden");
    setTimeout(function () { readyOverlay.classList.add("hidden"); }, 1100);
  }

  function die(silent) {
    if (!player.alive) return;
    player.alive = false;
    if (!silent) Sound.death();
    lives--;
    updateLivesHUD();
    if (lives <= 0) {
      setTimeout(gameOver, 400);
    } else {
      setTimeout(function () { resetPlayer(); }, 350);
    }
  }

  function gameOver() {
    levelActive = false;
    Sound.gameover();
    gameOverSub.textContent = "You reached " + (curZone + 1) + "-" + (curLevel + 1) + " · " + level.name;
    gameOverStars.textContent = save.balance;
    gameOverOverlay.classList.remove("hidden");
  }

  retryBtn.addEventListener("click", function () {
    Sound.click();
    startLevel(curZone, curLevel);
  });

  gameOverMapBtn.addEventListener("click", function () {
    Sound.click();
    gameOverOverlay.classList.add("hidden");
    showScreen(mainMenu);
  });

  function completeLevel() {
    levelActive = false;
    Sound.doorOpen();
    setTimeout(function () { Sound.win(); }, 200);
    var key = starKey(curZone, curLevel);
    var prevBest = save.stars[key] || 0;
    save.stars[key] = Math.max(prevBest, starsGot);
    var firstTime = !save.done[key];
    var gained = 0;
    if (firstTime) {
      save.done[key] = true;
      gained = 5;
      save.balance += gained;
    }
    if (curLevel + 1 < 10) {
      save.unlocked[curZone] = Math.max(save.unlocked[curZone], curLevel + 2);
    }
    persistSave();
    var sh = "";
    for (var i = 0; i < 3; i++) sh += i < starsGot ? "★" : '<span class="dim">★</span>';
    lcStars.innerHTML = sh;
    lcTries.textContent = "Level " + (curZone + 1) + "-" + (curLevel + 1) + " cleared!";
    lcPoints.textContent = firstTime ? "+" + gained + " ⭐  (balance: " + save.balance + ")" : "Already completed — no extra stars. Balance: " + save.balance + " ⭐";
    levelCompleteOverlay.classList.remove("hidden");
  }

  function advanceLevel() {
    if (curLevel + 1 < 10) {
      startLevel(curZone, curLevel + 1);
    } else {
      // Zone complete → Paul devil animation
      if (curZone + 1 < 3) {
        save.unlocked[curZone + 1] = Math.max(save.unlocked[curZone + 1], 1);
        persistSave();
      }
      zoneTitle.textContent = "ALL 10 LEVELS CLEARED!";
      zoneSub.textContent = "You survived the Devil's Gauntlet. LEGEND. 😈";
      paulSplit.classList.remove("play");
      void paulSplit.offsetWidth;
      paulSplit.classList.add("play");
      Sound.devil();
      zoneCompleteOverlay.classList.remove("hidden");
    }
  }

  /* =========================================================
     UPDATE
  ========================================================= */
  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function update(dt) {
    if (!levelActive || paused) return;
    if (!player.alive) return;

    level.moving.forEach(function (m) {
      m.t += dt * m.speed;
      if (m.axis === "x") m.x = m.baseX + Math.sin(m.t) * m.range;
      else m.y = m.baseY + Math.sin(m.t) * m.range;
    });

    level.saws.forEach(function (s) {
      s.t += dt * s.speed;
      s.angle += dt * 9;
      if (s.axis === "x") s.x = s.baseX + Math.sin(s.t) * s.range;
      else s.y = s.baseY + Math.sin(s.t) * s.range;
    });

    level.chasers.forEach(function (c) {
      if (!c.active) {
        if (player.x > c.triggerX) {
          c.active = true;
          c.cx = Math.min(c.x, player.x - 260);
          c.cy = player.y - 60;
          Sound.spawn();
        }
        return;
      }
      c.wob += dt * 6;
      var pcx = player.x + player.w / 2;
      var pcy = player.y + player.h / 2;
      var dx = pcx - c.cx, dy = pcy - c.cy;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;
      c.cx += (dx / dist) * c.speed * dt;
      c.cy += (dy / dist) * c.speed * dt + Math.sin(c.wob) * 30 * dt;
    });

    level.walls.forEach(function (w) {
      w.t += dt * w.speed;
      w.y = w.baseY + Math.sin(w.t) * w.range - w.range;
    });

    level.spikes.forEach(function (s) {
      var dist = Math.abs((player.x + player.w / 2) - (s.x + s.w / 2));
      if (s.state === "idle" && dist < s.triggerDist) {
        s.state = "warning"; s.timer = 0; Sound.warn();
      } else if (s.state === "warning") {
        s.timer += dt;
        if (s.timer > 0.32) { s.state = "active"; s.timer = 0; }
      } else if (s.state === "active") {
        s.timer += dt;
        if (s.timer > 1.1) { s.state = "cooldown"; s.timer = 0; }
      } else if (s.state === "cooldown") {
        s.timer += dt;
        if (s.timer > 0.8 && dist > s.triggerDist + 60) { s.state = "idle"; s.timer = 0; }
      }
    });

    level.fallingSpikes.forEach(function (f) {
      var dist = Math.abs((player.x + player.w / 2) - (f.x + f.w / 2));
      if (f.state === "idle" && dist < f.triggerDist) {
        f.state = "warning"; f.timer = 0; Sound.warn();
      } else if (f.state === "warning") {
        f.timer += dt;
        if (f.timer > 0.28) { f.state = "falling"; f.vy = 0; }
      } else if (f.state === "falling") {
        f.vy += GRAVITY * 1.4 * dt;
        f.curY += f.vy * dt;
        if (f.curY > GY - f.h) { f.curY = GY - f.h; f.state = "landed"; f.timer = 0; }
      } else if (f.state === "landed") {
        f.timer += dt;
        if (f.timer > 1.4 && dist > f.triggerDist + 80) { f.state = "idle"; f.curY = f.y; f.vy = 0; }
      }
    });

    level.crumble.forEach(function (c) {
      if (c.gone) return;
      var onIt = player.grounded && player.standingOn === c;
      if (c.state === "idle" && onIt) { c.state = "shaking"; c.timer = 0; }
      else if (c.state === "shaking") {
        c.timer += dt;
        if (c.timer > 0.45) { c.state = "gone"; c.gone = true; }
      }
    });

    level.fake.forEach(function (f) {
      if (f.gone) return;
      var onIt = player.grounded && player.standingOn === f;
      if (f.state === "idle" && onIt) { f.state = "shaking"; f.timer = 0; }
      else if (f.state === "shaking") {
        f.timer += dt;
        if (f.timer > 0.15) { f.state = "gone"; f.gone = true; }
      }
    });

    // stars
    level.stars.forEach(function (s) {
      if (s.got) return;
      var hb = { x: s.x - 16, y: s.y - 16, w: 32, h: 32 };
      if (rectsOverlap(player, hb)) {
        s.got = true;
        starsGot++;
        hudStars.textContent = "★ " + starsGot + "/3";
        Sound.star();
      }
    });

    // horizontal input
    var move = 0;
    if (input.left) move -= 1;
    if (input.right) move += 1;
    if (move !== 0) {
      player.vx += move * MOVE_SPEED * 6 * dt;
      player.vx = Math.max(-MOVE_SPEED, Math.min(MOVE_SPEED, player.vx));
      player.facing = move;
    } else {
      var decel = FRICTION_GROUND * dt;
      if (Math.abs(player.vx) <= decel) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * decel;
    }

    // footsteps
    if (player.grounded && Math.abs(player.vx) > 60) {
      stepTimer += dt;
      if (stepTimer > 0.28) { stepTimer = 0; Sound.step(); }
    } else {
      stepTimer = 0.2;
    }

    // jump
    if (input.jumpPressed && player.grounded) {
      player.vy = JUMP_VELOCITY;
      player.grounded = false;
      Sound.jump();
    }
    input.jumpPressed = false;

    // gravity
    player.vy += GRAVITY * dt;
    if (player.vy > 1600) player.vy = 1600;

    // falling whistle (long falls)
    if (!player.grounded && player.vy > 950 && !fallWhistled) {
      fallWhistled = true;
      Sound.fall();
    }

    // carry on moving platform
    var carryDX = 0, carryDY = 0;
    if (player.grounded && player.standingOn && player.standingOn._isMoving) {
      var mp = player.standingOn;
      carryDX = mp.x - mp._prevX;
      carryDY = mp.y - mp._prevY;
    }

    player.x += player.vx * dt + carryDX;
    player.y += player.vy * dt + carryDY;

    // collision
    var wasGrounded = player.grounded;
    var impactVy = player.vy;
    player.grounded = false;
    player.standingOn = null;
    var solids = collectSolids();
    solids.forEach(function (s) {
      if (!rectsOverlap(player, s)) return;
      var overlapX = Math.min(player.x + player.w - s.x, s.x + s.w - player.x);
      var overlapY = Math.min(player.y + player.h - s.y, s.y + s.h - player.y);
      if (overlapX < overlapY) {
        if (player.x < s.x) player.x -= overlapX; else player.x += overlapX;
        player.vx = 0;
      } else {
        if (player.y < s.y) {
          player.y -= overlapY;
          if (player.vy >= 0) { player.vy = 0; player.grounded = true; player.standingOn = s; }
        } else {
          player.y += overlapY;
          if (player.vy < 0) player.vy = 0;
        }
      }
    });

    level.moving.forEach(function (m) { m._isMoving = true; m._prevX = m.x; m._prevY = m.y; });

    // landing sound
    if (!wasGrounded && player.grounded) {
      fallWhistled = false;
      if (impactVy > 500) Sound.land();
    }

    checkHazards();

    if (player.y > DEATH_Y) die();
    if (player.x < 0) player.x = 0;

    if (level.fakeDoor && rectsOverlap(player, level.fakeDoor)) {
      Sound.fake();
      die(true);
      return;
    }

    if (rectsOverlap(player, level.door)) {
      completeLevel();
    }

    var targetX = player.x - canvasDesignWidth() * 0.4;
    targetX = Math.max(0, Math.min(level.width - canvasDesignWidth(), targetX));
    camera.x += (targetX - camera.x) * Math.min(1, dt * 6);
  }

  function canvasDesignWidth() { return canvas.width / SCALE; }

  function collectSolids() {
    var list = [];
    level.platforms.forEach(function (p) { list.push(p); });
    level.moving.forEach(function (m) { list.push(m); });
    level.crumble.forEach(function (c) { if (!c.gone) list.push(c); });
    level.fake.forEach(function (f) { if (!f.gone) list.push(f); });
    return list;
  }

  function checkHazards() {
    level.spikes.forEach(function (s) {
      if (s.state !== "active") return;
      var hb = spikeHitbox(s);
      if (rectsOverlap(player, hb)) die();
    });
    level.fallingSpikes.forEach(function (f) {
      if (f.state !== "falling" && f.state !== "landed") return;
      var hb = { x: f.x, y: f.curY, w: f.w, h: f.h };
      if (rectsOverlap(player, hb)) die();
    });
    level.walls.forEach(function (w) {
      var hb = { x: w.x, y: w.y, w: w.w, h: w.h };
      if (rectsOverlap(player, hb)) die();
    });
    level.saws.forEach(function (s) {
      var r = s.r * 0.82;
      var hb = { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
      if (rectsOverlap(player, hb)) die();
    });
    level.chasers.forEach(function (c) {
      if (!c.active) return;
      var hb = { x: c.cx - 15, y: c.cy - 15, w: 30, h: 30 };
      if (rectsOverlap(player, hb)) die();
    });
  }

  function spikeHitbox(s) {
    if (s.orient === "up") return { x: s.x, y: s.y - s.h * spikeExtend(s), w: s.w, h: s.h * spikeExtend(s) };
    return { x: s.x, y: s.y, w: s.w, h: s.h };
  }
  function spikeExtend(s) {
    if (s.state === "active") return 1;
    if (s.state === "warning") return 0.15;
    return 0;
  }

  /* =========================================================
     RENDER — Level Devil style: dark, stone platforms
  ========================================================= */
  var PLAT_BODY = "#3d434e";
  var PLAT_TOP = "#c3c9d4";
  var PLAT_EDGE = "#23262c";

  function render() {
    var w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!level) { ctx.fillStyle = "#111"; ctx.fillRect(0, 0, w, h); return; }

    ctx.fillStyle = ZONES[curZone].bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(-camera.x, -camera.y - YOFF);

    level.platforms.forEach(function (p) { drawPlatform(p); });
    level.moving.forEach(function (m) {
      drawPlatform(m);
      ctx.strokeStyle = "#ffd23f";
      ctx.lineWidth = 3;
      ctx.strokeRect(m.x + 1.5, m.y + 1.5, m.w - 3, m.h - 3);
    });
    level.crumble.forEach(function (c) {
      if (c.gone) return;
      var alpha = c.state === "shaking" ? (0.5 + 0.5 * Math.sin(performance.now() / 40)) : 1;
      ctx.globalAlpha = alpha;
      drawPlatform(c);
      ctx.strokeStyle = "#ff9d2e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x + c.w * 0.3, c.y + 2);
      ctx.lineTo(c.x + c.w * 0.45, c.y + c.h - 2);
      ctx.moveTo(c.x + c.w * 0.6, c.y + 2);
      ctx.lineTo(c.x + c.w * 0.75, c.y + c.h - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
    level.fake.forEach(function (f) {
      if (f.gone) return;
      drawPlatform(f);
    });
    level.walls.forEach(function (ww) {
      drawRect(ww, "#2a2d33", "#ff3b3b");
    });
    level.spikes.forEach(function (s) { drawSpike(s); });
    level.fallingSpikes.forEach(function (f) {
      if (f.state === "idle") {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(f.x + f.w / 2 - 2, 0, 4, 14);
      } else {
        drawTriangleDown({ x: f.x, y: f.curY, w: f.w, h: f.h }, "#ff3b3b");
      }
    });
    level.saws.forEach(function (s) { drawSaw(s); });
    level.chasers.forEach(function (c) { if (c.active) drawChaser(c); });
    level.stars.forEach(function (s) { if (!s.got) drawStar(s); });
    if (level.fakeDoor) drawDoor(level.fakeDoor, "#e8ebf0");
    drawDoor(level.door, "#e8ebf0");
    drawPlayer();

    ctx.restore();
  }

  function drawPlatform(p) {
    ctx.fillStyle = PLAT_BODY;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PLAT_TOP;
    ctx.fillRect(p.x, p.y, p.w, 7);
    ctx.strokeStyle = PLAT_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
  }

  function drawRect(r, color, strokeColor) {
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    }
  }

  function drawTriangleDown(r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w / 2, r.y + r.h);
    ctx.closePath();
    ctx.fill();
  }

  function drawSpike(s) {
    var ext = spikeExtend(s);
    if (ext <= 0.02 && s.state === "idle") return;
    var hh = s.h * ext;
    ctx.fillStyle = s.state === "warning" ? "#ff8080" : "#ff3b3b";
    var n = 3, segW = s.w / n;
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(s.x + i * segW, s.y);
      ctx.lineTo(s.x + (i + 0.5) * segW, s.y - hh);
      ctx.lineTo(s.x + (i + 1) * segW, s.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSaw(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillStyle = "#c9ccd4";
    var teeth = 10;
    ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var rr = (i % 2 === 0) ? s.r : s.r * 0.78;
      var a = (i / (teeth * 2)) * Math.PI * 2;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawChaser(c) {
    var x = c.cx, y = c.cy;
    ctx.fillStyle = "rgba(255,59,59,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, 30 + Math.sin(c.wob) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a1010";
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 12); ctx.lineTo(x - 22, y - 30); ctx.lineTo(x - 6, y - 18);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 12); ctx.lineTo(x + 22, y - 30); ctx.lineTo(x + 6, y - 18);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d21f1f";
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe14d";
    var lookX = player ? Math.max(-3, Math.min(3, (player.x - x) * 0.02)) : 0;
    ctx.beginPath();
    ctx.arc(x - 6 + lookX, y - 3, 4, 0, Math.PI * 2);
    ctx.arc(x + 6 + lookX, y - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0505";
    ctx.beginPath();
    ctx.arc(x - 6 + lookX, y - 3, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 6 + lookX, y - 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5c0d0d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 11); ctx.lineTo(x - 2, y - 7);
    ctx.moveTo(x + 11, y - 11); ctx.lineTo(x + 2, y - 7);
    ctx.stroke();
  }

  function drawStar(s) {
    var t = performance.now() / 500;
    var r = 13 + Math.sin(t + s.x) * 2;
    var cx = s.x, cy = s.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.7 + s.x) * 0.25);
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#a87e00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rr = (i % 2 === 0) ? r : r * 0.45;
      var a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawDoor(d, accent) {
    ctx.fillStyle = "#101114";
    ctx.fillRect(d.x - 5, d.y - 5, d.w + 10, d.h + 10);
    ctx.fillStyle = accent;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = "#101114";
    ctx.fillRect(d.x + 8, d.y + 8, d.w - 16, d.h - 16);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(d.x + d.w - 12, d.y + d.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer() {
    var c = CHARACTERS[selectedCharacter];
    if (!player.alive) return;
    ctx.fillStyle = c.color;
    roundRect(player.x, player.y, player.w, player.h, 8);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    var eyeY = player.y + player.h * 0.32;
            if (c.cute) {
      // Gloria chibi (photo-inspired) — PNG sprite, flips with facing
      var gw2 = 40, gh2 = 67;
      ctx.save();
      ctx.translate(player.x + player.w / 2, player.y + player.h + 5);
      ctx.scale(player.facing >= 0 ? 1 : -1, 1);
      if (gloriaImg.complete && gloriaImg.naturalWidth > 0) {
        ctx.drawImage(gloriaImg, -gw2 / 2, -gh2, gw2, gh2);
      } else {
        ctx.fillStyle = "#2b3a67";
        roundRect(-gw2 / 2, -gh2, gw2, gh2, 12);
        ctx.fill();
      }
      ctx.restore();
    } else {
      var eyeOffset = player.facing >= 0 ? player.w * 0.55 : player.w * 0.2;
      ctx.beginPath();
      ctx.arc(player.x + eyeOffset, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* =========================================================
     LOOP
  ========================================================= */
  function loop(now) {
    if (!levelActive) return;
    var dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

})();
