// Скейт Бакира — мини WebGL2 движок (без зависимостей)
'use strict';
var E = (function () {
  // ---------- math ----------
  function m4() { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
  function mul(out, a, b) {
    var r = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    out.set(r); return out;
  }
  function persp(fovy, asp, n, f) {
    var m = new Float32Array(16), t = 1 / Math.tan(fovy / 2);
    m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m;
  }
  function ortho(l, r, b, t, n, f) {
    var m = new Float32Array(16);
    m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n);
    m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); m[15] = 1; return m;
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function lookAt(eye, at, up) {
    var z = norm([eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]]);
    var x = norm(cross(up, z)), y = cross(z, x), m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
    m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
    m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]); m[15] = 1; return m;
  }
  function invert(m) {
    var inv = new Float32Array(16), a = m;
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    var det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
    det = det ? 1 / det : 0; for (var i = 0; i < 16; i++) inv[i] *= det; return inv;
  }
  // transform: translation + euler (order Y, X, Z) + optional uniform-ish scale
  function trs(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
    sx = sx || 1; sy = sy || sx; sz = sz || sx;
    var cx = Math.cos(rx || 0), sxr = Math.sin(rx || 0), cy = Math.cos(ry || 0), syr = Math.sin(ry || 0), cz = Math.cos(rz || 0), szr = Math.sin(rz || 0);
    // R = Ry * Rx * Rz
    var m00 = cy * cz + syr * sxr * szr, m01 = -cy * szr + syr * sxr * cz, m02 = syr * cx;
    var m10 = cx * szr, m11 = cx * cz, m12 = -sxr;
    var m20 = -syr * cz + cy * sxr * szr, m21 = syr * szr + cy * sxr * cz, m22 = cy * cx;
    var m = new Float32Array(16);
    m[0] = m00 * sx; m[1] = m10 * sx; m[2] = m20 * sx;
    m[4] = m01 * sy; m[5] = m11 * sy; m[6] = m21 * sy;
    m[8] = m02 * sz; m[9] = m12 * sz; m[10] = m22 * sz;
    m[12] = tx; m[13] = ty; m[14] = tz; m[15] = 1; return m;
  }

  // ---------- geometry ----------
  // Geo: arrays p (xyz), n (xyz), u (uv), c (rgb)
  function Geo() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  Geo.prototype.vcount = function () { return this.p.length / 3; };
  Geo.prototype.quad = function (a, b, c, d, nn, uva, uvb, uvc, uvd, col) {
    var base = this.vcount(), self = this;
    [[a, uva], [b, uvb], [c, uvc], [d, uvd]].forEach(function (v) {
      self.p.push(v[0][0], v[0][1], v[0][2]); self.n.push(nn[0], nn[1], nn[2]); self.u.push(v[1][0], v[1][1]);
      self.c.push(col[0], col[1], col[2]);
    });
    this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // append another geo transformed by matrix m with color tint
  Geo.prototype.add = function (g, m, col) {
    col = col || [1, 1, 1];
    var base = this.vcount();
    for (var k = 0; k < g.p.length; k += 3) {
      var x = g.p[k], y = g.p[k + 1], z = g.p[k + 2];
      if (m) {
        this.p.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
        var nx = g.n[k], ny = g.n[k + 1], nz = g.n[k + 2];
        var tx = m[0] * nx + m[4] * ny + m[8] * nz, ty = m[1] * nx + m[5] * ny + m[9] * nz, tz = m[2] * nx + m[6] * ny + m[10] * nz;
        var l = Math.hypot(tx, ty, tz) || 1; this.n.push(tx / l, ty / l, tz / l);
      } else { this.p.push(x, y, z); this.n.push(g.n[k], g.n[k + 1], g.n[k + 2]); }
      var vc = k; this.c.push(g.c[vc] * col[0], g.c[vc + 1] * col[1], g.c[vc + 2] * col[2]);
    }
    for (k = 0; k < g.u.length; k++) this.u.push(g.u[k]);
    for (k = 0; k < g.i.length; k++) this.i.push(g.i[k] + base);
    return this;
  };
  // box centered on x,z with bottom at y=0 if 'bottom', else centered; uv scale in meters
  function box(w, h, d, uvs, opts) {
    opts = opts || {}; uvs = uvs || 1;
    var g = new Geo(), x0 = -w / 2, x1 = w / 2, y0 = opts.center ? -h / 2 : 0, y1 = y0 + h, z0 = -d / 2, z1 = d / 2;
    var shade = opts.ao ? 0.62 : 1, white = [1, 1, 1];
    function U(a, b) { return [a / uvs, b / uvs]; }
    function col(y) { return opts.ao && y === y0 ? [shade, shade, shade] : white; }
    // +y top
    if (!opts.noTop) g.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], U(x0, z1), U(x1, z1), U(x1, z0), U(x0, z0), white);
    if (!opts.noBottom) g.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], U(x0, z0), U(x1, z0), U(x1, z1), U(x0, z1), white);
    // sides: to have vertex AO we push per-vertex colors manually
    function side(a, b, c, d, n, ua, ub, uc, ud) {
      var base = g.vcount();
      [[a, ua], [b, ub], [c, uc], [d, ud]].forEach(function (v) {
        g.p.push(v[0][0], v[0][1], v[0][2]); g.n.push(n[0], n[1], n[2]); g.u.push(v[1][0], v[1][1]);
        var cc = col(v[0][1]); g.c.push(cc[0], cc[1], cc[2]);
      });
      g.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    side([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], U(x0, y0), U(x1, y0), U(x1, y1), U(x0, y1));
    side([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], U(-x1, y0), U(-x0, y0), U(-x0, y1), U(-x1, y1));
    side([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], U(-z1, y0), U(-z0, y0), U(-z0, y1), U(-z1, y1));
    side([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], U(z0, y0), U(z1, y0), U(z1, y1), U(z0, y1));
    return g;
  }
  // cylinder along Y, bottom at 0 (or centered)
  function cylinder(rt, rb, h, seg, opts) {
    opts = opts || {}; seg = seg || 12;
    var g = new Geo(), y0 = opts.center ? -h / 2 : 0, y1 = y0 + h, uvs = opts.uvs || 1;
    var slope = (rb - rt) / h;
    for (var s = 0; s < seg; s++) {
      var a0 = s / seg * Math.PI * 2, a1 = (s + 1) / seg * Math.PI * 2;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var n0 = norm([c0, slope, s0]), n1 = norm([c1, slope, s1]);
      var base = g.vcount();
      var pts = [[rb * c0, y0, rb * s0, n0, s / seg], [rb * c1, y0, rb * s1, n1, (s + 1) / seg], [rt * c1, y1, rt * s1, n1, (s + 1) / seg], [rt * c0, y1, rt * s0, n0, s / seg]];
      for (var k = 0; k < 4; k++) {
        var P = pts[k]; g.p.push(P[0], P[1], P[2]); g.n.push(P[3][0], P[3][1], P[3][2]);
        g.u.push(P[4] * Math.PI * 2 * Math.max(rt, rb) / uvs, (k < 2 ? y0 : y1) / uvs); g.c.push(1, 1, 1);
      }
      g.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
      if (!opts.noCaps) {
        if (rt > 0) { var b2 = g.vcount(); g.p.push(0, y1, 0, rt * c1, y1, rt * s1, rt * c0, y1, rt * s0); for (k = 0; k < 3; k++) { g.n.push(0, 1, 0); g.c.push(1, 1, 1); } g.u.push(0.5, 0.5, 0.5 + c1 * 0.5, 0.5 + s1 * 0.5, 0.5 + c0 * 0.5, 0.5 + s0 * 0.5); g.i.push(b2, b2 + 1, b2 + 2); }
        if (rb > 0) { var b3 = g.vcount(); g.p.push(0, y0, 0, rb * c0, y0, rb * s0, rb * c1, y0, rb * s1); for (k = 0; k < 3; k++) { g.n.push(0, -1, 0); g.c.push(1, 1, 1); } g.u.push(0.5, 0.5, 0.5 + c0 * 0.5, 0.5 + s0 * 0.5, 0.5 + c1 * 0.5, 0.5 + s1 * 0.5); g.i.push(b3, b3 + 1, b3 + 2); }
      }
    }
    return g;
  }
  function sphere(r, seg, rings, sy) {
    seg = seg || 12; rings = rings || 8; sy = sy || 1;
    var g = new Geo();
    for (var j = 0; j <= rings; j++) for (var i = 0; i <= seg; i++) {
      var th = j / rings * Math.PI, ph = i / seg * Math.PI * 2;
      var x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
      g.p.push(x * r, y * r * sy, z * r); var nn = norm([x, y / sy, z]); g.n.push(nn[0], nn[1], nn[2]); g.u.push(i / seg, j / rings); g.c.push(1, 1, 1);
    }
    for (j = 0; j < rings; j++) for (i = 0; i < seg; i++) {
      var a = j * (seg + 1) + i, b = a + seg + 1;
      g.i.push(a, a + 1, b, b, a + 1, b + 1);
    }
    return g;
  }
  // capsule along Y from y=0 down to y=-len (limb), radius r0 top r1 bottom
  function limb(len, r0, r1, seg) {
    seg = seg || 10;
    var g = new Geo();
    var c = cylinder(r1, r0, len, seg, { noCaps: true });
    g.add(c, trs(0, -len, 0));
    g.add(sphere(r0, seg, 6), null);
    g.add(sphere(r1, seg, 6), trs(0, -len, 0));
    return g;
  }
  // extrude a 2D profile (array of [z,y] points, z forward) along X width; makes top surface, plus side walls & back
  function extrude(profile, width, uvs, opts) {
    opts = opts || {}; uvs = uvs || 1;
    var g = new Geo(), x0 = -width / 2, x1 = width / 2, acc = 0;
    for (var k = 0; k < profile.length - 1; k++) {
      var a = profile[k], b = profile[k + 1];
      var dz = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dz, dy);
      var n = norm([0, dz, -dy]);
      // surface normal: perpendicular to (dz,dy) pointing up/back
      n = [0, dz / L, -dy / L];
      if (n[1] < 0) n = [0, -n[1], -n[2]];
      g.quad([x0, a[1], a[0]], [x1, a[1], a[0]], [x1, b[1], b[0]], [x0, b[1], b[0]], n, [x0 / uvs, acc / uvs], [x1 / uvs, acc / uvs], [x1 / uvs, (acc + L) / uvs], [x0 / uvs, (acc + L) / uvs], [1, 1, 1]);
      acc += L;
    }
    // fix winding: ensure facing normal (we'll render double-sided off; so emit both orders when ambiguous)
    if (!opts.noSides) {
      var base = profile[0][1], zmin = Infinity, zmax = -Infinity;
      for (k = 0; k < profile.length; k++) { zmin = Math.min(zmin, profile[k][0]); zmax = Math.max(zmax, profile[k][0]); }
      [x0, x1].forEach(function (x, si) {
        var nx = si ? 1 : -1;
        for (var k2 = 0; k2 < profile.length - 1; k2++) {
          var a = profile[k2], b = profile[k2 + 1], fy = opts.floor || 0;
          g.quad([x, fy, a[0]], [x, fy, b[0]], [x, b[1], b[0]], [x, a[1], a[0]], [nx, 0, 0], [a[0] / uvs, fy / uvs], [b[0] / uvs, fy / uvs], [b[0] / uvs, b[1] / uvs], [a[0] / uvs, a[1] / uvs], [0.85, 0.85, 0.85]);
        }
      });
    }
    return g;
  }

  // ---------- renderer ----------
  var VS = '#version 300 es\nprecision highp float;\nlayout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aU;layout(location=3) in vec3 aC;\nuniform mat4 uM,uVP,uLVP;out vec3 vW;out vec3 vN;out vec2 vU;out vec3 vC;out vec4 vL;\nvoid main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM)*aN;vU=aU;vC=aC;vL=uLVP*w;gl_Position=uVP*w;}';
  var FS = '#version 300 es\nprecision highp float;precision highp sampler2DShadow;\nin vec3 vW;in vec3 vN;in vec2 vU;in vec3 vC;in vec4 vL;\nuniform sampler2D uT;uniform sampler2DShadow uS;uniform vec3 uCol,uSunDir,uSunCol,uSky,uGround,uFog,uEye;uniform float uSpec,uEmis,uFogD,uShadowOn,uTime,uScroll,uAlpha;\nout vec4 o;\nfloat shadow(){vec3 p=vL.xyz/vL.w*0.5+0.5;if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.)return 1.;float b=0.0015;float s=0.;vec2 t=vec2(1./2048.);\ns+=texture(uS,vec3(p.xy+vec2(-.7,-.7)*t,p.z-b));s+=texture(uS,vec3(p.xy+vec2(.7,-.7)*t,p.z-b));s+=texture(uS,vec3(p.xy+vec2(-.7,.7)*t,p.z-b));s+=texture(uS,vec3(p.xy+vec2(.7,.7)*t,p.z-b));return s*.25;}\nvoid main(){vec2 uv=vU+vec2(0.,uTime*uScroll);vec4 tx=texture(uT,uv);vec3 base=pow(tx.rgb,vec3(2.2))*uCol*vC;\nvec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;vec3 V=normalize(uEye-vW);\nfloat sh=uShadowOn>0.5?shadow():1.;float nd=max(dot(n,uSunDir),0.);\nvec3 hemi=mix(uGround,uSky,n.y*0.5+0.5);\nvec3 H=normalize(uSunDir+V);float sp=pow(max(dot(n,H),0.),mix(8.,90.,uSpec))*uSpec*1.4;\nfloat rim=pow(1.-max(dot(n,V),0.),3.)*0.18;\nvec3 c=base*(hemi+uSunCol*nd*sh)+uSunCol*sp*sh+hemi*rim*base*2.;\nc+=pow(max(tx.rgb-vec3(0.55),vec3(0.)),vec3(1.))*uEmis*3.0*uCol;\nfloat d=length(vW-uEye);float f=1.-exp(-pow(d*uFogD,1.6));c=mix(c,uFog,clamp(f,0.,1.));\nc=c*1.05;c=(c*(2.51*c+0.03))/(c*(2.43*c+0.59)+0.14);o=vec4(pow(clamp(c,0.,1.),vec3(1./2.2)),uAlpha);}';
  var SVS = '#version 300 es\nlayout(location=0) in vec3 aP;uniform mat4 uM,uLVP;void main(){gl_Position=uLVP*uM*vec4(aP,1.);}';
  var SFS = '#version 300 es\nprecision mediump float;out vec4 o;void main(){o=vec4(1.);}';
  var SKYVS = '#version 300 es\nlayout(location=0) in vec2 aP;out vec2 vP;void main(){vP=aP;gl_Position=vec4(aP,0.9999,1.);}';
  var SKYFS = '#version 300 es\nprecision highp float;in vec2 vP;uniform mat4 uInvVP;uniform vec3 uTop,uHor,uBot,uSunDir,uSunCol,uEye;uniform float uTime,uStars;out vec4 o;\nfloat h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}\nfloat fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*nz(p);p*=2.03;a*=.5;}return v;}\nvoid main(){vec4 a=uInvVP*vec4(vP,1.,1.);vec3 d=normalize(a.xyz/a.w-uEye);float y=d.y;\nvec3 c=y>0.?mix(uHor,uTop,pow(clamp(y,0.,1.),0.55)):mix(uHor,uBot,clamp(-y*4.,0.,1.));\nfloat s=max(dot(d,uSunDir),0.);c+=uSunCol*(pow(s,600.)*6.+pow(s,12.)*0.35+pow(s,3.)*0.12);\nif(y>0.01){vec2 cp=d.xz/(y+0.08)*1.6+vec2(uTime*0.01,0.);float cl=smoothstep(0.45,0.85,fbm(cp));c=mix(c,mix(uHor*1.15,vec3(1.)*0.95+uSunCol*0.1,0.6),cl*0.65*smoothstep(0.0,0.25,y));\nif(uStars>0.){float st=step(0.9985,h(floor(d.xz/(y+0.2)*300.)));c+=vec3(st)*uStars*smoothstep(0.1,0.4,y);}}\no=vec4(c,1.);}';
  var PVS = '#version 300 es\nlayout(location=0) in vec3 aP;layout(location=1) in vec4 aC;layout(location=2) in float aS;uniform mat4 uVP;uniform float uH;out vec4 vC;void main(){vec4 p=uVP*vec4(aP,1.);gl_Position=p;gl_PointSize=clamp(aS*uH/p.w,1.,64.);vC=aC;}';
  var PFS = '#version 300 es\nprecision mediump float;in vec4 vC;out vec4 o;void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;o=vec4(vC.rgb,vC.a*smoothstep(0.5,0.1,d));}';

  function Renderer(canvas, opts) {
    this.canvas = canvas;
    var gl = canvas.getContext('webgl2', { antialias: opts.aa !== false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 не поддерживается');
    this.gl = gl;
    this.shadowSize = opts.shadowSize || 2048;
    this.prog = this.mkProg(VS, FS);
    this.sprog = this.mkProg(SVS, SFS);
    this.skyProg = this.mkProg(SKYVS, SKYFS);
    this.pProg = this.mkProg(PVS, PFS);
    this.u = this.locs(this.prog, ['uM', 'uVP', 'uLVP', 'uT', 'uS', 'uCol', 'uSunDir', 'uSunCol', 'uSky', 'uGround', 'uFog', 'uEye', 'uSpec', 'uEmis', 'uFogD', 'uShadowOn', 'uTime', 'uScroll', 'uAlpha']);
    this.su = this.locs(this.sprog, ['uM', 'uLVP']);
    this.ku = this.locs(this.skyProg, ['uInvVP', 'uTop', 'uHor', 'uBot', 'uSunDir', 'uSunCol', 'uEye', 'uTime', 'uStars']);
    this.pu = this.locs(this.pProg, ['uVP', 'uH']);
    // sky quad
    this.skyVao = gl.createVertexArray(); gl.bindVertexArray(this.skyVao);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // particles
    this.pVao = gl.createVertexArray(); gl.bindVertexArray(this.pVao);
    this.pBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuf); gl.bufferData(gl.ARRAY_BUFFER, 4 * 8 * 2000, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.bindVertexArray(null);
    this.initShadow();
    this.white = this.texFromCanvas((function () { var c = document.createElement('canvas'); c.width = c.height = 4; var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 4, 4); return c; })());
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  }
  Renderer.prototype.mkProg = function (vs, fs) {
    var gl = this.gl;
    function sh(t, s) { var x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; }
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  };
  Renderer.prototype.locs = function (p, names) { var o = {}, gl = this.gl; names.forEach(function (n) { o[n] = gl.getUniformLocation(p, n); }); return o; };
  Renderer.prototype.initShadow = function () {
    var gl = this.gl, S = this.shadowSize;
    this.shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, S, S);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  Renderer.prototype.texFromCanvas = function (c, opts) {
    opts = opts || {};
    var gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var wrap = opts.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    return t;
  };
  // upload geo → mesh
  Renderer.prototype.mesh = function (g) {
    var gl = this.gl, vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    function buf(data, loc, size) {
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b;
    }
    var bufs = [buf(g.p, 0, 3), buf(g.n, 1, 3), buf(g.u, 2, 2), buf(g.c, 3, 3)];
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    var big = g.vcount() > 65535;
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(g.i) : new Uint16Array(g.i), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao: vao, count: g.i.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, bufs: bufs.concat([ib]) };
  };
  Renderer.prototype.freeMesh = function (m) { var gl = this.gl; gl.deleteVertexArray(m.vao); m.bufs.forEach(function (b) { gl.deleteBuffer(b); }); };
  Renderer.prototype.resize = function (w, h, dpr) {
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
  };
  // scene: {env, items:[{mesh, m, mat:{tex,col,spec,emis,scroll,alpha}, noShadow}], particles: Float32Array count}
  Renderer.prototype.render = function (scene, cam) {
    var gl = this.gl, env = scene.env, W = this.canvas.width, H = this.canvas.height, u = this.u;
    var items = scene.items;
    // shadow pass
    var lvp = scene.lightVP;
    if (lvp && scene.shadows) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo); gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.useProgram(this.sprog); gl.uniformMatrix4fv(this.su.uLVP, false, lvp);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
      for (var i = 0; i < items.length; i++) {
        var it = items[i]; if (it.noShadow || it.hidden) continue;
        gl.uniformMatrix4fv(this.su.uM, false, it.m); gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, it.mesh.type, 0);
      }
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, W, H);
    gl.clearColor(env.hor[0], env.hor[1], env.hor[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var vp = mul(new Float32Array(16), cam.proj, cam.view);
    // sky
    gl.disable(gl.DEPTH_TEST); gl.useProgram(this.skyProg);
    var k = this.ku; gl.uniformMatrix4fv(k.uInvVP, false, invert(vp));
    gl.uniform3fv(k.uTop, env.top); gl.uniform3fv(k.uHor, env.hor); gl.uniform3fv(k.uBot, env.bot || env.hor); gl.uniform3fv(k.uSunDir, env.sunDir);
    gl.uniform3fv(k.uSunCol, env.sunSky || env.sunCol); gl.uniform3fv(k.uEye, cam.eye); gl.uniform1f(k.uTime, scene.time); gl.uniform1f(k.uStars, env.stars || 0);
    gl.bindVertexArray(this.skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // main
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uLVP, false, lvp || m4());
    gl.uniform3fv(u.uSunDir, env.sunDir); gl.uniform3fv(u.uSunCol, env.sunCol); gl.uniform3fv(u.uSky, env.skyAmb); gl.uniform3fv(u.uGround, env.groundAmb);
    gl.uniform3fv(u.uFog, env.fog || env.hor); gl.uniform1f(u.uFogD, env.fogD); gl.uniform3fv(u.uEye, cam.eye); gl.uniform1f(u.uTime, scene.time);
    gl.uniform1f(u.uShadowOn, scene.shadows ? 1 : 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.shadowTex); gl.uniform1i(u.uS, 1);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uT, 0);
    var lastTex = null, transp = [];
    for (i = 0; i < items.length; i++) {
      it = items[i]; if (it.hidden) continue;
      if (it.mat.alpha !== undefined && it.mat.alpha < 1) { transp.push(it); continue; }
      this.drawItem(it, lastTex); lastTex = it.mat.tex;
    }
    if (transp.length) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      for (i = 0; i < transp.length; i++) this.drawItem(transp[i], null);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    // particles
    if (scene.pcount > 0) {
      gl.useProgram(this.pProg); gl.uniformMatrix4fv(this.pu.uVP, false, vp); gl.uniform1f(this.pu.uH, H * cam.proj[5] * 0.5);
      gl.bindVertexArray(this.pVao); gl.bindBuffer(gl.ARRAY_BUFFER, this.pBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.pdata.subarray(0, scene.pcount * 8));
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
      gl.drawArrays(gl.POINTS, 0, scene.pcount);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  };
  Renderer.prototype.drawItem = function (it, lastTex) {
    var gl = this.gl, u = this.u, mt = it.mat;
    if (mt.tex !== lastTex) gl.bindTexture(gl.TEXTURE_2D, mt.tex || this.white);
    gl.uniformMatrix4fv(u.uM, false, it.m);
    gl.uniform3fv(u.uCol, mt.col || [1, 1, 1]); gl.uniform1f(u.uSpec, mt.spec || 0); gl.uniform1f(u.uEmis, mt.emis || 0);
    gl.uniform1f(u.uScroll, mt.scroll || 0); gl.uniform1f(u.uAlpha, mt.alpha === undefined ? 1 : mt.alpha);
    gl.bindVertexArray(it.mesh.vao); gl.drawElements(gl.TRIANGLES, it.mesh.count, it.mesh.type, 0);
  };

  return { m4: m4, mul: mul, persp: persp, ortho: ortho, lookAt: lookAt, invert: invert, trs: trs, norm: norm, cross: cross,
    Geo: Geo, box: box, cylinder: cylinder, sphere: sphere, limb: limb, extrude: extrude, Renderer: Renderer };
})();
