// Звук: всё синтезируется WebAudio (без файлов)
'use strict';
var SFX = (function () {
  var ctx = null, master, sfxBus, musBus, noiseBuf, roll, grind, enabled = true, music = true, musTimer = null;
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master); musBus = ctx.createGain(); musBus.gain.value = 0.32; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    roll = loopNoise('lowpass', 420, 0.7); grind = loopNoise('bandpass', 2600, 6);
    applyEnabled();
    if (music) startMusic();
  }
  function loopNoise(type, f, q) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    var g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start();
    return { g: g, f: fl };
  }
  function env(node, t, a, peak, dcy) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy); }
  function noiseHit(f, type, q, peak, dcy, bus) {
    if (!ctx) return; var t = ctx.currentTime;
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 1;
    var g = ctx.createGain(); s.connect(fl); fl.connect(g); g.connect(bus || sfxBus); env(g, t, 0.003, peak, dcy); s.start(t, Math.random()); s.stop(t + dcy + 0.05);
  }
  function tone(f, type, peak, dcy, f2, delay, bus) {
    if (!ctx) return; var t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dcy);
    var g = ctx.createGain(); o.connect(g); g.connect(bus || sfxBus); env(g, t, 0.005, peak, dcy); o.start(t); o.stop(t + dcy + 0.05);
  }
  var api = {
    init: init,
    pop: function () { noiseHit(1800, 'highpass', 1, 0.5, 0.06); tone(180, 'sine', 0.5, 0.08, 70); },
    land: function (k) { k = k || 1; noiseHit(500, 'lowpass', 1, 0.4 * k, 0.12); tone(90, 'sine', 0.6 * k, 0.15, 45); },
    flip: function () { noiseHit(3000, 'bandpass', 2, 0.12, 0.05); },
    bail: function () { noiseHit(300, 'lowpass', 1, 0.9, 0.35); tone(120, 'square', 0.15, 0.25, 40); noiseHit(2500, 'bandpass', 1, 0.3, 0.2); },
    collect: function () { tone(880, 'triangle', 0.3, 0.12); tone(1320, 'triangle', 0.3, 0.2, null, 0.08); },
    balance: function () { tone(660, 'square', 0.12, 0.08); },
    score: function () { tone(523, 'triangle', 0.2, 0.1); tone(784, 'triangle', 0.2, 0.15, null, 0.07); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 'triangle', 0.3, 0.3, null, i * 0.12); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 'sawtooth', 0.12, 0.35, null, i * 0.18); }); },
    click: function () { tone(1200, 'sine', 0.15, 0.04); },
    setRoll: function (v) { if (roll) roll.g.gain.setTargetAtTime(enabled ? v * 0.22 : 0, ctx.currentTime, 0.05); },
    setGrind: function (v) { if (grind) grind.g.gain.setTargetAtTime(enabled ? v * 0.18 : 0, ctx.currentTime, 0.03); },
    setEnabled: function (v) { enabled = v; applyEnabled(); },
    setMusic: function (v) { music = v; if (!ctx) return; if (v) startMusic(); else stopMusic(); },
    slow: function (v) { if (musBus) musBus.gain.setTargetAtTime(v ? 0.16 : 0.32, ctx.currentTime, 0.2); }
  };
  function applyEnabled() { if (sfxBus) sfxBus.gain.value = enabled ? 1 : 0; }
  // ---------- музыка: простой бум-бэп ----------
  var step = 0, nextT = 0, BPM = 88;
  var bassNotes = [41, 41, 44, 39, 41, 41, 46, 44];
  var chords = [[53, 56, 60], [51, 55, 58], [49, 53, 56], [48, 51, 55]];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startMusic() { if (musTimer || !ctx) return; nextT = ctx.currentTime + 0.1; step = 0; musTimer = setInterval(sched, 50); }
  function stopMusic() { clearInterval(musTimer); musTimer = null; }
  function sched() {
    var spb = 60 / BPM / 4;
    while (nextT < ctx.currentTime + 0.2) { play(step, nextT); nextT += spb; step = (step + 1) % 64; }
  }
  function play(s, t) {
    var bar = Math.floor(s / 16), st = s % 16;
    function at(fn) { var d = t - ctx.currentTime; setTimeout(fn, Math.max(0, d * 1000 - 5)); }
    // kick
    if (st === 0 || st === 7 || st === 10) kick(t);
    if (st === 4 || st === 12) snare(t);
    if (st % 2 === 0) hat(t, st % 4 === 2 ? 0.08 : 0.04);
    if (st === 0 || st === 6 || st === 10) bass(mtof(bassNotes[(bar * 2 + (st > 8 ? 1 : 0)) % 8] - 12), t, st === 10 ? 0.2 : 0.35);
    if (st === 0) pad(chords[bar % 4], t);
    if (st === 14 && bar % 2 === 1) scratch(t);
  }
  function kick(t) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(musBus); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32); }
  function snare(t) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    var g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(musBus); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); s.start(t, Math.random()); s.stop(t + 0.2);
    var o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; o.connect(g2); g2.connect(musBus); g2.gain.setValueAtTime(0.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, v) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; var g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(musBus); g.gain.setValueAtTime(v * 3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.start(t, Math.random()); s.stop(t + 0.06); }
  function bass(f, t, len) { var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f / 2; var g = ctx.createGain(); o.connect(g); o2.connect(g); g.connect(musBus); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + len); o.start(t); o2.start(t); o.stop(t + len + 0.02); o2.stop(t + len + 0.02); }
  function pad(ch, t) {
    var len = 60 / BPM * 4;
    ch.forEach(function (m) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = (Math.random() - 0.5) * 12;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; var g = ctx.createGain();
      o.connect(f); f.connect(g); g.connect(musBus);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.4); g.gain.setValueAtTime(0.05, t + len - 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.start(t); o.stop(t + len + 0.05);
    });
  }
  function scratch(t) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 8; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.08); f.frequency.exponentialRampToValueAtTime(500, t + 0.16); var g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(musBus); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); s.start(t); s.stop(t + 0.2); }
  return api;
})();
