from pathlib import Path
import base64, binascii, io, re, subprocess, tarfile

root = Path(__file__).resolve().parents[1]
parts = sorted((root / '.zoo-v5').glob('part-*'))
if not parts:
    raise SystemExit('Zoo v5 payload parts are missing.')

# The payload is stored without guaranteed trailing Base64 padding.
# Normalise whitespace and restore any required '=' characters before decoding.
encoded = ''.join(p.read_text(encoding='ascii') for p in parts)
encoded = ''.join(encoded.split())
encoded += '=' * (-len(encoded) % 4)

try:
    raw = base64.b64decode(encoded, validate=True)
except binascii.Error as exc:
    raise SystemExit(f'Zoo v5 payload could not be decoded: {exc}') from exc

with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
    for member in archive.getmembers():
        target = (root / member.name).resolve()
        if root not in target.parents and target != root:
            raise SystemExit(f'Unsafe archive path: {member.name}')
    archive.extractall(root, filter='data')

# Mobile browsers may still have the v4 service worker and its cache active.
# Give the two critical UI assets a new URL so an old worker cannot mix an
# old app.js with the new Zoo HQ HTML/CSS.
release = '5.0.2'
index_path = root / 'public' / 'index.html'
index = index_path.read_text(encoding='utf-8')
index = re.sub(r'href=["\']styles\.css(?:\?[^"\']*)?["\']', f'href="styles.css?v={release}"', index)
index = re.sub(r'src=["\']app\.js(?:\?[^"\']*)?["\']', f'src="app.js?v={release}"', index)
index_path.write_text(index, encoding='utf-8')

# Use network-first static caching. The app is small, so correctness is more
# useful than serving stale JavaScript while online. API/private media remain
# completely outside the service-worker cache.
sw = f'''const CACHE = 'duck-bear-hq-v5-2';
const CORE = [
  './',
  './index.html',
  './styles.css?v={release}',
  './app.js?v={release}',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', event => {{
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', event => {{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('duck-bear-hq-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', event => {{
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) return;

  event.respondWith(
    fetch(request)
      .then(response => {{
        if (response.ok) {{
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }}
        return response;
      }})
      .catch(async () => {{
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./index.html');
        throw new Error('Offline and asset is not cached.');
      }})
  );
}});
'''
(root / 'public' / 'sw.js').write_text(sw, encoding='utf-8')

# Fail the Cloudflare build before deployment if either main JavaScript file
# has a syntax problem. This avoids publishing another blank shell.
for js in (root / 'public' / 'app.js', root / 'src' / 'index.js'):
    subprocess.run(['node', '--check', str(js)], check=True)

print(f'Zoo HQ v5 payload applied; mobile cache release {release} ready.')
