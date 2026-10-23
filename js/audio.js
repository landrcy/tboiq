/* Original chiptune + sfx synthesized with WebAudio. Nothing is created or played until the user turns sound on. */
(function () {
  'use strict';
  var ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  var on = false, timer = null, nextTime = 0, step = 0;
  var BPM = 92, EIGHTH = 60 / BPM / 2;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // 8-bar loop in A minor: Am F C G Am F E Am  (original)
  var ROOT = [45, 41, 48, 43, 45, 41, 40, 45];
  var MINOR = [0, 3, 7], MAJOR = [0, 4, 7];
  var QUAL = [MINOR, MAJOR, MAJOR, MAJOR, MINOR, MAJOR, MAJOR, MINOR];
  var LEAD = [
    [69, 0, 72, 0, 71, 69, 0, 0], [65, 0, 69, 0, 72, 0, 69, 0], [67, 0, 72, 0, 71, 0, 67, 0], [62, 0, 67, 71, 74, 0, 71, 0],
    [69, 0, 72, 0, 76, 0, 74, 72], [77, 0, 76, 0, 72, 0, 69, 0], [71, 0, 68, 0, 71, 0, 76, 0], [69, 0, 0, 0, 0, 0, 64, 67]
  ];
  var ARP = [0, 1, 2, 1, 0, 1, 2, 1];

  function init() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(master);
    var len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return true;
  }
  function osc(type, freq, t, dur, vol, dest, slideTo) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, dest) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 6000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t); s.stop(t + dur + 0.01);
  }
  function scheduleStep(i, t) {
    var bar = Math.floor(i / 8) % 8, k = i % 8, root = ROOT[bar], q = QUAL[bar];
    var lead = LEAD[bar][k];
    if (lead) osc('square', mtof(lead), t, EIGHTH * 1.6, 0.16, musicGain);
    osc('triangle', mtof(root + 12 + q[ARP[k]]), t, EIGHTH * 0.9, 0.12, musicGain);
    if (k === 0 || k === 3 || k === 6) osc('triangle', mtof(root), t, EIGHTH * 2.2, 0.34, musicGain);
    if (k === 4) osc('triangle', mtof(root + 7), t, EIGHTH * 1.5, 0.26, musicGain);
    if (k === 0 || k === 4) osc('sine', 120, t, 0.16, 0.5, musicGain, 40);
    if (k % 2 === 1) noise(t, 0.04, 0.12, musicGain);
  }
  // Scheduling uses the audio clock (not frames): look ahead 0.4s every 100ms.
  function pump() {
    if (!on) return;
    while (nextTime < ctx.currentTime + 0.4) { scheduleStep(step, nextTime); nextTime += EIGHTH; step++; }
  }
  function startMusic() {
    if (timer) return;
    nextTime = ctx.currentTime + 0.08; timer = setInterval(pump, 100); pump();
  }
  function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }

  function setOn(v) {
    on = !!v;
    if (on) {
      if (!init()) { on = false; return false; }
      if (ctx.state === 'suspended') ctx.resume();
      startMusic();
    } else {
      stopMusic();
      if (ctx) { musicGain.gain.cancelScheduledValues(0); var g = musicGain; g.disconnect(); musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master); }
    }
    return on;
  }
  function sfx(kind, arg) {
    if (!on || !ctx) return;
    var t = ctx.currentTime + 0.01, i;
    switch (kind) {
      case 'click': osc('square', 660, t, 0.06, 0.18, sfxGain); break;
      case 'tile': osc('square', arg === 'g' ? 880 : arg === 'y' ? 660 : 330, t, 0.1, 0.18, sfxGain); break;
      case 'win': [523, 659, 784, 1047].forEach(function (f, n) { osc('square', f, t + n * 0.1, 0.18, 0.2, sfxGain); }); break;
      case 'lose': [392, 330, 262, 196].forEach(function (f, n) { osc('triangle', f, t + n * 0.16, 0.26, 0.3, sfxGain); }); break;
      case 'error': osc('square', 160, t, 0.15, 0.2, sfxGain, 110); break;
      default: break;
    }
  }
  window.TBOIQAudio = { setOn: setOn, isOn: function () { return on; }, sfx: sfx };
})();
