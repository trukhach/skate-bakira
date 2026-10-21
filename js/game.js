// «Скейт Бакира» — основная логика игры
'use strict';
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var app = $('app'), canvas = $('c');
  var TG = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;

  // ---------- save ----------
  var SAVE_KEY = 'skatebakir_v1';
  var save = { done: {}, best: { score: 0, line: 0, lineScore: 0 }, tricks: {}, opt: { sound: true, music: true, vibro: true, tips: true, quality: -1, style: 0 } };
  try { var sv = JSON.parse(localStorage.getItem(SAVE_KEY)); if (sv) { for (var k in sv) save[k] = sv[k]; save.opt = Object.assign({ sound: true, music: true, vibro: true, tips: true, quality: -1, style: 0 }, sv.opt || {}); } } catch (e) { }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }
  var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  if (save.opt.quality < 0) save.opt.quality = isMobile ? 1 : 2;
  var QNAMES = ['Низкая', 'Средняя', 'Высокая'];

  // ---------- telegram ----------
  if (TG) {
    try { TG.ready(); TG.expand(); } catch (e) { }
    try { if (TG.disableVerticalSwipes) TG.disableVerticalSwipes(); } catch (e) { }
    try { if (TG.requestFullscreen && /android|ios/i.test(TG.platform || '')) TG.requestFullscreen(); } catch (e) { }
    try { if (TG.setHeaderColor) TG.setHeaderColor('#111111'); if (TG.setBackgroundColor) TG.setBackgroundColor('#111111'); } catch (e) { }
  }
  function haptic(kind) {
    if (!save.opt.vibro) return;
    try {
      if (TG && TG.HapticFeedback) { if (kind === 'heavy' || kind === 'light' || kind === 'medium') TG.HapticFeedback.impactOccurred(kind); else TG.HapticFeedback.notificationOccurred(kind); }
      else if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 60 : 15);
    } catch (e) { }
  }

  // ---------- layout / orientation (всегда горизонтально) ----------
  var VW = 0, VH = 0, rotated = false;
  var renderer;
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    rotated = h > w;
    if (rotated) { VW = h; VH = w; app.style.width = h + 'px'; app.style.height = w + 'px'; app.style.transform = 'translate(0,' + h + 'px) rotate(-90deg)'; }
    else { VW = w; VH = h; app.style.width = w + 'px'; app.style.height = h + 'px'; app.style.transform = 'none'; }
    if (renderer) renderer.resize(VW, VH, dprFor());
    var sc = Math.min(1, VH / 380);
    ['bOllie', 'bMan', 'bFooty'].forEach(function (id) { $(id).style.zoom = sc; });
  }
  function dprFor() { var d = window.devicePixelRatio || 1; return [Math.min(d, 0.75), Math.min(d, 1.25), Math.min(d, 2)][save.opt.quality]; }
  function toGame(cx, cy) { return rotated ? { x: window.innerHeight - cy, y: cx } : { x: cx, y: cy }; }
  window.addEventListener('resize', function () { setTimeout(layout, 50); });
  window.addEventListener('orientationchange', function () { setTimeout(layout, 200); });

  // ---------- input ----------
  var input = { jx: 0, jy: 0, ollie: false, olliePress: false, swipes: [], manualPress: false, footyPress: false };
  var touches = {};
  var joyEl = $('joy'), knob = $('knob');
  function swipeDir(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'); }
  function tStart(id, cx, cy) {
    var g = toGame(cx, cy), el = document.elementFromPoint(cx, cy);
    if (state !== 'play') return;
    if (el && (el.id === 'bOllie')) {
      touches[id] = { role: 'ollie', sx: g.x, sy: g.y, t: now() };
      input.ollie = true; input.olliePress = true; $('bOllie').classList.add('dn'); return;
    }
    if (el && (el.id === 'bMan' || el.id === 'bFooty' || el.id === 'bPause')) return;
    if (g.x < VW * 0.42) {
      touches[id] = { role: 'joy', sx: g.x, sy: g.y };
      joyEl.style.display = 'block'; joyEl.style.left = g.x + 'px'; joyEl.style.top = g.y + 'px'; knob.style.transform = 'translate(0,0)';
      $('joyhint').style.display = 'none';
    } else touches[id] = { role: 'swipe', sx: g.x, sy: g.y, t: now() };
  }
  function tMove(id, cx, cy) {
    var T = touches[id]; if (!T) return; var g = toGame(cx, cy);
    if (T.role === 'joy') {
      var dx = g.x - T.sx, dy = g.y - T.sy, L = Math.hypot(dx, dy), R = 58;
      if (L > R) { dx *= R / L; dy *= R / L; }
      input.jx = dx / R; input.jy = -dy / R;
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    } else {
      var ddx = g.x - T.sx, ddy = g.y - T.sy;
      if (Math.hypot(ddx, ddy) > 30) { input.swipes.push(swipeDir(ddx, ddy)); T.sx = g.x; T.sy = g.y; }
    }
  }
  function tEnd(id) {
    var T = touches[id]; if (!T) return;
    if (T.role === 'joy') { input.jx = 0; input.jy = 0; joyEl.style.display = 'none'; }
    if (T.role === 'ollie') { input.ollie = false; $('bOllie').classList.remove('dn'); }
    delete touches[id];
  }
  app.addEventListener('touchstart', function (e) { SFX.init(); for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; tStart(t.identifier, t.clientX, t.clientY); } if (state === 'play') e.preventDefault(); }, { passive: false });
  app.addEventListener('touchmove', function (e) { for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; tMove(t.identifier, t.clientX, t.clientY); } e.preventDefault(); }, { passive: false });
  function te(e) { for (var i = 0; i < e.changedTouches.length; i++) tEnd(e.changedTouches[i].identifier); }
  app.addEventListener('touchend', te); app.addEventListener('touchcancel', te);
  var mouseDown = false;
  app.addEventListener('mousedown', function (e) { if ('ontouchstart' in window && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return; SFX.init(); mouseDown = true; tStart('m', e.clientX, e.clientY); });
  window.addEventListener('mousemove', function (e) { if (mouseDown) tMove('m', e.clientX, e.clientY); });
  window.addEventListener('mouseup', function () { if (mouseDown) { mouseDown = false; tEnd('m'); } });
  function btn(id, fn) {
    var el = $(id);
    el.addEventListener('touchstart', function (e) { e.preventDefault(); e.stopPropagation(); SFX.init(); fn(); }, { passive: false });
    el.addEventListener('mousedown', function (e) { e.stopPropagation(); SFX.init(); fn(); });
  }
  btn('bMan', function () { input.manualPress = true; });
  btn('bFooty', function () { input.footyPress = true; });
  btn('bPause', function () { pauseGame(); });
  var keys = {};
  window.addEventListener('keydown', function (e) {
    SFX.init();
    if (keys[e.code]) return; keys[e.code] = true;
    if (state !== 'play') { if (e.code === 'Escape' && state === 'pause') resume(); return; }
    if (e.code === 'Space') { input.ollie = true; input.olliePress = true; e.preventDefault(); }
    var m = { KeyW: 'U', KeyA: 'L', KeyS: 'D', KeyD: 'R' }; if (m[e.code]) input.swipes.push(m[e.code]);
    if (e.code === 'KeyE') input.manualPress = true; if (e.code === 'KeyF') input.footyPress = true;
    if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; if (e.code === 'Space') input.ollie = false; });
  var kbJoy = false;
  function keyJoy() {
    if (Object.keys(touches).some(function (k) { return touches[k].role === 'joy'; })) return;
    var any = keys.ArrowRight || keys.ArrowLeft || keys.ArrowUp || keys.ArrowDown;
    if (!any && !kbJoy) return;
    kbJoy = !!any;
    input.jx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0); input.jy = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
  }

  // ---------- render setup ----------
  var MATS = {}, curThemeName = null;
  function buildMats(theme) {
    var night = !!theme.night, lit = theme.lit;
    function T(n, a) { return TEX.get(renderer, n, a); }
    MATS = {
      concrete: { tex: T('concrete'), spec: 0.12 }, asphalt: { tex: T('asphalt'), spec: 0.12 }, road: { tex: T('road'), spec: 0.2 },
      tiles: { tex: T('tiles'), spec: 0.25 }, brick: { tex: T('brick'), spec: 0.05 }, wood: { tex: T('wood'), spec: 0.15 },
      rampskin: { tex: T('rampskin'), spec: 0.45 }, metal: { tex: T('metal'), spec: 0.95 }, paint: { tex: T('paintmetal'), spec: 0.5 },
      grass: { tex: T('grass'), spec: 0.02 }, dirt: { tex: T('dirt'), spec: 0.02 }, graffiti: { tex: T('graffiti'), spec: 0.05 },
      facadeA: { tex: T('facade', [{ wall: '#7a5444', lit: lit, cols: 4, rows: 4 }]), spec: 0.2, emis: night ? 1.2 : 0.35 },
      facadeB: { tex: T('facade', [{ wall: '#a39b8e', lit: lit, cols: 5, rows: 4, glass: '#4a6070' }]), spec: 0.2, emis: night ? 1.2 : 0.35 },
      facadeC: { tex: T('facade', [{ wall: '#4d5866', lit: lit, cols: 6, rows: 6, glass: '#2d4f73' }]), spec: 0.5, emis: night ? 1.2 : 0.35 },
      glow: { tex: null, spec: 0, emis: 2.2 }, leaves: { tex: T('leaves'), spec: 0.05 }, bark: { tex: T('bark'), spec: 0.02 },
      water: { tex: T('water'), spec: 1.0, scroll: 0.08, col: [0.8, 0.95, 1.1] }, hazard: { tex: T('hazard'), spec: 0.3 },
      carpaint: { tex: T('paintmetal'), spec: 1.0 }, glass: { tex: null, spec: 1.0, col: [0.12, 0.16, 0.2] }
    };
  }
  function matFor(name) {
    if (MATS[name]) return MATS[name];
    if (name.indexOf('sign:') === 0) { MATS[name] = { tex: TEX.get(renderer, 'sign', [name.slice(5), '#151515', '#ffb21f']), spec: 0.2, emis: 0.6 }; return MATS[name]; }
    return MATS.concrete;
  }

  // ---------- world state ----------
  var level = null, statics = [], skater = null, itemMeshes = {}, spotMesh = null, beamMesh = null;
  var particles = { n: 0, max: 1800, data: new Float32Array(1800 * 8), list: [] };
  function emit(x, y, z, vx, vy, vz, r, g, b, a, size, life) {
    if (particles.list.length > 1700) return;
    particles.list.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, r: r, g: g, b: b, a: a, s: size, life: life, l0: life });
  }
  function updParticles(dt) {
    var L = particles.list, n = 0, D = particles.data;
    for (var i = L.length - 1; i >= 0; i--) {
      var p = L[i]; p.life -= dt; if (p.life <= 0) { L.splice(i, 1); continue; }
      p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.02) { p.y = 0.02; p.vy *= -0.3; }
    }
    for (i = 0; i < L.length; i++) { p = L[i]; var o = n * 8; D[o] = p.x; D[o + 1] = p.y; D[o + 2] = p.z; D[o + 3] = p.r; D[o + 4] = p.g; D[o + 5] = p.b; D[o + 6] = p.a * (p.life / p.l0); D[o + 7] = p.s; n++; }
    particles.n = n;
  }
  function makeItemMeshes() {
    function M(g) { return renderer.mesh(g); }
    var t = new E.Geo(); t.add(E.box(0.5, 0.03, 0.26, 1, { center: true })); itemMeshes.ticket = { mesh: M(t), col: [1, 0.85, 0.15] };
    var b = new E.Geo(); b.add(E.box(0.42, 0.1, 0.55, 1, { center: true })); b.add(E.box(0.4, 0.11, 0.02, 1, { center: true }), E.trs(0, 0, 0.24), [1.6, 1.6, 1.6]); itemMeshes.book = { mesh: M(b), col: [0.9, 0.15, 0.15] };
    var s = new E.Geo(); s.add(E.cylinder(0.11, 0.11, 0.03, 14, { center: true }), E.trs(-0.13, 0, 0, Math.PI / 2, 0, 0)); s.add(E.cylinder(0.11, 0.11, 0.03, 14, { center: true }), E.trs(0.13, 0, 0, Math.PI / 2, 0, 0)); s.add(E.box(0.12, 0.025, 0.02, 1, { center: true })); s.add(E.box(0.02, 0.02, 0.3, 1, { center: true }), E.trs(-0.24, 0, -0.15)); s.add(E.box(0.02, 0.02, 0.3, 1, { center: true }), E.trs(0.24, 0, -0.15));
    itemMeshes.shades = { mesh: M(s), col: [0.08, 0.08, 0.1] };
    var p = new E.Geo(); p.add(E.cylinder(0.06, 0.09, 0.18, 12), E.trs(0, -0.35, 0)); p.add(E.sphere(0.13, 12, 8), E.trs(0, -0.15, 0)); p.add(E.cylinder(0.07, 0.05, 0.16, 12), E.trs(0, -0.04, 0)); p.add(E.sphere(0.075, 12, 8), E.trs(0, 0.16, 0)); p.add(E.cylinder(0.057, 0.057, 0.04, 12), E.trs(0, 0.03, 0), [1, 0.1, 0.1]);
    itemMeshes.pin = { mesh: M(p), col: [1, 1, 1] };
    var dk = new E.Geo(); dk.add(E.box(0.22, 0.03, 0.8, 1, { center: true })); itemMeshes.deck = { mesh: M(dk), col: [0.2, 0.7, 1] };
    var ring = new E.Geo(); ring.add(E.cylinder(1, 1, 0.06, 32, { noCaps: false })); spotMesh = M(ring);
    var beam = new E.Geo(); beam.add(E.cylinder(1, 1, 1, 20, { noCaps: true })); beamMesh = M(beam);
  }
  function loadLevel(id) {
    statics.forEach(function (s) { renderer.freeMesh(s.mesh); }); statics = [];
    level = LEVELS.build(id);
    if (curThemeName !== level.themeName) { buildMats(level.theme); curThemeName = level.themeName; }
    for (var k in level.geos) {
      var gb = level.geos[k]; if (!gb.geo.i.length) continue;
      statics.push({ mesh: renderer.mesh(gb.geo), m: E.m4(), mat: matFor(gb.mat), chunk: gb.chunk, noShadow: gb.mat === 'glow' || gb.mat === 'grass' });
    }
    level.geos = null;
  }

  // ---------- physics helpers ----------
  function solidsNear(d) { var b = level.bins[Math.floor(d / 10)]; return b || []; }
  function groundInfo(x, d, maxY) {
    var h = 0, slope = 0, solid = null, L = solidsNear(d);
    for (var i = 0; i < L.length; i++) {
      var s = L[i]; if (x < s.x0 || x > s.x1 || d < s.d0 || d > s.d1) continue;
      var sh = LEVELS.surfH(s, d); if (s.type === 'box' && s.y0 && maxY < s.y0) continue;
      if (sh <= maxY && sh >= h) { h = sh; slope = LEVELS.surfSlope(s, d); solid = s; }
    }
    return { h: h, slope: slope, solid: solid };
  }
  function blocked(x, d, y, tol) {
    var L = solidsNear(d);
    for (var i = 0; i < L.length; i++) {
      var s = L[i]; if (x < s.x0 || x > s.x1 || d < s.d0 || d > s.d1) continue;
      var top = LEVELS.surfH(s, d), bot = s.y0 || 0;
      if (top > y + tol && y + 1.6 > bot) return s;
    }
    return null;
  }

  // ---------- trick tables ----------
  var AIR = { U: { n: 'Кикфлип', p: 100, dur: 0.42, a: 'kickflip', roll: 1 }, R: { n: 'Инди', p: 120, dur: 0.5, a: 'indy' }, L: { n: 'Эйрволк', p: 150, dur: 0.55, a: 'airwalk' }, D: { n: '360', p: 200, dur: 0.55, a: 'air', spin: 1 } };
  var VERT = { U: { n: 'Стиффи', p: 180, dur: 0.5, a: 'stiffy' }, R: { n: 'Ростбиф', p: 220, dur: 0.55, a: 'roastbeef' }, L: { n: 'Эйрволк', p: 150, dur: 0.55, a: 'airwalk' }, D: { n: '360', p: 200, dur: 0.55, a: 'air', spin: 1 } };
  var GRINDS = { N: { n: '50-50', a: 'grind' }, U: { n: 'Носграйнд', a: 'nosegrind' }, D: { n: 'Файв-О', a: 'fiveo' }, L: { n: 'Бордслайд', a: 'boardslide', yaw: 1 }, R: { n: 'Бордслайд', a: 'boardslide', yaw: 1 } };
  var ARROWS = { U: '▲', D: '▼', L: '◀', R: '▶' };

  // ---------- game session ----------
  var state = 'load', S = null, P = null;
  var GRAV = 22, OLLIE_V = 5.3, CRUISE = 6.5, FAST = 11.5;
  function now() { return performance.now() / 1000; }
  function newSession(mapId, goal) {
    loadLevel(mapId);
    LEVELS.decorate(level, goal);
    S = {
      map: mapId, goal: goal, score: 0, t: 0, timeLeft: goal && goal.time ? goal.time : 0, bails: 0, done: false, failed: false, endT: 0,
      cnt: {}, unique: {}, line: null, pend: [], footy: 0, footyT: 0, footyTricks: 0, footyActive: false, calls: null, finished: false,
      lastGrindType: null, bestLine: 0, bestLineScore: 0, slow: 1, msgT: 0
    };
    P = { x: level.startX, d: level.startD, y: 0, vy: 0, yaw: 0, speed: 0, spdH: 0, mode: 'ride', airT: 0, trick: null, vert: false,
      grind: null, gt: 0, bal: null, balT: 0, balN: 0, man: 0, bailT: 0, pushT: 0, pitch: 0, preSwipe: null, preSwipeT: -9, jumped: false,
      s: 0, v: 0, px: 0, pdir: 1, pend: [], airDir: 1, stallT: 0, boost: false, rootYawA: 0, camInit: true, idleT: 0 };
    if (level.kind === 'pipe') { var pd = level.pipe; P.s = pd.F + pd.R * Math.PI / 2 + pd.V; P.v = -0.5; P.mode = 'pipe'; }
    if (goal && goal.type === 'called') S.calls = { n: 0, cur: null, t: 0 };
    hudReset();
    if (S.calls) nextCall();
  }

  // ---------- line / scoring ----------
  function lineAdd(name, pts, kind) {
    if (!S.line) S.line = { moves: [], sum: 0, last: null, t: 0, mult: 0 };
    var L = S.line;
    L.moves.push(name); L.sum += pts;
    if (name !== L.last) L.mult++;
    L.last = name; L.t = 0;
    S.unique[name] = 1;
    if (state === 'play') save.tricks[name] = (save.tricks[name] || 0) + 1;
    if (S.footyActive) S.footyTricks++;
    goalEvent('move', name, kind);
    hudTrick();
  }
  function lineBank() {
    var L = S.line; if (!L) return; S.line = null;
    var pts = Math.round(L.sum * L.mult);
    S.score += pts; S.footy = Math.min(1, S.footy + pts / 900);
    if (state === 'play') {
      if (L.moves.length > save.best.line) save.best.line = L.moves.length;
      if (pts > save.best.lineScore) save.best.lineScore = pts;
      if (S.score > save.best.score) save.best.score = S.score;
    }
    if (pts > 0) { popup('+' + pts + (L.mult > 1 ? '  ×' + L.mult : '')); SFX.score(); }
    hudTrick(); goalEvent('score');
  }
  function lineLose() { S.line = null; S.pend = []; hudTrick(); }

  // ---------- goals ----------
  function goalEvent(ev, a, b) {
    if (!S || S.done || S.failed) return;
    var g = S.goal;
    if (ev === 'move' && S.calls && S.calls.cur && a === S.calls.cur) { S.calls.n++; SFX.collect(); popup('Есть!'); if (S.calls.n >= g.n) return win(); nextCall(); }
    if (!g) return;
    if (ev === 'move') {
      if (g.type === 'count' && g.ev === 'trick' && a === g.name2) inc();
      if (g.type === 'count' && g.ev === 'air' && b === 'air') inc();
      if (g.type === 'unique') { var u = Object.keys(S.unique).filter(function (n) { return n !== 'Олли'; }).length; S.cnt.u = u; hudGoal(); if (u >= g.n) win(); }
      if (g.type === 'seq' && S.line) { var mv = S.line.moves, sq = g.seq; if (mv.length >= sq.length) { var ok = true; for (var i = 0; i < sq.length; i++) if (mv[mv.length - sq.length + i] !== sq[i]) ok = false; if (ok) win(); } hudGoal(); }
      if (g.type === 'line' && S.line && S.line.moves.length >= g.n) win();
      if (g.type === 'score' && S.line && S.score + Math.round(S.line.sum * S.line.mult) >= g.n) lineBank();
      if (g.type === 'footy' && S.footyActive) { S.cnt.f = S.footyTricks; hudGoal(); if (S.footyTricks >= g.n) win(); }
    }
    if (ev === 'grind' && g.type === 'count' && g.ev === 'grind') inc();
    if (ev === 'balance' && g.type === 'count' && g.ev === 'balance') inc();
    if (ev === 'grindSwitch' && g.type === 'count' && g.ev === 'grindSwitch') inc();
    if (ev === 'collect' && g.type === 'collect') { S.cnt.c = (S.cnt.c || 0) + 1; hudGoal(); if (S.cnt.c >= g.n) win(); }
    if (ev === 'spot' && g.type === 'spots') { S.cnt.s = (S.cnt.s || 0) + 1; hudGoal(); if (S.cnt.s >= g.n) win(); }
    if (ev === 'score' && g.type === 'score' && S.score >= g.n) win();
    if (ev === 'bail' && g.noBail) fail('Ты упал!');
    if (ev === 'bail' && g.type === 'footy' && S.footyActive) fail('Падение на камеру!');
    if (ev === 'finish') {
      if (g.type === 'reach') return win();
      return fail('Трасса закончилась');
    }
    if (ev === 'time') { if (S.line) { lineBank(); if (S.done) return; } fail('Время вышло!'); }
    function inc() { S.cnt.n = (S.cnt.n || 0) + 1; hudGoal(); if (S.cnt.n >= g.n) win(); }
  }
  function nextCall() {
    var pool = ['Кикфлип', 'Инди', 'Эйрволк', '360', '50-50', 'Мануал', 'Олли'];
    var c; do { c = pool[Math.floor(Math.random() * pool.length)]; } while (c === S.calls.cur);
    S.calls.cur = c; S.calls.t = 12;
    $('call').style.display = 'block'; $('call').textContent = 'Сделай: ' + c;
  }
  function win() {
    if (S.done || S.failed) return; S.done = true; S.endT = 1.6;
    showMsg('ВЫПОЛНЕНО!', S.goal ? S.goal.name : ''); SFX.win(); haptic('success');
    if (S.goal) { var first = !save.done[S.goal.id]; save.done[S.goal.id] = 1; S.firstWin = first; }
    if (S.score > save.best.score) save.best.score = S.score;
    persist();
  }
  function fail(why) {
    if (S.done || S.failed) return; S.failed = true; S.endT = 1.6; S.failWhy = why;
    showMsg('ПРОВАЛ', why); SFX.lose(); haptic('error');
  }

  // ---------- update: linear maps ----------
  function startTrick(dir, vert) {
    var T = (vert ? VERT : AIR)[dir]; if (!T) return;
    P.trick = { def: T, t: 0 }; skater.setPose(T.a, 14); SFX.flip(); hudTrickName(T.n);
  }
  function startGrind(rail, rx, ry) {
    var type = (S.t - P.preSwipeT < 0.45 && P.preSwipe) ? P.preSwipe : 'N';
    var G = GRINDS[type];
    if (P.trick) { finishTrickIfDone(); }
    // pending air tricks before grind are confirmed
    flushPend();
    P.mode = 'grind'; P.grind = { rail: rail, def: G, t: 0 }; P.y = ry; P.x = rx; P.vy = 0; P.trick = null;
    P.speed = Math.max(P.spdH, 5.5); P.bal = null; P.balN = 0; P.balT = 0.9;
    skater.setPose(G.a, 16); SFX.land(0.5); haptic('light');
    if (S.lastGrindType && S.line && S.lastGrindType !== G.n) { goalEvent('grindSwitch'); popup('Смена грайнда!'); }
    S.lastGrindType = G.n;
    hudTrickName(G.n);
    // spots
    level.spots.forEach(function (sp) { if (sp.kind === 'grind' && !sp.done && sp.rail === rail) { sp.done = true; goalEvent('spot'); SFX.collect(); popup('Отмечено!'); } });
  }
  function endGrind(off) {
    var gr = P.grind; if (!gr) return;
    var pts = Math.round(60 + gr.t * 55);
    lineAdd(gr.def.n, pts); goalEvent('grind');
    P.grind = null; P.bal = null; $('bal').style.display = 'none';
  }
  function finishTrickIfDone() {
    if (!P.trick) return true;
    if (P.trick.t >= P.trick.def.dur * 0.82) { P.pend.push(P.trick.def); P.trick = null; return true; }
    return false;
  }
  function flushPend() {
    if (!P.pend) P.pend = [];
    P.pend.forEach(function (T) {
      lineAdd(T.n, T.p, 'air');
    });
    var had = P.pend.length; P.pend = []; return had;
  }
  function airTrickDone(T) {
    // spots for air tricks
    level.spots.forEach(function (sp) { if (sp.kind === 'air' && !sp.done && Math.hypot(sp.x - P.x, sp.d - P.d) < sp.r + 0.6) { sp.done = true; goalEvent('spot'); SFX.collect(); popup('Кадр!'); } });
  }
  function bail(why) {
    if (P.mode === 'bail') return;
    P.mode = 'bail'; P.bailT = 0; P.trick = null; P.grind = null; P.bal = null; P.pend = [];
    $('bal').style.display = 'none';
    skater.setPose('bail', 9); skater.boardDetached = true;
    P.board = { x: P.x, y: P.y + 0.1, d: P.d, vx: (Math.random() - 0.5) * 3, vy: 2.5, vd: P.speed * 0.8 + 1, rot: 0, spin: 8 };
    S.bails++; SFX.bail(); haptic('heavy'); lineLose(); goalEvent('bail');
    showMsg('ПАДЕНИЕ!', why || '');
    for (var i = 0; i < 18; i++) emit(P.x, P.y + 0.3, -P.d, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, 0.7, 0.65, 0.55, 0.6, 0.25, 0.8);
    if (S.footyActive) endFooty();
  }
  function respawn() {
    skater.boardDetached = false;
    if (level.kind === 'pipe') { var pd = level.pipe; P.s = pd.F + pd.R * Math.PI / 2 + pd.V; P.v = -0.5; P.mode = 'pipe'; P.y = 0; skater.setPose('ride', 20); return; }
    // find safe spot
    var d = P.d, tries = 0;
    while (tries < 40) { var gi = groundInfo(P.x, d, 0.35); if (!blocked(P.x, d, gi.h, 0.3) && !blocked(P.x, d + 1.5, gi.h, 0.3)) break; d -= 0.8; tries++; }
    P.d = Math.max(level.startD, d); var g2 = groundInfo(P.x, P.d, 0.35);
    P.y = g2.h; P.vy = 0; P.mode = 'ride'; P.speed = 2; P.yaw = 0; skater.setPose('ride', 20);
  }
  function balanceTick(dt, sw) {
    // returns false if bailed
    P.balT -= dt;
    if (!P.bal && P.balT <= 0) {
      var dirs = ['U', 'D', 'L', 'R']; var win = Math.max(0.55, 1.25 - P.balN * 0.1);
      P.bal = { dir: dirs[Math.floor(Math.random() * 4)], t: win, w: win };
      $('bal').style.display = 'block'; $('bal').querySelector('.a').textContent = ARROWS[P.bal.dir];
    }
    if (P.bal) {
      P.bal.t -= dt;
      $('bal').querySelector('i').style.width = Math.max(0, P.bal.t / P.bal.w * 100) + '%';
      if (sw) {
        if (sw === P.bal.dir) { P.bal = null; P.balN++; P.balT = Math.max(0.5, 1.3 - P.balN * 0.1); $('bal').style.display = 'none'; SFX.balance(); goalEvent('balance'); popup('Баланс!'); if (P.grind) P.grind.t += 0.3; return true; }
        bail('Не та стрелка'); return false;
      }
      if (P.bal.t <= 0) { bail('Потерял баланс'); return false; }
    }
    return true;
  }
  function updLine(dt) {
    var sw = input.swipes.length ? input.swipes.shift() : null;
    var jx = input.jx, jy = input.jy, W2 = level.W / 2 - 0.45;
    if (P.mode === 'bail') {
      P.bailT += dt; P.speed *= Math.pow(0.15, dt);
      P.d += P.speed * dt; var gb = groundInfo(P.x, P.d, P.y + 0.4); P.y += (gb.h - P.y) * Math.min(1, dt * 8);
      var B = P.board; B.vy -= GRAV * dt; B.x += B.vx * dt; B.d += B.vd * dt; B.y += B.vy * dt; B.vd *= Math.pow(0.4, dt); B.rot += B.spin * dt; B.spin *= Math.pow(0.3, dt);
      var bg = groundInfo(B.x, B.d, B.y + 0.3).h + 0.03; if (B.y < bg) { B.y = bg; B.vy = Math.abs(B.vy) * 0.3; B.vx *= 0.6; }
      skater.boardWorld = E.trs(B.x, B.y, -B.d, 0, B.rot * 0.3, B.rot);
      if (P.bailT > 1.7) respawn();
      return;
    }
    // footy & manual input
    if (P.mode === 'ride' || P.mode === 'manual' || P.mode === 'air' || P.mode === 'grind') {
      if (input.manualPress) {
        if (P.mode === 'ride' && P.speed > 4) { P.mode = 'manual'; P.man = 0; P.balT = 1.2; P.balN = 0; skater.setPose('manual', 12); hudTrickName('Мануал'); }
        else if (P.mode === 'manual') endManual();
      }
    }
    var spd;
    if (P.mode === 'ride' || P.mode === 'manual') {
      // steering & speed
      var tgtYaw = jx * 0.75; P.yaw += (tgtYaw - P.yaw) * Math.min(1, dt * 5);
      var tgt = jy > 0.35 ? FAST : (jy < -0.5 ? 0 : CRUISE);
      if (P.mode === 'manual') tgt = Math.max(tgt, 5);
      if (P.speed < tgt) P.speed = Math.min(tgt, P.speed + (jy > 0.35 ? 5 : 4) * dt);
      else P.speed = Math.max(tgt, P.speed - (jy < -0.5 ? 10 : 1.5) * dt);
      // pushing anim
      if (P.mode === 'ride') {
        if (jy > 0.35 && P.speed < FAST - 0.3) { P.pushT += dt; skater.setPose((P.pushT % 0.9) < 0.45 ? 'push' : 'ride', 8); } else if (skater.pose === 'push' || skater.pose === 'crouch' && !input.ollie) skater.setPose('ride', 10);
        if (P.speed < 0.3 && skater.pose !== 'idle') skater.setPose('idle', 6); else if (P.speed >= 0.3 && skater.pose === 'idle') skater.setPose('ride', 6);
      }
      var nx = P.x + Math.sin(P.yaw) * P.speed * dt, nd = P.d + Math.cos(P.yaw) * P.speed * dt;
      if (nx < -W2 || nx > W2) { nx = Math.max(-W2, Math.min(W2, nx)); P.yaw *= 0.5; }
      var hit = blocked(nx, nd, P.y, 0.32);
      if (hit) {
        if (P.speed > 3.5) { P.d -= 0.6; bail(hit.obstacle ? 'Врезался!' : 'Стена!'); return; }
        P.speed = 0; nx = P.x; nd = P.d;
      }
      var gi = groundInfo(nx, nd, P.y + 0.32);
      var slopeAlong = gi.slope * Math.cos(P.yaw);
      if (gi.h < P.y - 0.12) {
        // ride off an edge / ramp lip → air
        var ang = Math.atan(P.lastSlope || 0);
        P.vy = P.speed * Math.sin(ang); P.spdH = P.speed * Math.max(0.6, Math.cos(ang));
        P.vert = !!(P.lastSolid && P.lastSolid.vert && ang > 0.6);
        if (P.mode === 'manual') endManual();
        P.mode = 'air'; P.airT = 0; P.jumped = false; P.x = nx; P.d = nd;
        if (P.vy > 2) skater.setPose('air', 10);
      } else {
        P.x = nx; P.d = nd; P.y = gi.h; P.lastSlope = slopeAlong; P.lastSolid = gi.solid;
        if (slopeAlong < -0.05) P.speed += -slopeAlong * 6 * dt;
        P.pitch = Math.atan(slopeAlong);
      }
      // ollie
      if (input.olliePress && P.mode !== 'air') {
        if (P.mode === 'manual') endManual();
        var sa = Math.atan(Math.max(0, P.lastSlope || 0));
        P.mode = 'air'; P.vy = OLLIE_V + P.speed * Math.sin(sa); P.spdH = P.speed * Math.max(0.65, Math.cos(sa)); P.airT = 0; P.jumped = true;
        P.vert = !!(P.lastSolid && P.lastSolid.vert && sa > 0.6);
        skater.setPose('air', 14); SFX.pop(); haptic('light');
      }
      if (P.mode === 'manual') {
        P.man += dt;
        if (!balanceTick(dt, sw)) return; sw = null;
      }
      if (sw && P.mode !== 'manual') { P.preSwipe = sw; P.preSwipeT = S.t; }
    } else if (P.mode === 'air') {
      P.airT += dt;
      var g = GRAV;
      if (input.ollie && P.jumped && P.airT < 0.3 && P.vy > 0) g *= 0.38;
      var py = P.y;
      P.vy -= g * dt; P.y += P.vy * dt;
      var ax = P.x + (Math.sin(P.yaw) * P.spdH + jx * 2.8) * dt, ad = P.d + Math.cos(P.yaw) * P.spdH * dt;
      ax = Math.max(-W2, Math.min(W2, ax));
      P.yaw += (jx * 0.3 - P.yaw) * Math.min(1, dt * 1.5);
      // tricks
      if (sw) {
        P.preSwipe = sw; P.preSwipeT = S.t;
        if (!P.trick && P.airT > 0.05) startTrick(sw, P.vert);
      }
      if (P.trick) {
        P.trick.t += dt;
        if (P.trick.t >= P.trick.def.dur) { P.pend.push(P.trick.def); airTrickDone(P.trick.def); P.trick = null; skater.setPose('air', 10); }
      }
      // grind catch
      if (P.vy <= 0.8) {
        for (var i = 0; i < level.rails.length; i++) {
          var r = level.rails[i]; if (ad < r.d0 || ad > r.d1) continue;
          var t = (ad - r.d0) / (r.d1 - r.d0), rx = r.x0 + (r.x1 - r.x0) * t, ry = r.y0 + (r.y1 - r.y0) * t;
          if (Math.abs(ax - rx) < 0.5 && py >= ry - 0.08 && P.y <= ry + 0.12) {
            if (P.trick && P.trick.t < P.trick.def.dur * 0.6) { P.x = ax; P.d = ad; bail('Трюк не докручен'); return; }
            P.d = ad; startGrind(r, rx, ry); return;
          }
        }
      }
      // collisions
      var hb = blocked(ax, ad, P.y, 0.06);
      if (hb && LEVELS.surfH(hb, ad) - P.y > 0.2) { P.x = ax; P.d = ad - 0.5; bail('Врезался!'); return; }
      P.x = ax; P.d = ad;
      var gl = groundInfo(P.x, P.d, Math.max(py, P.y) + 0.06);
      if (P.y <= gl.h && P.vy <= 0) {
        P.y = gl.h;
        if (P.trick && P.trick.t < P.trick.def.dur * 0.82) { bail('Не докрутил'); return; }
        if (P.trick) { P.pend.push(P.trick.def); airTrickDone(P.trick.def); P.trick = null; }
        var had = flushPend();
        if (!had && P.jumped) { lineAdd('Олли', 25); }
        P.mode = 'ride'; P.speed = P.spdH; P.lastSlope = gl.slope; P.lastSolid = gl.solid;
        var hard = Math.min(1, -P.vy / 10);
        SFX.land(0.5 + hard); haptic('light'); skater.setPose('crouch', 20); setTimeout(function () { if (P.mode === 'ride' && skater.pose === 'crouch') skater.setPose('ride', 8); }, 180);
        for (var k = 0; k < 8; k++) emit(P.x, P.y + 0.05, -P.d, (Math.random() - 0.5) * 2, Math.random() * 1, (Math.random() - 0.5) * 2, 0.75, 0.7, 0.6, 0.35, 0.3, 0.6);
        if (S.line) S.line.t = 0;
        camShake = hard * 0.15;
      }
      P.pitch += (Math.atan2(P.vy, Math.max(1, P.spdH)) * 0.35 - P.pitch) * Math.min(1, dt * 4);
    } else if (P.mode === 'grind') {
      var gr = P.grind, rr = gr.rail; gr.t += dt;
      var slope = (rr.y1 - rr.y0) / (rr.d1 - rr.d0);
      P.speed += -slope * 7 * dt; P.speed = Math.max(4, Math.min(14, P.speed));
      P.d += P.speed * dt; P.yaw *= 0.9;
      var tt = (P.d - rr.d0) / (rr.d1 - rr.d0);
      P.x = rr.x0 + (rr.x1 - rr.x0) * tt; P.y = rr.y0 + (rr.y1 - rr.y0) * tt; P.pitch = Math.atan(slope);
      SFX.setGrind(1);
      if (Math.random() < 0.7) emit(P.x, P.y, -P.d + 0.3, (Math.random() - 0.5) * 1.5, Math.random() * 2, Math.random() * 2, 1, 0.75, 0.3, 1, 0.12, 0.35);
      if (gr.t > 0.8 && !balanceTick(dt, sw)) { SFX.setGrind(0); return; }
      if (gr.t <= 0.8 && sw) sw = null;
      if (input.olliePress) { endGrind(); P.mode = 'air'; P.vy = OLLIE_V; P.spdH = P.speed; P.airT = 0; P.jumped = false; skater.setPose('air', 14); SFX.pop(); SFX.setGrind(0); }
      else if (tt >= 1) { endGrind(); P.mode = 'air'; P.vy = 1.2; P.spdH = P.speed; P.airT = 0; P.jumped = false; skater.setPose('air', 10); SFX.setGrind(0); }
    }
    if (P.mode !== 'grind') SFX.setGrind(0);
    // line timing
    if (S.line && (P.mode === 'ride')) { S.line.t += dt; if (S.line.t > 1.0) lineBank(); }
    // finish line
    if (!S.finished && P.d >= level.finishD) {
      if (S.goal) { S.finished = true; goalEvent('finish'); }
      else { lineBank(); P.d = level.startD; P.x = 0; P.yaw = 0; P.y = 0; P.mode = 'ride'; P.camInit = true; showMsg('Новый круг', ''); level.items.forEach(function (it) { it.got = false; }); }
    }
  }
  function endManual() {
    if (P.mode !== 'manual') return;
    lineAdd('Мануал', Math.round(50 + P.man * 45));
    P.mode = 'ride'; P.bal = null; $('bal').style.display = 'none'; skater.setPose('ride', 10);
  }

  // ---------- update: halfpipe ----------
  function pipePos(s) {
    var pd = level.pipe, sg = s < 0 ? -1 : 1, a = Math.abs(s), F = pd.F, R = pd.R, top = F + R * Math.PI / 2;
    if (a <= F) return { x: s, y: 0, th: 0, sg: sg };
    if (a <= top) { var th = (a - F) / R; return { x: sg * (F + R * Math.sin(th)), y: R * (1 - Math.cos(th)), th: th, sg: sg }; }
    return { x: sg * (F + R), y: R + (a - top), th: Math.PI / 2, sg: sg };
  }
  function updPipe(dt) {
    var pd = level.pipe, sw = input.swipes.length ? input.swipes.shift() : null, top = pd.F + pd.R * Math.PI / 2, exitA = top + pd.V;
    if (P.mode === 'bail') {
      P.bailT += dt;
      var B = P.board; B.vy -= GRAV * dt; B.x += B.vx * dt; B.y += B.vy * dt; B.rot += B.spin * dt; if (B.y < 0.03) { B.y = 0.03; B.vy = Math.abs(B.vy) * 0.3; B.vx *= 0.5; }
      skater.boardWorld = E.trs(B.x, B.y, -pd.D, 0, B.rot * 0.3, B.rot);
      P.y += (0 - P.y) * Math.min(1, dt * 4);
      if (P.bailT > 1.7) respawn();
      return;
    }
    if (input.manualPress) { /* no manuals in pipe */ }
    if (P.mode === 'pipe') {
      var pp = pipePos(P.s);
      var acc = -pp.sg * GRAV * Math.sin(pp.th);
      if (Math.abs(P.s) > top) acc = -pp.sg * GRAV;
      // pump
      if (Math.abs(input.jx) > 0.35 && Math.sign(input.jx) === Math.sign(P.v) && pp.th < 0.9) acc += Math.sign(P.v) * 5;
      if (Math.abs(P.v) < 0.2 && pp.th < 0.05 && Math.abs(input.jx) > 0.35) P.v += Math.sign(input.jx) * 3 * dt;
      P.v += acc * dt; P.v *= (1 - 0.06 * dt);
      var vmax = 16; if (Math.abs(P.v) > vmax && pp.th < 0.3) P.v = Math.sign(P.v) * vmax;
      P.s += P.v * dt;
      if (input.olliePress && pp.th > 0.6 && Math.sign(P.v) === pp.sg) { P.boost = true; SFX.pop(); }
      var goingUp = Math.sign(P.v) === pp.sg && pp.th > 0.05;
      // stall/handplant near the top
      if (sw && goingUp && pp.th > 1.05) {
        if (sw === 'D') { P.mode = 'stall'; P.stallT = 0; P.stallDef = { n: 'Лип-стол', p: 150, a: 'stall' }; skater.setPose('stall', 12); hudTrickName('Лип-стол'); sw = null; }
        else if (sw === 'U') { P.mode = 'stall'; P.stallT = 0; P.stallDef = { n: 'Хендплант', p: 250, a: 'handplant', plant: 1 }; skater.setPose('handplant', 8); hudTrickName('Хендплант'); sw = null; }
      }
      if (sw) { P.preSwipe = sw; P.preSwipeT = S.t; }
      if (P.mode === 'pipe' && Math.abs(P.s) >= exitA && Math.sign(P.v) === pp.sg) {
        // launch
        P.mode = 'air'; P.airT = 0; P.vy = Math.abs(P.v) + (P.boost ? 2.5 : 0); P.boost = false; P.airDir = pp.sg;
        P.px = pp.sg * (pd.F + pd.R - 0.28); P.y = pd.R + pd.V; P.vert = true; P.jumped = false;
        P.airTotal = 2 * P.vy / GRAV;
        skater.setPose('air', 10);
      } else {
        pp = pipePos(P.s); P.px = pp.x; P.y = pp.y; P.th = pp.th;
        if (pp.th < 0.05 && skater.pose !== 'ride' && skater.pose !== 'crouch' && skater.pose !== 'push') skater.setPose(Math.abs(input.jx) > 0.35 ? 'crouch' : 'ride', 8);
      }
      if (S.line) { S.line.t += dt; if (S.line.t > 3.0) lineBank(); }
    } else if (P.mode === 'stall') {
      P.stallT += dt;
      var sg = P.s < 0 ? -1 : 1;
      P.px = sg * (pd.F + pd.R + (P.stallDef.plant ? -0.1 : 0.15)); P.y = pd.R + pd.V + (P.stallDef.plant ? Math.min(1, P.stallT * 3) * 0.2 : 0);
      if (P.stallT > (P.stallDef.plant ? 1.3 : 1.0)) {
        lineAdd(P.stallDef.n, P.stallDef.p, 'stall');
        P.mode = 'pipe'; P.s = sg * exitA * 0.999; P.v = -sg * 1.5; skater.setPose('crouch', 10); SFX.land(0.6);
      }
    } else if (P.mode === 'air') {
      P.airT += dt;
      P.vy -= GRAV * dt; P.y += P.vy * dt;
      if (sw) { if (!P.trick) startTrick(sw, true); }
      if (P.trick) { P.trick.t += dt; if (P.trick.t >= P.trick.def.dur) { P.pend.push(P.trick.def); P.trick = null; skater.setPose('air', 10); } }
      if (P.vy < 0 && P.y <= pd.R + pd.V) {
        if (P.trick && P.trick.t < P.trick.def.dur * 0.82) { bail('Не докрутил'); P.board = { x: P.px, y: P.y, vx: -P.airDir * 3, vy: 1, rot: 0, spin: 9 }; return; }
        if (P.trick) { P.pend.push(P.trick.def); P.trick = null; }
        flushPend();
        P.mode = 'pipe'; P.s = P.airDir * exitA * 0.999; P.v = -P.airDir * Math.abs(P.vy); SFX.land(0.6); haptic('light'); skater.setPose('crouch', 14);
        if (S.line) S.line.t = 0;
      }
    }
  }

  // ---------- camera ----------
  var CAM = { back: 3.7, h: 1.75, look: 1.0, ahead: 4, side: 0.55 };
  var cam = { eye: [0, 3, 6], at: [0, 1, 0], proj: null, view: null }, camShake = 0, camYaw = 0;
  function updCamera(dt) {
    var tx, ty, tz, eye, at;
    if (level.kind === 'pipe') {
      tx = P.px || 0; ty = P.y; tz = -level.pipe.D;
      eye = [tx * 0.7, 2.7 + ty * 0.5, tz + 7.8]; at = [tx * 0.85, 1.7 + ty * 0.7, tz];
    } else {
      tx = P.x; ty = P.y; tz = -P.d;
      camYaw += (P.yaw * 0.45 - camYaw) * Math.min(1, dt * 2.5);
      var fx = Math.sin(camYaw), fz = -Math.cos(camYaw);
      var back = CAM.back + Math.min(1.5, P.speed * 0.07);
      eye = [tx - fx * back + CAM.side, ty * 0.6 + CAM.h, tz - fz * back];
      at = [tx + fx * CAM.ahead, ty * 0.75 + CAM.look, tz + fz * CAM.ahead];
    }
    var k = P.camInit ? 1 : Math.min(1, dt * 7);
    for (var i = 0; i < 3; i++) { cam.eye[i] += (eye[i] - cam.eye[i]) * k; cam.at[i] += (at[i] - cam.at[i]) * Math.min(1, k * 1.4); }
    P.camInit = false;
    var sh = camShake; camShake *= Math.pow(0.02, dt);
    var e = [cam.eye[0] + (Math.random() - 0.5) * sh, cam.eye[1] + (Math.random() - 0.5) * sh, cam.eye[2]];
    var fov = (S && S.footyActive ? 78 : 66) * Math.PI / 180;
    cam.proj = E.persp(fov, VW / VH, 0.1, 420); cam.view = E.lookAt(e, cam.at, [0, 1, 0]); cam.eyeR = e;
  }
  function lightVP(center, theme) {
    var sd = theme.sunDir, sz = 26;
    var eye = [center[0] + sd[0] * 60, center[1] + sd[1] * 60, center[2] + sd[2] * 60];
    var up = Math.abs(sd[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
    return E.mul(new Float32Array(16), E.ortho(-sz, sz, -sz, sz, 1, 140), E.lookAt(eye, center, up));
  }

  // ---------- skater root transform ----------
  function updSkaterVisual(dt) {
    var ex = {}, root;
    var tr = P.trick;
    if (tr) {
      var p = Math.min(1, tr.t / tr.def.dur);
      if (tr.def.roll) { ex.boardRoll = p * Math.PI * 2; ex.feetLift = Math.sin(p * Math.PI) * 0.18; }
    }
    if (P.mode === 'grind' && P.grind && P.grind.def.yaw) ex.boardYaw = Math.PI / 2 * 0.9;
    if (level.kind === 'pipe') {
      var pd = level.pipe, z = -pd.D;
      var dir = P.mode === 'air' ? -P.airDir : (P.v >= 0 ? 1 : -1);
      var yaw = dir > 0 ? -Math.PI / 2 : Math.PI / 2, pitch = 0;
      if (P.mode === 'pipe') { var pp = pipePos(P.s); pitch = (Math.sign(P.v) === pp.sg ? 1 : -1) * pp.th; }
      if (P.mode === 'air') {
        var f = Math.min(1, P.airT / Math.max(0.3, P.airTotal || 1));
        var outYaw = P.airDir > 0 ? -Math.PI / 2 : Math.PI / 2;
        yaw = outYaw + Math.PI * f * P.airDir; pitch = Math.PI / 2 * (1 - 2 * f);
      }
      if (P.mode === 'stall') { var sg = P.s < 0 ? -1 : 1; yaw = sg > 0 ? -Math.PI / 2 : Math.PI / 2; pitch = P.stallDef.plant ? Math.PI * 0.95 : 0.0; }
      if (tr && tr.def.spin) yaw += Math.min(1, tr.t / tr.def.dur) * Math.PI * 2;
      var pitchOff = P.mode === 'stall' && P.stallDef.plant ? 1.0 : 0;
      root = E.trs(P.px || 0, P.y + pitchOff, z, pitch, yaw, P.mode === 'bail' ? Math.min(1.4, P.bailT * 3) : 0);
    } else {
      var spin = tr && tr.def.spin ? Math.min(1, tr.t / tr.def.dur) * Math.PI * 2 : 0;
      var lean = P.mode === 'ride' ? -input.jx * 0.18 * Math.min(1, P.speed / 6) : 0;
      root = E.trs(P.x, P.y, -P.d, P.pitch || 0, -P.yaw + spin, lean + (P.mode === 'bail' ? Math.min(1.4, P.bailT * 3) : 0));
    }
    skater.rootM = root;
    skater.update(dt, ex);
  }

  // ---------- footy ----------
  function startFooty() { S.footyActive = true; S.footyT = 6; S.footyTricks = 0; $('lb').style.display = 'block'; SFX.slow(true); popup('Камера пишет!'); }
  function endFooty() { S.footyActive = false; S.footy = 0; $('lb').style.display = 'none'; SFX.slow(false); }

  // ---------- main update ----------
  var lastT = now(), acc = 0;
  function frame() {
    requestAnimationFrame(frame);
    var t = now(), rdt = Math.min(0.05, t - lastT); lastT = t;
    if (state === 'play') update(rdt);
    else if (state === 'menu') updateDemo(rdt);
    if (level && P) render(rdt);
    input.olliePress = false; input.manualPress = false; input.footyPress = false;
    if (state !== 'play') input.swipes.length = 0;
  }
  function update(rdt) {
    keyJoy();
    if (input.footyPress && S.footy >= 1 && !S.footyActive) startFooty();
    var slow = S.footyActive ? 0.42 : 1;
    if (S.footyActive) { S.footyT -= rdt; if (S.footyT <= 0) endFooty(); }
    var dt = rdt * slow;
    S.t += dt;
    var steps = Math.ceil(dt / 0.012), sdt = dt / steps;
    for (var i = 0; i < steps; i++) {
      if (level.kind === 'pipe') updPipe(sdt); else updLine(sdt);
      if (i === 0) { input.olliePress = false; input.manualPress = false; }
    }
    // timers
    if (S.goal && S.goal.time && !S.done && !S.failed) { S.timeLeft -= dt; if (S.timeLeft <= 0) { S.timeLeft = 0; goalEvent('time'); } }
    if (S.calls && S.calls.cur && !S.done && !S.failed) { S.calls.t -= dt; if (S.calls.t <= 0) fail('Не успел: ' + S.calls.cur); }
    // items
    level.items.forEach(function (it) {
      if (it.got) return;
      var px = level.kind === 'pipe' ? P.px : P.x, pdd = level.kind === 'pipe' ? level.pipe.D : P.d;
      if (Math.hypot(it.x - px, it.d - pdd) < 1.0 && Math.abs(it.y - (P.y + 0.7)) < 1.0) {
        it.got = true; SFX.collect(); haptic('light'); goalEvent('collect'); popup('+1');
        for (var k = 0; k < 20; k++) emit(it.x, it.y, -it.d, (Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4, 1, 0.9, 0.3, 1, 0.18, 0.7);
      }
    });
    // sound
    var grounded = P.mode === 'ride' || P.mode === 'manual' || P.mode === 'pipe';
    SFX.setRoll(grounded ? Math.min(1, (P.speed || Math.abs(P.v) || 0) / 11) : 0);
    // end-of-goal
    if ((S.done || S.failed) && S.endT > 0) { S.endT -= rdt; if (S.endT <= 0) showResult(); }
    updParticles(dt);
    updCamera(rdt);
    updSkaterVisual(dt);
    hudTick(rdt);
  }
  // demo in menu: skater pumping in the halfpipe
  function updateDemo(rdt) {
    if (!level || !P) return;
    var dt = rdt;
    if (level.kind === 'pipe') {
      var pp = pipePos(P.s);
      input.jx = Math.abs(P.v) > 0.1 ? Math.sign(P.v) : 1;
      if (P.mode === 'air' && !P.trick && P.airT > 0.15 && Math.random() < 0.03) input.swipes.push(['U', 'L', 'R', 'D'][Math.floor(Math.random() * 4)]);
      var sv = S.goal; S.goal = null; updPipe(dt); S.goal = sv;
      input.swipes.length = 0;
    }
    S.t += dt;
    updParticles(dt);
    // orbit camera
    var a = S.t * 0.12, r = 15;
    var tx = P.px || 0, tz = -level.pipe.D;
    cam.eye = [Math.sin(a) * r, 5.5, tz + Math.cos(a) * r]; cam.at = [tx * 0.4, 2.5, tz];
    cam.proj = E.persp(60 * Math.PI / 180, VW / VH, 0.1, 420); cam.view = E.lookAt(cam.eye, cam.at, [0, 1, 0]); cam.eyeR = cam.eye;
    updSkaterVisual(dt);
    input.jx = 0;
  }

  // ---------- render ----------
  var sceneItems = [];
  function render(dt) {
    var th = level.theme;
    sceneItems.length = 0;
    var curD = level.kind === 'pipe' ? 9999 : P.d;
    for (var i = 0; i < statics.length; i++) {
      var s = statics[i];
      if (curD !== 9999) { var c0 = s.chunk * 60, c1 = c0 + 60; if (c1 < curD - 45 || c0 > curD + 230) continue; }
      sceneItems.push(s);
    }
    skater.items.forEach(function (it) { sceneItems.push(it); });
    // collectibles
    var t = S ? S.t : 0;
    level.items.forEach(function (it, idx) {
      if (it.got) return; var im = itemMeshes[it.type] || itemMeshes.ticket;
      if (curD !== 9999 && (it.d < curD - 30 || it.d > curD + 200)) return;
      sceneItems.push({ mesh: im.mesh, m: E.trs(it.x, it.y + Math.sin(t * 3 + idx) * 0.12, -it.d, 0.3, t * 2.5 + idx, 0.2), mat: { tex: null, col: im.col, spec: 0.6, emis: 0.6 }, noShadow: false });
      if (Math.random() < 0.35) emit(it.x + (Math.random() - 0.5) * 0.6, it.y + (Math.random() - 0.5) * 0.6, -it.d + (Math.random() - 0.5) * 0.6, 0, 0.6, 0, 1, 0.85, 0.3, 0.9, 0.12, 0.5);
    });
    level.spots.forEach(function (sp) {
      if (sp.done) return;
      if (curD !== 9999 && (sp.d < curD - 30 || sp.d > curD + 200)) return;
      var col = sp.kind === 'air' ? [0.2, 0.9, 1.6] : [1.6, 0.4, 1.4];
      if (sp.kind === 'air') {
        sceneItems.push({ mesh: spotMesh, m: E.trs(sp.x, 0.02, -sp.d, 0, 0, 0, sp.r, 1, sp.r), mat: { tex: null, col: col, emis: 1, alpha: 0.28 }, noShadow: true });
        sceneItems.push({ mesh: beamMesh, m: E.trs(sp.x, 0, -sp.d, 0, t, 0, sp.r * 0.9, 6, sp.r * 0.9), mat: { tex: null, col: col, emis: 1, alpha: 0.12 }, noShadow: true });
      } else {
        var rl = sp.rail, len = rl.d1 - rl.d0;
        sceneItems.push({ mesh: beamMesh, m: E.trs(rl.x0, rl.y0, -(rl.d0 + len / 2), Math.PI / 2, 0, 0, 0.25, len, 0.25), mat: { tex: null, col: col, emis: 1, alpha: 0.35 }, noShadow: true });
        sceneItems.push({ mesh: beamMesh, m: E.trs(rl.x0, 0, -(rl.d0 + len / 2), 0, 0, 0, 0.6, 7, 0.6), mat: { tex: null, col: col, emis: 1, alpha: 0.1 }, noShadow: true });
      }
    });
    var center = level.kind === 'pipe' ? [0, 2, -level.pipe.D] : [P.x, P.y, -P.d - 8];
    var scene = { env: th, items: sceneItems, time: t, shadows: save.opt.quality > 0, lightVP: lightVP(center, th), pdata: particles.data, pcount: particles.n };
    renderer.render(scene, { proj: cam.proj, view: cam.view, eye: cam.eyeR || cam.eye });
  }

  // ---------- HUD ----------
  var hudCache = {};
  function setText(id, s) { if (hudCache[id] !== s) { hudCache[id] = s; $(id).innerHTML = s; } }
  function hudReset() {
    hudCache = {}; $('popups').innerHTML = ''; $('bal').style.display = 'none'; $('call').style.display = 'none'; $('lb').style.display = 'none';
    hudGoal(); hudTrick();
  }
  function hudGoal() {
    var g = S.goal, s;
    if (!g) s = '<b>' + level.name + '</b> · свободное катание';
    else {
      var c = '';
      if (g.type === 'count') c = (S.cnt.n || 0) + '/' + g.n;
      if (g.type === 'collect') c = (S.cnt.c || 0) + '/' + g.n;
      if (g.type === 'spots') c = (S.cnt.s || 0) + '/' + g.n;
      if (g.type === 'score') c = Math.min(S.score, g.n) + '/' + g.n + (g.noBail ? ' · без падений' : '');
      if (g.type === 'unique') c = (S.cnt.u || 0) + '/' + g.n;
      if (g.type === 'line') c = 'линия ' + (S.line ? S.line.moves.length : 0) + '/' + g.n;
      if (g.type === 'seq') c = g.seq.join(' → ');
      if (g.type === 'footy') c = (S.cnt.f || 0) + '/' + g.n + ' на камеру';
      if (g.type === 'called') c = (S.calls ? S.calls.n : 0) + '/' + g.n;
      if (g.type === 'reach') c = 'до финиша';
      s = '<b>' + g.name + '</b> · ' + c + (g.time ? '<span id="timer"></span>' : '');
    }
    hudCache.goal = null; setText('goal', s);
  }
  function hudTrickName(n) { var el = $('trick').querySelector('.t'); el.textContent = n; hudCache.tn = n; }
  function hudTrick() {
    var L = S && S.line, el = $('trick');
    el.querySelector('.l').textContent = L ? L.moves.slice(-6).join(' + ') : '';
    el.querySelector('.p').textContent = L ? Math.round(L.sum) + (L.mult > 1 ? ' × ' + L.mult : '') : '';
    if (!L && !(P && P.trick) && !(P && P.grind)) el.querySelector('.t').textContent = '';
    if (S && S.goal && (S.goal.type === 'line' || S.goal.type === 'seq')) hudGoal();
  }
  function hudTick(dt) {
    setText('score', S.score + '<small>' + (S.goal ? '' : 'рекорд ' + save.best.score) + '</small>');
    $('footy').querySelector('i').style.width = (S.footyActive ? S.footyT / 6 * 100 : S.footy * 100) + '%';
    $('bFooty').classList.toggle('rdy', S.footy >= 1 && !S.footyActive);
    if (S.goal && S.goal.time) { var tm = $('timer'); if (tm) { var v = Math.ceil(S.timeLeft); tm.textContent = ' ⏱ ' + v; } }
    if (S.calls && S.calls.cur) $('call').textContent = 'Сделай: ' + S.calls.cur + '  (' + Math.ceil(S.calls.t) + ')';
    if (S.msgT > 0) { S.msgT -= dt; if (S.msgT <= 0) $('msg').classList.remove('on'); }
  }
  function popup(text) {
    var d = document.createElement('div'); d.className = 'pop h'; d.textContent = text;
    d.style.left = (VW * 0.5 - 60 + (Math.random() - 0.5) * 80) + 'px'; d.style.top = (VH * 0.42) + 'px';
    $('popups').appendChild(d); setTimeout(function () { d.remove(); }, 1000);
  }
  function showMsg(a, b) { $('msg').innerHTML = a + (b ? '<small>' + b + '</small>' : ''); $('msg').classList.add('on'); S.msgT = 1.4; }

  // ---------- screens ----------
  var prevScreen = 'main', curScreen = null;
  var SCR = { main: 'mMain', story: 'mStory', brief: 'mBrief', free: 'mFree', help: 'mHelp', records: 'mRecords', options: 'mOptions', pause: 'mPause', result: 'mResult' };
  function show(name) {
    Object.keys(SCR).forEach(function (k) { $(SCR[k]).classList.toggle('on', k === name); });
    if (name && curScreen !== name) prevScreen = curScreen || 'main';
    curScreen = name;
    var playing = name === null;
    $('hud').style.display = playing || name === 'pause' ? 'block' : 'none';
    $('ctl').style.display = playing ? 'block' : 'none';
    if (name === 'story') renderStory();
    if (name === 'free') renderFree();
    if (name === 'records') renderRecords();
    if (name === 'options') renderOptions();
    if (TG && TG.BackButton) { try { if (name && name !== 'main') TG.BackButton.show(); else TG.BackButton.hide(); } catch (e) { } }
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () {
      SFX.init(); SFX.click();
      var go = b.getAttribute('data-go');
      if (b.getAttribute('data-from') === 'pause') backTo = 'pause'; else if (go === 'help' || go === 'options') backTo = 'main';
      show(go);
    });
  });
  var backTo = 'main';
  document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { SFX.click(); show(backTo); }); });
  if (TG && TG.BackButton) TG.BackButton.onClick(function () { if (curScreen === 'pause') resume(); else if (curScreen === 'brief') show('story'); else if (curScreen === 'help' || curScreen === 'options') show(backTo); else if (curScreen && curScreen !== 'main') show('main'); else if (state === 'play') pauseGame(); });

  var curCh = 1;
  function chUnlocked(ch) {
    if (ch === 1) return true;
    var prev = LEVELS.GOALS.filter(function (g) { return g.ch === ch - 1; });
    return prev.filter(function (g) { return save.done[g.id]; }).length >= prev.length - 2;
  }
  function renderStory() {
    var tabs = $('chTabs'); tabs.innerHTML = '';
    LEVELS.CHAPTERS.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'mbtn s ' + (c.id === curCh ? '' : 'g');
      var un = chUnlocked(c.id); b.textContent = c.id + '. ' + c.name + (un ? '' : ' 🔒'); b.disabled = !un; if (!un) b.style.opacity = 0.45;
      b.onclick = function () { SFX.click(); curCh = c.id; renderStory(); }; tabs.appendChild(b);
    });
    var list = $('goalList'); list.innerHTML = '';
    var ch = LEVELS.CHAPTERS[curCh - 1];
    var done = 0, tot = 0;
    LEVELS.GOALS.forEach(function (g) {
      if (g.ch !== curCh) return; tot++; if (save.done[g.id]) done++;
      var d = document.createElement('div'); d.className = 'gi' + (save.done[g.id] ? ' done' : '') + (chUnlocked(g.ch) ? '' : ' lock');
      d.innerHTML = '<b>' + g.name + '</b><small>' + LEVELS.MAPNAMES[g.map] + '</small>';
      d.onclick = function () { SFX.click(); openBrief(g); }; list.appendChild(d);
    });
    $('chTitle').textContent = 'Глава ' + curCh + ': ' + ch.name + ' (' + done + '/' + tot + ')';
  }
  var briefGoal = null;
  function openBrief(g) {
    briefGoal = g; var ch = LEVELS.CHAPTERS[g.ch - 1];
    $('bAva').textContent = ch.mentor[0]; $('bAva').style.background = ch.mcol;
    $('bTitle').textContent = g.name; $('bSub').textContent = ch.mentor + ' · ' + LEVELS.MAPNAMES[g.map] + (g.time ? ' · ' + g.time + ' сек' : '');
    var first = LEVELS.GOALS.filter(function (x) { return x.ch === g.ch; })[0] === g;
    $('bText').innerHTML = (first ? '<i style="color:#bbb">' + ch.intro + '</i><br><br>' : '') + g.text;
    show('brief');
  }
  $('bStart').addEventListener('click', function () { SFX.init(); SFX.click(); startGame(briefGoal.map, briefGoal); });
  function renderFree() {
    var list = $('mapList'); list.innerHTML = '';
    Object.keys(LEVELS.MAPNAMES).forEach(function (id) {
      var d = document.createElement('div'); d.className = 'gi'; d.innerHTML = '<b>' + LEVELS.MAPNAMES[id] + '</b><small>' + ({ pipe: 'рампа, трюки в воздухе', plaza: 'закат, лестницы и бордюры', downtown: 'вечерний город', construction: 'трубы и трамплины', park: 'большие трамплины' }[id] || 'тренировка') + '</small>';
      d.onclick = function () { SFX.click(); startGame(id, null); }; list.appendChild(d);
    });
  }
  function renderRecords() {
    var fav = '-', fn = 0; for (var k in save.tricks) if (k !== 'Олли' && save.tricks[k] > fn) { fn = save.tricks[k]; fav = k; }
    var tot = LEVELS.GOALS.length, dn = Object.keys(save.done).length;
    $('recTable').innerHTML = '<tr><td>Лучший счёт</td><td>' + save.best.score + '</td></tr><tr><td>Самая длинная линия</td><td>' + save.best.line + ' трюков</td></tr><tr><td>Лучшая линия</td><td>' + save.best.lineScore + ' очков</td></tr><tr><td>Любимый трюк</td><td>' + fav + '</td></tr><tr><td>Прогресс</td><td>' + Math.round(dn / tot * 100) + '% (' + dn + '/' + tot + ')</td></tr>';
    var st = ['Наклейка скейтшопа', 'Про-модель доски', 'Видеопарт Киры', 'Обложка «ДОСКИ»'];
    $('stickers').innerHTML = LEVELS.CHAPTERS.map(function (c, i) { var all = LEVELS.GOALS.filter(function (g) { return g.ch === c.id; }); var ok = all.every(function (g) { return save.done[g.id]; }); return '<span class="stk' + (ok ? '' : ' no') + '">' + (ok ? '★ ' : '🔒 ') + st[i] + '</span>'; }).join('');
  }
  function stylesUnlocked() { var n = 1; LEVELS.CHAPTERS.forEach(function (c) { if (c.id < 4 && LEVELS.GOALS.filter(function (g) { return g.ch === c.id; }).every(function (g) { return save.done[g.id]; })) n++; }); return n; }
  function renderOptions() {
    document.querySelectorAll('[data-opt]').forEach(function (b) { var k = b.getAttribute('data-opt'); b.classList.toggle('on', !!save.opt[k]); b.textContent = save.opt[k] ? 'ВКЛ' : 'ВЫКЛ'; });
    $('qBtn').textContent = QNAMES[save.opt.quality];
    var un = stylesUnlocked(); $('styleBtn').textContent = SKATER.STYLES[save.opt.style].name + ' (' + un + '/4)';
  }
  document.querySelectorAll('[data-opt]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-opt'); save.opt[k] = !save.opt[k]; persist(); renderOptions(); SFX.click();
      if (k === 'sound') SFX.setEnabled(save.opt.sound); if (k === 'music') SFX.setMusic(save.opt.music);
    });
  });
  $('qBtn').addEventListener('click', function () { save.opt.quality = (save.opt.quality + 1) % 3; persist(); renderOptions(); layout(); });
  $('styleBtn').addEventListener('click', function () { var un = stylesUnlocked(); save.opt.style = (save.opt.style + 1) % un; persist(); skater.setStyle(save.opt.style); renderOptions(); });
  $('resetBtn').addEventListener('click', function () {
    if ($('resetBtn').textContent !== 'Точно?') { $('resetBtn').textContent = 'Точно?'; return; }
    save.done = {}; save.best = { score: 0, line: 0, lineScore: 0 }; save.tricks = {}; save.opt.style = 0; persist(); skater.setStyle(0); $('resetBtn').textContent = 'Сброс'; renderOptions();
  });

  function startGame(map, goal) {
    $('load').style.display = 'flex'; $('loadTxt').textContent = 'Загружаю: ' + LEVELS.MAPNAMES[map]; $('loadBar').style.width = '60%';
    setTimeout(function () {
      newSession(map, goal);
      skater.setPose('ride', 30); skater.boardDetached = false;
      state = 'play'; show(null); $('load').style.display = 'none';
      $('bMan').style.display = map === 'pipe' ? 'none' : 'flex';
      $('joyhint').style.display = isMobile ? 'flex' : 'none'; $('swipehint').style.display = isMobile ? 'block' : 'none';
      setTimeout(function () { $('swipehint').style.display = 'none'; }, 6000);
      if (goal) showMsg(goal.name, LEVELS.MAPNAMES[map]); else showMsg(LEVELS.MAPNAMES[map], 'свободное катание');
    }, 30);
  }
  function pauseGame() { if (state !== 'play') return; state = 'pause'; SFX.setRoll(0); SFX.setGrind(0); $('pGoal').textContent = S.goal ? S.goal.name + ': ' + S.goal.text : 'Свободное катание: ' + level.name; show('pause'); backTo = 'pause'; }
  function resume() { state = 'play'; show(null); lastT = now(); }
  $('pResume').addEventListener('click', function () { SFX.click(); resume(); });
  $('pRetry').addEventListener('click', function () { SFX.click(); startGame(S.map, S.goal); });
  $('pMenu').addEventListener('click', function () { SFX.click(); toMenu(); });
  function showResult() {
    state = 'result'; SFX.setRoll(0); SFX.setGrind(0);
    var ok = S.done;
    $('rTitle').textContent = ok ? 'Красава!' : 'Не вышло';
    $('rTitle').style.color = ok ? '#7CFF4F' : '#ff6b6b';
    var g = S.goal, txt = '';
    if (g) txt = '<b>' + g.name + '</b><br>' + (ok ? 'Задание выполнено.' : (S.failWhy || '')) + '<br>Очки: ' + S.score + ' · Падений: ' + S.bails;
    if (ok && g) {
      var chGoals = LEVELS.GOALS.filter(function (x) { return x.ch === g.ch; });
      if (chGoals.every(function (x) { return save.done[x.id]; }) && S.firstWin) txt += '<br><br><span class="stk">★ Глава «' + LEVELS.CHAPTERS[g.ch - 1].name + '» пройдена! Новый стиль Бакира в настройках.</span>';
      if (g.id === LEVELS.GOALS.length - 1) txt += '<br><br><b style="color:#ffb21f">БАКИР НА ОБЛОЖКЕ «ДОСКИ»! Игра пройдена!</b>';
    }
    $('rText').innerHTML = txt;
    var next = g ? LEVELS.GOALS[g.id + 1] : null;
    $('rNext').style.display = ok && next && chUnlocked(next.ch) ? 'block' : 'none';
    show('result');
  }
  $('rNext').addEventListener('click', function () { SFX.click(); var n = LEVELS.GOALS[S.goal.id + 1]; curCh = n.ch; if (save.opt.tips) openBrief(n); else startGame(n.map, n); });
  $('rRetry').addEventListener('click', function () { SFX.click(); startGame(S.map, S.goal); });
  $('rMenu').addEventListener('click', function () { SFX.click(); toMenu(); });
  function toMenu() {
    if (S && S.goal) curCh = S.goal.ch;
    $('load').style.display = 'flex'; $('loadTxt').textContent = 'Загрузка…';
    setTimeout(function () {
      newSession('pipe', null); state = 'menu'; skater.boardDetached = false; show('main'); $('load').style.display = 'none';
      SFX.setRoll(0); SFX.setGrind(0);
    }, 30);
  }

  // ---------- boot ----------
  function boot() {
    layout();
    try {
      renderer = new E.Renderer(canvas, { aa: save.opt.quality > 0, shadowSize: save.opt.quality === 2 ? 2048 : 1024 });
    } catch (e) {
      $('loadTxt').textContent = 'Ваше устройство не поддерживает WebGL2: ' + e.message; return;
    }
    layout();
    $('loadBar').style.width = '30%';
    setTimeout(function () {
      makeItemMeshes();
      skater = SKATER.build(renderer, save.opt.style);
      $('loadBar').style.width = '70%';
      newSession('pipe', null);
      state = 'menu'; show('main');
      $('loadBar').style.width = '100%';
      setTimeout(function () { $('load').style.display = 'none'; }, 150);
      SFX.setEnabled(save.opt.sound); SFX.setMusic(save.opt.music);
      requestAnimationFrame(frame);
    }, 20);
    document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'play') pauseGame(); });
  }
  // debug hooks for testing
  window.__G = { CAM: CAM, tick: function (n, dt) { for (var i = 0; i < n; i++) { update(dt || 1 / 60); input.olliePress = false; input.manualPress = false; input.footyPress = false; } }, get skater() { return skater; }, get S() { return S; }, get P() { return P; }, get level() { return level; }, input: input, startGame: startGame, show: show, get state() { return state; } };
  boot();
})();
