// Процедурные текстуры (canvas)
'use strict';
var TEX = (function () {
  var seed = 1337;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function cv(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function noise(ctx, w, h, amt, alpha, size) {
    size = size || 1;
    for (var i = 0; i < w * h * amt / (size * size); i++) {
      var v = Math.floor(rnd() * 255);
      ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + alpha + ')';
      ctx.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), size, size);
    }
  }
  function speckle(ctx, w, h, n, cols, smax) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      var s = 1 + rnd() * (smax || 2); ctx.fillRect(rnd() * w, rnd() * h, s, s);
    }
  }
  function blotches(ctx, w, h, n, col, rmax) {
    for (var i = 0; i < n; i++) {
      var x = rnd() * w, y = rnd() * h, r = 4 + rnd() * rmax;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      // wrap
      ctx.save(); ctx.translate(x > w / 2 ? -w : w, 0); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    }
  }
  function cracks(ctx, w, h, n, col) {
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (var i = 0; i < n; i++) {
      var x = rnd() * w, y = rnd() * h; ctx.beginPath(); ctx.moveTo(x, y);
      for (var k = 0; k < 8; k++) { x += (rnd() - 0.5) * 24; y += (rnd() - 0.5) * 24; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  var make = {
    concrete: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#9a9890'; x.fillRect(0, 0, 512, 512);
      blotches(x, 512, 512, 60, 'rgba(70,68,60,0.18)', 60); blotches(x, 512, 512, 40, 'rgba(200,198,190,0.15)', 50);
      noise(x, 512, 512, 0.5, 0.08); speckle(x, 512, 512, 2500, ['#6f6d66', '#b9b7ae', '#85837c'], 2);
      cracks(x, 512, 512, 4, 'rgba(40,40,36,0.35)');
      // expansion joints
      x.fillStyle = 'rgba(50,48,44,0.55)'; x.fillRect(0, 0, 512, 3); x.fillRect(0, 0, 3, 512);
      return c;
    },
    asphalt: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#3b3c3f'; x.fillRect(0, 0, 512, 512);
      speckle(x, 512, 512, 14000, ['#2a2b2d', '#4c4d50', '#58595c', '#323335', '#6a6862'], 2);
      blotches(x, 512, 512, 30, 'rgba(20,20,22,0.25)', 70); cracks(x, 512, 512, 6, 'rgba(15,15,15,0.6)');
      return c;
    },
    road: function () {
      var c = make.asphalt(), x = c.getContext('2d');
      x.fillStyle = 'rgba(235,225,180,0.85)';
      for (var i = 0; i < 4; i++) x.fillRect(250, i * 128 + 20, 12, 70);
      return c;
    },
    tiles: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#7d736a'; x.fillRect(0, 0, 512, 512);
      var cols = ['#b9ad9d', '#a89b8a', '#c4b8a8', '#9e9282', '#b3a28d'];
      for (var j = 0; j < 8; j++) for (var i = 0; i < 8; i++) {
        var off = (j % 2) * 32;
        x.fillStyle = cols[Math.floor(rnd() * cols.length)]; x.fillRect(i * 64 + off + 2, j * 64 + 2, 60, 60);
        if (off) { x.fillRect(i * 64 + off + 2 - 512, j * 64 + 2, 60, 60); }
      }
      noise(x, 512, 512, 0.4, 0.07); blotches(x, 512, 512, 25, 'rgba(60,55,45,0.15)', 50);
      return c;
    },
    brick: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#6b5a4f'; x.fillRect(0, 0, 512, 512);
      for (var j = 0; j < 16; j++) for (var i = -1; i < 9; i++) {
        var off = (j % 2) * 32, r = 120 + rnd() * 50, g = 55 + rnd() * 25, b = 40 + rnd() * 20;
        x.fillStyle = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; x.fillRect(i * 64 + off + 2, j * 32 + 2, 60, 28);
      }
      noise(x, 512, 512, 0.5, 0.1); blotches(x, 512, 512, 20, 'rgba(30,25,20,0.2)', 60);
      return c;
    },
    wood: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#a2794c'; x.fillRect(0, 0, 512, 512);
      for (var i = 0; i < 8; i++) {
        var base = 140 + rnd() * 40; x.fillStyle = 'rgb(' + (base | 0) + ',' + ((base * 0.72) | 0) + ',' + ((base * 0.45) | 0) + ')'; x.fillRect(0, i * 64, 512, 62);
        for (var k = 0; k < 40; k++) { x.strokeStyle = 'rgba(80,50,25,' + (0.1 + rnd() * 0.2) + ')'; x.beginPath(); var yy = i * 64 + rnd() * 62; x.moveTo(0, yy); x.bezierCurveTo(170, yy + (rnd() - 0.5) * 8, 340, yy + (rnd() - 0.5) * 8, 512, yy); x.stroke(); }
        x.fillStyle = 'rgba(40,25,10,0.6)'; x.fillRect(0, i * 64 + 62, 512, 2);
        x.fillStyle = '#5a5a5a'; x.fillRect(20, i * 64 + 28, 5, 5); x.fillRect(490, i * 64 + 28, 5, 5);
      }
      return c;
    },
    rampskin: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#5e6e7c'; x.fillRect(0, 0, 512, 512);
      blotches(x, 512, 512, 40, 'rgba(30,35,40,0.3)', 50); noise(x, 512, 512, 0.6, 0.08);
      x.strokeStyle = 'rgba(20,25,30,0.6)'; x.lineWidth = 2; x.strokeRect(1, 1, 510, 510);
      x.fillStyle = 'rgba(15,15,15,0.5)'; for (var i = 0; i < 6; i++) x.fillRect(rnd() * 500, rnd() * 500, 120, 3);
      return c;
    },
    metal: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#c9ccd0'; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 400; i++) { x.fillStyle = 'rgba(' + (rnd() > 0.5 ? '255,255,255' : '80,80,90') + ',0.12)'; x.fillRect(0, rnd() * 256, 256, 1); }
      return c;
    },
    paintmetal: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
      noise(x, 256, 256, 0.3, 0.06); blotches(x, 256, 256, 8, 'rgba(90,60,40,0.25)', 30);
      return c;
    },
    grass: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#4f7a31'; x.fillRect(0, 0, 512, 512);
      blotches(x, 512, 512, 50, 'rgba(110,150,60,0.25)', 60); blotches(x, 512, 512, 40, 'rgba(30,60,20,0.3)', 50);
      for (var i = 0; i < 9000; i++) { var g = 90 + rnd() * 90; x.fillStyle = 'rgba(' + ((g * 0.55) | 0) + ',' + (g | 0) + ',' + ((g * 0.3) | 0) + ',0.7)'; x.fillRect(rnd() * 512, rnd() * 512, 1, 3); }
      return c;
    },
    dirt: function () {
      var c = cv(512), x = c.getContext('2d'); x.fillStyle = '#7a6347'; x.fillRect(0, 0, 512, 512);
      blotches(x, 512, 512, 60, 'rgba(50,38,25,0.3)', 60); speckle(x, 512, 512, 8000, ['#5a4632', '#9a8466', '#6e5a40', '#8c8c86'], 3);
      return c;
    },
    grip: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#1b1b1d'; x.fillRect(0, 0, 256, 256);
      speckle(x, 256, 256, 6000, ['#2a2a2d', '#111', '#333336'], 1);
      return c;
    },
    deck: function () {
      var c = cv(512, 128), x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, '#ff6b1a'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#e83f6f');
      x.fillStyle = g; x.fillRect(0, 0, 512, 128);
      x.fillStyle = '#111'; x.font = 'bold 64px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('БАКИР', 256, 66);
      x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeText('БАКИР', 256, 66);
      return c;
    },
    facade: function (opt) {
      opt = opt || {};
      var c = cv(512), x = c.getContext('2d');
      x.fillStyle = opt.wall || '#8a8178'; x.fillRect(0, 0, 512, 512);
      noise(x, 512, 512, 0.4, 0.08); blotches(x, 512, 512, 20, 'rgba(40,35,30,0.2)', 60);
      var cols = opt.cols || 4, rows = opt.rows || 4, ww = 512 / cols, hh = 512 / rows;
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var lit = rnd() < (opt.lit || 0.25);
        x.fillStyle = 'rgba(30,30,30,0.6)'; x.fillRect(i * ww + ww * 0.18 - 3, j * hh + hh * 0.2 - 3, ww * 0.64 + 6, hh * 0.58 + 6);
        if (lit) {
          var lg = x.createLinearGradient(0, j * hh, 0, j * hh + hh); lg.addColorStop(0, '#fff2b8'); lg.addColorStop(1, '#ffc768'); x.fillStyle = lg;
        } else {
          var gg = x.createLinearGradient(i * ww, j * hh, i * ww + ww, j * hh + hh); gg.addColorStop(0, opt.glass || '#3d5468'); gg.addColorStop(1, '#1d2a35'); x.fillStyle = gg;
        }
        x.fillRect(i * ww + ww * 0.18, j * hh + hh * 0.2, ww * 0.64, hh * 0.58);
        x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(i * ww + ww * 0.49, j * hh + hh * 0.2, 3, hh * 0.58);
        x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(i * ww + ww * 0.18, j * hh + hh * 0.8, ww * 0.64, 4);
      }
      return c;
    },
    graffiti: function () {
      var c = cv(1024, 256), x = c.getContext('2d');
      x.fillStyle = '#8f8a82'; x.fillRect(0, 0, 1024, 256); noise(x, 1024, 256, 0.3, 0.1);
      var words = ['БАКИР', 'СКЕЙТ', 'ОЛЛИ!', 'GRIND', 'КАТАЙ'];
      var cols = [['#ff3d7f', '#ffe14d'], ['#2ee6d6', '#3a55ff'], ['#ff8a00', '#ff2d2d'], ['#9dff3a', '#00a86b'], ['#ffffff', '#ff4fd8']];
      for (var i = 0; i < 5; i++) {
        x.save(); x.translate(110 + i * 200, 130); x.rotate((rnd() - 0.5) * 0.25);
        x.font = 'bold ' + (60 + rnd() * 30 | 0) + 'px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        var gr = x.createLinearGradient(0, -40, 0, 40); gr.addColorStop(0, cols[i][0]); gr.addColorStop(1, cols[i][1]);
        x.lineWidth = 12; x.strokeStyle = '#111'; x.strokeText(words[i], 0, 0); x.fillStyle = gr; x.fillText(words[i], 0, 0);
        x.lineWidth = 2; x.strokeStyle = '#fff'; x.strokeText(words[i], 0, 0);
        x.restore();
      }
      for (i = 0; i < 25; i++) { x.fillStyle = 'rgba(' + (rnd() * 255 | 0) + ',' + (rnd() * 255 | 0) + ',' + (rnd() * 255 | 0) + ',0.5)'; x.fillRect(rnd() * 1024, 200 + rnd() * 50, 2, 10 + rnd() * 30); }
      return c;
    },
    sign: function (text, bg, fg) {
      var c = cv(512, 128), x = c.getContext('2d'); x.fillStyle = bg || '#1d1d1d'; x.fillRect(0, 0, 512, 128);
      x.strokeStyle = fg || '#ffd23f'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
      x.fillStyle = fg || '#ffd23f'; x.font = 'bold 58px Impact, Arial Black, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 68);
      return c;
    },
    leaves: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#3f6b2a'; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 1500; i++) { var g = 70 + rnd() * 110; x.fillStyle = 'rgba(' + ((g * 0.5) | 0) + ',' + (g | 0) + ',' + ((g * 0.3) | 0) + ',0.8)'; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 2 + rnd() * 4, 0, 7); x.fill(); }
      return c;
    },
    bark: function () {
      var c = cv(128), x = c.getContext('2d'); x.fillStyle = '#4e3a2a'; x.fillRect(0, 0, 128, 128);
      for (var i = 0; i < 60; i++) { x.fillStyle = 'rgba(20,12,6,0.4)'; x.fillRect(rnd() * 128, 0, 2, 128); }
      noise(x, 128, 128, 0.5, 0.1); return c;
    },
    water: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#2f6f8f'; x.fillRect(0, 0, 256, 256);
      for (var i = 0; i < 80; i++) { x.strokeStyle = 'rgba(200,240,255,' + (0.1 + rnd() * 0.3) + ')'; x.beginPath(); var y = rnd() * 256; x.moveTo(0, y); x.bezierCurveTo(80, y - 6, 170, y + 6, 256, y); x.stroke(); }
      return c;
    },
    hazard: function () {
      var c = cv(256, 64), x = c.getContext('2d'); x.fillStyle = '#ffcc00'; x.fillRect(0, 0, 256, 64);
      x.fillStyle = '#111'; for (var i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 32, 64); x.lineTo(i * 32 + 16, 64); x.lineTo(i * 32 + 48, 0); x.lineTo(i * 32 + 32, 0); x.fill(); }
      return c;
    },
    cloth: function () {
      var c = cv(128), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
      for (var i = 0; i < 128; i += 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(0, i, 128, 1); }
      noise(x, 128, 128, 0.4, 0.05); return c;
    },
    face: function () {
      var c = cv(256), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
      // sphere UV: u around, v top→bottom. face toward +X ≈ u=0/1 boundary. put features at u≈0.0 → draw at both ends
      function feat(cx) {
        x.fillStyle = '#2a1a10';
        x.fillRect(cx - 22, 104, 14, 5); x.fillRect(cx + 8, 104, 14, 5); // brows
        x.fillStyle = '#fff'; x.fillRect(cx - 21, 113, 11, 8); x.fillRect(cx + 10, 113, 11, 8);
        x.fillStyle = '#3a2412'; x.fillRect(cx - 18, 114, 6, 7); x.fillRect(cx + 13, 114, 6, 7);
        x.fillStyle = 'rgba(120,60,40,0.5)'; x.fillRect(cx - 3, 120, 6, 16);
        x.fillStyle = '#6a2a20'; x.fillRect(cx - 10, 146, 20, 4);
        // beard / stubble
        x.fillStyle = 'rgba(40,25,15,0.55)'; x.beginPath(); x.ellipse(cx, 160, 30, 22, 0, 0, Math.PI); x.fill();
      }
      x.translate(0, 256); x.scale(1, -1);
      feat(0); feat(256);
      return c;
    }
  };
  var cache = {};
  function get(r, name, arg) {
    var key = name + (arg ? JSON.stringify(arg) : '');
    if (!cache[key]) { seed = 1000 + key.length * 77 + key.charCodeAt(0); cache[key] = r.texFromCanvas(make[name](arg && arg[0], arg && arg[1], arg && arg[2])); }
    return cache[key];
  }
  function getCanvas(name, args) { return make[name].apply(null, args || []); }
  function clear() { cache = {}; }
  return { get: get, getCanvas: getCanvas, clear: clear, make: make };
})();
