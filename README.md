# TBOIQ

Unofficial Wordle-style *Binding of Isaac* trivia: **Guess the Item** and **Guess the Character**.
Daily puzzle (same for everyone, based on the America/New_York date, no server) plus unlimited random mode. 8 guesses. Attribute tiles: green = match, yellow = close/partial, red = no, arrows = higher/lower.

Static HTML/CSS/JS, no build step, relative paths (GitHub Pages ready).

## Run
    python3 -m http.server 8766     # then open http://localhost:8766/
(or open `index.html` directly; data is loaded via plain `<script>` tags).

Routes: `#/` home, `#/item`, `#/char`, `#/item/random`, `#/char/random`.

## Layout
- `index.html`, `css/style.css`
- `js/` storage (localStorage `tboiq.v1`), daily (seeded daily pick), engine (compare/search), icons (art layer), audio (WebAudio chiptune, off by default), app (UI)
- `data/items.js`, `data/characters.js` - hand-written factual data (Repentance baseline)
- `assets/art/` - original pixel-art kit (palette, UI icons, item icons, portraits)
- `fonts/` - Press Start 2P (OFL)
- `tools/` - scripts + raw notes that generate the data files (`build_data.py`, `build_chars.py`)

## Art
`js/icons.js` uses the kit in `assets/art/` and falls back to procedural 16x16 icons. Swap sources with `TBOIQIcons.setProvider(...)`.

See `CREDITS.md` for licensing.
