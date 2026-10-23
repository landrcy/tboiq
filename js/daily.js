/* Deterministic daily puzzle: same answer for everyone, based on the America/New_York calendar day. */
(function () {
  'use strict';
  var fmt = null;
  function nyDate(d) {
    try {
      if (!fmt) fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
      return fmt.format(d || new Date());           // YYYY-MM-DD
    } catch (e) {
      var x = d || new Date();
      return x.getUTCFullYear() + '-' + ('0' + (x.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + x.getUTCDate()).slice(-2);
    }
  }
  function dayNumber(s) {                            // days since 2026-01-01
    var p = s.split('-').map(Number);
    return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(2026, 0, 1)) / 86400000);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {                               // FNV-1a
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Fixed shuffle (seeded by game name + list size) walked one step per day => no repeats within a cycle.
  function answerIndex(game, n, dateStr) {
    var rnd = mulberry32(hash('tboiq:' + game + ':' + n)), perm = [], i, j, t;
    for (i = 0; i < n; i++) perm.push(i);
    for (i = n - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    var d = dayNumber(dateStr), k = ((d % n) + n) % n;
    return perm[k];
  }
  function msToNextNY() {                            // ms until next midnight in New York (approx. by polling the NY date)
    var now = Date.now(), today = nyDate(new Date(now)), lo = 0, hi = 26 * 3600e3;
    if (nyDate(new Date(now + hi)) === today) return hi;
    while (hi - lo > 1000) { var mid = (lo + hi) >> 1; if (nyDate(new Date(now + mid)) === today) lo = mid; else hi = mid; }
    return hi;
  }
  window.TBOIQDaily = { nyDate: nyDate, dayNumber: dayNumber, answerIndex: answerIndex, hash: hash, mulberry32: mulberry32, msToNext: msToNextNY };
})();
