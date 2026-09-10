from pathlib import Path
import base64, io, tarfile

root = Path(__file__).resolve().parents[1]
parts = sorted((root / '.zoo-v5').glob('part-*'))
if not parts:
    raise SystemExit('Zoo v5 payload parts are missing.')
raw = base64.b64decode(''.join(p.read_text(encoding='ascii') for p in parts))
with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
    for member in archive.getmembers():
        target = (root / member.name).resolve()
        if root not in target.parents and target != root:
            raise SystemExit(f'Unsafe archive path: {member.name}')
    archive.extractall(root, filter='data')
print('Zoo HQ v5 payload applied.')
