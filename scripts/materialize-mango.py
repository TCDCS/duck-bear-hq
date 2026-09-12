"""Reconstruct the checked Mango source bundle on its isolated feature branch.
The import cannot change workflows, account data or unrelated source files.
"""
import argparse, hashlib, json, lzma, pathlib, subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
COMPRESSED='5bb120953d4cbdcf4aee409c82e68f5760ca3997fd6b49ea9a1e389504a68827'
PAYLOAD='1c94155c5c4784b45f8bf8fae4650ac4ec155106dfce1e76a598e655093d27d2'
PREFIXES=('public/games/','public/mango-games.js','src/mango-routes.mjs','migrations/0003_mango_profiles.sql','scripts/apply-mango-integration.py','scripts/build-mango-standalone.py','scripts/mango-local-auth.py','scripts/wait-mango-live.py','tests/mango-','tests/helpers/mango-','docs/mango-mayhem.md','docs/superpowers/')
INTEGRATION=['src/worker-games.js','public/index.html','public/kart-games.js']
def unpack(root):
    pieces=[root/f'.mango-v1/part-{i:02d}.bin' for i in range(7)]
    packed=b''.join(p.read_bytes() for p in pieces)
    if hashlib.sha256(packed).hexdigest()!=COMPRESSED:raise ValueError('Compressed source checksum mismatch')
    decoder=lzma.LZMADecompressor(memlimit=128*1024*1024)
    raw=decoder.decompress(packed,max_length=2*1024*1024)
    if not decoder.eof or decoder.unused_data or hashlib.sha256(raw).hexdigest()!=PAYLOAD:raise ValueError('Source checksum mismatch')
    data=json.loads(raw)
    if data.get('version')!=1 or not isinstance(data.get('files'),dict) or len(data['files'])!=37:raise ValueError('Unexpected source manifest')
    for name,text in data['files'].items():
        rel=pathlib.PurePosixPath(name)
        if rel.is_absolute() or '..' in rel.parts or not name.startswith(PREFIXES) or not isinstance(text,str):raise ValueError('Unsafe source path')
        path=root/name
        if not path.resolve().is_relative_to(root.resolve()):raise ValueError('Source path leaves repository')
        if path.exists() and path.read_text()!=text:raise ValueError('Refusing to overwrite different source: '+name)
    return data['files'],pieces
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',action='store_true');args=parser.parse_args()
    files,pieces=unpack(ROOT)
    for name,text in files.items():
        path=ROOT/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text)
    subprocess.run(['python',str(ROOT/'scripts/apply-mango-integration.py')],cwd=ROOT,check=True)
    if args.stage:
        subprocess.run(['git','add','--',*sorted(files),*INTEGRATION],cwd=ROOT,check=True)
        subprocess.run(['git','rm','--',*(str(p.relative_to(ROOT)) for p in pieces)],cwd=ROOT,check=True)
    print(f'Materialized {len(files)} checked source files; existing account and racing logic retained.')
