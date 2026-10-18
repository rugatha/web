#!/usr/bin/env python3
"""Loopback-only browser acceptance server. Never uses the production Firebase project."""
import argparse
import json
import re
import os
import tempfile
import hashlib
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VENDOR = Path(os.environ.get('RUGATHA_FIREBASE_TEST_SDK_DIR', str(Path(tempfile.gettempdir()) / 'rugatha-firebase-12.7.0')))
PREFIX = 'https://www.gstatic.com/firebasejs/12.7.0/'
CATALOG_SOURCE = ROOT.joinpath('shared/spell-catalog.js').read_text()
CATALOG_VERSION = re.search(r"const version = '([^']+)'", CATALOG_SOURCE).group(1)
CATALOG = Path(os.environ.get('RUGATHA_SPELL_CATALOG_TEST_DIR', str(Path(tempfile.gettempdir()) / 'rugatha-spell-catalog' / CATALOG_VERSION)))
CATALOG_FILES = dict(re.findall(r"name: '([^']+)', sha256: '([^']+)'", CATALOG_SOURCE))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/__test__/member-race.html':
            return self.send_text('<!doctype html><title>Member initialization race test</title><script src="/shared/firebase.config.js"></script><script type="module" src="/tests/browser/spellbook-boot.js"></script>', 'text/html')
        if path == '/__test__/legacy.html':
            return self.send_text('<!doctype html><title>Legacy local source test</title><p>Test-only localStorage writer</p>', 'text/html')
        if path == '/__test__/health':
            return self.send_text('ok', 'text/plain')
        if path.startswith('/__catalog__/'):
            name = path.removeprefix('/__catalog__/')
            if name not in CATALOG_FILES:
                return self.send_error(404)
            return self.send_text((CATALOG / name).read_text(), 'application/json')
        if path.startswith('/__firebase__/'):
            name = path.removeprefix('/__firebase__/')
            if name == 'firebase-analytics.js':
                return self.send_text('export const isSupported=async()=>false; export const getAnalytics=()=>({});')
            if name not in ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-storage.js']:
                return self.send_error(404)
            return self.send_text((VENDOR / name).read_text().replace(PREFIX, '/__firebase__/'))
        if path == '/shared/firebase.config.js':
            return self.send_text('''window.RUGATHA_FEATURE_FLAGS = {firebaseEnabled:true, dataBackend:'firestore', dataWritesEnabled:true, spellbookSyncEnabled:true};
window.RUGATHA_FIREBASE_CONFIG = {apiKey:'demo-key',authDomain:'demo-rugatha.firebaseapp.com',projectId:'demo-rugatha',appId:'demo-app',storageBucket:'demo-rugatha.appspot.com'};''')
        target = (ROOT / path.lstrip('/')).resolve()
        if target.is_dir():
            target = target / 'index.html'
        if not target.is_relative_to(ROOT):
            return self.send_error(404)
        parts = target.relative_to(ROOT).parts
        if (any(part.startswith('.') or part in ['node_modules', 'migration-private', 'config'] for part in parts)
                or any(marker in target.name for marker in ['service-account', 'rtdb-export', 'secret'])):
            return self.send_error(404)
        if target.suffix not in ['.html', '.js', '.json', '.csv', '.css', '.png', '.svg', '.webp', '.jpg', '.jpeg', '.webmanifest', '.ico', '.woff2']:
            return self.send_error(404)
        if target.suffix in ['.html', '.js'] and target.exists():
            source = target.read_text().replace(PREFIX, '/__firebase__/')
            if path == '/shared/spell-catalog.js':
                source = re.sub(r'file.url = `[^`]+`;', 'file.url = `/__catalog__/${file.name}`;', source)
            if path == '/shared/auth.js':
                source = "import '/tests/browser/spellbook-boot.js';\n" + source
            if path.rstrip('/') in ['/toolbox/spells', '/toolbox/spells/index.html']:
                source = re.sub(r'<script async src="https://www.googletagmanager.com/[^>]+></script>', '', source)
                source = source.replace('import { mountSpellbook }', "import '/tests/browser/spellbook-boot.js';\n    import { mountSpellbook }")
                if 'mobile' in self.path:
                    source = source.replace('<main class="spells-shell">', '<main class="spells-shell" style="max-width:390px;margin:auto">')
            return self.send_text(source, 'text/html' if target.suffix == '.html' else 'text/javascript')
        return super().do_GET()

    def do_POST(self):
        # Rules faults affect the demo Emulator only, never a cloud endpoint.
        if self.path not in ['/__test__/deny', '/__test__/restore']:
            return self.send_error(404)
        rules = ROOT.joinpath('config/firebase/firestore.rules').read_text()
        if self.path.endswith('/deny'):
            rules = "rules_version = '2'; service cloud.firestore { match /databases/{db}/documents { match /{all=**} { allow read, write: if false; } } }"
        body = json.dumps({'rules': {'files': [{'name': 'firestore.rules', 'content': rules}]}}).encode()
        request = urllib.request.Request('http://127.0.0.1:8080/emulator/v1/projects/demo-rugatha:securityRules', data=body, method='PUT', headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
        return self.send_text('ok', 'text/plain')

    def send_text(self, body, content_type='text/javascript'):
        data = body.encode()
        self.send_response(200)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    for name, digest in CATALOG_FILES.items():
        if not CATALOG.joinpath(name).exists() or hashlib.sha256(CATALOG.joinpath(name).read_bytes()).hexdigest() != digest:
            parser.error('Catalog cache missing or changed; run npm run test:catalog:setup')
    for name in ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-storage.js']:
        if not VENDOR.joinpath(name).exists():
            parser.error(f'Missing {VENDOR / name}; see tests/browser/README.md')
    # Seed only the demo counter; normal shared/auth.js creates mapped member records.
    counter_url = 'http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/system/memberNumbers'
    try:
        urllib.request.urlopen(urllib.request.Request(counter_url, headers={'Authorization': 'Bearer owner'}), timeout=10).close()
    except urllib.error.HTTPError as cause:
        if cause.code != 404:
            raise
        body = json.dumps({'fields': {'lastAllocated': {'integerValue': '0'}, 'updatedAt': {'timestampValue': '2026-10-18T00:00:00Z'}}}).encode()
        urllib.request.urlopen(urllib.request.Request(counter_url, data=body, method='PATCH', headers={'Authorization': 'Bearer owner', 'Content-Type': 'application/json'}), timeout=10).close()
    print(f'Browser acceptance: http://127.0.0.1:{args.port}/toolbox/spells/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
