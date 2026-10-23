# TBOIQ

Unofficial Wordle-style *Binding of Isaac* trivia: **Guess the Item** and **Guess the Character**, in a basement/cellar look. **Not affiliated with Edmund McMillen, Nicalis or Team Meat.**
Daily puzzle (same for everyone, based on the America/New_York date, no server) plus unlimited random mode. 8 guesses, shown as 8 hearts. Attribute tiles: green = match, yellow = close/partial, red = no, arrows = higher/lower.
After a game (win or loss) the answer appears on a pedestal with an "item get" banner and an icon-led info card (pools, type, quality, recharge, DLC, id, unlock; for characters: stats, hearts, starting items, unlock, tainted counterpart) with a link to its wiki page.
A **browse** page (book icon) lists all items and characters, searchable and filterable by pool, quality, type, tainted, unlock and version.

Static HTML/CSS/JS, no build step, relative paths (GitHub Pages ready).

## Run
    python3 -m http.server 8766     # then open http://localhost:8766/
(or open `index.html` directly; data is loaded via plain `<script>` tags).

Routes: `#/` home, `#/item`, `#/char`, `#/item/random`, `#/char/random`, `#/browse`, `#/browse/char`.

## Layout
- `index.html`, `css/style.css`
- `js/` storage (localStorage `tboiq.v1`), daily (seeded daily pick), engine (compare/search), icons (sprite + art layer), theme (procedural textures), audio (WebAudio chiptune, off by default), app (UI, info card, browse)
- `data/items.js`, `data/characters.js` - factual data + short own-words descriptions (Repentance baseline); `data/sprites.js` - sprite file index with wiki page per entry
- `assets/sprites/` - real wiki sprites (349 items, 33 character icons, 34 portraits), stored locally
- `assets/art/` - original pixel-art kit (palette, UI icons, fallback art)
- `fonts/` - Press Start 2P and Creepster (both OFL)
- `tools/` - `fetch_sprites.py` (polite downloader), `sprites_manifest.json` (source of every sprite), `build_v2.py` (regenerates `data/*.js` from `items_base.json`, `chars_base.json`, `item_info.txt`, `raw_charstats.json`). The older `build_data.py` / `build_chars.py` produced the v1 data and are kept for reference only; do not run them over the v2 files.

## Daily answers
The daily answer is a seeded shuffle keyed by game and list length, so adding or removing entries changes which entry is the answer on a given date.

## Art and credits
Sprites are (c) Edmund McMillen / Nicalis / respective owners, sourced from the Binding of Isaac Wiki (CC BY-SA 3.0 for wiki content). `js/icons.js` falls back to the original kit art if a sprite fails to load. See `CREDITS.md` for full licensing, and the in-site credits (i icon).
