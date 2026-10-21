// Бакир — 3D модель скейтера, процедурная анимация
'use strict';
var SKATER = (function () {
  var STYLES = [
    { name: 'Классика', hoodie: [0.95, 0.42, 0.1], pants: [0.16, 0.2, 0.32], shoes: [0.92, 0.92, 0.9], cap: [0.08, 0.08, 0.1], skin: [0.86, 0.64, 0.5], wheel: [1, 0.85, 0.3] },
    { name: 'Ночь', hoodie: [0.12, 0.12, 0.14], pants: [0.35, 0.33, 0.3], shoes: [0.1, 0.1, 0.1], cap: [0.8, 0.1, 0.12], skin: [0.8, 0.58, 0.45], wheel: [0.9, 0.9, 0.9] },
    { name: 'Токсик', hoodie: [0.45, 0.85, 0.15], pants: [0.1, 0.1, 0.12], shoes: [0.95, 0.3, 0.6], cap: [0.95, 0.85, 0.2], skin: [0.88, 0.67, 0.52], wheel: [0.3, 0.9, 1] },
    { name: 'Спорт', hoodie: [0.15, 0.3, 0.85], pants: [0.9, 0.9, 0.92], shoes: [0.95, 0.95, 0.95], cap: [0.95, 0.95, 0.95], skin: [0.72, 0.5, 0.36], wheel: [1, 0.4, 0.2] }
  ];
  // pose params (person frame: +Z faces toe side, +X = nose/forward travel, Y up)
  var BASE = {
    hip: [0.0, 0.93, 0.03], lean: 0.12, twist: 0.25, side: 0.0,
    fL: [0.23, 0.12, 0.02], fR: [-0.2, 0.12, 0.0],
    hL: [0.4, 0.98, 0.18], hR: [-0.36, 0.92, 0.02],
    head: 1.15, headPitch: 0.05,
    bPitch: 0, bRoll: 0, bYaw: 0, bLift: 0, bFwd: 0, bodySpin: 0, bodyRoll: 0, bodyY: 0
  };
  function P(o) { var p = JSON.parse(JSON.stringify(BASE)); for (var k in o) p[k] = o[k]; return p; }
  var POSES = {
    ride: P({}),
    crouch: P({ hip: [0, 0.68, 0.08], lean: 0.45, hL: [0.38, 0.72, 0.32], hR: [-0.32, 0.66, 0.25], headPitch: -0.1 }),
    push: P({ hip: [0.06, 0.82, 0.02], lean: 0.3, fL: [0.23, 0.12, 0.02], fR: [-0.12, 0.0, 0.26], hL: [0.42, 0.9, 0.2], hR: [-0.4, 0.82, -0.1] }),
    air: P({ hip: [0, 0.78, 0.04], lean: 0.32, fL: [0.24, 0.2, 0.02], fR: [-0.2, 0.2, 0.0], hL: [0.5, 1.05, 0.25], hR: [-0.5, 0.98, 0.1] }),
    kickflip: P({ hip: [0, 0.86, 0.04], lean: 0.25, fL: [0.3, 0.42, 0.2], fR: [-0.2, 0.38, -0.05], hL: [0.55, 1.15, 0.28], hR: [-0.55, 1.05, 0.0], bLift: 0.12 }),
    indy: P({ hip: [0, 0.66, 0.08], lean: 0.55, fL: [0.22, 0.32, 0.0], fR: [-0.2, 0.32, 0.0], hL: [0.55, 1.05, 0.3], hR: [-0.02, 0.26, 0.15], bLift: 0.14 }),
    airwalk: P({ hip: [0.0, 0.9, 0.0], lean: -0.05, fL: [0.25, 0.25, 0.42], fR: [-0.15, 0.32, -0.42], hL: [0.42, 0.42, 0.06], hR: [-0.6, 1.25, 0.0], bLift: 0.18, bFwd: 0.12, bRoll: 0.35 }),
    stiffy: P({ hip: [0.0, 0.98, -0.02], lean: 0.15, fL: [0.28, 0.12, 0.0], fR: [-0.22, 0.12, 0.0], hL: [0.6, 1.1, 0.1], hR: [-0.25, 0.24, 0.12], bPitch: 0.5, bLift: 0.0 }),
    roastbeef: P({ hip: [0, 0.66, 0.08], lean: 0.5, fL: [0.22, 0.3, 0.02], fR: [-0.2, 0.3, 0.0], hL: [0.55, 1.05, 0.3], hR: [0.0, 0.25, -0.12], bLift: 0.12 }),
    manual: P({ hip: [-0.1, 0.9, 0.0], lean: -0.12, fL: [0.18, 0.2, 0.02], fR: [-0.26, 0.12, 0.0], hL: [0.5, 1.15, 0.3], hR: [-0.55, 1.1, 0.2], bPitch: 0.22 }),
    grind: P({ hip: [0, 0.76, 0.06], lean: 0.35, hL: [0.65, 1.12, 0.1], hR: [-0.65, 1.05, 0.05], headPitch: -0.05 }),
    nosegrind: P({ hip: [0.08, 0.78, 0.06], lean: 0.4, fL: [0.26, 0.16, 0.02], fR: [-0.16, 0.28, 0.0], hL: [0.7, 1.05, 0.1], hR: [-0.6, 1.1, 0.0], bPitch: -0.22 }),
    fiveo: P({ hip: [-0.1, 0.8, 0.04], lean: 0.2, fL: [0.18, 0.28, 0.02], fR: [-0.26, 0.14, 0.0], hL: [0.65, 1.15, 0.1], hR: [-0.6, 1.05, 0.05], bPitch: 0.22 }),
    boardslide: P({ hip: [0, 0.8, 0.05], lean: 0.3, hL: [0.6, 1.1, 0.25], hR: [-0.6, 1.05, 0.2], bYaw: 0 }),
    stall: P({ hip: [0, 0.72, 0.1], lean: 0.5, hL: [0.4, 0.75, 0.35], hR: [-0.35, 0.7, 0.3], bPitch: 0.35 }),
    handplant: P({ hip: [0, 0.95, 0.0], lean: 0.0, fL: [0.2, 0.35, 0.05], fR: [-0.2, 0.35, 0.0], hL: [0.05, 1.9, 0.25], hR: [-0.1, 0.55, 0.0], bLift: 0.25 }),
    bail: P({ hip: [0, 0.3, -0.25], lean: -1.2, side: 0.4, fL: [0.35, 0.25, 0.5], fR: [-0.2, 0.1, 0.4], hL: [0.6, 0.6, -0.4], hR: [-0.5, 0.2, -0.5], head: 0.3, headPitch: 0.3 }),
    idle: P({ hip: [0, 0.97, 0.0], lean: 0.05, hL: [0.22, 0.6, 0.06], hR: [-0.22, 0.6, 0.06], head: 0.9 })
  };

  function build(r, styleIdx) {
    var st = STYLES[styleIdx || 0];
    var tCloth = TEX.get(r, 'cloth'), tFace = TEX.get(r, 'face'), tGrip = TEX.get(r, 'grip'), tDeck = TEX.get(r, 'deck'), tMetal = TEX.get(r, 'metal');
    function M(g) { return r.mesh(g); }
    var parts = {};
    var items = [];
    function part(name, geo, mat) { var it = { mesh: M(geo), m: E.m4(), mat: mat }; parts[name] = it; items.push(it); return it; }
    var hoodie = { tex: tCloth, col: st.hoodie, spec: 0.05 }, pants = { tex: tCloth, col: st.pants, spec: 0.05 }, skin = { tex: null, col: st.skin, spec: 0.15 };
    // torso: tapered, from y=0 (waist) up to 0.55
    var tg = new E.Geo();
    tg.add(E.cylinder(0.2, 0.16, 0.5, 14, {}), E.trs(0, 0, 0, 0, 0, 0, 1, 1, 0.68));
    tg.add(E.sphere(0.2, 14, 8, 0.55), E.trs(0, 0.5, 0, 0, 0, 0, 1, 1, 0.68));
    // hood
    tg.add(E.sphere(0.15, 10, 6, 0.6), E.trs(0, 0.5, -0.1, 0.3, 0, 0));
    // pocket
    tg.add(E.box(0.22, 0.12, 0.04), E.trs(0, 0.08, 0.12, 0, 0, 0));
    part('torso', tg, hoodie);
    var pg = new E.Geo(); pg.add(E.sphere(0.17, 12, 8, 0.7), E.trs(0, 0, 0, 0, 0, 0, 1, 1, 0.75)); part('pelvis', pg, pants);
    // head with face
    var hg = new E.Geo(); hg.add(E.sphere(0.115, 16, 12, 1.12), E.trs(0, 0, 0, 0, -Math.PI / 2, 0)); part('head', hg, { tex: tFace, col: st.skin, spec: 0.2 });
    // cap backwards + ears
    var cg = new E.Geo(); cg.add(E.sphere(0.122, 14, 6, 0.75), null);
    cg.add(E.box(0.16, 0.012, 0.12), E.trs(0, 0.0, -0.15, 0.05, 0, 0));
    part('cap', cg, { tex: tCloth, col: st.cap, spec: 0.1 });
    var neck = new E.Geo(); neck.add(E.cylinder(0.05, 0.055, 0.1, 8), null); part('neck', neck, skin);
    // limbs (nominal lengths)
    var UA = 0.3, LA = 0.28, TH = 0.44, SH = 0.43;
    part('uaL', E.limb(UA, 0.062, 0.052, 10), hoodie); part('uaR', E.limb(UA, 0.062, 0.052, 10), hoodie);
    part('laL', E.limb(LA, 0.052, 0.042, 10), hoodie); part('laR', E.limb(LA, 0.052, 0.042, 10), hoodie);
    var hand = new E.Geo(); hand.add(E.sphere(0.048, 8, 6, 1.1), null);
    part('hdL', hand, skin); part('hdR', hand, skin);
    part('thL', E.limb(TH, 0.085, 0.07, 10), pants); part('thR', E.limb(TH, 0.085, 0.07, 10), pants);
    part('shL', E.limb(SH, 0.07, 0.058, 10), pants); part('shR', E.limb(SH, 0.07, 0.058, 10), pants);
    var shoe = new E.Geo(); shoe.add(E.box(0.12, 0.08, 0.28), E.trs(0, -0.02, 0.05)); shoe.add(E.box(0.125, 0.025, 0.29), E.trs(0, -0.03, 0.05));
    part('ftL', shoe, { tex: tCloth, col: st.shoes, spec: 0.3 }); part('ftR', shoe, { tex: tCloth, col: st.shoes, spec: 0.3 });
    // board (root frame: long axis along Z)
    var dk = new E.Geo();
    dk.add(E.box(0.21, 0.014, 0.56, 0.6), E.trs(0, 0, 0));
    dk.add(E.box(0.2, 0.014, 0.16, 0.6), E.trs(0, 0.02, -0.35, -0.28, 0, 0));
    dk.add(E.box(0.2, 0.014, 0.16, 0.6), E.trs(0, 0.02, 0.35, 0.28, 0, 0));
    part('deck', dk, { tex: tDeck, col: [1, 1, 1], spec: 0.35 });
    var gp = new E.Geo();
    gp.add(E.box(0.205, 0.003, 0.56, 0.3), E.trs(0, 0.0145, 0));
    gp.add(E.box(0.195, 0.003, 0.16, 0.3), E.trs(0, 0.0345, -0.35, -0.28, 0, 0));
    gp.add(E.box(0.195, 0.003, 0.16, 0.3), E.trs(0, 0.0345, 0.35, 0.28, 0, 0));
    part('grip', gp, { tex: tGrip, col: [1, 1, 1], spec: 0.0 });
    var tr = new E.Geo();
    [-0.2, 0.2].forEach(function (z) { tr.add(E.box(0.06, 0.035, 0.05), E.trs(0, -0.035, z)); tr.add(E.cylinder(0.008, 0.008, 0.2, 6, { center: true }), E.trs(0, -0.06, z, 0, 0, Math.PI / 2)); });
    part('trucks', tr, { tex: tMetal, col: [0.8, 0.82, 0.85], spec: 0.8 });
    var wh = new E.Geo();
    [-0.2, 0.2].forEach(function (z) { [-0.095, 0.095].forEach(function (x) { wh.add(E.cylinder(0.028, 0.028, 0.03, 10, { center: true }), E.trs(x, -0.06, z, 0, 0, Math.PI / 2)); }); });
    part('wheels', wh, { tex: null, col: st.wheel, spec: 0.4 });
    // blob shadow handled by shadow map
    var self = {
      items: items, parts: parts, cur: P({}), pose: 'ride', target: POSES.ride, blend: 12,
      rootM: E.m4(), boardM: null, boardDetached: false, boardWorld: E.m4()
    };
    self.setPose = function (name, speed) { self.pose = name; self.target = POSES[name] || POSES.ride; self.blend = speed || 12; };
    self.update = function (dt, extra) {
      var c = self.cur, t = self.target, k = 1 - Math.exp(-self.blend * dt);
      for (var key in t) {
        if (Array.isArray(t[key])) for (var i = 0; i < 3; i++) c[key][i] += (t[key][i] - c[key][i]) * k;
        else c[key] += (t[key] - c[key]) * k;
      }
      // extra procedural offsets (board flip etc.) supplied each frame
      self.compose(extra || {});
    };
    function limbM(A, B, hint, nominal) {
      var d = [A[0] - B[0], A[1] - B[1], A[2] - B[2]], L = Math.hypot(d[0], d[1], d[2]) || 1e-3;
      var y = [d[0] / L, d[1] / L, d[2] / L];
      var x = E.norm(E.cross(y, hint)); if (!isFinite(x[0])) x = [1, 0, 0];
      var z = E.cross(x, y), s = L / nominal, m = new Float32Array(16);
      m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = y[0] * s; m[5] = y[1] * s; m[6] = y[2] * s; m[8] = z[0]; m[9] = z[1]; m[10] = z[2];
      m[12] = A[0]; m[13] = A[1]; m[14] = A[2]; m[15] = 1; return m;
    }
    function ik(H, F, a, b, hint) {
      var d = [F[0] - H[0], F[1] - H[1], F[2] - H[2]], L = Math.hypot(d[0], d[1], d[2]);
      var maxL = (a + b) * 0.999; if (L > maxL) { var s = maxL / L; d = [d[0] * s, d[1] * s, d[2] * s]; L = maxL; F = [H[0] + d[0], H[1] + d[1], H[2] + d[2]]; }
      var dir = [d[0] / L, d[1] / L, d[2] / L];
      var x = (a * a - b * b + L * L) / (2 * L), hgt = Math.sqrt(Math.max(a * a - x * x, 0));
      // bend dir = hint orthogonalized
      var dot = hint[0] * dir[0] + hint[1] * dir[1] + hint[2] * dir[2];
      var bd = E.norm([hint[0] - dir[0] * dot, hint[1] - dir[1] * dot, hint[2] - dir[2] * dot]);
      var K = [H[0] + dir[0] * x + bd[0] * hgt, H[1] + dir[1] * x + bd[1] * hgt, H[2] + dir[2] * x + bd[2] * hgt];
      return [K, F];
    }
    function tp(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
    self.compose = function (ex) {
      var c = self.cur;
      var bodyM = E.mul(E.m4(), self.rootM, E.trs(0, c.bodyY, 0, c.bodyRoll, Math.PI / 2 + c.bodySpin, 0));
      // pelvis
      var hipM = E.trs(c.hip[0], c.hip[1], c.hip[2], 0, c.twist * 0.4, 0);
      var torsoM = E.mul(E.m4(), hipM, E.trs(0, 0.05, 0, c.lean, c.twist * 0.6, c.side));
      E.mul(parts.pelvis.m, bodyM, hipM);
      E.mul(parts.torso.m, bodyM, torsoM);
      var neckM = E.mul(E.m4(), torsoM, E.trs(0, 0.56, 0.0, -c.lean * 0.4 + c.headPitch, 0, 0));
      E.mul(parts.neck.m, bodyM, neckM);
      var headM = E.mul(E.m4(), neckM, E.trs(0, 0.17, 0.0, 0, c.head - c.twist, 0));
      E.mul(parts.head.m, bodyM, headM);
      E.mul(parts.cap.m, bodyM, E.mul(E.m4(), headM, E.trs(0, 0.035, 0, -0.12, Math.PI, 0)));
      // shoulders & hips in person space
      var shL = tp(torsoM, [0.2, 0.46, 0]), shR = tp(torsoM, [-0.2, 0.46, 0]);
      var hpL = tp(hipM, [0.1, -0.02, 0]), hpR = tp(hipM, [-0.1, -0.02, 0]);
      var fL = c.fL.slice(), fR = c.fR.slice();
      if (ex.feetLift) { fL[1] += ex.feetLift; fR[1] += ex.feetLift; }
      var legL = ik(hpL, [fL[0], fL[1] + 0.08, fL[2]], TH, SH, [0.25, 0, 1]), legR = ik(hpR, [fR[0], fR[1] + 0.08, fR[2]], TH, SH, [-0.25, 0, 1]);
      E.mul(parts.thL.m, bodyM, limbM(hpL, legL[0], [1, 0, 0], TH)); E.mul(parts.shL.m, bodyM, limbM(legL[0], legL[1], [1, 0, 0], SH));
      E.mul(parts.thR.m, bodyM, limbM(hpR, legR[0], [1, 0, 0], TH)); E.mul(parts.shR.m, bodyM, limbM(legR[0], legR[1], [1, 0, 0], SH));
      // shoes: across the board (pointing toe side +Z, slightly angled)
      E.mul(parts.ftL.m, bodyM, E.trs(legL[1][0], legL[1][1] - 0.04, legL[1][2], 0, 0.35, 0));
      E.mul(parts.ftR.m, bodyM, E.trs(legR[1][0], legR[1][1] - 0.04, legR[1][2], 0, -0.25, 0));
      var armL = ik(shL, c.hL, UA, LA, [0.3, -0.4, -1]), armR = ik(shR, c.hR, UA, LA, [-0.3, -0.4, -1]);
      E.mul(parts.uaL.m, bodyM, limbM(shL, armL[0], [1, 0, 0], UA)); E.mul(parts.laL.m, bodyM, limbM(armL[0], armL[1], [1, 0, 0], LA));
      E.mul(parts.uaR.m, bodyM, limbM(shR, armR[0], [1, 0, 0], UA)); E.mul(parts.laR.m, bodyM, limbM(armR[0], armR[1], [1, 0, 0], LA));
      E.mul(parts.hdL.m, bodyM, E.trs(armL[1][0], armL[1][1], armL[1][2]));
      E.mul(parts.hdR.m, bodyM, E.trs(armR[1][0], armR[1][1], armR[1][2]));
      // board
      var bm;
      if (self.boardDetached) bm = self.boardWorld;
      else {
        // root frame: board long axis Z (nose at -Z). pitch = rotate about X (nose up for +), roll = about Z (flip)
        bm = E.mul(E.m4(), self.rootM, E.trs(0, 0.1 + c.bLift + (ex.boardLift || 0), -c.bFwd, 0, c.bYaw + (ex.boardYaw || 0), 0));
        var pit = c.bPitch + (ex.boardPitch || 0), pz = pit > 0 ? 0.3 : -0.3;
        bm = E.mul(E.m4(), bm, E.trs(0, 0, pz));
        bm = E.mul(E.m4(), bm, E.trs(0, 0, 0, pit, 0, 0));
        bm = E.mul(E.m4(), bm, E.trs(0, 0, -pz));
        bm = E.mul(E.m4(), bm, E.trs(0, 0, 0, 0, 0, c.bRoll + (ex.boardRoll || 0)));
        self.boardWorld = bm;
      }
      ['deck', 'grip', 'trucks', 'wheels'].forEach(function (n) { parts[n].m = bm; });
    };
    self.setStyle = function (i) {
      var s = STYLES[i] || STYLES[0];
      ['torso', 'uaL', 'uaR', 'laL', 'laR'].forEach(function (n) { parts[n].mat.col = s.hoodie; });
      ['pelvis', 'thL', 'thR', 'shL', 'shR'].forEach(function (n) { parts[n].mat.col = s.pants; });
      ['ftL', 'ftR'].forEach(function (n) { parts[n].mat.col = s.shoes; });
      parts.cap.mat.col = s.cap; parts.head.mat.col = s.skin; parts.hdL.mat.col = s.skin; parts.hdR.mat.col = s.skin; parts.neck.mat.col = s.skin;
      parts.wheels.mat.col = s.wheel;
    };
    // shared material objects per part (avoid aliasing)
    items.forEach(function (it) { it.mat = Object.assign({}, it.mat); });
    self.setStyle(styleIdx || 0);
    self.compose({});
    return self;
  }
  return { build: build, STYLES: STYLES, POSES: POSES };
})();
