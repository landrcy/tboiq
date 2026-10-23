#!/usr/bin/env python3
"""Builds data/items.js and data/characters.js from hand-collected factual attributes.

Raw inputs (raw_*.txt) were collected from the public Binding of Isaac wiki
(Cargo API) and are facts only (names, ids, numbers, categories).
Repentance baseline: only entries whose DLC bitmask includes the Repentance bit (8) are used.
Bitmask: 1=Rebirth 2=Afterbirth 4=Afterbirth+ 8=Repentance 16=Repentance+ (Repentance+ only values are ignored).
"""
import json, re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
def rd(n):
    return [l.rstrip('\n') for l in open(os.path.join(here, n), encoding='utf8') if l.strip()]

ids = {}
for l in rd('raw_ids.txt'):
    n, i = l.rsplit('|', 1); ids[n] = int(i)

def baseline(s):
    """pick value from 'mask:value mask:value' with Repentance bit set"""
    pick = None
    for part in s.split(' '):
        m, v = part.split(':', 1)
        if ' ' in v: pass
        if int(m) & 8:
            pick = v if pick is None else pick
    return pick

def parse_multi(l):
    # name|mask:val mask:val  (value may contain spaces e.g. 'one time')
    n, rest = l.split('|', 1)
    toks = re.findall(r'(\d+):(.*?)(?=\s\d+:|$)', rest)
    pick = None
    for m, v in toks:
        if int(m) & 8 and pick is None: pick = v.strip()
    return n, pick

qual = {}
for l in rd('raw_quality.txt'):
    n, v = parse_multi(l); qual[n] = int(v)
rech = {}
for l in rd('raw_recharge.txt'):
    n, v = parse_multi(l); rech[n] = v

pools = {}
POOLMAP = {'Treasure Room':'treasure','Shop':'shop','Boss':'boss','Devil Room':'devil','Angel Room':'angel',
           'Secret Room':'secret','Library':'library','Curse Room':'curse','Planetarium':'planetarium',
           'Red Chest':'redchest','Golden Chest':'goldchest','Ultra Secret Room':'ultrasecret',
           'Crane Game':'crane','Baby Shop':'baby'}
ORDER = ['treasure','shop','boss','devil','angel','secret','library','curse','planetarium','redchest','goldchest','ultrasecret','crane','baby','misc']
for l in rd('raw_pools.txt'):
    parts = l.split('|'); n = parts[0]
    ks = set()
    for p in parts[1:]:
        ks.add(POOLMAP.get(p, 'misc'))
    # 'misc' = any other pool (beggars, bums, mom's/old/wooden chest, key master, shell game, ...)
    pools[n] = [k for k in ORDER if k in ks]

FAMILIARS = set("""Brother Bobby|Halo of Flies|Incubus|Sister Maggy|Lil Brimstone|Lil Haunt|Lil Gurdy|Rainbow Baby|Dark Bum|Bum Friend|Demon Baby|Headless Baby|Little C.H.A.D.|Bomber Boy|Distant Admiration|Forever alone|Harlequin Baby|Daddy Longlegs|Sack of Pennies|Bob's Brain|Lil Chest|Acid Baby|Abel|Guardian Angel|Sworn Protector|Cambion Conception|Immaculate Conception|Lord of the Pit|Guppy's Hairball|Dead Bird|Cain's Other Eye|Sacrificial Dagger|Spear Of Destiny|Isaac's Heart|Lil Abaddon|Blood Puppy|Bot Fly|The Swarm|Giant Cell|Lil Portal|King Baby|Twisted Pair|Vengeful Spirit|Fruity Plum|Cube Baby|Dirty Mind|Quints|Star of Bethlehem""".split('|'))

def dlc_of(i):
    if i <= 346: return 0
    if i <= 441: return 1
    if i <= 552: return 2
    return 3

DISPLAY = {'Forever alone':'Forever Alone'}
items = []
missing = []
for n, i in ids.items():
    if n not in qual: missing.append(('quality', n))
    if n not in pools: missing.append(('pools', n))
    active = n in rech
    t = 'active' if active else ('familiar' if n in FAMILIARS else 'passive')
    rc = None
    if active:
        v = rech[n]
        if re.fullmatch(r'\d+', v): rc = int(v)
        elif re.fullmatch(r'\d+s', v): rc = v
        elif v == 'unlimited': rc = 'inf'
        elif v == 'one time': rc = 'once'
        else: rc = 'var'   # variable / damage-based
    items.append({'k': 'c%d' % i, 'name': DISPLAY.get(n, n), 'n': i, 'type': t, 'q': qual.get(n, 0),
                  'dlc': dlc_of(i), 'rc': rc, 'pools': pools.get(n, ['misc'])})

# Trinkets (Rebirth ids 1-61, AB 62-90, AB+ 91-128, Repentance 129-189). No quality / pools / recharge.
TR = """Swallowed Penny|1;Petrified Poop|2;Rosary Bead|7;Mom's Toenail|16;Daemon's Tail|22;Cain's Eye|59;The Left Hand|61;
Watch Battery|72;Black Feather|80;Blind Rage|81;Store Key|83;Karma|85;Lil Larva|86;Brown Cap|90;
Ouroboros Worm|96;Tonsil|97;Dim Bulb|101;Bag Lunch|105;Crow Heart|107;Hairpin|120;Wooden Cross|121;
Jawbreaker|129;Teardrop Charm|139;Mother's Kiss|156;Gilded Key|159;Lucky Sack|160;Wicked Crown|161;Hollow Heart|168;Cursed Penny|172""".replace('\n','')
def tdlc(i):
    return 0 if i <= 61 else 1 if i <= 90 else 2 if i <= 128 else 3
for part in TR.split(';'):
    n, i = part.strip().rsplit('|', 1); i = int(i)
    items.append({'k': 't%d' % i, 'name': n, 'n': i, 'type': 'trinket', 'q': None, 'dlc': tdlc(i), 'rc': None, 'pools': ['trinket']})

items.sort(key=lambda x: (x['type'] == 'trinket', x['n']))
names = [x['name'].lower() for x in items]
assert len(names) == len(set(names)), 'dup names'
with open(os.path.join(here, '..', 'data', 'items.js'), 'w', encoding='utf8') as f:
    f.write('/* TBOIQ item dataset: factual attributes only (Repentance baseline). Generated by tools/build_data.py */\n')
    f.write('window.TBOIQ_DATA = window.TBOIQ_DATA || {};\nwindow.TBOIQ_DATA.items = [\n')
    f.write(',\n'.join(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in items))
    f.write('\n];\n')
print('items', len(items), 'missing', missing)
from collections import Counter
print(Counter(x['type'] for x in items), Counter(x['dlc'] for x in items))
print(Counter(x['q'] for x in items))
