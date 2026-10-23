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
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function go(view, mode) { location.hash = view === 'home' ? '#/' : '#/' + view + (mode === 'random' ? '/random' : ''); }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    var v = h[0] === 'item' || h[0] === 'char' ? h[0] : 'home';
    return { view: v, mode: h[1] === 'random' ? 'random' : 'daily' };
  }

  /* ---------- nav ---------- */
  function renderNav() {
    $nav.textContent = '';
    var left = el('div', 'grp'), right = el('div', 'grp');
    left.appendChild(kitBtn('home', 'Home', function () { go('home'); }, { current: route.view === 'home' }));
    left.appendChild(kitBtn('item', 'Guess the item', function () { go('item'); }, { current: route.view === 'item' }));
    left.appendChild(kitBtn('character', 'Guess the character', function () { go('char'); }, { current: route.view === 'char' }));
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
    if (route.view === 'home') renderHome(); else { startGame(route.view, route.mode); renderGame(); }
    document.title = route.view === 'home' ? 'TBOIQ' : 'TBOIQ - ' + E.games[route.view].title;
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
    [['item', 'Guess the item', I.kit('potion_flask', 6)], ['char', 'Guess the character', I.kit('hooded_pilgrim', 4)]].forEach(function (c) {
      var a = el('a', 'card', { href: '#/' + c[0], 'aria-label': c[1] + ' - daily' });
      a.appendChild(el('span', 'art', null, [c[2]]));
      var kids = [I.ui('calendar', { scale: 2 }), dailyBadge(c[0])];
      a.appendChild(el('span', 'meta', null, kids));
      cards.appendChild(a);
    });
    var tag = el('p', 'tag', null, ['8 guesses']);
    $view.appendChild(logo); $view.appendChild(cards); $view.appendChild(tag);
    $view.appendChild(el('p', 'fine', null, ['Unofficial fan project. Original art and sound. See CREDITS.']));
  }

  function pips(root) {
    var used = cur.rec.guesses.length, n = E.MAX;
    root.textContent = ''; root.setAttribute('aria-label', 'Guesses used ' + used + ' of ' + n);
    for (var i = 0; i < n; i++) root.appendChild(el('i', i < used ? 'pip used' : 'pip'));
  }

  function renderGame() {
    var g = cur.g, wrap = el('section', 'game');
    var hud = el('div', 'hud');
    var modes = el('div', 'grp');
    modes.appendChild(ownBtn('calendar', 'Daily puzzle', function () { go(g.key, 'daily'); }, { pressed: cur.mode === 'daily' }));
    modes.appendChild(ownBtn('dice', 'Random play (unlimited)', function () { go(g.key, 'random'); }, { pressed: cur.mode === 'random' }));
    modes.appendChild(ownBtn('stats', 'Stats', showStats));
    var pipsEl = el('div', 'pips', { role: 'img' }); pips(pipsEl); cur.pipsEl = pipsEl;
    hud.appendChild(modes); hud.appendChild(pipsEl);
    wrap.appendChild(hud);
    var slot = el('div', 'slot'); cur.slot = slot; wrap.appendChild(slot);
    // column header (wide screens)
    var head = el('div', 'cells head ' + g.key, { 'aria-hidden': 'true' }, [el('span')]);
    g.cols.forEach(function (c) { head.appendChild(el('span', 'hc', { title: c.label }, [fit(I.ui(c.icon, { scale: 1 }))])); });
    wrap.appendChild(head);
    var rows = el('div', 'rows', { 'aria-label': 'Guesses' }); cur.rowsEl = rows; wrap.appendChild(rows);
    $view.appendChild(wrap);
    cur.rec.guesses.forEach(function (k) { addRow(g.byKey[k], false); });
    setSlot();
  }

  function entityEl(g, e, big) {
    var c = I.entity(g.key, e, big ? (g.key === 'item' ? 4 : 6) : 3);
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
    d.appendChild(el('span', 'lab', null, [fit(I.ui(col.icon, { scale: 1 }))]));
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
    var ans = cur.answer, big = I.entity(g.key, ans, g.key === 'item' ? 5 : 8);
    box.appendChild(el('div', 'rs-ans' + (ans.tainted ? ' tainted' : ''), null, [big, el('span', 'nm', null, [ans.name])]));
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
    b.appendChild(el('p', 'note', null, ['RB Rebirth, AB Afterbirth, A+ Afterbirth+, RP Repentance. Data baseline: Repentance.']));
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
  render();
})();
