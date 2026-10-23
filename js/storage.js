/* localStorage wrapper (safe when storage is blocked) */
(function () {
  'use strict';
  var KEY = 'tboiq.v1';
  var mem = null;
  function blank() {
    return { sound: false, daily: { item: null, char: null }, rand: { item: null, char: null },
      stats: { item: stat(), char: stat() } };
  }
  function stat() { return { played: 0, wins: 0, streak: 0, best: 0, lastWin: '', dist: [0, 0, 0, 0, 0, 0, 0, 0], rPlayed: 0, rWins: 0 }; }
  function load() {
    if (mem) return mem;
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { d = null; }
    mem = blank();
    if (d && typeof d === 'object') {
      mem.sound = !!d.sound;
      ['item', 'char'].forEach(function (g) {
        if (d.daily && d.daily[g]) mem.daily[g] = d.daily[g];
        if (d.rand && d.rand[g]) mem.rand[g] = d.rand[g];
        if (d.stats && d.stats[g]) mem.stats[g] = Object.assign(stat(), d.stats[g]);
      });
    }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* ignore */ } }
  window.TBOIQStore = { get: load, save: save, newStat: stat };
})();
