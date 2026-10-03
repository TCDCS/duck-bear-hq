"""One-time, checksum-guarded attachment of the already-tested Books integration.
Executed only on its development branch, then removed from that branch.
"""
from pathlib import Path
import hashlib

def edit(path, replacements, expected):
    p=Path(path); text=p.read_text()
    for old,new in replacements:
        assert text.count(old)==1, f'Unexpected baseline for {path}: {old[:80]}'
        text=text.replace(old,new,1)
    assert hashlib.sha256(text.encode()).hexdigest()==expected, f'Integration checksum mismatch: {path}'
    p.write_text(text)

edit('public/hq/app.mjs',[
 ("import {applySketchChapter}","import {booksDestination,clearBookDevice} from './books-bridge.mjs';\nimport {applySketchChapter}"),
 ('function visible(g){return (','function visible(g){return (!g.feature||A.me.features?.[g.feature])&&('),
 ("finally{dirty=false;A.me=null;A.go('/sign-in/');}","finally{await clearBookDevice();dirty=false;A.me=null;A.go('/sign-in/');}"),
 ("const next=new URL(params.get('next')||dest,location.origin);if(","const next=new URL(params.get('next')||dest,location.origin);if(A.me.features?.books&&A.me.pair&&booksDestination(next)){location.assign(next.pathname+next.search);return;}if(")
 ],'20878fc7fe5aa3f7c2accaf83d465da56ea1b34db87ea432a04811ec981db9c0')
edit('public/hq/routes.mjs',[
 ('export const NAV=[\n',"export const NAV=[\n {title:'Books',icon:'📖',base:'/books/',pair:true,feature:'books',items:[['Our bookshelf','/books/']]},\n")
 ],'5ac7ef8b6b7af99854e9666122239adbb8c9793e55f21500478e64b6b110b5ab')
edit('src/hq/handler.mjs',[
 ('version:VERSION,build:BUILD};}',"version:VERSION,build:BUILD,features:{books:['true','1'].includes(String(env.BOOKS_ENABLED||''))}};}")
 ],'34f9bd0f3de3ecbe29fcb6a51d70e3d08f8ede0bccf2fe7fb226e9dd2868a393')
edit('src/worker-games.js',[
 ('import original',"import {withBooks} from './books/hq-adapter.mjs';\nimport original"),
 ('export default createGameHandler({assets,fallback:createHqHandler(createMangoHandler(original))});', 'export default withBooks(createGameHandler({assets,fallback:createHqHandler(createMangoHandler(original))}));')
 ],'cbb27d92b8b721bd7b44f9041f5afc4f289b7b6e4740c8f15457023560287056')
edit('wrangler.jsonc',[
 ('"run_worker_first": [\n','"run_worker_first": [\n      "/books",\n      "/books/*",\n')
 ],'cfb59d1c5ffe9e15abe92980248d2db6172973c80dd740ee833350c0890ca827')
edit('.gitignore',[
 ('test-results/\n','test-results/\n\n# Generated private-book reader libraries and development evidence\npublic/books/vendor/\ntests/books/generated/\nverification/\n*.pyc\n__pycache__/\n')
 ],'95098674be6f158d74ed42cc1fd35ff4497ee4f4bbf138360fe81d330198ab0c')
print('Exact tested integration changes attached; no live files or bindings changed.')
