"""DOM-level reader controls and layout, without network or private content."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os, re
root=Path(__file__).resolve().parents[2]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1365,'height':900})
 page.set_content('<main id="main"></main><div id="message" hidden></div>')
 page.add_style_tag(content=(root/'public/books/styles.css').read_text())
 page.add_script_tag(content=(root/'public/books/common.mjs').read_text().replace('export ',''))
 page.add_script_tag(content='''var remembered=0, saved=0;var local={key:(...v)=>v.join(':'),get:async()=>null,localState:async()=>null,all:async()=>[],cachedFile:async()=>({bytes:new ArrayBuffer(8)}),saveFile:async()=>{saved++},rememberIdentity:async()=>{remembered++},flushProgress:async()=>null,flushNotes:async()=>{},queueProgress:async()=>{},storeState:async()=>{}};''')
 src=re.sub(r'^import .*;\n','',(root/'public/books/reader.mjs').read_text(),flags=re.M).replace('export ','')
 page.add_script_tag(content=src)
 page.evaluate('''async()=>{window.reader=new Reader({me:{user:{id:'test-user'}},book:{id:'b1',title:'Synthetic book'},file:{id:'f1',version:'v1',format:'epub'},offline:true});reader.openEpub=async()=>{reader.stage.innerHTML='<p>Local test chapter</p>';};await reader.open();}''')
 assert page.locator('#reader-stage').inner_text()=='Local test chapter'
 failures=[]
 page.click('#reader-appearance')
 for label in ['Theme','Typeface','Reading style']:
  if page.get_by_label(label,exact=True).count()!=1:failures.append('The '+label+' control needs an unambiguous accessible label')
 page.keyboard.press('Escape')
 if not page.locator('#reader-panel').is_hidden():failures.append('Escape must close an open reader panel')
 page.evaluate('reader.closePanel()')
 geometry=page.evaluate('''()=>({footer:document.querySelector('.reader-bottom').getBoundingClientRect().width,stage:document.querySelector('.stage-wrap').getBoundingClientRect().width,width:innerWidth})''')
 if geometry['footer']<geometry['width']-1:failures.append('Page controls must span the reader instead of shrinking to their text')
 if geometry['stage']>1000:failures.append('Desktop reading column must stay at most 1000 CSS pixels')
 page.evaluate('reader.saveOffline()')
 assert page.evaluate('saved')==1
 if page.evaluate('remembered')!=0:failures.append('Saving offline must not restore an old account identity')
 page.evaluate("""async()=>{local.get=async()=>({id:'test-note',note:'My local note',selectedText:'Local passage'});local.flushNotes=async()=>{throw Object.assign(new Error('Note conflict'),{status:409,code:'annotation_conflict',details:{id:'test-note',current:{note:'Other device note',revision:2}}});};await reader.flush().catch(()=>{});} """)
 if 'Two versions of a note' not in page.locator('#reader-panel').inner_text():failures.append('A note conflict must show both versions and resolution controls')
 page.evaluate("""async()=>{local.all=async()=>[{id:'test-note',fileId:'f1',version:'v1',kind:'note',note:'My local note',locator:{type:'pdf',page:1},revision:0}];local.saveLocalNote=async()=>{};window.prompt=()=> 'Edited note';await reader.notesPanel();await [...document.querySelectorAll('#reader-panel button')].find(b=>b.textContent==='Edit note').onclick();}""")
 if 'Two versions of a note' not in page.locator('#reader-panel').inner_text():failures.append('Editing a conflicting note must not hide its resolution panel')
 moved=page.evaluate("""async()=>{
  local.flushNotes=async()=>{};local.flushProgress=async()=>({revision:1});
  let release,reading;const waiting=new Promise(r=>reading=r),gate=new Promise(r=>release=r);
  local.localState=async()=>{reading();await gate;return {revision:1,progress:0.1,locator:{type:'pdf',page:1}}};
  const flushing=reader.flush();await waiting;reader.changed({type:'pdf',page:3},0.3);release();await flushing;clearTimeout(reader.saveTimer);
  return reader.state.locator.page;
 }""")
 if moved!=3:failures.append('A delayed sync must not replace a newer on-screen reading position')
 page.set_viewport_size({'width':390,'height':844})
 if page.evaluate('document.documentElement.scrollWidth>innerWidth'):failures.append('Reader must fit a mobile viewport without page-wide horizontal scrolling')
 assert not failures,failures
 print('PASS reader Escape key, full-width page controls, readable desktop column, mobile fit, and offline identity boundary.')
 b.close()
