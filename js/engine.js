/* Comparison engine: pure functions, no DOM. */
(function () {
  'use strict';
  var D = window.TBOIQ_DATA;
  var MAX_GUESSES = 8;
  var DLC = ['RB', 'AB', 'A+', 'RP'];
  var DLC_NAME = ['Rebirth', 'Afterbirth', 'Afterbirth+', 'Repentance'];
  var POOL_NAME = { treasure: 'Treasure Room', shop: 'Shop', boss: 'Boss', devil: 'Devil Room', angel: 'Angel Room', secret: 'Secret Room',
    library: 'Library', curse: 'Curse Room', planetarium: 'Planetarium', redchest: 'Red Chest', goldchest: 'Golden Chest',
    ultrasecret: 'Ultra Secret', crane: 'Crane Game', baby: 'Baby Shop', misc: 'Other', trinket: 'Trinket' };
  var UNLOCK_NAME = { default: 'Start', boss: 'Boss', collect: 'Collect', feat: 'Feat', secret: 'Secret', donate: 'Donate', closet: 'Closet' };

  function setState(a, b) {
    if (a.length === b.length && a.every(function (x) { return b.indexOf(x) >= 0; })) return 'g';
    return a.some(function (x) { return b.indexOf(x) >= 0; }) ? 'y' : 'r';
  }
  // numeric: guess value g vs answer value a; near = distance counted as "close"
  function numState(g, a, near) {
    if (g === a) return { s: 'g', d: 0 };
    return { s: Math.abs(g - a) <= near ? 'y' : 'r', d: a > g ? 1 : -1 };
  }
  function word(s) { return s === 'g' ? 'match' : s === 'y' ? 'close' : 'no match'; }
  function dirWord(d) { return d > 0 ? ', answer is higher' : d < 0 ? ', answer is lower' : ''; }
  function tile(col, s, d, view, text) {
    return { col: col, s: s, d: d || 0, view: view, label: text + ': ' + word(s) + dirWord(d) };
  }

  /* ---------- Items ---------- */
  var TYPE_ICON = { active: ['bolt', { y: '#f2c94c' }], passive: ['gem', null], familiar: ['blob', null], trinket: ['coin', null] };
  function rcKind(v) { return v === null || v === undefined ? 'none' : typeof v === 'number' ? 'num' : /s$/.test(v) ? 'time' : v; }
  function rcText(v) {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'number') return String(v);
    if (v === 'inf') return 'INF'; if (v === 'once') return '1X'; if (v === 'var') return '?';
    return v.toUpperCase();
  }
  var itemCols = [
    { id: 'type', icon: 'blob', label: 'Type' }, { id: 'q', icon: 'star', label: 'Quality' }, { id: 'pools', icon: 'chest', label: 'Pools' },
    { id: 'dlc', icon: 'disc', label: 'Version' }, { id: 'rc', icon: 'bolt', label: 'Recharge' }, { id: 'id', icon: 'hash', label: 'ID' }
  ];
  function compareItem(g, a) {
    var t = [], s, r;
    // type
    s = g.type === a.type ? 'g' : ((g.type === 'passive' && a.type === 'familiar') || (g.type === 'familiar' && a.type === 'passive')) ? 'y' : 'r';
    t.push(tile('type', s, 0, { t: 'icon', n: TYPE_ICON[g.type][0], pal: TYPE_ICON[g.type][1] }, 'Type ' + g.type));
    // quality
    if (g.q === null || a.q === null) s = g.q === a.q ? 'g' : 'r';
    if (g.q === null || a.q === null) t.push(tile('q', s, 0, { t: 'text', v: g.q === null ? '-' : String(g.q) }, 'Quality ' + (g.q === null ? 'none' : g.q)));
    else { r = numState(g.q, a.q, 1); t.push(tile('q', r.s, r.d, { t: 'text', v: String(g.q) }, 'Quality ' + g.q)); }
    // pools
    t.push(tile('pools', setState(g.pools, a.pools), 0, { t: 'pools', list: g.pools }, 'Pools ' + g.pools.map(function (p) { return POOL_NAME[p]; }).join(', ')));
    // dlc
    r = numState(g.dlc, a.dlc, 1); t.push(tile('dlc', r.s, r.d, { t: 'text', v: DLC[g.dlc] }, 'Version ' + DLC_NAME[g.dlc]));
    // recharge
    var gk = rcKind(g.rc), ak = rcKind(a.rc);
    if (gk === 'num' && ak === 'num') r = numState(g.rc, a.rc, 1);
    else if (g.rc === a.rc) r = { s: 'g', d: 0 };
    else if (gk !== 'none' && ak !== 'none') r = { s: 'y', d: 0 };   // both are actives, different recharge style
    else r = { s: 'r', d: 0 };
    t.push(tile('rc', r.s, r.d, { t: 'text', v: rcText(g.rc) }, 'Recharge ' + rcText(g.rc)));
    // id
    var gt = g.type === 'trinket', at = a.type === 'trinket';
    if (gt !== at) r = { s: 'r', d: 0 }; else r = numState(g.n, a.n, gt ? 5 : 25);
    t.push(tile('id', r.s, r.d, { t: 'text', v: (gt ? 'T' : '') + g.n }, 'ID ' + (gt ? 'trinket ' : '') + g.n));
    return t;
  }

  /* ---------- Characters ---------- */
  var HEART_PAL = { red: null, soul: { r: '#74a3c8', l: '#f5ebcf' }, black: { r: '#8d7bc0', l: '#d9c8a2' } };
  function heartIcon(h) {
    if (h === 'coin') return { n: 'coin' }; if (h === 'bone') return { n: 'bone' };
    if (h === 'none') return { n: 'cross', pal: { w: '#9aa0b4' } }; if (h === 'random') return { n: 'help', pal: { w: '#8d7bc0' } };
    return { n: 'heart', pal: HEART_PAL[h] };
  }
  var ITEM_ICON = { active: { n: 'bolt' }, passive: { n: 'gem' }, innate: { n: 'star', pal: { y: '#74a3c8' } }, random: { n: 'help', pal: { w: '#8d7bc0' } } };
  var POCKET_ICON = { bomb: { n: 'bomb' }, key: { n: 'key' }, coin: { n: 'coin' }, pill: { n: 'pill' }, card: { n: 'card' }, charge: { n: 'bolt', pal: { y: '#74a3c8' } }, random: { n: 'help', pal: { w: '#8d7bc0' } } };
  var UNLOCK_ICON = { default: 'star', boss: 'skull', collect: 'coin', feat: 'trophy', secret: 'help', donate: 'slot', closet: 'door' };
  var charCols = [
    { id: 'mode', icon: 'char', label: 'Tainted' }, { id: 'unlock', icon: 'door', label: 'Unlock' }, { id: 'hearts', icon: 'heart', label: 'Hearts' },
    { id: 'hp', icon: 'plus', label: 'Health' }, { id: 'items', icon: 'item', label: 'Items' }, { id: 'pocket', icon: 'bomb', label: 'Pocket' },
    { id: 'flight', icon: 'wings', label: 'Flight' }, { id: 'dlc', icon: 'disc', label: 'Version' }, { id: 'id', icon: 'hash', label: 'ID' }
  ];
  function compareChar(g, a) {
    var t = [], s, r;
    t.push(tile('mode', g.tainted === a.tainted ? 'g' : 'r', 0, { t: 'icon', n: g.tainted ? 'skull' : 'char', pal: g.tainted ? { w: '#e2573f' } : null }, g.tainted ? 'Tainted' : 'Regular'));
    t.push(tile('unlock', g.unlock === a.unlock ? 'g' : 'r', 0, { t: 'icon', n: UNLOCK_ICON[g.unlock] }, 'Unlock ' + UNLOCK_NAME[g.unlock]));
    t.push(tile('hearts', setState(g.hearts, a.hearts), 0, { t: 'icons', list: g.hearts.map(heartIcon) }, 'Hearts ' + g.hearts.join(', ')));
    if (g.hp === null || a.hp === null) t.push(tile('hp', g.hp === a.hp ? 'g' : 'r', 0, { t: 'text', v: g.hp === null ? '?' : String(g.hp) }, 'Health ' + (g.hp === null ? 'random' : g.hp)));
    else { r = numState(g.hp, a.hp, 1); t.push(tile('hp', r.s, r.d, { t: 'text', v: String(g.hp) }, 'Health ' + g.hp)); }
    var gi = g.items.length ? g.items : [], ai = a.items.length ? a.items : [];
    s = (!gi.length && !ai.length) ? 'g' : (!gi.length || !ai.length) ? 'r' : setState(gi, ai);
    t.push(tile('items', s, 0, gi.length ? { t: 'icons', list: gi.map(function (k) { return ITEM_ICON[k]; }) } : { t: 'icon', n: 'cross', pal: { w: '#9aa0b4' } }, 'Starting items ' + (gi.join(', ') || 'none')));
    var gp = g.pocket, ap = a.pocket;
    s = (!gp.length && !ap.length) ? 'g' : (!gp.length || !ap.length) ? 'r' : setState(gp, ap);
    t.push(tile('pocket', s, 0, gp.length ? { t: 'icons', list: gp.map(function (k) { return POCKET_ICON[k]; }) } : { t: 'icon', n: 'cross', pal: { w: '#9aa0b4' } }, 'Pocket ' + (gp.join(', ') || 'none')));
    t.push(tile('flight', g.flight === a.flight ? 'g' : 'r', 0, g.flight ? { t: 'icon', n: 'wings' } : { t: 'icon', n: 'cross', pal: { w: '#9aa0b4' } }, 'Flight ' + (g.flight ? 'yes' : 'no')));
    r = numState(g.dlc, a.dlc, 1); t.push(tile('dlc', r.s, r.d, { t: 'text', v: DLC[g.dlc] }, 'Version ' + DLC_NAME[g.dlc]));
    r = numState(g.n, a.n, 3); t.push(tile('id', r.s, r.d, { t: 'text', v: String(g.n) }, 'ID ' + g.n));
    return t;
  }

  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9?]+/g, ' ').trim(); }
  var games = {
    item: { key: 'item', title: 'Item', list: D.items, cols: itemCols, compare: compareItem, salt: 'item' },
    char: { key: 'char', title: 'Character', list: D.characters, cols: charCols, compare: compareChar, salt: 'char' }
  };
  Object.keys(games).forEach(function (k) {
    var g = games[k]; g.byKey = {};
    g.list.forEach(function (e) { e._s = norm(e.name + ' ' + (e.aka || '')); g.byKey[e.k] = e; });
  });
  function search(game, q, skip) {
    q = norm(q); if (!q) return [];
    var pre = [], sub = [];
    game.list.forEach(function (e) {
      if (skip && skip[e.k]) return;
      var nn = norm(e.name);
      if (nn.indexOf(q) === 0) pre.push(e); else if (e._s.indexOf(q) >= 0) sub.push(e);
    });
    return pre.concat(sub);
  }
  function exact(game, q) {
    q = norm(q); if (!q) return null;
    for (var i = 0; i < game.list.length; i++) if (norm(game.list[i].name) === q) return game.list[i];
    return null;
  }
  window.TBOIQEngine = { MAX: MAX_GUESSES, games: games, search: search, exact: exact, POOL_NAME: POOL_NAME, DLC_NAME: DLC_NAME, UNLOCK_NAME: UNLOCK_NAME };
})();
