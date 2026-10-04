"""Production connection controls with synthetic delayed Drive responses; no Google account."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, re
root=Path(__file__).resolve().parents[2]
(root/'verification').mkdir(exist_ok=True)
with sync_playwright() as p:
    kind=os.environ.get('BOOKS_BROWSER','chromium')
    browser=getattr(p,kind).launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,args=['--no-sandbox'] if kind=='chromium' else [])
    page=browser.new_page(viewport={'width':390,'height':844});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    shell=re.sub(r'<script\b[^>]*>.*?</script>|<link\b[^>]*>', '', (root/'public/books/index.html').read_text(),flags=re.S)
    page.set_content(shell);page.add_style_tag(content=(root/'public/books/styles.css').read_text())
    page.add_script_tag(content='''
      history.replaceState=()=>{};
      var local={rememberIdentity:async()=>{},get:async()=>null,all:async()=>[]};
      window.__scan={id:'scan_fixture',status:'paused',booksSeen:12,filesSeen:42,foldersDone:3,foldersTotal:7,warnings:['Shortcuts were not followed.']};
      window.__calls=[];
      window.fetch=async (url,options={})=>{
        url=String(url);__calls.push(url);
        if(url.endsWith('/me'))return Response.json({user:{id:'reader',displayName:'Test reader'},owner:true,build:'test'});
        if(url.includes('/catalogue'))return Response.json({books:[],total:0,nextOffset:null});
        if(url.endsWith('/google-drive/status'))return Response.json({configured:true,connected:true,rootId:'synthetic_root_01',rootLabel:'eBooks'});
        if(url.endsWith('/scan/latest')||url.endsWith('/scan'))return Response.json({...__scan});
        if(url.endsWith('/resume')){__scan.status='running';return Response.json({...__scan});}
        if(url.endsWith('/pause')){__scan.status='paused';return Response.json({...__scan});}
        if(url.endsWith('/step'))return new Promise(resolve=>window.__finishStep=()=>resolve(Response.json({...__scan,status:'running',booksSeen:99})));
        return Response.json({shelves:[]});
      };
    ''')
    page.add_script_tag(content=(root/'public/books/common.mjs').read_text().replace('export ',''))
    page.add_script_tag(content=re.sub(r'^import .*;\n','',(root/'public/books/library.mjs').read_text(),flags=re.M))
    page.get_by_role('button',name='Library connection',exact=True).click()
    expect(page.locator('#scan-status')).to_contain_text('paused')
    expect(page.locator('#scan-status')).to_contain_text('3 of 7 folders')
    expect(page.locator('#scan-status')).to_contain_text('Shortcuts were not followed.')
    page.get_by_role('button',name='Scan / resume library',exact=True).click()
    page.wait_for_function("__calls.some(x=>x.endsWith('/resume')) && typeof __finishStep==='function'")
    page.get_by_role('button',name='Pause scan',exact=True).click()
    page.wait_for_function("__calls.some(x=>x.endsWith('/pause'))")
    expect(page.locator('#scan-status')).to_contain_text('paused')
    page.evaluate('__finishStep()')
    expect(page.get_by_role('button',name='Scan / resume library',exact=True)).to_be_enabled()
    expect(page.locator('#scan-status')).not_to_contain_text('99 books')
    expect(page.locator('#message')).to_contain_text('paused for all devices')
    for width in [320,390,1365]:
        page.set_viewport_size({'width':width,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    page.screenshot(path=str(root/'verification/scan-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(root/'verification/scan-mobile.png'),full_page=True)
    assert not errors,errors
    (root/'verification/scan-ui.json').write_text(json.dumps({'passed':True,'checks':['saved folder counts','visible warnings','persistent resume','persistent pause','late response ignored','320/390/1365px width'],'pageErrors':errors},indent=2))
    print('PASS persistent scan pause/resume, warnings, folder progress and late-response protection')
    browser.close()
