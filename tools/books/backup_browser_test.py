"""Real Books recovery on two independent loopback databases; synthetic publications only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, subprocess, time, zipfile, uuid

root=Path(__file__).resolve().parents[2]
base='http://127.0.0.1:8788'
recovery='http://127.0.0.1:8789'
evidence=root/'verification';evidence.mkdir(exist_ok=True)
checks=[];errors=[]
server_log=(evidence/'restore-dev-server.log').open('w')
server=subprocess.Popen(['node','--experimental-sqlite','tools/books/dev-server.mjs'],cwd=root,
    env={**os.environ,'BOOKS_TEST_PORT':'8789','BOOKS_TEST_FAIL_RESTORE_UPLOAD_ONCE':'1'},stdout=server_log,stderr=subprocess.STDOUT)
try:
 with sync_playwright() as p:
    browser=getattr(p,os.environ.get('BOOKS_BROWSER','chromium')).launch(
        executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,
        args=['--no-sandbox'] if os.environ.get('BOOKS_BROWSER','chromium')=='chromium' else [])
    def context(name,origin):
        ctx=browser.new_context(viewport={'width':1365,'height':900},accept_downloads=True)
        ctx.add_cookies([{'name':'test_reader','value':name,'url':origin}])
        return ctx
    def page_for(ctx,origin):
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/books/')
        expect(page.get_by_role('heading',name='Our bookshelf',exact=True)).to_be_visible()
        return page
    def backup_page(page):
        page.get_by_role('button',name='Library connection',exact=True).click()
        page.get_by_role('button',name='Book backups',exact=True).click()
        expect(page.get_by_role('heading',name='Book backups',exact=True)).to_be_visible()
    def put(ctx,origin,path,data):
        r=ctx.request.put(origin+path,headers={'Origin':origin},data=data)
        assert r.ok,r.text()
        return r.json()
    ctx=context('zachary',base)
    # Test shared static dependencies over HTTP, not only script-injected DOM fixtures.
    dependency=ctx.request.get(base+'/hq/zip.mjs')
    assert dependency.ok and 'javascript' in dependency.headers.get('content-type','')
    checks.append('backup shared ZIP dependency loads through the actual asset route')
    page=page_for(ctx,base)
    original=(root/'tests/books/generated/field-notes.pdf').read_bytes()+b'\n% recovery browser fixture\n'
    page.locator('#upload-files').set_input_files({'name':'Recovery test.pdf','mimeType':'application/pdf','buffer':original})
    page.get_by_role('button',name='Open Recovery test',exact=True).click()
    page.get_by_role('button',name='Read PDF',exact=True).click()
    expect(page.locator('#reader-stage canvas')).to_be_visible()
    page.get_by_role('button',name='Next page',exact=True).click()
    expect(page.locator('#reader-progress')).to_contain_text('2 of 3')
    page.get_by_role('button',name='Bookmark',exact=True).click()
    expect(page.locator('#sync-status')).to_contain_text('Saved')
    page.get_by_role('button',name='Back to books',exact=True).click()
    books=ctx.request.get(base+'/api/hq/books/catalogue').json()['books']
    book=next(b for b in books if b['title']=='Recovery test')
    file=ctx.request.get(base+'/api/hq/books/'+book['id']).json()['book']['files'][0]
    partner=context('guannan',base)
    put(partner,base,'/api/hq/books/annotations/recovery-partner-note',{
        'fileId':file['id'],'version':file['version'],'revision':0,'kind':'note',
        'locator':{'type':'pdf','page':1},'note':'Private partner recovery note'})
    put(partner,base,'/api/hq/books/files/'+file['id']+'/progress',{
        'version':file['version'],'revision':0,'locator':{'type':'pdf','page':1},
        'progress':1/3,'deviceId':'recovery-partner-device','opId':str(uuid.uuid4())})
    page.get_by_role('button',name='Library connection',exact=True).click()
    page.get_by_role('button',name='Check Google connection',exact=True).click()
    expect(page.locator('#connection-check')).to_contain_text('missing')
    checks.append('missing Google credentials are reported without claiming a connection')
    page.get_by_role('button',name='Book backups',exact=True).click()
    expect(page.get_by_role('heading',name='Book backups',exact=True)).to_be_visible()
    expect(page.locator('#main')).to_contain_text('Google Drive originals are not included')
    with page.expect_download() as pending:
        page.get_by_role('link',name='Download Books backup',exact=True).click()
    download=pending.value;assert not download.failure(),download.failure()
    dest=evidence/'synthetic-books-backup.zip';download.save_as(str(dest))
    with zipfile.ZipFile(dest) as archive:
        manifest=json.loads(archive.read('manifest.json'))
        assert manifest['driveOriginalsIncluded'] is False
        assert 'books_connections' not in manifest['tables']
        assert all('/' not in x or x.startswith('files/') for x in archive.namelist())
    page.get_by_label('Choose a Books backup ZIP',exact=True).set_input_files(str(dest))
    expect(page.locator('#restore-result')).to_contain_text('Nothing will be overwritten')
    assert page.get_by_role('button',name='Restore Books',exact=True).count()==0
    assert partner.request.get(base+'/api/hq/books/backup').status==403
    checks.append('owner exports; partner cannot export household; existing library cannot be overwritten')
    page.screenshot(path=str(evidence/'backup-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(evidence/'backup-mobile.png'),full_page=True)
    source_total=ctx.request.get(base+'/api/hq/books/catalogue').json()['total']
    target=context('zachary',recovery)
    for attempt in range(50):
        if server.poll() is not None:raise AssertionError('Isolated recovery server stopped')
        try:
            if target.request.get(recovery+'/books/',timeout=500).ok:break
        except Exception:pass
        time.sleep(.1)
    else:raise AssertionError('Isolated recovery server did not start')
    restored=page_for(target,recovery)
    assert target.request.get(recovery+'/api/hq/books/catalogue').json()['total']==0
    backup_page(restored)
    restored.get_by_label('Choose a Books backup ZIP',exact=True).set_input_files(str(dest))
    expect(restored.get_by_role('button',name='Restore Books',exact=True)).to_be_disabled()
    restored.get_by_label('Type RESTORE BOOKS to confirm',exact=True).fill('RESTORE BOOKS')
    # Inject a real HTTP 503 in the isolated target; keep service workers enabled.
    apply=restored.get_by_role('button',name='Restore Books',exact=True)
    apply.click()
    expect(restored.locator('#restore-result')).to_contain_text('Synthetic retryable upload interruption.')
    expect(apply).to_be_enabled()
    expect(restored.get_by_label('Choose a Books backup ZIP',exact=True)).to_be_enabled()
    assert target.request.get(recovery+'/api/hq/books/catalogue').json()['total']==0,'Interrupted staging must not partially restore records'
    apply.click()
    expect(restored.locator('#restore-result')).to_contain_text('Books restored privately',timeout=30000)
    assert target.request.get(recovery+'/api/hq/books/catalogue').json()['total']==len(manifest['tables']['books_catalogue'])
    checks.append('interrupted upload leaves catalogue empty; retry restores the complete catalogue')
    restored.screenshot(path=str(evidence/'restore-complete.png'),full_page=True)
    content=target.request.get(recovery+'/api/hq/books/files/'+file['id']+'/content?download=1')
    assert content.ok and content.body()==original
    assert 'attachment' in content.headers.get('content-disposition','')
    other=context('guannan',recovery)
    notes='/api/hq/books/files/'+file['id']+'/annotations?version='+file['version']
    owner_notes=target.request.get(recovery+notes).json()['annotations']
    partner_notes=other.request.get(recovery+notes).json()['annotations']
    assert any(n['kind']=='bookmark' for n in owner_notes)
    assert all(n['note']!='Private partner recovery note' for n in owner_notes)
    assert [n['note'] for n in partner_notes]==['Private partner recovery note']
    progress='/api/hq/books/files/'+file['id']+'/progress'
    assert target.request.get(recovery+progress).json()['locator']['page']==2
    assert other.request.get(recovery+progress).json()['locator']['page']==1
    assert ctx.request.get(base+'/api/hq/books/catalogue').json()['total']==source_total,'The source library must remain intact'
    assert other.request.get(recovery+'/api/hq/books/backup').status==403
    assert target.request.get(recovery+'/api/hq/integrations/google-drive/status').json()['connected'] is False
    checks.append('confirmed browser restore preserves exact original bytes and separate reader records without Google tokens')
    restored.get_by_role('button',name='Open books',exact=True).click()
    restored.get_by_role('button',name='Open Recovery test',exact=True).click()
    restored.get_by_role('button',name='Read PDF',exact=True).click()
    expect(restored.locator('#reader-stage canvas')).to_be_visible()
    expect(restored.locator('#reader-progress')).to_contain_text('2 of 3')
    restored.get_by_role('button',name='Notes',exact=True).click()
    expect(restored.locator('#reader-panel .note-card b')).to_have_text('Bookmark · Page 2')
    restored.screenshot(path=str(evidence/'restored-reader.png'),full_page=True)
    restored.get_by_role('button',name='Next page',exact=True).click()
    expect(restored.locator('#reader-progress')).to_contain_text('3 of 3')
    restored.get_by_role('button',name='Go to passage',exact=True).click()
    expect(restored.locator('#reader-progress')).to_contain_text('2 of 3')
    expect(restored.locator('#reader-panel')).to_be_hidden()
    checks.append('restored book opens at the saved page and its rendered bookmark navigates back to that page')
    assert not errors,errors
    (evidence/'backup-browser.json').write_text(json.dumps({'passed':True,'checks':checks,'pageErrors':errors},indent=2))
    print('\n'.join('PASS '+x for x in checks))
    browser.close()
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 server_log.close()
 (evidence/'backup-browser-diagnostics.json').write_text(json.dumps({'completed':checks,'pageErrors':errors},indent=2))
