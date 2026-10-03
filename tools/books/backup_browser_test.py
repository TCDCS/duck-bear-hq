"""Books-only backup and Google setup UI; synthetic publications, never private Drive files."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os
root=Path(__file__).resolve().parents[2]
base='http://127.0.0.1:8788'
(root/'verification').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=getattr(p,os.environ.get('BOOKS_BROWSER','chromium')).launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,args=['--no-sandbox'] if os.environ.get('BOOKS_BROWSER','chromium')=='chromium' else [])
    ctx=browser.new_context(viewport={'width':1365,'height':900},accept_downloads=True)
    ctx.add_cookies([{'name':'test_reader','value':'zachary','url':base}])
    page=ctx.new_page(); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/books/')
    page.locator('#upload-files').set_input_files(str(root/'tests/books/generated/field-notes.pdf'))
    expect(page.get_by_role('button',name='Open field-notes',exact=True)).to_be_visible()
    page.get_by_role('button',name='Library connection',exact=True).click()
    expect(page.get_by_role('button',name='Check Google connection',exact=True)).to_be_visible()
    page.get_by_role('button',name='Check Google connection',exact=True).click()
    expect(page.locator('#connection-check')).to_contain_text('missing')
    page.get_by_role('button',name='Book backups',exact=True).click()
    expect(page.get_by_role('heading',name='Book backups',exact=True)).to_be_visible()
    expect(page.locator('#main')).to_contain_text('Google Drive originals are not included')
    with page.expect_download() as pending:
        page.get_by_role('link',name='Download Books backup',exact=True).click()
    download=pending.value
    assert not download.failure(),download.failure()
    dest=root/'verification/synthetic-books-backup.zip';download.save_as(str(dest))
    page.get_by_label('Choose a Books backup ZIP',exact=True).set_input_files(str(dest))
    expect(page.locator('#restore-result')).to_contain_text('Nothing will be overwritten')
    assert page.get_by_role('button',name='Restore Books',exact=True).count()==0
    page.screenshot(path=str(root/'verification/backup-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Backup screen overflows phone'
    page.screenshot(path=str(root/'verification/backup-mobile.png'),full_page=True)
    other=browser.new_context();other.add_cookies([{'name':'test_reader','value':'guannan','url':base}])
    response=other.request.get(base+'/api/hq/books/backup');assert response.status==403
    assert not errors,errors
    (root/'verification/backup-browser.json').write_text(json.dumps({'passed':True,'checks':['owner export ZIP','Google setup diagnostic','archive preview','nonempty recovery refusal','partner cannot export household','phone width'],'pageErrors':errors},indent=2))
    browser.close()
