/* Procedural basement textures (original, drawn at load with a seeded RNG; no image files).
   Produces two tileable canvases -> CSS custom properties --tex-wall (cracked stone with flesh/blood patches) and --tex-panel (dark mottled flesh-stone). */
(function () {
  'use strict';
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function css(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function make(size, seed, opt) {
    var R = rng(seed), cv = document.createElement('canvas'); cv.width = cv.height = size;
    var x = cv.getContext('2d'), img = x.createImageData(size, size), d = img.data;
    var px = function (i, j, c) { i = (i + size) % size; j = (j + size) % size; var o = (j * size + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; };
    var get = function (i, j) { i = (i + size) % size; j = (j + size) % size; var o = (j * size + i) * 4; return [d[o], d[o + 1], d[o + 2]]; };
    var brickW = opt.bw, brickH = opt.bh, cols = Math.round(size / brickW), rows = Math.round(size / brickH);
    // bricks
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var off = (r % 2) * (brickW / 2), v = R(), flesh = R() < opt.flesh;
      var base = flesh ? mix(opt.fleshA, opt.fleshB, R()) : mix(opt.stoneA, opt.stoneB, v);
      for (var j = 0; j < brickH; j++) for (var i = 0; i < brickW; i++) {
        var n = (R() - 0.5) * opt.noise, hi = (j < 2 ? 14 : 0) + (i < 2 ? 8 : 0) - (j > brickH - 3 ? 12 : 0);
        px(c * brickW + i + off, r * brickH + j, [base[0] + n + hi, base[1] + n * 0.9 + hi * 0.8, base[2] + n * 0.8 + hi * 0.7]);
      }
      // mortar / outline
      for (var i2 = 0; i2 < brickW; i2++) px(c * brickW + i2 + off, r * brickH, opt.mortar);
      for (var j2 = 0; j2 < brickH; j2++) px(c * brickW + off, r * brickH + j2, opt.mortar);
    }
    // blood stains: soft blobs
    for (var b = 0; b < opt.blood; b++) {
      var bx = R() * size, by = R() * size, br = 2 + R() * 5;
      for (var j3 = -br; j3 <= br; j3++) for (var i3 = -br; i3 <= br; i3++) {
        var dd = Math.sqrt(i3 * i3 + j3 * j3); if (dd > br + R() * 1.2) continue;
        var px0 = get(bx + i3 | 0, by + j3 | 0); px((bx + i3) | 0, (by + j3) | 0, mix(px0, opt.blood1, 0.55 - dd / (br * 2.4)));
      }
      var len = 3 + R() * 10;   // a drip
      for (var k = 0; k < len; k++) { var q = get(bx | 0, (by + br + k) | 0); px(bx | 0, (by + br + k) | 0, mix(q, opt.blood2, 0.7 - k / (len * 1.4))); }
    }
    // cracks: wrapped random walks
    for (var cr = 0; cr < opt.cracks; cr++) {
      var cx = R() * size, cy = R() * size, ang = R() * 6.28, steps = 12 + R() * 22;
      for (var s = 0; s < steps; s++) {
        px(cx | 0, cy | 0, opt.crack); if (R() < 0.35) px((cx + 1) | 0, cy | 0, mix(get((cx + 1) | 0, cy | 0), opt.crack, 0.5));
        ang += (R() - 0.5) * 1.1; cx += Math.cos(ang); cy += Math.sin(ang);
        if (R() < 0.06) { var a2 = ang + (R() < 0.5 ? 1 : -1) * 0.9, bx2 = cx, by2 = cy; for (var t2 = 0; t2 < 5 + R() * 6; t2++) { px(bx2 | 0, by2 | 0, opt.crack); bx2 += Math.cos(a2); by2 += Math.sin(a2); a2 += (R() - 0.5) * 0.8; } }
      }
    }
    x.putImageData(img, 0, 0); return cv;
  }
  var root = document.documentElement;
  var wall = make(128, 7151, { bw: 32, bh: 16, flesh: 0.16, stoneA: [58, 44, 40], stoneB: [76, 60, 54], fleshA: [92, 46, 44], fleshB: [118, 62, 56], noise: 14, mortar: [14, 8, 8], crack: [18, 10, 10], cracks: 7, blood: 6, blood1: [110, 20, 22], blood2: [86, 12, 16] });
  var panel = make(64, 3319, { bw: 32, bh: 32, flesh: 0.5, stoneA: [40, 29, 28], stoneB: [50, 36, 34], fleshA: [58, 31, 31], fleshB: [72, 38, 36], noise: 12, mortar: [26, 17, 17], crack: [14, 8, 8], cracks: 3, blood: 3, blood1: [96, 18, 20], blood2: [70, 10, 14] });
  root.style.setProperty('--tex-wall', 'url(' + wall.toDataURL('image/png') + ')');
  root.style.setProperty('--tex-panel', 'url(' + panel.toDataURL('image/png') + ')');
})();
