"""Isolated DOM checks; real HTTP backup/restore checks run separately in CI."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import os, json, zipfile, re
root=Path(__file__).resolve().parents[2]
module=root/'public/books/backup.mjs'
assert module.exists(), 'Book backup controls must be implemented'
(root/'verification').mkdir(exist_ok=True)
fixture=root/'verification/backup-ui-fixture.zip'
with zipfile.ZipFile(fixture,'w',compression=zipfile.ZIP_STORED) as z:
    z.writestr('manifest.json',json.dumps({'format':'duck-bear-books','version':1,'objects':[]}))
with sync_playwright() as p:
    browser=getattr(p,os.environ.get('BOOKS_BROWSER','chromium')).launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,args=['--no-sandbox'] if os.environ.get('BOOKS_BROWSER','chromium')=='chromium' else [])
    page=browser.new_page(viewport={'width':390,'height':844})
    page.set_content('<div id="message" hidden></div><main id="main"></main>')
    page.add_style_tag(content=(root/'public/books/styles.css').read_text())
    page.add_script_tag(content=(root/'public/books/common.mjs').read_text().replace('export ',''))
    page.add_script_tag(content='(()=>{'+(root/'public/hq/zip.mjs').read_text().replace('export ','')+';window.readZip=readZip;})();')
    page.add_script_tag(content="window.fetch=async()=>Response.json({canRestore:false,books:3,uploadedFiles:1,readingPositions:2,annotations:1,warning:'Books already contains records. Nothing will be overwritten.'});")
    page.add_script_tag(content=re.sub(r'^import .*;\n','',module.read_text(),flags=re.M).replace('export ',''))
    page.evaluate("mountBooksBackup({me:{owner:true},onBack:()=>{}})")
    expect(page.get_by_role('link',name='Download Books backup',exact=True)).to_be_visible()
    page.get_by_label('Choose a Books backup ZIP',exact=True).set_input_files(str(fixture))
    expect(page.locator('#restore-result')).to_contain_text('Nothing will be overwritten')
    assert page.get_by_role('button',name='Restore Books',exact=True).count()==0
    for width in [320,390,1365]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    page.screenshot(path=str(root/'verification/backup-dom-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(root/'verification/backup-dom-mobile.png'),full_page=True)
    # A restore keeps the selected archive fixed until the server attempt completes.
    page.evaluate("""()=>{window.fetch=async url=>String(url).endsWith('/preview')?
      Response.json({canRestore:true,jobId:'restore-test',books:3,uploadedFiles:0,warning:'Empty library.'}):
      new Promise(resolve=>window.__releaseRestore=()=>resolve(Response.json({error:'Synthetic retryable failure'},{status:503})));} """)
    page.evaluate("mountBooksBackup({me:{owner:true},onBack:()=>{}})")
    picker=page.get_by_label('Choose a Books backup ZIP',exact=True)
    picker.set_input_files(str(fixture))
    page.get_by_label('Type RESTORE BOOKS to confirm',exact=True).fill('RESTORE BOOKS')
    page.get_by_role('button',name='Restore Books',exact=True).click()
    page.wait_for_function("typeof __releaseRestore==='function'")
    expect(picker).to_be_disabled()
    page.evaluate('__releaseRestore()')
    expect(page.locator('#restore-result')).to_contain_text('Synthetic retryable failure')
    expect(picker).to_be_enabled()
    expect(page.get_by_role('button',name='Restore Books',exact=True)).to_be_enabled()
    print('PASS backup labels, archive preview, refusal to overwrite, 320/390/1365px layout')
    browser.close()
