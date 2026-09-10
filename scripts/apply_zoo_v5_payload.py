from pathlib import Path
import base64, binascii, io, tarfile

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

print('Zoo HQ v5 payload applied.')
