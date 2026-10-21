// Карты (уровни) и задания «Скейт Бакира»
'use strict';
var LEVELS = (function () {
  var THEMES = {
    day: { top: [0.18, 0.42, 0.85], hor: [0.72, 0.82, 0.93], bot: [0.5, 0.5, 0.48], sunDir: [0.45, 0.8, 0.35], sunCol: [1.55, 1.45, 1.25], skyAmb: [0.42, 0.5, 0.65], groundAmb: [0.32, 0.29, 0.24], fogD: 0.0075, lit: 0.08 },
    sunset: { top: [0.17, 0.2, 0.45], hor: [1.0, 0.62, 0.38], bot: [0.4, 0.3, 0.25], sunDir: [-0.35, 0.28, -0.85], sunCol: [1.7, 1.08, 0.66], sunSky: [1.4, 0.8, 0.4], skyAmb: [0.42, 0.38, 0.5], groundAmb: [0.32, 0.22, 0.17], fogD: 0.0085, lit: 0.3 },
    evening: { top: [0.05, 0.07, 0.2], hor: [0.55, 0.38, 0.5], bot: [0.15, 0.12, 0.15], sunDir: [0.5, 0.35, -0.6], sunCol: [1.05, 0.72, 0.6], sunSky: [0.9, 0.45, 0.35], skyAmb: [0.28, 0.28, 0.45], groundAmb: [0.2, 0.16, 0.18], fogD: 0.0095, lit: 0.55, stars: 0.6, night: true },
    dusty: { top: [0.35, 0.5, 0.75], hor: [0.85, 0.78, 0.65], bot: [0.5, 0.45, 0.38], sunDir: [-0.5, 0.7, 0.3], sunCol: [1.6, 1.4, 1.1], skyAmb: [0.48, 0.48, 0.52], groundAmb: [0.35, 0.3, 0.24], fogD: 0.009, lit: 0.1 }
  };
  Object.keys(THEMES).forEach(function (k) { THEMES[k].sunDir = E.norm(THEMES[k].sunDir); THEMES[k].fog = THEMES[k].hor; });

  // seeded random
  function RNG(s) { this.s = s || 1; }
  RNG.prototype.r = function () { this.s = (this.s * 16807) % 2147483647; return (this.s - 1) / 2147483646; };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.r(); };
  RNG.prototype.pick = function (a) { return a[Math.floor(this.r() * a.length)]; };

  // ---------- level builder ----------
  function LB(id, opts) {
    this.id = id; this.W = opts.W; this.L = opts.L; this.theme = opts.theme; this.name = opts.name;
    this.geos = {}; this.solids = []; this.rails = []; this.items = []; this.spots = []; this.lights = [];
    this.rng = new RNG(opts.seed || 7); this.kind = 'line'; this.chunk = 60; this.ground = opts.ground || 'concrete';
  }
  LB.prototype.put = function (mat, geo, m, col, d) {
    var ci = Math.max(0, Math.floor((d === undefined ? 0 : d) / this.chunk));
    var key = mat + '|' + ci;
    if (!this.geos[key]) this.geos[key] = { mat: mat, chunk: ci, geo: new E.Geo() };
    this.geos[key].geo.add(geo, m, col);
  };
  // place box: center x, from d to d+len, bottom y0, height h
  LB.prototype.boxAt = function (mat, x, d, w, len, h, y0, col, uvs, opts) {
    var g = E.box(w, h, len, uvs || 1, opts || { ao: true });
    this.put(mat, g, E.trs(x, y0 || 0, -(d + len / 2)), col, d + len / 2);
  };
  LB.prototype.solid = function (s) { this.solids.push(s); return s; };
  LB.prototype.block = function (x, d, w, len, h, mat, opt) {
    opt = opt || {};
    this.boxAt(mat || 'concrete', x, d, w, len, h, opt.y0 || 0, opt.col, opt.uvs || 1);
    this.solid({ type: 'box', x0: x - w / 2, x1: x + w / 2, d0: d, d1: d + len, h: h + (opt.y0 || 0), y0: opt.y0 || 0 });
    if (opt.grind) {
      var self = this;
      [x - w / 2 + 0.06, x + w / 2 - 0.06].forEach(function (rx, i) {
        if (opt.grind === 'L' && i === 1) return; if (opt.grind === 'R' && i === 0) return;
        self.rails.push({ x0: rx, d0: d + 0.1, y0: h + (opt.y0 || 0), x1: rx, d1: d + len - 0.1, y1: h + (opt.y0 || 0), kind: 'ledge' });
        // metal coping strip
        self.boxAt('metal', rx + (i ? 0.04 : -0.04), d, 0.05, len, 0.05, h + (opt.y0 || 0) - 0.045, [0.85, 0.85, 0.9], 1, {});
      });
    }
  };
  // ramp rising along d (dir=+1) or falling (dir=-1); shape: 'kick','bank','qp'
  function rampH(shape, t) {
    if (shape === 'bank') return t;
    if (shape === 'qp') return 1 - Math.sqrt(Math.max(0, 1 - t * t));
    return Math.pow(t, 1.8);
  }
  LB.prototype.ramp = function (x, d, w, len, h, shape, dir, opt) {
    opt = opt || {}; dir = dir || 1; shape = shape || 'kick';
    var prof = [], N = shape === 'bank' ? 1 : 10;
    for (var i = 0; i <= N; i++) {
      var t = i / N, hh = rampH(shape, t) * h;
      prof.push(dir > 0 ? [-(d + t * len), hh] : [-(d + len - t * len), hh]);
    }
    prof.sort(function (a, b) { return b[0] - a[0]; });
    // build in local coords: profile z values are world z; translate x only
    var g = E.extrude(prof.map(function (p) { return [p[0], p[1]]; }), w, 2.5, {});
    this.put(opt.mat || 'rampskin', g, E.trs(x, 0, 0), opt.col, d + len / 2);
    // back wall / support
    var wallD = dir > 0 ? d + len : d;
    this.boxAt('wood', x, dir > 0 ? wallD - 0.06 : wallD, w, 0.06, h, 0, [0.8, 0.8, 0.8], 1.5);
    // coping at lip
    if (h > 0.6) this.put('metal', E.cylinder(0.04, 0.04, w, 8, { center: true }), E.trs(x, h, -wallD, 0, 0, Math.PI / 2), [0.9, 0.9, 0.95], wallD);
    var s = this.solid({ type: 'ramp', shape: shape, dir: dir, x0: x - w / 2, x1: x + w / 2, d0: d, d1: d + len, h: h, vert: !!opt.vert });
    return s;
  };
  LB.prototype.rail = function (x, d0, d1, y0, y1, opt) {
    opt = opt || {};
    var len = d1 - d0, dy = y1 - y0, L = Math.hypot(len, dy), ang = Math.atan2(dy, len);
    var col = opt.col || [0.85, 0.2, 0.15];
    // bar along -z: cylinder along Y rotated to Z
    this.put('paint', E.cylinder(0.045, 0.045, L, 10, { center: true }), E.trs(x, (y0 + y1) / 2, -(d0 + len / 2), Math.PI / 2 + ang, 0, 0), col, d0 + len / 2);
    var posts = Math.max(2, Math.round(len / 3) + 1);
    for (var i = 0; i < posts; i++) {
      var t = (i + 0.5) / posts, pd = d0 + len * t, py = y0 + dy * t, base = opt.base !== undefined ? opt.base : this.groundAt(x, pd);
      if (py - base > 0.05) this.put('paint', E.cylinder(0.035, 0.035, py - base, 8), E.trs(x, base, -pd), col, pd);
    }
    this.rails.push({ x0: x, d0: d0, y0: y0 + 0.04, x1: x, d1: d1, y1: y1 + 0.04, kind: 'rail' });
  };
  LB.prototype.groundAt = function (x, d) {
    var h = 0;
    for (var i = 0; i < this.solids.length; i++) { var s = this.solids[i]; if (x >= s.x0 && x <= s.x1 && d >= s.d0 && d <= s.d1) h = Math.max(h, surfH(s, d)); }
    return h;
  };
  LB.prototype.pipe = function (x, d, len, r, opt) {
    opt = opt || {};
    this.put('paint', E.cylinder(r, r, len, 16, { uvs: 2 }), E.trs(x, r, -(d + len / 2), Math.PI / 2, 0, 0), opt.col || [0.25, 0.45, 0.7], d + len / 2);
    this.solid({ type: 'box', x0: x - r * 0.7, x1: x + r * 0.7, d0: d, d1: d + len, h: r * 2 });
    this.rails.push({ x0: x, d0: d + 0.1, y0: r * 2, x1: x, d1: d + len - 0.1, y1: r * 2, kind: 'pipe' });
  };
  LB.prototype.stairs = function (x, d, w, steps, stepH, stepLen, mat) {
    for (var i = 0; i < steps; i++) {
      var h = (steps - i) * stepH;
      this.boxAt(mat || 'concrete', x, d + i * stepLen, w, stepLen, h, 0, null, 1);
      this.solid({ type: 'box', x0: x - w / 2, x1: x + w / 2, d0: d + i * stepLen, d1: d + (i + 1) * stepLen, h: h, stair: true });
    }
  };
  // decorative props (non-solid unless noted)
  LB.prototype.cone = function (x, d) {
    this.put('paint', E.cylinder(0.04, 0.17, 0.55, 10), E.trs(x, 0.03, -d), [1, 0.38, 0.05], d);
    this.put('paint', E.box(0.4, 0.03, 0.4), E.trs(x, 0, -d), [1, 0.38, 0.05], d);
    this.put('paint', E.cylinder(0.08, 0.11, 0.08, 10, { noCaps: true }), E.trs(x, 0.3, -d), [1.4, 1.4, 1.4], d);
    this.solid({ type: 'box', x0: x - 0.22, x1: x + 0.22, d0: d - 0.22, d1: d + 0.22, h: 0.58, obstacle: true });
  };
  LB.prototype.barrel = function (x, d) {
    this.put('paint', E.cylinder(0.3, 0.3, 0.9, 14), E.trs(x, 0, -d), [0.9, 0.35, 0.1], d);
    this.put('hazard', E.cylinder(0.305, 0.305, 0.2, 14, { noCaps: true, uvs: 0.5 }), E.trs(x, 0.55, -d), null, d);
    this.solid({ type: 'box', x0: x - 0.3, x1: x + 0.3, d0: d - 0.3, d1: d + 0.3, h: 0.9, obstacle: true });
  };
  LB.prototype.hydrant = function (x, d) {
    this.put('paint', E.cylinder(0.12, 0.14, 0.6, 10), E.trs(x, 0, -d), [0.85, 0.12, 0.1], d);
    this.put('paint', E.sphere(0.13, 10, 6), E.trs(x, 0.62, -d), [0.85, 0.12, 0.1], d);
    this.put('paint', E.cylinder(0.05, 0.05, 0.4, 8, { center: true }), E.trs(x, 0.42, -d, 0, 0, Math.PI / 2), [0.85, 0.12, 0.1], d);
    this.solid({ type: 'box', x0: x - 0.18, x1: x + 0.18, d0: d - 0.18, d1: d + 0.18, h: 0.72, obstacle: true });
  };
  LB.prototype.trash = function (x, d) {
    this.put('paint', E.cylinder(0.26, 0.23, 0.85, 12), E.trs(x, 0, -d), [0.2, 0.35, 0.25], d);
    this.put('paint', E.cylinder(0.28, 0.28, 0.06, 12), E.trs(x, 0.85, -d), [0.15, 0.25, 0.2], d);
    this.solid({ type: 'box', x0: x - 0.27, x1: x + 0.27, d0: d - 0.27, d1: d + 0.27, h: 0.9, obstacle: true });
  };
  LB.prototype.bench = function (x, d, len) {
    len = len || 3;
    this.boxAt('wood', x, d, 0.55, len, 0.07, 0.42, null, 1);
    this.boxAt('wood', x - 0.3, d, 0.06, len, 0.4, 0.55, null, 1);
    for (var i = 0; i < 2; i++) this.boxAt('paint', x, d + 0.2 + i * (len - 0.5), 0.5, 0.1, 0.42, 0, [0.15, 0.15, 0.17], 1);
    this.solid({ type: 'box', x0: x - 0.3, x1: x + 0.3, d0: d, d1: d + len, h: 0.49 });
    this.rails.push({ x0: x + 0.24, d0: d + 0.1, y0: 0.49, x1: x + 0.24, d1: d + len - 0.1, y1: 0.49, kind: 'ledge' });
  };
  LB.prototype.planter = function (x, d, w, len, tree) {
    this.block(x, d, w, len, 0.55, 'concrete', { grind: true });
    this.boxAt('dirt', x, d + 0.15, w - 0.3, len - 0.3, 0.02, 0.55, [0.6, 0.6, 0.6], 2, {});
    if (tree) this.tree(x, d + len / 2, 0.55, 1);
  };
  LB.prototype.tree = function (x, d, y0, s) {
    s = s || 1; y0 = y0 || 0;
    this.put('bark', E.cylinder(0.12 * s, 0.18 * s, 2.6 * s, 8), E.trs(x, y0, -d), null, d);
    var r = this.rng;
    for (var i = 0; i < 4; i++) {
      this.put('leaves', E.sphere(1.0 * s * r.range(0.8, 1.2), 10, 7, 0.85), E.trs(x + r.range(-0.6, 0.6) * s, y0 + (2.6 + r.range(0, 1.0)) * s, -d + r.range(-0.6, 0.6) * s), [r.range(0.8, 1.1), r.range(0.85, 1.1), 0.8], d);
    }
  };
  LB.prototype.lamp = function (x, d, side) {
    this.put('paint', E.cylinder(0.06, 0.09, 5, 8), E.trs(x, 0, -d), [0.2, 0.22, 0.25], d);
    this.put('paint', E.box(1.2, 0.08, 0.12), E.trs(x - side * 0.55, 5, -d), [0.2, 0.22, 0.25], d);
    this.put('glow', E.box(0.4, 0.1, 0.25), E.trs(x - side * 1.0, 4.92, -d), [1, 0.9, 0.7], d);
    if (Math.abs(x) < this.W / 2 + 0.2) this.solid({ type: 'box', x0: x - 0.12, x1: x + 0.12, d0: d - 0.12, d1: d + 0.12, h: 5, obstacle: true });
  };
  LB.prototype.car = function (x, d, col, ang) {
    ang = ang || 0;
    var m = E.trs(x, 0, -d, 0, ang, 0);
    var g = new E.Geo();
    g.add(E.box(1.8, 0.7, 4.2, 1, {}), E.trs(0, 0.35, 0));
    g.add(E.box(1.6, 0.55, 2.2, 1, {}), E.trs(0, 1.05, 0.2));
    this.put('carpaint', g, m, col, d);
    var gl = new E.Geo(); gl.add(E.box(1.62, 0.42, 2.0, 1, {}), E.trs(0, 1.1, 0.2)); this.put('glass', gl, m, null, d);
    var w = new E.Geo();
    [[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]].forEach(function (p) { w.add(E.cylinder(0.34, 0.34, 0.25, 12, { center: true }), E.trs(p[0], 0.34, p[1], 0, 0, Math.PI / 2)); });
    this.put('paint', w, m, [0.08, 0.08, 0.08], d);
    var lt = new E.Geo(); lt.add(E.box(0.3, 0.12, 0.05), E.trs(-0.6, 0.55, -2.1)); lt.add(E.box(0.3, 0.12, 0.05), E.trs(0.6, 0.55, -2.1));
    this.put('glow', lt, m, [1, 1, 0.9], d);
    var hw = Math.abs(Math.cos(ang)) * 0.9 + Math.abs(Math.sin(ang)) * 2.1, hl = Math.abs(Math.sin(ang)) * 0.9 + Math.abs(Math.cos(ang)) * 2.1;
    this.solid({ type: 'box', x0: x - hw, x1: x + hw, d0: d - hl, d1: d + hl, h: 1.32 });
  };
  LB.prototype.building = function (x, d, w, len, h, fac, col) {
    this.boxAt(fac, x, d, w, len, h, 0, col, 12, { ao: true, noBottom: true });
    this.boxAt('concrete', x, d, w + 0.3, len + 0.3, 0.4, h, [0.6, 0.6, 0.6], 2, { noBottom: true });
  };
  LB.prototype.finish = function () {
    var d = this.L - 8, W = this.W;
    this.put('paint', E.cylinder(0.15, 0.15, 4.5, 10), E.trs(-W / 2 + 0.6, 0, -d), [0.95, 0.85, 0.1], d);
    this.put('paint', E.cylinder(0.15, 0.15, 4.5, 10), E.trs(W / 2 - 0.6, 0, -d), [0.95, 0.85, 0.1], d);
    this.put('paint', E.box(W - 1.2, 0.25, 0.25, 1, {}), E.trs(0, 4.4, -d), [0.95, 0.85, 0.1], d);
    this.signAt('ФИНИШ', 0, d, 4.65, 6);
    this.finishD = d;
  };
  LB.prototype.signAt = function (text, x, d, y, w, rotY) {
    var g = E.box(w || 4, (w || 4) / 4, 0.12, 1, {});
    // texture spans whole face: uv scale = width
    var gg = E.box(w || 4, (w || 4) / 4, 0.12, 1, {});
    var ww = w || 4; for (var i = 0; i < gg.u.length; i += 2) { gg.u[i] = gg.u[i] / ww + 0.5; gg.u[i + 1] = gg.u[i + 1] / (ww / 4); }
    this.put('sign:' + text, gg, E.trs(x, y, -d, 0, rotY || 0, 0), null, d);
  };
  LB.prototype.item = function (type, x, d, y) { this.items.push({ type: type, x: x, d: d, y: y === undefined ? 0.9 : y, got: false }); };
  LB.prototype.spot = function (kind, x, d, r, len) { this.spots.push({ kind: kind, x: x, d: d, r: r || 2.2, len: len || 0, done: false }); };
  // ground & side scenery helpers
  LB.prototype.groundPlane = function (mat, x0, x1, d0, d1, y, uvs, col) {
    var step = this.chunk;
    for (var d = Math.floor(d0 / step) * step; d < d1; d += step) {
      var a = Math.max(d, d0), b = Math.min(d + step, d1); if (b <= a) continue;
      var g = new E.Geo(), U = uvs || 4;
      g.quad([x0, y || 0, -a], [x1, y || 0, -a], [x1, y || 0, -b], [x0, y || 0, -b], [0, 1, 0], [x0 / U, a / U], [x1 / U, a / U], [x1 / U, b / U], [x0 / U, b / U], col || [1, 1, 1]);
      this.put(mat, g, null, null, (a + b) / 2);
    }
  };
  LB.prototype.cityBlocks = function (side, x0, facs, hmin, hmax, setback) {
    var d = -30, r = this.rng;
    while (d < this.L + 80) {
      var len = r.range(14, 26), w = r.range(10, 16), h = r.range(hmin, hmax);
      var x = side * (x0 + (setback || 0) + w / 2 + r.range(0, 2));
      var c = r.range(0.8, 1.1);
      this.building(x, d, w, len, h, r.pick(facs), [c, c * r.range(0.95, 1.02), c * r.range(0.92, 1.0)]);
      d += len + r.range(1, 5);
    }
  };
  LB.prototype.wallSide = function (side, x, h, mat) {
    var step = 30;
    for (var d = -20; d < this.L + 40; d += step) this.boxAt(mat || 'graffiti', side * x, d, 0.3, step, h, 0, [1, 1, 1], h, { ao: true });
  };
  LB.prototype.fence = function (side, x) {
    for (var d = -20; d < this.L + 40; d += 3) {
      this.put('paint', E.cylinder(0.04, 0.04, 2.2, 6), E.trs(side * x, 0, -d), [0.55, 0.57, 0.6], d);
    }
    for (var d2 = -20; d2 < this.L + 40; d2 += 30) {
      [0.3, 1.2, 2.15].forEach(function (y) { this.put('paint', E.cylinder(0.025, 0.025, 30, 6, { center: true }), E.trs(side * x, y, -(d2 + 15), Math.PI / 2, 0, 0), [0.55, 0.57, 0.6], d2 + 15); }, this);
    }
  };
  LB.prototype.result = function () {
    // bins for solids by d
    var bins = {};
    this.solids.forEach(function (s, i) { for (var b = Math.floor(s.d0 / 10); b <= Math.floor(s.d1 / 10); b++) (bins[b] = bins[b] || []).push(s); });
    return this.extendResult({ id: this.id, name: this.name, kind: this.kind, W: this.W, L: this.L, theme: THEMES[this.theme], themeName: this.theme, geos: this.geos, solids: this.solids, bins: bins, rails: this.rails, items: this.items, spots: this.spots, finishD: this.finishD || this.L - 8, startD: this.startD || 4, startX: this.startX || 0, pipe: this.pipeDef });
  };
  LB.prototype.extendResult = function (r) { return r; };

  function surfH(s, d) {
    if (s.type === 'box') return s.h;
    var t = (d - s.d0) / (s.d1 - s.d0); if (s.dir < 0) t = 1 - t;
    return rampH(s.shape, Math.min(1, Math.max(0, t))) * s.h;
  }
  function surfSlope(s, d) {
    if (s.type === 'box') return 0;
    var e = 0.05, a = surfH(s, d - e), b = surfH(s, d + e);
    return (b - a) / (2 * e);
  }

  // ---------- maps ----------
  var MAPS = {};
  function common(b, opt) {
    var W = b.W, L = b.L;
    b.groundPlane(b.ground, -W / 2, W / 2, -40, L + 60, 0, 4);
  }
  MAPS.train_a = function () {
    var b = new LB('train_a', { name: 'Учебка: Покатушки', W: 14, L: 190, theme: 'day', seed: 11 });
    common(b); b.wallSide(-1, 7.15, 2.6); b.wallSide(1, 7.15, 2.6); b.cityBlocks(-1, 8, ['facadeA', 'facadeB'], 8, 16); b.cityBlocks(1, 8, ['facadeA', 'facadeB'], 8, 16);
    var r = b.rng;
    for (var d = 25; d < 170; d += 9) {
      var x = Math.sin(d * 0.09) * 3.5;
      b.cone(x - 1.6, d); b.cone(x + 1.6, d + 4);
      if (r.r() < 0.4) b.barrel(r.pick([-5.5, 5.5]), d + 2);
    }
    b.signAt('СТАРТ', 0, 2, 3.2, 5); b.finish();
    return b.result();
  };
  MAPS.train_b = function () {
    var b = new LB('train_b', { name: 'Учебка: Олли', W: 14, L: 220, theme: 'day', seed: 12 });
    common(b); b.fence(-1, 7); b.fence(1, 7); b.cityBlocks(-1, 9, ['facadeA', 'facadeB'], 8, 16); b.cityBlocks(1, 9, ['facadeA', 'facadeB'], 8, 16);
    var d = 25, i = 0;
    while (d < 195) {
      var high = i % 3 === 2;
      b.block(0, d, 14, high ? 1.2 : 0.8, high ? 0.75 : 0.4, high ? 'wood' : 'concrete', {});
      if (high) b.boxAt('hazard', 0, d - 0.01, 14, 0.02, 0.2, 0.55, null, 0.25, {});
      d += high ? 18 : 13; i++;
    }
    b.ramp(-4, 60, 3, 2.5, 0.6, 'kick'); b.ramp(4, 110, 3, 2.5, 0.6, 'kick');
    b.signAt('ПРЫГАЙ!', 0, 2, 3.2, 5); b.finish();
    return b.result();
  };
  MAPS.train_c = function () {
    var b = new LB('train_c', { name: 'Учебка: Рельсы', W: 14, L: 260, theme: 'day', seed: 13 });
    common(b); b.wallSide(-1, 7.15, 2.6); b.wallSide(1, 7.15, 2.6); b.cityBlocks(-1, 8, ['facadeA', 'facadeB'], 8, 16); b.cityBlocks(1, 8, ['facadeA', 'facadeB'], 8, 16);
    b.rail(0, 22, 36, 0.5, 0.5, { base: 0 });
    b.block(-4, 45, 0.6, 14, 0.45, 'concrete', { grind: true });
    b.block(4, 45, 0.6, 14, 0.45, 'concrete', { grind: true });
    b.rail(-2.5, 72, 100, 0.55, 0.55, { base: 0, col: [0.2, 0.5, 0.9] });
    b.rail(2.5, 72, 100, 0.55, 0.55, { base: 0, col: [0.2, 0.5, 0.9] });
    b.ramp(0, 112, 4, 2.6, 0.7, 'kick');
    b.rail(0, 117, 140, 1.0, 1.0, { base: 0 });
    b.bench(-4.5, 150, 4); b.bench(4.5, 150, 4);
    b.rail(0, 165, 200, 0.55, 0.55, { base: 0, col: [0.95, 0.75, 0.1] });
    b.block(-4.5, 205, 0.7, 20, 0.5, 'concrete', { grind: true }); b.block(4.5, 205, 0.7, 20, 0.5, 'concrete', { grind: true });
    b.rail(0, 228, 245, 0.55, 0.55, { base: 0 });
    b.signAt('РЕЛЬСЫ', 0, 2, 3.2, 5); b.finish();
    return b.result();
  };
  MAPS.train_d = function () {
    var b = new LB('train_d', { name: 'Учебка: Скорость', W: 14, L: 320, theme: 'day', seed: 14 });
    common(b); b.fence(-1, 7); b.fence(1, 7); b.cityBlocks(-1, 9, ['facadeA', 'facadeB'], 8, 18); b.cityBlocks(1, 9, ['facadeA', 'facadeB'], 8, 18);
    for (var d = 30; d < 290; d += 45) {
      b.ramp(0, d, 6, 3, 0.9, 'kick');
      b.ramp(0, d + 10, 6, 4, 0.9, 'bank', -1);
      b.cone(-5, d + 20); b.cone(5, d + 26); b.barrel(0, d + 32);
    }
    b.signAt('ГАЗУЙ!', 0, 2, 3.2, 5); b.finish();
    return b.result();
  };
  MAPS.plaza = function () {
    var b = new LB('plaza', { name: 'Площадь', W: 22, L: 340, theme: 'sunset', seed: 21, ground: 'tiles' });
    common(b);
    b.groundPlane('concrete', -40, -11, -40, 400, 0.0, 4); b.groundPlane('concrete', 11, 40, -40, 400, 0.0, 4);
    b.cityBlocks(-1, 14, ['facadeA', 'facadeB', 'facadeC'], 12, 34, 7); b.cityBlocks(1, 14, ['facadeA', 'facadeB', 'facadeC'], 12, 34, 7);
    for (var d = 0; d < 340; d += 22) { b.lamp(-10.5, d, -1); b.lamp(10.5, d + 11, 1); }
    // section 1: planters & benches
    b.planter(-6, 20, 1.6, 8, true); b.planter(6, 30, 1.6, 8, true);
    b.bench(-2.5, 44, 4); b.bench(2.5, 52, 4);
    b.block(0, 62, 4, 6, 0.22, 'concrete', {}); // manual pad
    // section 2: platform with stairs and rails
    b.ramp(-5, 78, 8, 5, 1.1, 'bank'); b.block(-5, 83, 8, 14, 1.1, 'tiles', { grind: 'R' });
    b.stairs(-5, 97, 8, 4, 0.275, 0.7, 'concrete');
    b.rail(-5, 97, 99.8, 2.0, 1.15, {}); b.rail(-1.3, 97.2, 100.2, 1.95, 1.0, {});
    b.block(5, 80, 1.2, 22, 0.6, 'concrete', { grind: true });
    // section 3: kickers & gap
    b.ramp(-6, 118, 4, 2.6, 0.8, 'kick'); b.ramp(6, 118, 4, 2.6, 0.8, 'kick');
    b.ramp(0, 132, 6, 3.4, 1.4, 'qp', 1, { vert: true });
    b.ramp(0, 141, 6, 5, 1.0, 'bank', -1);
    b.rail(-7, 150, 175, 0.55, 0.55, { base: 0, col: [0.95, 0.7, 0.1] });
    b.planter(7, 152, 1.6, 10, true);
    b.bench(0, 165, 4);
    // section 4: long ledges and a second platform
    b.block(-3, 185, 0.7, 26, 0.5, 'concrete', { grind: true }); b.block(3, 190, 0.7, 26, 0.5, 'concrete', { grind: true });
    b.ramp(7, 220, 5, 4, 0.9, 'bank'); b.block(7, 224, 5, 10, 0.9, 'tiles', { grind: 'L' }); b.stairs(7, 234, 5, 3, 0.3, 0.7);
    b.rail(4.3, 234, 236.1, 1.8, 1.0, {});
    b.ramp(-6, 232, 4, 2.6, 0.8, 'kick');
    b.planter(-6, 250, 1.6, 8, true); b.planter(0, 262, 1.6, 8, false); b.bench(5, 265, 4);
    b.ramp(0, 276, 6, 3.4, 1.3, 'qp', 1, { vert: true }); b.ramp(0, 284, 6, 4.5, 0.9, 'bank', -1);
    // fountain far right
    b.put('concrete', E.cylinder(3.0, 3.0, 0.6, 28), E.trs(7, 0, -305), [0.9, 0.88, 0.85], 305);
    b.put('water', E.cylinder(2.7, 2.7, 0.05, 28), E.trs(7, 0.52, -305), null, 305);
    b.put('concrete', E.cylinder(0.35, 0.5, 2.2, 14), E.trs(7, 0, -305), [0.85, 0.83, 0.8], 305);
    b.put('concrete', E.cylinder(1.1, 0.4, 0.3, 18), E.trs(7, 2.2, -305), [0.85, 0.83, 0.8], 305);
    b.solid({ type: 'box', x0: 4.2, x1: 9.8, d0: 302.2, d1: 307.8, h: 0.6 });
    b.rails.push({ x0: 4.15, d0: 303, y0: 0.6, x1: 4.15, d1: 307, y1: 0.6, kind: 'ledge' });
    b.signAt('ПЛОЩАДЬ', 0, 2, 3.4, 6);
    b.finish();
    return b.result();
  };
  MAPS.downtown = function () {
    var b = new LB('downtown', { name: 'Центр', W: 20, L: 390, theme: 'evening', seed: 31, ground: 'road' });
    b.groundPlane('road', -6, 6, -40, 450, 0, 12);
    b.groundPlane('concrete', -10, -6, -40, 450, 0.15, 3); b.groundPlane('concrete', 6, 10, -40, 450, 0.15, 3);
    b.groundPlane('concrete', -40, -10, -40, 450, 0.15, 4); b.groundPlane('concrete', 10, 40, -40, 450, 0.15, 4);
    // curbs as solids + grindable edges
    b.solid({ type: 'box', x0: -11, x1: -6, d0: -40, d1: 450, h: 0.15 }); b.solid({ type: 'box', x0: 6, x1: 11, d0: -40, d1: 450, h: 0.15 });
    b.rails.push({ x0: -6.05, d0: 0, y0: 0.15, x1: -6.05, d1: 390, y1: 0.15, kind: 'ledge', curb: true });
    b.rails.push({ x0: 6.05, d0: 0, y0: 0.15, x1: 6.05, d1: 390, y1: 0.15, kind: 'ledge', curb: true });
    for (var dd = -40; dd < 450; dd += 30) { b.boxAt('concrete', -6.05, dd, 0.1, 30, 0.15, 0, [0.75, 0.75, 0.75], 1, {}); b.boxAt('concrete', 6.05, dd, 0.1, 30, 0.15, 0, [0.75, 0.75, 0.75], 1, {}); }
    b.cityBlocks(-1, 11, ['facadeC', 'facadeB', 'facadeA'], 20, 60); b.cityBlocks(1, 11, ['facadeC', 'facadeB', 'facadeA'], 20, 60);
    for (var d = 0; d < 400; d += 20) { b.lamp(-9.4, d, -1); b.lamp(9.4, d + 10, 1); }
    var cols = [[0.75, 0.1, 0.1], [0.1, 0.25, 0.6], [0.85, 0.85, 0.85], [0.1, 0.1, 0.1], [0.9, 0.7, 0.1]], r = b.rng;
    // parked cars and props
    [30, 58, 105, 160, 236, 300, 352].forEach(function (d, i) { b.car(-4.6, d, cols[i % 5], 0); });
    [44, 90, 140, 214, 270, 330].forEach(function (d, i) { b.car(4.6, d, cols[(i + 2) % 5], Math.PI); });
    [20, 75, 128, 190, 250, 315].forEach(function (d) { b.hydrant(-7.2, d); }); [50, 120, 180, 284].forEach(function (d) { b.trash(7.6, d); });
    // street features
    b.ramp(0, 66, 5, 2.6, 0.8, 'kick');
    b.rail(0, 72, 92, 0.6, 0.6, { base: 0, col: [0.95, 0.75, 0.1] });
    b.block(8.2, 96, 1.2, 20, 0.6, 'concrete', { grind: true, y0: 0.15 });
    b.cone(-1.5, 112); b.cone(1.5, 116); b.cone(-1.5, 120);
    b.ramp(-2.5, 145, 4, 3, 1.0, 'kick');
    b.block(-2.5, 150, 3, 12, 1.0, 'concrete', { grind: true });
    b.rail(-2.5, 162, 164, 1.6, 0.9, {});
    // sculpture top-left with launch ramp
    var sx = -8.3, sd = 201.5;
    b.ramp(-5.2, 190, 3.6, 3.6, 1.7, 'qp', 1, { vert: true });
    for (var k = 0; k < 4; k++) b.put('paint', E.box(1.4 - k * 0.2, 1.0, 1.4 - k * 0.2, 1, { center: true }), E.trs(sx, 0.5 + k * 1.0, -sd, 0, k * 0.5, 0.0), [0.75 + k * 0.05, 0.3, 0.2 + k * 0.1], sd);
    b.solid({ type: 'box', x0: sx - 0.7, x1: sx + 0.7, d0: sd - 0.7, d1: sd + 0.7, h: 4.0, y0: 0.15 });
    b.rail(3, 225, 250, 0.6, 0.6, { base: 0 }); b.rail(-3, 228, 253, 0.6, 0.6, { base: 0 });
    b.ramp(0, 262, 6, 3.4, 1.3, 'qp', 1, { vert: true }); b.ramp(0, 270, 6, 4.5, 0.9, 'bank', -1);
    b.block(-8.2, 290, 1.2, 24, 0.6, 'concrete', { grind: true, y0: 0.15 });
    b.rail(0, 322, 345, 0.6, 0.6, { base: 0, col: [0.2, 0.6, 1.0] });
    // fountain right
    b.put('concrete', E.cylinder(2.2, 2.2, 0.6, 24), E.trs(7.8, 0.15, -370), [0.85, 0.85, 0.9], 370);
    b.put('water', E.cylinder(2.0, 2.0, 0.05, 24), E.trs(7.8, 0.67, -370), null, 370);
    b.solid({ type: 'box', x0: 5.8, x1: 9.8, d0: 368, d1: 372, h: 0.75 });
    b.signAt('ЦЕНТР', 0, 2, 3.6, 6);
    b.finish();
    b.groundPlane('road', -6, 6, -40, 0, 0, 12);
    return b.result();
  };
  MAPS.construction = function () {
    var b = new LB('construction', { name: 'Стройка', W: 18, L: 310, theme: 'dusty', seed: 41, ground: 'dirt' });
    common(b);
    b.groundPlane('concrete', -4, 4, -40, 370, 0.01, 4);
    b.fence(-1, 9); b.fence(1, 9);
    b.cityBlocks(-1, 14, ['facadeB', 'facadeA'], 6, 22); b.cityBlocks(1, 14, ['facadeB', 'facadeA'], 6, 22);
    // crane
    b.put('paint', E.box(1.2, 40, 1.2, 4), E.trs(-22, 0, -150), [0.95, 0.75, 0.1], 150);
    b.put('paint', E.box(36, 1.0, 1.0, 4), E.trs(-12, 40, -150), [0.95, 0.75, 0.1], 150);
    var cols = [[0.25, 0.45, 0.7], [0.75, 0.3, 0.15], [0.35, 0.35, 0.38], [0.2, 0.55, 0.3]];
    var pipes = [[-5, 20, 14], [5, 26, 12], [0, 48, 16], [-6, 70, 18], [6, 74, 16], [-2, 100, 12], [3, 118, 20], [-6, 140, 14], [6, 150, 16], [0, 170, 14], [-5, 195, 16], [4.5, 200, 18], [0, 228, 12], [-6, 250, 16], [6, 255, 14], [0, 278, 12]];
    pipes.forEach(function (p, i) { b.pipe(p[0], p[1], p[2], 0.42, { col: cols[i % 4] }); });
    // plywood kickers in front of some pipes
    [[0, 44], [-2, 96], [3, 114], [0, 166], [0, 224], [0, 274]].forEach(function (k) { b.ramp(k[0], k[1], 3, 2.2, 0.6, 'kick', 1, { mat: 'wood' }); });
    // scaffold ledges
    b.block(-7.6, 120, 1.4, 22, 0.9, 'wood', { grind: 'R' }); b.block(7.6, 180, 1.4, 22, 0.9, 'wood', { grind: 'L' });
    [36, 62, 88, 132, 162, 210, 240, 268].forEach(function (d, i) { b.barrel(i % 2 ? 2.8 : -2.8, d); });
    [58, 108, 188, 236].forEach(function (d) { b.cone(-1.2, d); b.cone(1.2, d + 1.5); });
    b.signAt('СТРОЙКА', 0, 2, 3.4, 6);
    b.finish();
    return b.result();
  };
  MAPS.park = function () {
    var b = new LB('park', { name: 'Парк', W: 22, L: 370, theme: 'day', seed: 51, ground: 'concrete' });
    b.groundPlane('concrete', -11, 11, -40, 430, 0, 4);
    b.groundPlane('grass', -60, -11, -40, 430, 0.0, 6); b.groundPlane('grass', 11, 60, -40, 430, 0.0, 6);
    for (var d = -20; d < 420; d += 7) { b.tree(-14 - b.rng.range(0, 8), d + b.rng.range(0, 4), 0, b.rng.range(0.9, 1.4)); b.tree(14 + b.rng.range(0, 8), d + b.rng.range(0, 4), 0, b.rng.range(0.9, 1.4)); }
    b.cityBlocks(-1, 34, ['facadeA', 'facadeB'], 15, 30); b.cityBlocks(1, 34, ['facadeA', 'facadeB'], 15, 30);
    for (d = 0; d < 380; d += 24) { b.lamp(-11.5, d, -1); b.lamp(11.5, d + 12, 1); }
    b.bench(-7, 18, 4); b.bench(7, 26, 4);
    b.block(0, 34, 5, 7, 0.22, 'concrete', {}); // manual pad
    b.ramp(-5, 50, 5, 3.6, 1.6, 'qp', 1, { vert: true }); b.ramp(-5, 58, 5, 5, 1.0, 'bank', -1);
    b.rail(5, 48, 72, 0.55, 0.55, { base: 0 });
    b.block(0, 78, 6, 8, 0.22, 'concrete', {});
    b.ramp(4, 96, 5, 3.6, 1.6, 'qp', 1, { vert: true }); b.ramp(4, 104, 5, 5, 1.0, 'bank', -1);
    b.planter(-6, 92, 1.6, 12, true);
    b.rail(-2, 120, 148, 0.55, 0.55, { base: 0, col: [0.2, 0.6, 1.0] }); b.rail(2, 124, 152, 0.55, 0.55, { base: 0, col: [0.2, 0.6, 1.0] });
    b.bench(-7, 160, 4); b.bench(7, 166, 4);
    b.block(0, 172, 6, 8, 0.22, 'concrete', {});
    b.ramp(0, 190, 6, 3.6, 1.7, 'qp', 1, { vert: true }); b.ramp(0, 198, 6, 5, 1.1, 'bank', -1);
    b.block(-6, 210, 1.0, 24, 0.55, 'concrete', { grind: true }); b.block(6, 214, 1.0, 24, 0.55, 'concrete', { grind: true });
    b.block(0, 245, 6, 8, 0.22, 'concrete', {});
    b.ramp(-4, 262, 5, 3.6, 1.6, 'qp', 1, { vert: true }); b.ramp(-4, 270, 5, 5, 1.0, 'bank', -1);
    b.rail(5, 262, 290, 0.55, 0.55, { base: 0, col: [0.95, 0.7, 0.1] });
    b.bench(-6, 292, 4); b.planter(6, 300, 1.6, 10, true);
    b.block(0, 312, 6, 8, 0.22, 'concrete', {});
    b.ramp(0, 326, 6, 3.6, 1.6, 'qp', 1, { vert: true }); b.ramp(0, 334, 6, 5, 1.0, 'bank', -1);
    b.signAt('ПАРК', 0, 2, 3.4, 5);
    b.finish();
    return b.result();
  };
  // halfpipe — special physics
  MAPS.pipe = function () {
    var b = new LB('pipe', { name: 'Рампа', W: 30, L: 60, theme: 'sunset', seed: 61, ground: 'concrete' });
    b.kind = 'pipe';
    var F = 3.2, R = 3.4, V = 0.35, LEN = 14, DECK = 2.6;
    b.groundPlane('concrete', -60, 60, -40, 80, -0.01, 4);
    // profile across X (we extrude along z then rotate)
    var prof = [];
    prof.push([-(F + R + DECK), R + V]); prof.push([-(F + R), R + V]); prof.push([-(F + R), R]);
    for (var i = 0; i <= 14; i++) { var th = (1 - i / 14) * Math.PI / 2; prof.push([-(F + R * Math.sin(th)), R * (1 - Math.cos(th))]); }
    prof.push([F, 0]);
    for (i = 1; i <= 14; i++) { th = i / 14 * Math.PI / 2; prof.push([F + R * Math.sin(th), R * (1 - Math.cos(th))]); }
    prof.push([F + R, R + V]); prof.push([F + R + DECK, R + V]);
    var g = E.extrude(prof, LEN, 3, { noSides: true });
    b.put('rampskin', g, E.trs(0, 0, -20, 0, Math.PI / 2, 0), null, 20);
    // side walls of pipe (wood) & supports
    [-LEN / 2, LEN / 2].forEach(function (z) {
      var wg = new E.Geo();
      for (var k = 0; k < prof.length - 1; k++) {
        var a = prof[k], c = prof[k + 1];
        wg.quad([a[0], 0, 0], [c[0], 0, 0], [c[0], c[1], 0], [a[0], a[1], 0], [0, 0, z > 0 ? 1 : -1], [a[0] / 2, 0], [c[0] / 2, 0], [c[0] / 2, c[1] / 2], [a[0] / 2, a[1] / 2], [0.8, 0.8, 0.8]);
      }
      b.put('wood', wg, E.trs(0, 0, -20 + z), null, 20);
    });
    [-1, 1].forEach(function (s) {
      b.put('metal', E.cylinder(0.05, 0.05, LEN, 10, { center: true }), E.trs(s * (F + R - 0.02), R + V, -20, Math.PI / 2, 0, 0), [0.95, 0.95, 1], 20);
      b.put('paint', E.cylinder(0.03, 0.03, LEN, 8, { center: true }), E.trs(s * (F + R + DECK - 0.1), R + V + 1.0, -20, Math.PI / 2, 0, 0), [0.8, 0.2, 0.15], 20);
      for (var z2 = -LEN / 2; z2 <= LEN / 2; z2 += 3.5) b.put('paint', E.cylinder(0.03, 0.03, 1.0, 6), E.trs(s * (F + R + DECK - 0.1), R + V, -20 + z2), [0.8, 0.2, 0.15], 20);
    });
    b.signAt('СКЕЙТ БАКИРА', 0, 20 + LEN / 2 + 6, 8.5, 12);
    b.put('paint', E.cylinder(0.12, 0.12, 8, 8), E.trs(-5, 0, -(20 + LEN / 2 + 6)), [0.3, 0.3, 0.32], 26);
    b.put('paint', E.cylinder(0.12, 0.12, 8, 8), E.trs(5, 0, -(20 + LEN / 2 + 6)), [0.3, 0.3, 0.32], 26);
    // surroundings
    var r = b.rng;
    for (var k2 = 0; k2 < 14; k2++) { var a2 = k2 / 14 * Math.PI * 2; b.building(Math.cos(a2) * 55, 20 + Math.sin(a2) * 55, 14, 14, r.range(10, 35), r.pick(['facadeA', 'facadeB', 'facadeC']), [1, 1, 1]); }
    for (k2 = 0; k2 < 10; k2++) b.tree(r.range(-25, 25), r.range(-10, 5) * (r.r() < 0.5 ? 1 : -1) + (r.r() < 0.5 ? 0 : 38), 0, 1.2);
    b.lamp(-12, 20, -1); b.lamp(12, 20, 1);
    b.pipeDef = { F: F, R: R, V: V, LEN: LEN, D: 20, DECK: DECK };
    return b.result();
  };

  // ---------- goals (chapters) ----------
  // type: reach | count(ev,filter) | score | collect | spots | unique | seq | line | balance | stall | switch | footy | called
  var CH = [
    { id: 1, name: 'Азы', mentor: 'Тимур', mcol: '#ff8a1f', intro: 'Здорово, Бакир! Я Тимур. Хочешь на обложку журнала «ДОСКА»? Тогда начинаем с азов.' },
    { id: 2, name: 'Площадь', mentor: 'Рустам', mcol: '#2ee6d6', intro: 'Слышал, ты быстро учишься. Я Рустам, король площади. Покажи, что умеешь.' },
    { id: 3, name: 'Центр', mentor: 'Кира', mcol: '#ff4fd8', intro: 'Я Кира, снимаю скейт-видео. Центр города — наша сцена. Камера уже пишет.' },
    { id: 4, name: 'Парк и рампа', mentor: 'Марат', mcol: '#9dff3a', intro: 'Марат. Редактор «ДОСКИ». Пройдёшь мои испытания — будет тебе обложка.' }
  ];
  var G = [
    // ch1
    { ch: 1, map: 'train_a', name: 'Покатушки', text: 'Джойстик слева — руль и скорость. Вверх — разгон, вниз — тормоз. Проедь трассу до финиша, объезжая конусы.', type: 'reach' },
    { ch: 1, map: 'train_b', name: 'Олли', text: 'Жми ОЛЛИ — прыжок. Держи кнопку дольше — прыжок выше. Высокие барьеры (с жёлтой полосой) бери только высоким олли. Доберись до финиша.', type: 'reach' },
    { ch: 1, map: 'train_c', name: 'Рельсы', text: 'Запрыгни на рельс или край бордюра — грайнд начнётся сам. Сделай 2 грайнда.', type: 'count', ev: 'grind', n: 2 },
    { ch: 1, map: 'train_d', name: 'Скорость', text: 'Доберись до финиша, пока не вышло время! Держи джойстик вверх — это вторая скорость.', type: 'reach', time: 42 },
    { ch: 1, map: 'pipe', name: 'Триста шестьдесят', text: 'В рампе раскачивайся джойстиком влево-вправо. В воздухе свайп ВНИЗ — трюк 360. Сделай пять «360».', type: 'count', ev: 'trick', name2: '360', n: 5, time: 120 },
    { ch: 1, map: 'pipe', name: 'Эйрволк', text: 'Вылети из рампы и сделай свайп ВЛЕВО — Эйрволк. Нужно 2 штуки.', type: 'count', ev: 'trick', name2: 'Эйрволк', n: 2, time: 120 },
    { ch: 1, map: 'pipe', name: 'Стойки', text: 'Подъезжая к краю рампы, сделай свайп ВНИЗ, пока колёса ещё на стенке, — получится стойка на копинге (Лип-стол). Сделай 2.', type: 'count', ev: 'trick', name2: 'Лип-стол', n: 2, time: 120 },
    { ch: 1, map: 'pipe', name: 'Экзамен', text: 'Покажи, что усвоил: 5 воздушных трюков в рампе за минуту.', type: 'count', ev: 'air', n: 5, time: 60 },
    // ch2
    { ch: 2, map: 'train_c', name: 'Баланс', text: 'На длинных рельсах появляются стрелки баланса. Свайпни в сторону стрелки, иначе упадёшь. Поймай 2 стрелки.', type: 'count', ev: 'balance', n: 2 },
    { ch: 2, map: 'train_c', name: 'Смена грайнда', text: 'Свайп перед приземлением на рельс меняет грайнд: вверх — Носграйнд, вниз — Файв-О, вбок — Бордслайд. Смени грайнд 2 раза.', type: 'count', ev: 'grindSwitch', n: 2 },
    { ch: 2, map: 'plaza', name: 'Мануал-линия', text: 'Кнопка МАНУАЛ на скорости — езда на задних колёсах. Сделай линию: Кикфлип → Мануал → Инди.', type: 'seq', seq: ['Кикфлип', 'Мануал', 'Инди'] },
    { ch: 2, map: 'plaza', name: 'Линия из 4', text: 'Линия — трюки подряд без пауз. Чем длиннее линия, тем больше множитель. Сделай линию из 4 трюков.', type: 'line', n: 4 },
    { ch: 2, map: 'plaza', name: 'Билетики', text: 'Растерял билеты на концерт по всей площади! Они лежат низко у земли. Собери 8 штук.', type: 'collect', item: 'ticket', n: 8 },
    { ch: 2, map: 'plaza', name: 'Фотографы', text: 'На площади ждут фотографы. Сделай воздушный трюк в каждой из 5 светящихся зон.', type: 'spots', spot: 'air', n: 5 },
    { ch: 2, map: 'plaza', name: 'Тетрадь трюков', text: 'Я уронил тетрадь с трюками где-то справа в конце площади, у фонтана. Найди её!', type: 'collect', item: 'book', n: 1 },
    { ch: 2, map: 'plaza', name: '700 очков', text: 'Думаешь, ты крутой? Набери 700 очков на площади.', type: 'score', n: 700 },
    // ch3
    { ch: 3, map: 'downtown', name: 'Футаж', text: 'Заполняй шкалу ФУТАЖ трюками. Когда она полная, жми кнопку с камерой — включится замедление. Чисто приземли 2 трюка на камеру.', type: 'footy', n: 2 },
    { ch: 3, map: 'downtown', name: 'Реакция', text: 'Делай трюки, которые я называю. Пять подряд!', type: 'called', n: 5 },
    { ch: 3, map: 'downtown', name: 'Подшипники', text: 'Сгоняй в скейтшоп в конце улицы за подшипниками, пока не закрылись!', type: 'reach', time: 48 },
    { ch: 3, map: 'construction', name: 'Грайнд-рай', text: 'Строители оставили кучу труб. Сделай 8 грайндов до конца стройки.', type: 'count', ev: 'grind', n: 8 },
    { ch: 3, map: 'construction', name: 'Пять разных', text: 'Сделай 5 РАЗНЫХ трюков до конца трассы.', type: 'unique', n: 5 },
    { ch: 3, map: 'construction', name: 'Флаеры', text: 'Проезжай грайндом по отмеченным трубам — расклеим флаеры нашего скейт-шоу. Нужно 5 труб.', type: 'spots', spot: 'grind', n: 5 },
    { ch: 3, map: 'downtown', name: 'Очки на скульптуре', text: 'Твои тёмные очки улетели на верх скульптуры слева. Разгонись с трамплина и забери их!', type: 'collect', item: 'shades', n: 1 },
    { ch: 3, map: 'downtown', name: '800 очков', text: 'Изучи центр и набери 800 очков.', type: 'score', n: 800 },
    // ch4
    { ch: 4, map: 'pipe', name: '900 за минуту', text: 'Разорви рампу: 900 очков за 60 секунд!', type: 'score', n: 900, time: 60 },
    { ch: 4, map: 'park', name: 'Ростбиф-линия', text: 'Линия: Мануал → Ростбиф → Мануал → Эйрволк. Ростбиф — свайп ВПРАВО после вылета с большого трамплина.', type: 'seq', seq: ['Мануал', 'Ростбиф', 'Мануал', 'Эйрволк'] },
    { ch: 4, map: 'pipe', name: 'Верт-линия', text: 'В рампе: Ростбиф → Эйрволк → Стиффи в одной линии. Включи футаж, без замедления не успеть!', type: 'seq', seq: ['Ростбиф', 'Эйрволк', 'Стиффи'], time: 120 },
    { ch: 4, map: 'park', name: 'Без падений', text: 'Пройди парк без единого падения и набери 400 очков.', type: 'score', n: 400, noBail: true },
    { ch: 4, map: 'park', name: 'Кегли', text: 'Пацаны раскидали кегли по всему парку. Собери 10.', type: 'collect', item: 'pin', n: 10 },
    { ch: 4, map: 'park', name: 'Фотосессия', text: 'Фотограф ждёт у отмеченных рельсов и бордюров. Програйнди 6 отмеченных мест.', type: 'spots', spot: 'grind', n: 6 },
    { ch: 4, map: 'downtown', name: 'Под давлением', text: 'Все смотрят! 2000 очков и ни одного падения.', type: 'score', n: 2000, noBail: true },
    { ch: 4, map: 'park', name: 'Обложка', text: 'Финал. Редакция «ДОСКИ» хочет линию из 12 трюков. Сделаешь — ты на обложке!', type: 'line', n: 12 }
  ];
  G.forEach(function (g, i) { g.id = i; });

  // items & spots per goal (placed on the map at load)
  function decorate(lv, goal) {
    lv.items = []; lv.spots = [];
    if (!goal) return;
    var r = new RNG(100 + goal.id);
    if (goal.type === 'collect') {
      if (goal.item === 'ticket') { for (var i = 0; i < 10; i++) lv.items.push({ type: 'ticket', x: r.range(-8, 8), d: 20 + i * 28 + r.range(0, 8), y: 0.45, got: false }); }
      if (goal.item === 'book') lv.items.push({ type: 'book', x: 9.5, d: 300, y: 0.6, got: false });
      if (goal.item === 'shades') lv.items.push({ type: 'shades', x: -6.9, d: 197.4, y: 4.0, got: false });
      if (goal.item === 'pin') { for (i = 0; i < 12; i++) lv.items.push({ type: 'pin', x: r.range(-8, 8), d: 15 + i * 27 + r.range(0, 6), y: 0.6, got: false }); }
    }
    if (goal.type === 'spots') {
      if (goal.spot === 'air') {
        // over kickers / ramps & stairs
        [[-6, 121.5], [6, 121.5], [0, 136.5], [0, 280], [-5, 100.5], [-6, 235]].forEach(function (p) { lv.spots.push({ kind: 'air', x: p[0], d: p[1], r: 2.4, done: false }); });
      } else {
        var cands = lv.rails.filter(function (rl) { return !rl.curb && (rl.d1 - rl.d0) > 4; });
        var step = Math.max(1, Math.floor(cands.length / (goal.n + 1)));
        for (i = 0; i < cands.length && lv.spots.length < goal.n + 1; i += step) lv.spots.push({ kind: 'grind', rail: cands[i], x: cands[i].x0, d: (cands[i].d0 + cands[i].d1) / 2, done: false });
      }
    }
  }
  function build(id) { return MAPS[id](); }
  return { build: build, THEMES: THEMES, GOALS: G, CHAPTERS: CH, decorate: decorate, surfH: surfH, surfSlope: surfSlope, MAPNAMES: { train_a: 'Учебка: Покатушки', train_b: 'Учебка: Олли', train_c: 'Учебка: Рельсы', train_d: 'Учебка: Скорость', plaza: 'Площадь', downtown: 'Центр', construction: 'Стройка', park: 'Парк', pipe: 'Рампа' } };
})();
