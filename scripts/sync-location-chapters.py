"""Join reviewed location/chapter matches to current chapter metadata, then rebuild pages."""
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'scripts/data/location-chapter-index.json'
CHILDREN = ['realms', 'kingdoms', 'cities', 'pois']
SERIES = {'rugatha': 'Rugatha', 'lite': 'Rugatha Lite', 'plus': 'Rugatha Plus',
          'wilds': 'Rugatha Wilds', 'brown': 'Rugatha Brown', 'legends': 'Rugatha Legends'}
chapters = json.loads((ROOT / 'campaigns/data/chapter-content.json').read_text())
titles = json.loads((ROOT / 'campaigns/data/chapter-titles.json').read_text())
index = json.loads(INDEX.read_text())['locations']

def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)

catalog = {}
for matches in index.values():
    for kind in ['chapters']:
        for match in matches[kind]:
            cid = match['id']
            source = chapters[cid]
            if match['evidence'] not in list(strings(source['content'])):
                raise ValueError(f'Evidence changed: {cid}')
            url = '/' + source['source'].lstrip('/')
            if not url.startswith('/campaigns/pages/') or '..' in url or not (ROOT / url.lstrip('/')).is_file():
                raise ValueError(f'Invalid chapter page: {cid}: {url}')
            catalog[cid] = {
                'id': cid,
                'title_zh': titles.get(cid, {}).get('zh') or source['title'],
                'title_en': titles.get(cid, {}).get('en') or source['title'],
                'series': SERIES.get(cid.split('-')[0], 'Rugatha'),
                'date': source.get('date', ''),
                'url': url,
            }

def order(cid):
    prefix = cid.split('-')[0]
    return (list(SERIES).index(prefix), tuple(int(n) for n in re.findall(r'\d+', cid)), cid)

lock = ROOT / 'map/location/assets/.location-data.lock'
for attempt in range(1200):
    try:
        lock.mkdir()
        break
    except FileExistsError:
        time.sleep(0.1)
else:
    raise TimeoutError('location.json is busy; retry after the current artwork finishes publishing.')
try:
    file = ROOT / 'map/location/assets/location.json'
    data = json.loads(file.read_text())
    seen = set()
    def visit(node, segments=(), depth=0):
        key = '/'.join(segments)
        matches = index.get(key, {'chapters': []})
        if key in index:
            seen.add(key)
        actual = {item['id'] for item in matches['chapters']}
        for child in node.get(CHILDREN[depth], []) if depth < len(CHILDREN) else []:
            actual |= visit(child, (*segments, child['slug']), depth + 1)
        node['chapters'] = [catalog[cid] for cid in sorted(actual, key=order)]
        return actual
    visit(data)
    if seen != set(index):
        raise ValueError(f'Unknown location keys: {set(index) - seen}')
    temporary = file.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(file)
    subprocess.run(['node', 'scripts/generate-location-pages.mjs'], cwd=ROOT, check=True)
    print(f'Updated chapter links for 240 pages, covering {len(catalog)} chapter records.')
finally:
    lock.rmdir()
