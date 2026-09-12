"""Check exact public release bytes and room bindings, with useful failure diagnostics."""
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

base = os.environ['BASE_URL'].rstrip('/')
expected = {
    '/games/wacky-races/game.js': Path('src/kart-assets/game.js.txt').read_bytes(),
    '/games/wacky-races/network.js': Path('src/kart-assets/network.js.txt').read_bytes(),
    '/': Path('public/index.html').read_bytes(),
}
headers = {'Cache-Control': 'no-cache', 'User-Agent': 'Duck-Bear-release-check/4'}

def read_public(path):
    # Use the same client identity for every request, including the version API.
    request = urllib.request.Request(base + path, headers=headers)
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read()

for attempt in range(60):
    path = '/'
    try:
        matches = True
        for path, data in expected.items():
            received = read_public(path)
            if hashlib.sha256(received).digest() != hashlib.sha256(data).digest():
                print('Waiting for current source at ' + path, flush=True)
                matches = False
                break
        if matches:
            path = '/api/races/version'
            version = json.loads(read_public(path))
            if version.get('version') == 4 and version.get('multiplayer'):
                print('Published source and online-room bindings verified at ' + base, flush=True)
                break
            print('Waiting for online-room bindings: ' + json.dumps(version), flush=True)
    except urllib.error.HTTPError as error:
        print(f'Waiting for {path}: HTTP {error.code}', flush=True)
    except Exception as error:
        print(f'Waiting for {path}: {type(error).__name__}: {error}', flush=True)
    time.sleep(10)
else:
    raise SystemExit('The exact release could not be verified on the public site.')
