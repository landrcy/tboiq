/* TBOIQ UI. Plain script, no build step. */
(function () {
  'use strict';
  var I = window.TBOIQIcons, E = window.TBOIQEngine, S = window.TBOIQStore, Day = window.TBOIQDaily, A = window.TBOIQAudio;
  var $view = document.getElementById('view'), $nav = document.getElementById('nav'), $dlg = document.getElementById('dlg'), $toast = document.getElementById('toast');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var route = { view: 'home', mode: 'daily' };
  var cur = null, tickTimer = null, revealTimers = [];
  var FLIP_STEP = 0.22;   // seconds between tile reveals (CSS animation-delay; time based)

  /* ---------- helpers ---------- */
  function el(tag, cls, attrs, kids) {
    var n = document.createElement(tag); if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { if (k) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return n;
  }
  function fit(c, mult) { c.style.width = 'calc(var(--us,2) * ' + (c.width * (mult || 1)) + 'px)'; c.style.height = 'calc(var(--us,2) * ' + (c.height * (mult || 1)) + 'px)'; return c; }
  function toast(msg, icon) {
    $toast.textContent = ''; var t = el('div', 'toast', null, [icon ? I.ui(icon, { scale: 2 }) : null, el('span', null, null, [msg])]);
    $toast.appendChild(t); clearTimeout(toast._t); toast._t = setTimeout(function () { $toast.textContent = ''; }, 2200);
  }
  /* icon-only button using the kit's normal + hover icons */
  function kitBtn(name, label, onClick, opts) {
    opts = opts || {};
    var b = el('button', 'ibtn' + (opts.cls ? ' ' + opts.cls : ''), { type: 'button', 'aria-label': label, title: label });
    var n = I.kit('ui_' + name, opts.scale || 3) || I.ui('help', { scale: 3 }), h = I.kit('ui_' + name + '_hover', opts.scale || 3);
    n.classList.add('n'); b.appendChild(n); if (h) { h.classList.add('h'); b.appendChild(h); }
    if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(!!opts.pressed));
    if (opts.current) b.setAttribute('aria-current', 'page');
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function ownBtn(name, label, onClick, opts) {
    opts = opts || {};
    var b = el('button', 'ibtn' + (opts.cls ? ' ' + opts.cls : ''), { type: 'button', 'aria-label': label, title: label });
    b.appendChild(I.ui(name, { scale: opts.scale || 3 }));
    if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(!!opts.pressed));
    if (opts.current) b.setAttribute('aria-current', 'page');
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function go(view, mode) { location.hash = view === 'home' ? '#/' : '#/' + view + (mode === 'random' ? '/random' : ''); }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    var v = h[0] === 'item' || h[0] === 'char' || h[0] === 'browse' ? h[0] : 'home';
    return { view: v, mode: h[1] === 'random' ? 'random' : 'daily', tab: h[1] === 'char' ? 'char' : 'item' };
  }

  /* ---------- nav ---------- */
  function renderNav() {
    $nav.textContent = '';
    var left = el('div', 'grp'), right = el('div', 'grp');
    left.appendChild(kitBtn('home', 'Home', function () { go('home'); }, { current: route.view === 'home' }));
    left.appendChild(kitBtn('item', 'Guess the item', function () { go('item'); }, { current: route.view === 'item' }));
    left.appendChild(kitBtn('character', 'Guess the character', function () { go('char'); }, { current: route.view === 'char' }));
    left.appendChild(ownBtn('book', 'Browse all items and characters', function () { location.hash = '#/browse'; }, { current: route.view === 'browse' }));
    var on = A.isOn();
    right.appendChild(kitBtn(on ? 'sound_on' : 'sound_off', on ? 'Sound on (click to mute)' : 'Sound off (click to play)', toggleSound, { pressed: on }));
    right.appendChild(kitBtn('how_to_play', 'How to play', showHelp));
    $nav.appendChild(left); $nav.appendChild(right);
  }
  function toggleSound() {
    var st = S.get(), v = A.setOn(!A.isOn());
    st.sound = v; S.save(); renderNav(); if (v) A.sfx('click');
  }

  /* ---------- game state ---------- */
  function startGame(gk, mode) {
    var g = E.games[gk], st = S.get(), date = Day.nyDate(), rec, ans;
    if (mode === 'daily') {
      ans = g.list[Day.answerIndex(g.salt, g.list.length, date)];
      rec = st.daily[gk];
      if (!rec || rec.day !== date || rec.ans !== ans.k) rec = st.daily[gk] = { day: date, ans: ans.k, guesses: [], status: 'playing' };
    } else {
      rec = st.rand[gk];
      if (!rec || !g.byKey[rec.ans]) rec = st.rand[gk] = newRandom(g);
      ans = g.byKey[rec.ans];
    }
    cur = { g: g, mode: mode, rec: rec, answer: ans, date: date, busy: false };
    S.save();
  }
  function newRandom(g) { return { ans: g.list[Math.floor(Math.random() * g.list.length)].k, guesses: [], status: 'playing' }; }

  /* ---------- views ---------- */
  function render() {
    revealTimers.forEach(clearTimeout); revealTimers = []; clearInterval(tickTimer); tickTimer = null;
    closeList();
    route = parseHash(); renderNav(); $view.textContent = '';
    if (route.view === 'home') renderHome(); else if (route.view === 'browse') renderBrowse(); else { startGame(route.view, route.mode); renderGame(); }
    document.title = route.view === 'home' ? 'TBOIQ' : route.view === 'browse' ? 'TBOIQ - Browse' : 'TBOIQ - ' + E.games[route.view].title;
    window.scrollTo(0, 0);
  }

  function dailyBadge(gk) {
    var st = S.get(), rec = st.daily[gk], date = Day.nyDate();
    if (!rec || rec.day !== date || !rec.guesses.length) return null;
    if (rec.status === 'won') return el('span', 'badge', { 'aria-label': 'Solved in ' + rec.guesses.length }, [I.kit('ui_correct', 2), el('span', null, null, [rec.guesses.length + '/' + E.MAX])]);
    if (rec.status === 'lost') return el('span', 'badge', { 'aria-label': 'Failed' }, [I.kit('ui_wrong', 2)]);
    return el('span', 'badge', { 'aria-label': rec.guesses.length + ' of ' + E.MAX + ' guesses used' }, [el('span', null, null, [rec.guesses.length + '/' + E.MAX])]);
  }
  function renderHome() {
    var logo = el('h1', 'logo', null, [el('span', null, null, ['TBOIQ'])]);
    var cards = el('div', 'cards');
    [['item', 'Guess the item', I.entity('item', E.games.item.byKey.c105 || E.games.item.list[0], 7)], ['char', 'Guess the character', I.entity('char', E.games.char.byKey.p0, 4, { portrait: true })]].forEach(function (c) {
      var a = el('a', 'card', { href: '#/' + c[0], 'aria-label': c[1] + ' - daily' });
      a.appendChild(el('span', 'art', null, [c[2]]));
      var kids = [I.ui('calendar', { scale: 2 }), dailyBadge(c[0])];
      a.appendChild(el('span', 'meta', null, kids));
      cards.appendChild(a);
    });
    var tag = el('p', 'tag hearts', { 'aria-label': '8 guesses' }); for (var hi = 0; hi < E.MAX; hi++) tag.appendChild(el('i', 'hp', null, [I.ui('heart', { scale: 3, pal: { r: '#d63a2f', l: '#ff8d7a' } })]));
    $view.appendChild(logo); $view.appendChild(cards); $view.appendChild(tag);
    $view.appendChild(el('p', 'fine', null, ['Unofficial fan project. Sprites (c) Edmund McMillen / Nicalis, via the Binding of Isaac Wiki. Tap the i for credits.']));
  }

  function pips(root) {
    var used = cur.rec.guesses.length, n = E.MAX;
    root.textContent = ''; root.setAttribute('aria-label', 'Guesses used ' + used + ' of ' + n);
    for (var i = 0; i < n; i++) {
      var lost = i < used, h = el('i', 'hp' + (lost ? ' lost' : '') + (lost && i === used - 1 ? ' lose' : ''), null,
        [lost ? I.ui('heart', { scale: 3, pal: { r: '#2a1c1b', l: '#3a2826' } }) : I.ui('heart', { scale: 3, pal: { r: '#d63a2f', l: '#ff8d7a' } })]);
      root.appendChild(h);
    }
  }

  function renderGame() {
    var g = cur.g, wrap = el('section', 'game');
    var hud = el('div', 'hud');
    var modes = el('div', 'grp');
    modes.appendChild(ownBtn('calendar', 'Daily puzzle', function () { go(g.key, 'daily'); }, { pressed: cur.mode === 'daily' }));
    modes.appendChild(ownBtn('dice', 'Random play (unlimited)', function () { go(g.key, 'random'); }, { pressed: cur.mode === 'random' }));
    modes.appendChild(ownBtn('stats', 'Stats', showStats));
    var pipsEl = el('div', 'hearts', { role: 'img' }); pips(pipsEl); cur.pipsEl = pipsEl;
    hud.appendChild(modes); hud.appendChild(pipsEl);
    wrap.appendChild(hud);
    var slot = el('div', 'slot'); cur.slot = slot; wrap.appendChild(slot);
    // column header (wide screens)
    var head = el('div', 'cells head ' + g.key, { 'aria-hidden': 'true' }, [el('span')]);
    g.cols.forEach(function (c) { head.appendChild(el('span', 'hc', { title: c.label }, [fit(I.ui(c.icon, { scale: 1 })), el('span', 'ht', null, [c.short || c.label.toUpperCase()])])); });
    wrap.appendChild(head);
    var rows = el('div', 'rows', { 'aria-label': 'Guesses' }); cur.rowsEl = rows; wrap.appendChild(rows);
    $view.appendChild(wrap);
    cur.rec.guesses.forEach(function (k) { addRow(g.byKey[k], false); });
    setSlot();
  }

  function entityEl(g, e, big) {
    var c = I.entity(g.key, e, big ? (g.key === 'item' ? 4 : 6) : (g.key === 'item' ? 3 : 2));
    var w = el('span', 'ent' + (e.tainted ? ' tainted' : ''), null, [c]);
    return w;
  }
  function renderView(v, labCanvas) {
    var box = el('span', 'in');
    if (v.t === 'text') box.appendChild(el('span', 'tx', null, [v.v]));
    else if (v.t === 'icon') { var c = I.ui(v.n, { scale: 1, pal: v.pal }); box.appendChild(el('span', 'chip', null, [fit(c, 1)])); }
    else if (v.t === 'icons') {
      var chip = el('span', 'chip wrap'); v.list.forEach(function (it) { chip.appendChild(fit(I.ui(it.n, { scale: 1, pal: it.pal }))); }); box.appendChild(chip);
    } else if (v.t === 'pools') {
      var chip2 = el('span', 'chip wrap pools'); v.list.forEach(function (p) { chip2.appendChild(fit(I.pool(p, 1))); }); box.appendChild(chip2);
    }
    return box;
  }
  function makeTile(g, t, i, animate) {
    var col = g.cols[i], d = el('div', 'tile ' + t.s + (animate ? ' flip' : ''), { role: 'img', 'aria-label': t.label, title: t.label });
    d.style.setProperty('--i', i + 1);
    var mk = t.s === 'g' ? 'check' : t.s === 'y' ? 'tilde' : 'cross';
    d.appendChild(el('span', 'mk', null, [fit(I.ui(mk, { scale: 1, pal: { w: t.s === 'y' ? '#0e0b14' : '#f5ebcf' } }))]));
    d.appendChild(el('span', 'lab', null, [fit(I.ui(col.icon, { scale: 1 })), el('span', 'lt', null, [col.short || col.label.toUpperCase()])]));
    d.appendChild(renderView(t.view));
    if (t.d) d.appendChild(el('span', 'ar', null, [fit(I.ui(t.d > 0 ? 'up' : 'down', { scale: 1, pal: { w: t.s === 'y' ? '#0e0b14' : '#f5ebcf' } }))]));
    return d;
  }
  function addRow(guess, animate) {
    var g = cur.g, tiles = g.compare(guess, cur.answer);
    var row = el('div', 'row' + (animate ? ' new' : ''));
    row.appendChild(el('div', 'cap', null, [guess.name]));
    var cells = el('div', 'cells ' + g.key);
    cells.appendChild(el('div', 'tile ent-cell', null, [entityEl(g, guess)]));
    tiles.forEach(function (t, i) { cells.appendChild(makeTile(g, t, i, animate)); });
    row.appendChild(cells);
    cur.rowsEl.insertBefore(row, cur.rowsEl.firstChild);
    return tiles;
  }

  /* ---------- guess input + autocomplete ---------- */
  var listEl = null, items = [], sel = -1;
  function closeList() { if (listEl) { listEl.hidden = true; listEl.textContent = ''; } items = []; sel = -1; var inp = document.getElementById('guess'); if (inp) inp.setAttribute('aria-expanded', 'false'); }
  function setSlot() {
    var slot = cur.slot; slot.textContent = '';
    if (cur.rec.status !== 'playing') { renderResult(slot); return; }
    var form = el('form', 'entry', { autocomplete: 'off', role: 'search' });
    var inp = el('input', null, { id: 'guess', type: 'text', placeholder: cur.g.key === 'item' ? 'Item' : 'Character', 'aria-label': 'Guess ' + cur.g.title.toLowerCase(),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'go', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'sugg', maxlength: '40' });
    var btn = el('button', 'ibtn go', { type: 'submit', 'aria-label': 'Submit guess', title: 'Submit guess' }, [I.ui('check', { scale: 3, pal: { w: '#ffd56b' } })]);
    listEl = el('ul', 'sugg', { id: 'sugg', role: 'listbox', 'aria-label': 'Suggestions' }); listEl.hidden = true;
    form.appendChild(inp); form.appendChild(btn); form.appendChild(listEl);
    slot.appendChild(form);
    inp.addEventListener('input', function () { refresh(inp); });
    inp.addEventListener('focus', function () { refresh(inp); });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1, inp); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1, inp); }
      else if (ev.key === 'Escape') closeList();
      else if (ev.key === 'Tab') closeList();
    });
    inp.addEventListener('blur', function () { setTimeout(closeList, 150); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pick = sel >= 0 ? items[sel] : (E.exact(cur.g, inp.value) || (items.length === 1 ? items[0] : null) || (items.length ? items[0] : null));
      if (!pick) { A.sfx('error'); shake(form); return; }
      submit(pick);
    });
    if (!window.matchMedia('(pointer: coarse)').matches) setTimeout(function () { inp.focus(); }, 0);
  }
  function shake(n) { n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); }
  function refresh(inp) {
    var skip = {}; cur.rec.guesses.forEach(function (k) { skip[k] = 1; });
    items = E.search(cur.g, inp.value, skip).slice(0, 30); sel = -1; listEl.textContent = '';
    if (!items.length) { closeList(); return; }
    items.forEach(function (e, i) {
      var li = el('li', null, { role: 'option', id: 'opt' + i, 'aria-selected': 'false' }, [entityEl(cur.g, e), el('span', 'nm', null, [e.name])]);
      li.querySelector('canvas').style.width = li.querySelector('canvas').width * 2 + 'px'; li.querySelector('canvas').style.height = li.querySelector('canvas').height * 2 + 'px';
      li.addEventListener('mousedown', function (ev) { ev.preventDefault(); submit(e); });
      listEl.appendChild(li);
    });
    listEl.hidden = false; inp.setAttribute('aria-expanded', 'true');
  }
  function move(d, inp) {
    if (!items.length) { refresh(inp); return; }
    sel = (sel + d + items.length) % items.length;
    Array.prototype.forEach.call(listEl.children, function (li, i) { li.setAttribute('aria-selected', String(i === sel)); if (i === sel) { li.scrollIntoView({ block: 'nearest' }); inp.setAttribute('aria-activedescendant', li.id); } });
  }

  function submit(guess) {
    if (cur.busy || cur.rec.status !== 'playing') return;
    if (cur.rec.guesses.indexOf(guess.k) >= 0) { toast('Already guessed', 'cross'); return; }
    cur.busy = true; closeList();
    var inp = document.getElementById('guess'); if (inp) inp.value = '';
    cur.rec.guesses.push(guess.k);
    var won = guess.k === cur.answer.k, lost = !won && cur.rec.guesses.length >= E.MAX;
    var tiles = addRow(guess, !reduced.matches);
    pips(cur.pipsEl); A.sfx('click');
    if (!reduced.matches) tiles.forEach(function (t, i) { revealTimers.push(setTimeout(function () { A.sfx('tile', t.s); }, (i + 1) * FLIP_STEP * 1000)); });
    var wait = reduced.matches ? 0 : (tiles.length * FLIP_STEP + 0.5) * 1000;
    if (won || lost) {
      cur.rec.status = won ? 'won' : 'lost'; recordStats(won);
    }
    S.save();
    revealTimers.push(setTimeout(function () {
      cur.busy = false;
      if (won || lost) { A.sfx(won ? 'win' : 'lose'); }
      setSlot();
    }, wait));
  }

  function recordStats(won) {
    var st = S.get(), s = st.stats[cur.g.key], n = cur.rec.guesses.length;
    if (cur.mode === 'daily') {
      s.played++; if (won) {
        s.wins++; s.dist[n - 1]++;
        var prev = s.lastWin ? Day.dayNumber(cur.date) - Day.dayNumber(s.lastWin) : 99;
        s.streak = prev === 1 ? s.streak + 1 : 1; s.lastWin = cur.date; if (s.streak > s.best) s.best = s.streak;
      } else s.streak = 0;
    } else { s.rPlayed++; if (won) s.rWins++; }
  }

  /* ---------- result ---------- */
  function shareText() {
    var g = cur.g, ans = cur.answer, rows = cur.rec.guesses.map(function (k) {
      return g.compare(g.byKey[k], ans).map(function (t) { return t.s === 'g' ? '\uD83D\uDFE9' : t.s === 'y' ? '\uD83D\uDFE8' : '\uD83D\uDFE5'; }).join('');
    });
    var score = cur.rec.status === 'won' ? cur.rec.guesses.length : 'X';
    var head = 'TBOIQ ' + g.title + ' ' + (cur.mode === 'daily' ? cur.date : 'random') + ' ' + score + '/' + E.MAX;
    return head + '\n' + rows.join('\n') + '\n' + location.href.split('#')[0];
  }
  function copy(text) {
    function fallback() {
      var ta = el('textarea', 'sr', { 'aria-hidden': 'true' }); ta.value = text; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }
  function renderResult(slot) {
    var won = cur.rec.status === 'won', g = cur.g;
    var box = el('div', 'result ' + (won ? 'won' : 'lost'), { role: 'group', 'aria-label': won ? 'Solved' : 'Out of guesses' });
    box.appendChild(el('div', 'rs-top', null, [I.kit(won ? 'ui_correct' : 'ui_wrong', 3), el('span', 'sc', null, [(won ? cur.rec.guesses.length : 'X') + '/' + E.MAX])]));
    box.appendChild(infoCard(g.key, cur.answer, { reveal: true }));
    var acts = el('div', 'grp');
    acts.appendChild(kitBtn('share', 'Copy result', function () { copy(shareText()).then(function (ok) { toast(ok ? 'Copied' : 'Copy failed', ok ? 'check' : 'cross'); A.sfx('click'); }); }));
    acts.appendChild(ownBtn('stats', 'Stats', showStats));
    if (cur.mode === 'random') acts.appendChild(ownBtn('dice', 'New random puzzle', function () { S.get().rand[g.key] = newRandom(g); S.save(); render(); }));
    else {
      acts.appendChild(ownBtn('dice', 'Play random', function () { go(g.key, 'random'); }));
      var cd = el('span', 'cd', { 'aria-label': 'Next daily puzzle in' }); cd.appendChild(I.ui('calendar', { scale: 2 })); var tx = el('span', null, null, ['']); cd.appendChild(tx);
      var upd = function () {
        var ms = Day.msToNext(), s = Math.floor(ms / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
        tx.textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
        if (Day.nyDate() !== cur.date) render();
      };
      upd(); clearInterval(tickTimer); tickTimer = setInterval(upd, 1000);
      acts.appendChild(cd);
    }
    box.appendChild(acts);
    slot.appendChild(box);
  }

  /* ---------- info card (reveal panel + browse detail) ---------- */
  var TYPE_G = { active: ['bolt', { y: '#f2c94c' }], passive: ['gem', null], familiar: ['blob', null], trinket: ['coin', null] };
  var TYPE_NAME = { active: 'Active item', passive: 'Passive item', familiar: 'Familiar', trinket: 'Trinket' };
  var DLC_ABBR = ['RB', 'AB', 'A+', 'RP'];
  var HEART_PAL = { red: null, soul: { r: '#74a3c8', l: '#f5ebcf' }, black: { r: '#8d7bc0', l: '#d9c8a2' } };
  var POCKET_G = { bomb: ['bomb'], key: ['key'], coin: ['coin'], pill: ['pill'], card: ['card'], charge: ['bolt', { y: '#74a3c8' }], random: ['help', { w: '#8d7bc0' }] };
  var UNLOCK_G = { default: 'star', boss: 'skull', collect: 'coin', feat: 'trophy', secret: 'help', donate: 'slot', closet: 'door' };
  var itemByName = null;
  function nameKey(n) { return n.toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, ''); }
  function findItem(name) {
    if (!itemByName) { itemByName = {}; E.games.item.list.forEach(function (it) { if (it.type !== 'trinket') itemByName[nameKey(it.name)] = it; }); }
    return itemByName[nameKey(name)] || null;
  }
  function gl(spec, scale) { return I.ui(spec[0], { scale: scale || 2, pal: spec[1] || null }); }
  function fact(icons, text, label, cls) {
    var c = el('span', 'fact' + (cls ? ' ' + cls : ''), { title: label, 'aria-label': label + (text !== null && text !== undefined ? ': ' + text : '') });
    icons.forEach(function (i) { c.appendChild(i); });
    if (text !== null && text !== undefined) c.appendChild(el('span', 'fv', null, [String(text)]));
    return c;
  }
  function rcText(v) { if (v === null || v === undefined) return null; if (typeof v === 'number') return String(v); if (v === 'inf') return 'INF'; if (v === 'once') return '1X'; if (v === 'var') return '?'; return String(v).toUpperCase(); }
  function signed(v) { return v === null || v === undefined ? '?' : (v > 0 ? '+' : '') + v.toFixed(2); }
  function wikiLink(gk, e) {
    var u = I.wikiUrl(e); if (!u) return null;
    var a = el('a', 'wl', { href: u, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Source: ' + e.name + ' on the Binding of Isaac Wiki (opens in a new tab)', title: 'Wiki source' }, [I.ui('link', { scale: 2 }), el('span', null, null, ['wiki'])]);
    return a;
  }
  function itemFacts(e) {
    var f = el('div', 'facts');
    f.appendChild(fact([gl(TYPE_G[e.type])], null, TYPE_NAME[e.type]));
    f.appendChild(fact(e.q ? Array.apply(null, Array(e.q)).map(function () { return I.ui('star', { scale: 2 }); }) : [], e.q === null ? '-' : (e.q ? null : '0'), 'Quality ' + (e.q === null ? 'none' : e.q)));
    var pl = el('span', 'fact', { 'aria-label': 'Pools: ' + e.pools.map(function (p) { return E.POOL_NAME[p]; }).join(', ') });
    e.pools.forEach(function (p) { pl.appendChild(el('span', 'pi', { title: E.POOL_NAME[p] }, [I.pool(p, 3)])); }); f.appendChild(pl);
    if (e.type === 'active') f.appendChild(fact([I.ui('bolt', { scale: 2, pal: { y: '#f2c94c' } })], rcText(e.rc) || '-', 'Recharge'));
    f.appendChild(fact([I.ui('disc', { scale: 2 })], DLC_ABBR[e.dlc], E.DLC_NAME[e.dlc]));
    f.appendChild(fact([I.ui('hash', { scale: 2 })], (e.type === 'trinket' ? 'T' : '') + e.n, 'ID'));
    return f;
  }
  function heartIcons(e) {
    var out = [];
    e.hearts.forEach(function (h) {
      if (h === 'coin') out.push(I.ui('coin', { scale: 2 })); else if (h === 'bone') out.push(I.ui('bone', { scale: 2 }));
      else if (h === 'none') out.push(I.ui('cross', { scale: 2, pal: { w: '#9aa0b4' } })); else if (h === 'random') out.push(I.ui('help', { scale: 2, pal: { w: '#8d7bc0' } }));
      else out.push(I.ui('heart', { scale: 2, pal: HEART_PAL[h] }));
    });
    return out;
  }
  function charFacts(e) {
    var f = el('div', 'facts'), s = e.stats || {};
    f.appendChild(fact([I.ui('speed', { scale: 2 })], s.speed === undefined || s.speed === null ? '?' : s.speed.toFixed(2), 'Speed'));
    f.appendChild(fact([I.ui('tear', { scale: 2 })], signed(s.tears), 'Tears (vs Isaac)'));
    f.appendChild(fact([I.ui('dmg', { scale: 2 })], s.dmg === undefined || s.dmg === null ? '?' : s.dmg.toFixed(2), 'Damage'));
    f.appendChild(fact([I.ui('range', { scale: 2 })], s.range === undefined || s.range === null ? '?' : s.range.toFixed(2), 'Range'));
    f.appendChild(fact([I.ui('luck', { scale: 2 })], s.luck === undefined || s.luck === null ? '?' : s.luck.toFixed(1), 'Luck'));
    f.appendChild(fact(heartIcons(e), e.hp === null ? '?' : '\u00d7' + e.hp, 'Hearts: ' + e.hearts.join(', ')));
    f.appendChild(fact([I.ui('disc', { scale: 2 })], DLC_ABBR[e.dlc], E.DLC_NAME[e.dlc]));
    f.appendChild(fact([I.ui('hash', { scale: 2 })], e.n, 'ID'));
    return f;
  }
  function infoCard(gk, e, opt) {
    opt = opt || {};
    var isItem = gk === 'item', root = el('article', 'info ' + gk + (opt.reveal ? ' reveal' : ''));
    var stage = el('div', 'stage');
    stage.appendChild(el('span', 'glow', { 'aria-hidden': 'true' }));
    stage.appendChild(el('div', 'floaty' + (e.tainted ? ' tainted' : ''), null, [I.entity(gk, e, isItem ? 4 : 3, { portrait: true })]));
    if (isItem) stage.appendChild(el('div', 'ped', { 'aria-hidden': 'true' }, [I.pedestal(4)]));
    root.appendChild(stage);
    var banner = el('div', 'banner');
    if (!opt.noName) banner.appendChild(el('h3', 'bn', null, [e.name]));
    if (isItem && e.d) banner.appendChild(el('p', 'bd', null, [e.d]));
    if (!isItem && e.tainted) banner.appendChild(el('span', 'bd', { 'aria-label': 'Tainted' }, [I.ui('tainted', { scale: 2 })]));
    if (banner.childNodes.length) root.appendChild(banner);
    root.appendChild(isItem ? itemFacts(e) : charFacts(e));
    if (isItem) { if (e.u) root.appendChild(el('p', 'unl', null, [I.ui('door', { scale: 2 }), el('span', null, null, [e.u])])); }
    else {
      var st = el('div', 'start');
      (e.start || []).forEach(function (n) {
        var it = findItem(n), c = el('span', 'si', { title: n, 'aria-label': 'Starting item: ' + n });
        if (it) c.appendChild(I.entity('item', it, 2)); else c.appendChild(el('span', 'tx', null, [n]));
        st.appendChild(c);
      });
      (e.pocket || []).forEach(function (k) { var sp = POCKET_G[k]; if (sp) st.appendChild(el('span', 'si pk', { title: 'Pocket: ' + k, 'aria-label': 'Pocket: ' + k }, [gl(sp, 2)])); });
      if (st.childNodes.length) root.appendChild(st);
      root.appendChild(el('p', 'unl', null, [I.ui(UNLOCK_G[e.unlock] || 'star', { scale: 2 }), el('span', null, null, [e.u || E.UNLOCK_NAME[e.unlock]])]));
      if (e.twin && E.games.char.byKey[e.twin]) {
        var tw = E.games.char.byKey[e.twin];
        var tb = el('button', 'ibtn tw', { type: 'button', 'aria-label': (tw.tainted ? 'Tainted counterpart: ' : 'Base character: ') + tw.name, title: tw.name }, [I.entity('char', tw, 2)]);
        tb.addEventListener('click', function () { showDetail('char', tw); });
        root.appendChild(el('p', 'unl', null, [I.ui(tw.tainted ? 'tainted' : 'char', { scale: 2 }), tb]));
      }
    }
    var wl = wikiLink(gk, e); if (wl) root.appendChild(el('p', 'src', null, [wl]));
    return root;
  }
  function showDetail(gk, e) { var b = el('div', 'db'); b.appendChild(infoCard(gk, e, { noName: true })); openDlg(e.name, b); A.sfx('click'); }

  /* ---------- browse ---------- */
  var BR = { item: { q: '', pool: null, qual: null, type: null }, char: { q: '', tainted: null, unlock: null, dlc: null } };
  function renderBrowse() {
    var tab = route.tab, g = E.games[tab], f = BR[tab], wrap = el('section', 'browse');
    var bar = el('div', 'bbar');
    var tabs = el('div', 'grp');
    tabs.appendChild(kitBtn('item', 'Items', function () { location.hash = '#/browse'; }, { pressed: tab === 'item' }));
    tabs.appendChild(kitBtn('character', 'Characters', function () { location.hash = '#/browse/char'; }, { pressed: tab === 'char' }));
    var sf = el('label', 'sbox', { title: 'Search' }, [I.ui('search', { scale: 2 })]);
    var inp = el('input', null, { type: 'search', id: 'bq', 'aria-label': 'Search by name', autocomplete: 'off', spellcheck: 'false', value: f.q });
    sf.appendChild(inp);
    bar.appendChild(tabs); bar.appendChild(sf); wrap.appendChild(bar);
    var cnt = el('span', 'cnt', { 'aria-live': 'polite' });
    var cells = {};
    function apply() {
      var hit = {}; if (f.q) E.search(g, f.q).forEach(function (e) { hit[e.k] = 1; });
      var n = 0;
      g.list.forEach(function (e) {
        var ok = (!f.q || hit[e.k]);
        if (tab === 'item') ok = ok && (f.pool === null || e.pools.indexOf(f.pool) >= 0) && (f.qual === null || e.q === f.qual) && (f.type === null || e.type === f.type);
        else ok = ok && (f.tainted === null || !!e.tainted === f.tainted) && (f.unlock === null || e.unlock === f.unlock) && (f.dlc === null || e.dlc === f.dlc);
        cells[e.k].hidden = !ok; if (ok) n++;
      });
      cnt.textContent = n + ' / ' + g.list.length;
      Array.prototype.forEach.call(wrap.querySelectorAll('.fb'), function (b) { b.setAttribute('aria-pressed', String(f[b.dataset.f] === JSON.parse(b.dataset.v))); });
    }
    function fbtn(key, val, icon, label) {
      var b = el('button', 'fb', { type: 'button', 'aria-label': label, title: label, 'aria-pressed': 'false', 'data-f': key, 'data-v': JSON.stringify(val) }, icon);
      b.addEventListener('click', function () { f[key] = f[key] === val ? null : val; apply(); A.sfx('click'); });
      return b;
    }
    var fl = el('div', 'filters');
    if (tab === 'item') {
      var r1 = el('div', 'frow', { 'aria-label': 'Pool filter' });
      Object.keys(E.POOL_NAME).forEach(function (p) { r1.appendChild(fbtn('pool', p, [I.pool(p, 3)], E.POOL_NAME[p])); });
      var r2 = el('div', 'frow', { 'aria-label': 'Quality filter' });
      [0, 1, 2, 3, 4].forEach(function (q) { r2.appendChild(fbtn('qual', q, [I.ui('star', { scale: 2 }), el('b', null, null, [String(q)])], 'Quality ' + q)); });
      var r3 = el('div', 'frow', { 'aria-label': 'Type filter' });
      Object.keys(TYPE_G).forEach(function (t) { r3.appendChild(fbtn('type', t, [gl(TYPE_G[t], 2)], TYPE_NAME[t])); });
      fl.appendChild(r1); fl.appendChild(r2); fl.appendChild(r3);
    } else {
      var c1 = el('div', 'frow');
      c1.appendChild(fbtn('tainted', false, [I.ui('char', { scale: 2 })], 'Regular'));
      c1.appendChild(fbtn('tainted', true, [I.ui('tainted', { scale: 2 })], 'Tainted'));
      var c2 = el('div', 'frow', { 'aria-label': 'Unlock filter' });
      Object.keys(UNLOCK_G).forEach(function (u) { c2.appendChild(fbtn('unlock', u, [I.ui(UNLOCK_G[u], { scale: 2 })], 'Unlock: ' + E.UNLOCK_NAME[u])); });
      var c3 = el('div', 'frow', { 'aria-label': 'Version filter' });
      DLC_ABBR.forEach(function (d, i) { c3.appendChild(fbtn('dlc', i, [el('b', null, null, [d])], E.DLC_NAME[i])); });
      fl.appendChild(c1); fl.appendChild(c2); fl.appendChild(c3);
    }
    wrap.appendChild(fl);
    wrap.appendChild(el('div', 'bmeta', null, [I.ui(tab === 'item' ? 'item' : 'char', { scale: 2 }), cnt]));
    var grid = el('div', 'bgrid ' + tab, { role: 'list' });
    g.list.forEach(function (e) {
      var b = el('button', 'bcell' + (e.tainted ? ' tainted' : ''), { type: 'button', role: 'listitem', title: e.name, 'aria-label': e.name }, [I.entity(tab, e, tab === 'item' ? 3 : 3)]);
      b.addEventListener('click', function () { showDetail(tab, e); });
      cells[e.k] = b; grid.appendChild(b);
    });
    wrap.appendChild(grid);
    $view.appendChild(wrap);
    var tm = null;
    inp.addEventListener('input', function () { f.q = inp.value; clearTimeout(tm); tm = setTimeout(apply, 80); });
    apply();
  }

  /* ---------- credits ---------- */
  function showCredits() {
    var b = el('div', 'db credits');
    function a(href, text) { return el('a', null, { href: href, target: '_blank', rel: 'noopener noreferrer' }, [text]); }
    function p(kids) { return el('p', null, null, kids); }
    b.appendChild(p(['Unofficial fan project. Not affiliated with Edmund McMillen, Nicalis or Team Meat. ', el('i', null, null, ['The Binding of Isaac']), ' belongs to its owners.']));
    b.appendChild(p(['Item and character sprites are \u00a9 Edmund McMillen / Nicalis / respective owners. They come from the ', a('https://bindingofisaacrebirth.fandom.com/', 'Binding of Isaac Wiki'), ' (wiki content: ', a('https://creativecommons.org/licenses/by-sa/3.0/', 'CC BY-SA 3.0'), ').']));
    b.appendChild(p(['Facts (pools, quality, stats, unlocks) are from the wiki and wiki.gg; the short descriptions are rewritten in our own words. Sprites were converted from WebP to PNG and are stored locally. Each card links to its wiki page.']));
    b.appendChild(p(['UI art kit, procedural textures and chiptune are original. Fonts: Press Start 2P and Creepster (SIL OFL). ', a('https://github.com/landrcy/tboiq/blob/main/CREDITS.md', 'CREDITS.md')]));
    openDlg('Credits', b);
  }
  function renderFooter() {
    var f = document.getElementById('foot'); if (!f) return; f.textContent = '';
    f.appendChild(ownBtn('info', 'Credits and licensing', showCredits, { scale: 2 }));
    var a = el('a', 'ibtn', { href: 'https://bindingofisaacrebirth.fandom.com/wiki/', target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Binding of Isaac Wiki (opens in a new tab)', title: 'Binding of Isaac Wiki' }, [I.ui('link', { scale: 2 })]);
    f.appendChild(a);
  }

  /* ---------- dialogs ---------- */
  function openDlg(title, body) {
    $dlg.textContent = '';
    var head = el('div', 'dh', null, [el('h2', null, { id: 'dlg-title' }, [title]), kitBtn('close', 'Close', function () { $dlg.close(); })]);
    $dlg.appendChild(head); $dlg.appendChild(body);
    if (!$dlg.open) $dlg.showModal();
  }
  $dlg.addEventListener('click', function (ev) { if (ev.target === $dlg) $dlg.close(); });
  function showHelp() {
    var b = el('div', 'db');
    function line(icons, text) { var l = el('div', 'hl'); var ic = el('span', 'ic'); icons.forEach(function (i) { ic.appendChild(i); }); l.appendChild(ic); l.appendChild(el('span', null, null, [text])); b.appendChild(l); }
    var tg = function (cls, mk, pal, arrow) {
      var t = el('span', 'tile mini ' + cls); t.appendChild(el('span', 'mk', null, [fit(I.ui(mk, { scale: 1, pal: pal }))]));
      if (arrow) t.appendChild(el('span', 'ar', null, [fit(I.ui(arrow, { scale: 1, pal: pal }))])); return t;
    };
    line([tg('g', 'check', { w: '#f5ebcf' })], 'Match');
    line([tg('y', 'tilde', { w: '#0e0b14' })], 'Close / partial');
    line([tg('r', 'cross', { w: '#f5ebcf' })], 'No match');
    line([tg('r', 'cross', { w: '#f5ebcf' }, 'up'), tg('r', 'cross', { w: '#f5ebcf' }, 'down')], 'Answer is higher / lower');
    line([I.ui('calendar', { scale: 2 }), I.ui('dice', { scale: 2 })], 'Daily (same for everyone) / random');
    line([el('b', null, null, ['8'])], 'guesses');
    b.appendChild(el('h3', null, null, ['Items']));
    var ci = el('div', 'legend'); E.games.item.cols.forEach(function (c) { ci.appendChild(el('span', 'lg', null, [fit(I.ui(c.icon, { scale: 1 })), c.label])); }); b.appendChild(ci);
    var pl = el('div', 'legend'); Object.keys(E.POOL_NAME).forEach(function (k) { pl.appendChild(el('span', 'lg', null, [fit(I.pool(k, 1)), E.POOL_NAME[k]])); }); b.appendChild(pl);
    b.appendChild(el('p', 'note', null, ['Hearts = guesses left (8). RB Rebirth, AB Afterbirth, A+ Afterbirth+, RP Repentance. Data baseline: Repentance.']));
    b.appendChild(el('h3', null, null, ['Characters']));
    var cc = el('div', 'legend'); E.games.char.cols.forEach(function (c) { cc.appendChild(el('span', 'lg', null, [fit(I.ui(c.icon, { scale: 1 })), c.label])); }); b.appendChild(cc);
    openDlg('How to play', b);
  }
  function showStats() {
    var g = cur ? cur.g : E.games.item, s = S.get().stats[g.key], b = el('div', 'db');
    function stat(n, label) { return el('div', 'st', null, [el('b', null, null, [String(n)]), el('span', null, null, [label])]); }
    b.appendChild(el('div', 'stgrid', null, [stat(s.played, 'Played'), stat(s.played ? Math.round(s.wins / s.played * 100) : 0, 'Win %'), stat(s.streak, 'Streak'), stat(s.best, 'Best')]));
    var max = Math.max.apply(null, s.dist.concat([1])), dist = el('div', 'dist', { 'aria-label': 'Guess distribution' });
    s.dist.forEach(function (n, i) {
      var bar = el('div', 'bar2'); bar.style.setProperty('--w', Math.max(8, Math.round(n / max * 100)) + '%');
      dist.appendChild(el('div', 'dr', null, [el('span', 'dn', null, [String(i + 1)]), el('span', 'fill' + (n ? ' has' : ''), null, [el('span', null, null, [String(n)])])]));
      dist.lastChild.querySelector('.fill').style.width = Math.max(10, Math.round(n / max * 100)) + '%';
    });
    b.appendChild(dist);
    b.appendChild(el('div', 'rl', null, [I.ui('dice', { scale: 2 }), el('span', null, null, [s.rWins + '/' + s.rPlayed])]));
    openDlg(g.title + ' stats', b);
  }

  /* ---------- embers background (rAF + delta time; frame-rate independent) ---------- */
  (function embers() {
    var cv = document.getElementById('embers'), ctx = cv.getContext('2d'), P = [], last = 0, run = false, W = 0, H = 0, SC = 4;
    var cols = ['#e8902a', '#ffd56b', '#e2573f', '#9c4d1c'];
    function size() { W = Math.ceil(window.innerWidth / SC); H = Math.ceil(window.innerHeight / SC); cv.width = W; cv.height = H; }
    function spawn(initial) { P.push({ x: Math.random() * W, y: initial ? Math.random() * H : H + 2, vy: 4 + Math.random() * 7, vx: (Math.random() - 0.5) * 3, c: cols[Math.floor(Math.random() * cols.length)], ph: Math.random() * 6.28, life: 0 }); }
    function frame(t) {
      if (!run) return;
      var dt = Math.min(0.1, (t - last) / 1000); last = t;   // seconds, clamped
      ctx.clearRect(0, 0, W, H);
      while (P.length < 26) spawn(P.length < 18 && !last);
      for (var i = P.length - 1; i >= 0; i--) {
        var p = P[i]; p.life += dt; p.y -= p.vy * dt; p.x += (p.vx + Math.sin(p.life * 1.5 + p.ph) * 2) * dt;
        if (p.y < -2) { P.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, Math.min(1, p.y / H + 0.2)) * 0.55; ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
      requestAnimationFrame(frame);
    }
    function start() { if (run || reduced.matches || document.hidden) return; run = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { run = false; ctx.clearRect(0, 0, W, H); }
    size(); window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    reduced.addEventListener && reduced.addEventListener('change', function () { if (reduced.matches) stop(); else start(); });
    start();
  })();

  /* ---------- boot ---------- */
  window.addEventListener('hashchange', render);
  setInterval(function () { if (cur && route.view !== 'home' && route.mode === 'daily' && cur.date !== Day.nyDate()) render(); }, 30000);
  document.addEventListener('keydown', function (ev) { if (ev.key === '?' && !/input|textarea/i.test(ev.target.tagName)) showHelp(); });
  renderFooter();
  render();
})();
