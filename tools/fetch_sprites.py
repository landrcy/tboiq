#!/usr/bin/env python3
"""Download wiki item icons from the Binding of Isaac Wiki's public static file host, one by one, politely.
Writes assets/sprites/items/<key>.png and tools/sprites_manifest.json. No Cloudflare bypass: only plain requests
to static.wikia.nocookie.net; any non-200 is recorded as missing (fallback icon is used by the site)."""
import hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
BASE = 'https://static.wikia.nocookie.net/bindingofisaacre_gamepedia/images/'
WIKI = 'https://bindingofisaacrebirth.fandom.com/wiki/'
UA = 'TBOIQ-fanproject/2.0 (unofficial fan quiz; polite 2 req/s; github.com/landrcy/tboiq)'
DELAY = 0.5
def furl(fn):
    fn = fn.replace(' ', '_'); h = hashlib.md5(fn.encode('utf8')).hexdigest()
    return BASE + h[0] + '/' + h[:2] + '/' + urllib.parse.quote(fn, safe="()!'*,-._~")
def get(fn):
    time.sleep(DELAY)
    req = urllib.request.Request(furl(fn), headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        return None if e.code == 404 else ('ERR%d' % e.code)
    except Exception as e:
        return 'ERR' + str(e)
def load_js(p, var):
    s = open(os.path.join(root, 'data', p), encoding='utf8').read()
    return [json.loads(x.rstrip(',')) for x in re.findall(r'^\{.*\},?$', s, re.M)]
def variants(prefix, name):
    n = name.strip(); out = [n]
    if n.startswith('The '): out.append(n[4:])
    out.append(n.title().replace("'S", "'s"))
    out.append(n.replace('!', '')); out.append(n.replace('?', '')); out.append(n.replace('/', '_'))
    seen = []; [seen.append(x) for x in out if x not in seen]
    return [prefix + '_' + x + '_icon.png' for x in seen]
def main(kind):
    mpath = os.path.join(here, 'sprites_manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {}
    if kind == 'items':
        items = load_js('items.js', 'items')
        for it in items:
            k = it['k']
            if k in man and (man[k].get('file') or man[k].get('missing')): continue
            pre = 'Trinket' if it['type'] == 'trinket' else 'Collectible'
            got = None
            for fn in variants(pre, it['name']):
                d = get(fn)
                if isinstance(d, bytes):
                    got = (fn, d); break
                if isinstance(d, str): print('!!', it['name'], fn, d)
            if got:
                im = Image.open(io.BytesIO(got[1])).convert('RGBA')
                out = os.path.join(root, 'assets', 'sprites', 'items', k + '.png'); im.save(out, optimize=True)
                man[k] = {'file': 'assets/sprites/items/' + k + '.png', 'wikiFile': got[0], 'page': WIKI + urllib.parse.quote(it['name'].replace(' ', '_'), safe="()!'*,-._~"), 'size': list(im.size)}
                print('ok ', k, it['name'], im.size)
            else:
                man[k] = {'missing': True, 'tried': variants(pre, it['name'])}
                print('MISS', k, it['name'])
            json.dump(man, open(mpath, 'w'), indent=1)
def chars():
    mpath = os.path.join(here, 'sprites_manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {}
    os.makedirs(os.path.join(root, 'assets', 'sprites', 'chars'), exist_ok=True)
    for c in load_js('characters.js', 'chars'):
        k = c['k']
        names = [c['name'], c['name'].replace('&', 'and'), c.get('aka') or c['name'], c['name'].replace('The ', '')]
        seen = []; [seen.append(x) for x in names if x and x not in seen]
        entry = man.get(k, {})
        for kind, suffix in (('icon', '_icon'), ('portrait', '_appearance')):
            if entry.get(kind): continue
            got = None
            for n in seen:
                fn = 'Character_' + n + suffix + '.png'
                d = get(fn)
                if isinstance(d, bytes): got = (fn, d); break
                if isinstance(d, str): print('!!', fn, d)
            if got:
                im = Image.open(io.BytesIO(got[1])).convert('RGBA')
                rel = 'assets/sprites/chars/' + k + ('' if kind == 'icon' else '_portrait') + '.png'
                im.save(os.path.join(root, rel), optimize=True)
                entry[kind] = {'file': rel, 'wikiFile': got[0], 'size': list(im.size)}
                print('ok ', k, c['name'], kind, im.size)
            else:
                entry[kind + 'Missing'] = True; print('MISS', k, c['name'], kind)
        pn = c['name'].replace('&', 'and').replace(' ', '_')
        entry['page'] = WIKI + urllib.parse.quote(pn, safe="()!'*,-._~")
        man[k] = entry
        json.dump(man, open(mpath, 'w'), indent=1)
if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else 'items'
    chars() if mode == 'chars' else main(mode)
