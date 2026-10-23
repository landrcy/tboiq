# Credits & licensing

**TBOIQ is an unofficial fan project. It is not affiliated with or endorsed by Edmund McMillen, Nicalis or Team Meat.** *The Binding of Isaac* and everything in it belong to their owners.

## Sprites (not ours)
- Item, trinket and character sprites are **(c) Edmund McMillen / Nicalis / respective owners**.
- They are sourced from the **Binding of Isaac Wiki** (<https://bindingofisaacrebirth.fandom.com/>), where wiki content is available under **CC BY-SA 3.0** (<https://creativecommons.org/licenses/by-sa/3.0/>). The game's art itself remains the property of its owners; it is used here as a non-commercial fan project.
- Files were downloaded one by one at a polite rate from the wiki's public image host, saved locally in `assets/sprites/` (nothing is hotlinked) and converted from WebP to PNG. No other changes.
- `tools/sprites_manifest.json` records, for every sprite, the local file, the original wiki file name and the wiki page it belongs to. `tools/fetch_sprites.py` is the downloader. The in-site detail cards link each entry to its wiki page.
- 349 items/trinkets have a real sprite (0 use fallback art). 33 characters have a wiki icon and 34 have a wiki portrait (??? has only a portrait).
- If you are a rights holder and want something removed, open an issue and it will be taken down.

## Data and text
- Facts shown (IDs, quality, pools, recharge, DLC, character stats, starting items, unlock methods) come from the Binding of Isaac wikis (Fandom and wiki.gg, CC BY-SA 3.0) and were checked against the wiki tables. Facts are not copyrightable, but the source is credited anyway.
- The short effect descriptions and unlock phrases (`d` / `u` in `data/*.js`, source in `tools/item_info.txt` and `tools/build_v2.py`) are **written in our own words**, not copied from the wiki.
- Wiki pages were read with ordinary public HTTP requests. No block, login or captcha was bypassed.

## Original work in this repo
- **Pixel art kit** (`assets/art/`): Dungeon-24 palette, UI icons and fallback portraits. Original, hand-authored; no AI-generated images.
- **Procedural art** (`js/icons.js`, `js/theme.js`): code-drawn glyphs, pool icons, pedestal, and the cracked-stone / flesh / blood textures, generated at load.
- **Audio**: an original 8-bar chiptune loop and SFX synthesized with WebAudio in `js/audio.js`. No audio files, and sound is off until the player turns it on.

## Fonts (bundled locally, SIL Open Font License 1.1)
- **Press Start 2P** (c) 2012 The Press Start 2P Project Authors. `fonts/OFL.txt`.
- **Creepster** (c) 2011 Font Diner, Inc. `fonts/OFL-Creepster.txt`.
