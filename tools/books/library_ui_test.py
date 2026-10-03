"""Render the production bookshelf in a local DOM; use synthetic catalogue data."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import os, re

root = Path(__file__).resolve().parents[2]
with sync_playwright() as p:
    browser = getattr(p,os.environ.get('BOOKS_BROWSER','chromium')).launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,
                                headless=True, args=['--no-sandbox'] if os.environ.get('BOOKS_BROWSER','chromium')=='chromium' else [])
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    shell = (root/'public/books/index.html').read_text()
    shell = re.sub(r'<script\b[^>]*>.*?</script>|<link\b[^>]*>', '', shell, flags=re.S)
    page.set_content(shell)
    page.add_style_tag(content=(root/'public/books/styles.css').read_text())
    page.add_script_tag(content='''
      history.replaceState=()=>{};
      var local={rememberIdentity:async()=>{},get:async()=>null,all:async()=>[]};
      window.fetch=async url=>new Response(JSON.stringify(
        String(url).endsWith('/me')?{user:{id:'test-reader',displayName:'Test reader'},owner:true,build:'test'}:
        String(url).includes('/catalogue')?{books:[
          {id:'one',title:'Sea and Sky',authors:['Test Library'],status:'reading'},
          {id:'two',title:'Field notes',authors:[],status:'none'}],total:2,nextOffset:null}:
        {shelves:[]}),{headers:{'Content-Type':'application/json'}});
    ''')
    page.add_script_tag(content=(root/'public/books/common.mjs').read_text().replace('export ', ''))
    source = re.sub(r'^import .*;\n', '', (root/'public/books/library.mjs').read_text(), flags=re.M)
    page.add_script_tag(content=source)
    expect(page.get_by_role('button', name='Open Sea and Sky', exact=True)).to_be_visible()
    failures = []
    for width in [320, 390, 760, 1365]:
        page.set_viewport_size({'width':width, 'height':844})
        geometry = page.evaluate('''()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,
          navigation:document.querySelector('.sidebar nav').getBoundingClientRect().width,
          navigationContent:document.querySelector('.sidebar nav').scrollWidth,
          searchRight:document.querySelector('.searchbar').getBoundingClientRect().right,
          columns:getComputedStyle(document.querySelector('.bookgrid')).gridTemplateColumns})''')
        if geometry['document'] > width or geometry['searchRight'] > width:
            failures.append(geometry)
        if width <= 390:
            assert len(geometry['columns'].split()) == 2, geometry
            assert geometry['navigationContent'] > geometry['navigation'], geometry
    assert not failures, 'Bookshelf must fit the viewport without hiding overflow: '+str(failures)
    print('PASS bookshelf fits 320/390/760/1365px; phone shelves scroll within their row and two covers remain visible.')
    page.get_by_role('button', name='Library connection', exact=True).click()
    expect(page.get_by_role('button', name='Check Google connection', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='Book backups', exact=True)).to_be_visible()
    browser.close()
