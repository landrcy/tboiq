/* Icon layer. All art is original and generated here (string pixel grids + procedural generators).
   Public API (a provider can override any of these via TBOIQIcons.setProvider):
     ui(name, {scale, pal})      -> <canvas>   small interface/attribute glyphs
     pool(key, scale)            -> <canvas>   pool glyph
     entity(kind, obj, scale)    -> <canvas>   16x16 procedural art for an item ('item') or a character ('char')
*/
(function () {
  'use strict';
  /* grid letters mapped onto the TBOIQ Dungeon-24 kit palette (assets/art/palette.json) */
  var PAL = { k: '#0e0b14', w: '#f5ebcf', g: '#a38c76', d: '#66504f', r: '#e2573f', l: '#f5ebcf', o: '#e8902a', y: '#ffd56b',
    e: '#78a03a', b: '#74a3c8', c: '#74a3c8', p: '#8d7bc0', n: '#9c4d1c', m: '#e2573f' };
  var G = {
    home: ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwwwww.', '.wwnnww.', '.wwnnww.', '.wwnnww.'],
    item: ['..gggg..', '...ww...', '...ww...', '..wbbw..', '.wbbbbw.', '.wbbbbw.', '.wbbbbw.', '..wwww..'],
    char: ['..wwww..', '.wwwwww.', '.wkwwkw.', '.wwwwww.', '.wwwwww.', '..wwww..', '.wwwwww.', '.w.ww.w.'],
    sound: ['...w....', '..ww..w.', '.www...w', 'wwww.w.w', 'wwww.w.w', '.www...w', '..ww..w.', '...w....'],
    mute: ['...w....', '..ww.r.r', '.www..r.', 'wwww.r.r', 'wwww....', '.www....', '..ww....', '...w....'],
    help: ['..wwww..', '.ww..ww.', '.....ww.', '....ww..', '...ww...', '...ww...', '........', '...ww...'],
    stats: ['......yy', '......yy', '....rryy', '....rryy', '..eerryy', '..eerryy', 'bbeerryy', 'bbeerryy'],
    share: ['...ww...', '..wwww..', '.w.ww.w.', '...ww...', 'w..ww..w', 'w......w', 'w......w', 'wwwwwwww'],
    dice: ['.wwwwww.', 'wwwwwwww', 'wkwwwwkw', 'wwwkkwww', 'wwwkkwww', 'wkwwwwkw', 'wwwwwwww', '.wwwwww.'],
    calendar: ['.w....w.', 'wwwwwwww', 'wrrrrrrw', 'wwwwwwww', 'wwkwkwww', 'wwwwwwww', 'wkwkwkww', 'wwwwwwww'],
    check: ['........', '.......w', '......ww', 'w....ww.', 'ww..ww..', '.wwww...', '..ww....', '........'],
    cross: ['w......w', 'ww....ww', '.ww..ww.', '..wwww..', '..wwww..', '.ww..ww.', 'ww....ww', 'w......w'],
    tilde: ['........', '..ww....', '.wwww..w', 'ww..wwww', 'w....ww.', '........'],
    up: ['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '...ww...', '...ww...', '...ww...', '...ww...'],
    wings: ['w......w', 'ww....ww', 'www..www', 'wwwwwwww', '.wwwwww.', '..wwww..', '...ww...'],
    heart: ['.rr..rr.', 'rlrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'],
    coin: ['..yyyy..', '.yywwyy.', 'yywyyyoy', 'yywyyyoy', 'yyyyyyoy', 'yyyyyooy', '.yyoooy.', '..yyyy..'],
    bone: ['ww....ww', '.wwwwww.', '.wwwwww.', 'ww....ww'],
    star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'yy....yy'],
    skull: ['.wwwwww.', 'wwwwwwww', 'wkkwwkkw', 'wkkwwkkw', 'wwwkkwww', '.wwwwww.', '.wkwkwk.', '..wwww..'],
    trophy: ['yyyyyyyy', 'y.yyyy.y', 'y.yyyy.y', '.yyyyyy.', '..yyyy..', '...yy...', '..yyyy..', '.yyyyyy.'],
    door: ['..nnnn..', '.nnnnnn.', '.nnnnnn.', '.nnnnyn.', '.nnnnnn.', '.nnnnnn.', '.nnnnnn.', '.nnnnnn.'],
    slot: ['.gggggg.', '.g....g.', '.g.yy.g.', '.g....g.', '.gggggg.', '.g.kk.g.', '.g.kk.g.', '.gggggg.'],
    bomb: ['.....yy.', '....y...', '..gggg..', '.gggggg.', 'ggwggggg', 'gggggggg', '.gggggg.', '..gggg..'],
    key: ['..yyy...', '.y...y..', '.y...y..', '..yyy...', '...y....', '...yy...', '...y....', '...yy...'],
    pill: ['.rrrwww.', 'rrrrwwww', 'rrrrwwww', '.rrrwww.'],
    card: ['.wwwwww.', '.wrrrrw.', '.wrwwrw.', '.wrwwrw.', '.wrrrrw.', '.wwwwww.'],
    bolt: ['....yyy.', '...yyy..', '..yyy...', '.yyyyyy.', '...yyy..', '..yyy...', '.yy.....', 'y.......'],
    gem: ['..cccc..', '.cwccbc.', 'cccccccc', '.cccbbc.', '..cbbc..', '...cc...'],
    blob: ['..gggg..', '.gggggg.', 'gkgggkgg', 'gggggggg', 'gggggggg', 'g.g..g.g'],
    hash: ['.w..w...', 'wwwwwwww', '.w..w...', '.w..w...', 'wwwwwwww', '.w..w...'],
    plus: ['...ww...', '...ww...', 'wwwwwwww', 'wwwwwwww', '...ww...', '...ww...'],
    chest: ['.nnnnnn.', 'nnnnnnnn', 'nnnyynnn', 'nnnnnnnn', 'nnnnnnnn', 'nnnnnnnn'],
    disc: ['..bbbb..', '.bwwwwb.', 'bwwbbwwb', 'bwbbbbwb', 'bwwbbwwb', '.bwwwwb.', '..bbbb..'],
    sparkle: ['...w....', '...w....', '.wwwww..', '...w....', '..w.w...'],
    x2: ['w.w.www', '.w..w.w', 'w.w..ww', '.....w.', '.....www']
  };
  var DOWN = { down: 'up' };
  var providers = null;
  var cache = {};

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function canvasOf(w, h, scale) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'px';
    c.style.width = (w * scale) + 'px'; c.style.height = (h * scale) + 'px'; c.setAttribute('aria-hidden', 'true');
    return c;
  }
  function Buf(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  Buf.prototype.set = function (x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; };
  Buf.prototype.get = function (x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.p[y * this.w + x]; };
  Buf.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.set(x + i, y + j, c); };
  Buf.prototype.disc = function (cx, cy, r, c, lit) {
    for (var y = 0; y < this.h; y++) for (var x = 0; x < this.w; x++) {
      var dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) {
        var k = (dx + dy) / (r * 1.5), col = c;
        if (lit) col = k < -0.5 ? shade(c, 0.3) : k > 0.5 ? shade(c, -0.3) : c;
        this.set(x, y, col);
      }
    }
  };
  Buf.prototype.outline = function (c) {
    var add = [], x, y;
    for (y = 0; y < this.h; y++) for (x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
    }
    add.forEach(function (a) { this.set(a[0], a[1], c); }, this);
  };
  Buf.prototype.toCanvas = function (scale) {
    var c = canvasOf(this.w, this.h, scale), x = c.getContext('2d');
    for (var y = 0; y < this.h; y++) for (var i = 0; i < this.w; i++) { var v = this.p[y * this.w + i]; if (v) { x.fillStyle = v; x.fillRect(i, y, 1, 1); } }
    return c;
  };

  /* ---- string-grid icons ---- */
  function gridCanvas(name, pal) {
    var flip = false, src = name;
    if (DOWN[name]) { src = DOWN[name]; flip = true; }
    var rows = G[src]; if (!rows) rows = G.help;
    if (flip) rows = rows.slice().reverse();
    var w = rows[0].length, h = rows.length, b = new Buf(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var ch = rows[y][x]; if (ch === '.') continue;
      b.set(x, y, (pal && pal[ch]) || PAL[ch]);
    }
    return b;
  }
  var srcCache = {};
  function uiCanvas(name, o) {
    o = o || {}; var scale = o.scale || 2;
    var key = name + '|' + (o.pal ? JSON.stringify(o.pal) : '');
    var b = srcCache[key] || (srcCache[key] = gridCanvas(name, o.pal));
    return b.toCanvas(scale);
  }

  /* ---- pools: colour + pattern so they are distinguishable without colour ---- */
  var POOLS = ['treasure', 'shop', 'boss', 'devil', 'angel', 'secret', 'library', 'curse', 'planetarium', 'redchest', 'goldchest', 'ultrasecret', 'crane', 'baby', 'misc', 'trinket'];
  var POOLCOL = { treasure: '#e8902a', shop: '#74a3c8', boss: '#e2573f', devil: '#c0405a', angel: '#f5ebcf', secret: '#6e5a9e', library: '#a38c76', curse: '#8d7bc0',
    planetarium: '#4fb3a6', redchest: '#a62336', goldchest: '#ffd56b', ultrasecret: '#d98aa8', crane: '#78a03a', baby: '#efb5c4', misc: '#7c8296', trinket: '#d9c8a2' };
  function poolPat(i, x, y) {   // x,y in 0..5 ; returns true for dark pattern pixel
    switch (i % 16) {
      case 0: return (x === 2 || x === 3) && (y === 2 || y === 3);
      case 1: return y === 2 || y === 3;
      case 2: return x === 2 || x === 3;
      case 3: return x === y;
      case 4: return (x + y) % 2 === 0;
      case 5: return x === 2 || y === 2;
      case 6: return (x === 1 || x === 4 || y === 1 || y === 4) && x > 0 && x < 5 && y > 0 && y < 5;
      case 7: return x + y === 5;
      case 8: return y === 1 || y === 4;
      case 9: return x === 1 || x === 4;
      case 10: return (x === 1 && y === 1) || (x === 4 && y === 4) || (x === 1 && y === 4) || (x === 4 && y === 1);
      case 11: return y === 3 || (x === 2 && y === 1);
      case 12: return (x === 2 && y < 4) || (y === 1 && x > 0 && x < 5);
      case 13: return y >= 3 && x % 2 === 0;
      case 14: return false;
      default: return x === 1 || y === 1;
    }
  }
  function poolCanvas(key, scale) {
    scale = scale || 2;
    var i = Math.max(0, POOLS.indexOf(key)), col = POOLCOL[key] || '#9aa0b4', b = new Buf(6, 6);
    b.rect(0, 0, 6, 6, col);
    [[0, 0], [5, 0], [0, 5], [5, 5]].forEach(function (p) { b.set(p[0], p[1], null); });
    var dark = shade(col, -0.62);
    for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) if (b.get(x, y) && poolPat(i, x, y)) b.set(x, y, dark);
    return b.toCanvas(scale);
  }

  /* ---- procedural entity art ---- */
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var OUT = '#14101a';

  function itemBuf(it) {
    var rnd = rng(hashStr(it.k)), b = new Buf(16, 16), pools = it.pools;
    var c1 = POOLCOL[pools[0]] || '#9aa0b4', c2 = POOLCOL[pools[1] || pools[0]] || c1, v = it.n % 4, i, j;
    if (it.type === 'active') {
      if (v === 0) {                                   // flask
        b.rect(6, 2, 4, 4, '#cfd6e6'); b.rect(6, 1, 4, 1, '#a2693b'); b.disc(8, 10, 4.6, c1, true); b.rect(5, 9, 6, 1, c2);
      } else if (v === 1) {                            // book
        b.rect(3, 2, 10, 12, c1); b.rect(3, 2, 2, 12, shade(c1, -0.35)); b.rect(5, 13, 8, 1, '#f2ead7'); b.rect(7, 5, 4, 1, c2); b.rect(8, 4, 2, 4, c2);
      } else if (v === 2) {                            // die
        b.rect(3, 3, 10, 10, c1); b.rect(3, 3, 10, 1, shade(c1, 0.3)); b.rect(3, 12, 10, 1, shade(c1, -0.3));
        [[5, 5], [10, 5], [5, 10], [10, 10]].forEach(function (p) { b.rect(p[0], p[1], 2, 2, '#f2ead7'); }); b.rect(7, 7, 2, 2, c2);
      } else {                                         // card / scroll
        b.rect(4, 2, 8, 12, '#e9dfc0'); b.rect(4, 2, 8, 3, c1); b.rect(4, 13, 8, 1, shade('#e9dfc0', -0.25));
        b.rect(7, 7, 2, 4, c2); b.rect(6, 8, 4, 2, c2);
      }
    } else if (it.type === 'familiar') {
      var body = c1; b.disc(8, 9, 5, body, true);
      if (v === 1 || v === 3) { b.rect(4, 3, 2, 3, body); b.rect(10, 3, 2, 3, body); }   // ears
      else { b.set(7, 3, c2); b.set(8, 2, c2); b.set(9, 3, c2); }
      b.rect(5, 8, 2, 2, '#14101a'); b.rect(9, 8, 2, 2, '#14101a'); b.set(5, 8, '#f2ead7'); b.set(9, 8, '#f2ead7');
      b.rect(7, 11, 2, 1, shade(body, -0.5)); b.rect(4, 13, 2, 1, shade(body, -0.3)); b.rect(10, 13, 2, 1, shade(body, -0.3));
    } else if (it.type === 'trinket') {
      if (v < 2) { b.disc(8, 8, 5, c1, true); b.disc(8, 8, 3, shade(c1, -0.25)); b.rect(7, 6, 2, 4, c1 === '#c9b78a' ? '#f2ead7' : c2); }
      else if (v === 2) { b.disc(7, 6, 3.4, c1, true); b.disc(7, 6, 1.6, null); b.rect(7, 9, 2, 6, c1); b.rect(9, 12, 2, 1, c1); b.rect(9, 14, 2, 1, c1); }
      else { b.rect(3, 6, 10, 4, c1); b.rect(4, 5, 8, 1, c1); b.rect(4, 10, 8, 1, shade(c1, -0.3)); b.rect(6, 7, 4, 2, c2); }
    } else {                                           // passive
      if (v === 0) {                                   // gem
        for (j = 0; j < 6; j++) b.rect(8 - 1 - j, 2 + j, 2 + j * 2, 1, j < 3 ? shade(c1, 0.15) : c1);
        for (j = 0; j < 5; j++) b.rect(3 + j, 8 + j, 10 - j * 2, 1, shade(c1, -0.2 - j * 0.05));
        b.rect(7, 3, 2, 2, '#f2ead7'); b.rect(6, 7, 4, 1, c2);
      } else if (v === 1) {                            // orb
        b.disc(8, 8, 5.4, c1, true); b.disc(8, 8, 2.4, c2); b.set(5, 5, '#f2ead7'); b.set(6, 5, '#f2ead7'); b.set(5, 6, '#f2ead7');
      } else if (v === 2) {                            // rune stone
        b.rect(4, 2, 8, 12, '#6b6f86'); b.rect(3, 4, 10, 8, '#6b6f86'); b.rect(4, 2, 8, 1, '#9aa0b4'); b.rect(3, 4, 1, 4, '#9aa0b4');
        b.rect(7, 4, 2, 8, c1); b.rect(5, 6, 6, 2, c1); if (rnd() > 0.5) b.rect(5, 10, 6, 1, c2); else b.rect(5, 4, 2, 2, c2);
      } else {                                         // amulet
        for (i = 0; i < 4; i++) { b.set(4 + i, 1 + i, '#c9b78a'); b.set(11 - i, 1 + i, '#c9b78a'); }
        b.disc(8, 10, 4, c1, true); b.disc(8, 10, 2, c2); b.set(8, 4, '#c9b78a');
      }
    }
    var q = it.q || 0;
    [[2, 2], [13, 3], [13, 13], [2, 13]].slice(0, q).forEach(function (p) { if (!b.get(p[0], p[1])) b.set(p[0], p[1], '#fff6cf'); });
    b.outline(OUT);
    return b;
  }

  var SKIN = ['#e8c9a8', '#d9b99b', '#c9d6df', '#e6d3c3', '#bfd1b5'];
  function charBuf(ch) {
    var rnd = rng(hashStr(ch.k)), b = new Buf(16, 16), h0 = ch.hearts[0], v = ch.n % 4;
    var robes = { red: '#b03a48', soul: '#3f6fb5', black: '#4a3a63', coin: '#b8902e', bone: '#cfc7ae', random: '#7d5bb0', none: '#8a8fa6' };
    var robe = robes[h0] || '#b03a48', skin = ch.tainted ? '#b7a7b2' : SKIN[Math.floor(rnd() * SKIN.length)];
    var i;
    if (ch.flight) {                                    // wings
      for (i = 0; i < 4; i++) { b.rect(1 + i, 6 + i, 3, 1, '#e8e4f2'); b.rect(12 - i, 6 + i, 3, 1, '#e8e4f2'); }
      b.rect(1, 5, 3, 1, '#e8e4f2'); b.rect(12, 5, 3, 1, '#e8e4f2');
    }
    b.rect(5, 9, 6, 5, robe); b.rect(4, 11, 8, 3, robe); b.rect(5, 9, 6, 1, shade(robe, 0.3)); b.rect(4, 13, 8, 1, shade(robe, -0.3));
    b.rect(5, 14, 2, 1, '#3a2f4a'); b.rect(9, 14, 2, 1, '#3a2f4a');
    b.disc(8, 6, 4.2, skin, true);
    var eye = ch.tainted ? '#e5484d' : '#14101a';
    b.rect(6, 6, 1, 2, eye); b.rect(9, 6, 1, 2, eye);
    b.rect(7, 9, 2, 1, shade(skin, -0.45));
    if (h0 === 'black' || ch.unlock === 'closet' && v === 1) { b.set(4, 2, '#8a5fc0'); b.set(4, 3, '#8a5fc0'); b.set(11, 2, '#8a5fc0'); b.set(11, 3, '#8a5fc0'); b.set(5, 3, '#8a5fc0'); b.set(10, 3, '#8a5fc0'); }
    else if (h0 === 'soul') { b.rect(5, 0, 6, 1, '#f2c94c'); }
    else if (v === 0) { b.rect(6, 1, 4, 1, shade(robe, 0.2)); b.rect(7, 0, 2, 1, shade(robe, 0.2)); }
    else if (v === 1) { b.rect(5, 1, 6, 2, '#5a3b2a'); b.rect(4, 3, 1, 3, '#5a3b2a'); b.rect(11, 3, 1, 3, '#5a3b2a'); }
    else if (v === 2) { b.rect(5, 1, 6, 1, '#d9b24a'); b.rect(4, 2, 8, 1, '#d9b24a'); b.rect(4, 3, 2, 2, '#d9b24a'); b.rect(10, 3, 2, 2, '#d9b24a'); }
    else { b.set(5, 1, '#8b8fa8'); b.set(10, 1, '#8b8fa8'); b.rect(6, 2, 4, 1, '#8b8fa8'); }
    if (ch.tainted) { b.set(7, 3, '#5a1a22'); b.set(8, 4, '#5a1a22'); b.set(8, 5, '#5a1a22'); b.set(6, 11, '#5a1a22'); b.set(7, 12, '#5a1a22'); }
    if (ch.hp === null) { b.set(2, 2, '#52d1d1'); b.set(13, 2, '#e86aa8'); b.set(13, 12, '#f2c94c'); b.set(2, 12, '#4cc46a'); }
    b.outline(OUT);
    return b;
  }

  /* ---- pixel kit (assets/art/icons.js, global TBOIQ): original art by the project's pixel artist ---- */
  function kit() { return (typeof window.TBOIQ === 'object' && window.TBOIQ && window.TBOIQ.ICONS) ? window.TBOIQ : null; }
  function kitCanvas(name, scale) {
    var K = kit(); if (!K || !K.ICONS[name]) return null;
    var c = K.iconCanvas(name, scale || 2); c.className = 'px'; c.removeAttribute('style');
    c.style.width = c.width + 'px'; c.style.height = c.height + 'px'; c.setAttribute('aria-hidden', 'true'); return c;
  }
  var KIT_CAT = { passive: 'passive', active: 'active', familiar: 'familiar', trinket: 'trinket' };
  function kitName(kind, obj) {
    var K = kit(); if (!K) return null;
    if (kind === 'item') {
      var list = K.CATEGORIES[KIT_CAT[obj.type]]; if (!list) return null;
      return list[hashStr(obj.k) % list.length];
    }
    var h = obj.hearts[0], base = hashStr(obj.name.replace(/^Tainted /, ''));
    if (obj.flight) return 'crowned_wraith';
    if (h === 'black') return 'horned_knight';
    if (h === 'soul') return 'hooded_pilgrim';
    if (h === 'coin') return 'cat_cutpurse';
    if (h === 'bone' || h === 'random') return 'bone_jester';
    if (h === 'none') return 'crowned_wraith';
    var reds = ['moss_witch', 'plague_physician', 'shroom_hermit', 'hooded_pilgrim']; return reds[base % reds.length];
  }
  function entityCanvas(kind, obj, scale) {
    scale = scale || 3;
    if (providers && providers.entity) { var c = providers.entity(kind, obj, scale); if (c) return c; }
    var kn = kitName(kind, obj);
    if (kn) { var kc = kitCanvas(kn, kind === 'char' ? Math.max(1, Math.round(scale * 2 / 3)) : scale); if (kc) return kc; }
    var key = kind + ':' + obj.k, b = cache[key] || (cache[key] = kind === 'item' ? itemBuf(obj) : charBuf(obj));
    return b.toCanvas(scale);
  }
  function ui(name, o) {
    if (providers && providers.ui) { var c = providers.ui(name, o); if (c) return c; }
    return uiCanvas(name, o);
  }
  function pool(key, scale) {
    if (providers && providers.pool) { var c = providers.pool(key, scale); if (c) return c; }
    return poolCanvas(key, scale);
  }
  window.TBOIQIcons = { kit: kitCanvas, hasKit: function () { return !!kit(); }, ui: ui, pool: pool, entity: entityCanvas, POOLCOL: POOLCOL, setProvider: function (p) { providers = p; } };
})();
