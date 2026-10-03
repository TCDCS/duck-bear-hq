"""Real IndexedDB and JSON API regression tests; synthetic accounts/books only."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os

root=Path(__file__).resolve().parents[2]
base='http://127.0.0.1:8788'
evidence=root/'verification';evidence.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,headless=True,args=['--no-sandbox'])
 contexts=[];pages=[];errors=[];checks=[]
 def reader(name):
  ctx=browser.new_context();contexts.append(ctx)
  ctx.add_cookies([{'name':'test_reader','value':name,'url':base}])
  page=ctx.new_page();pages.append(page)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'/books/')
  expect(page.get_by_role('heading',name='Our bookshelf',exact=True)).to_be_visible()
  page.evaluate('''async()=>{window.local=await import('/books/offline.mjs');window.api=(await import('/books/common.mjs')).request;window.me=await api('/api/hq/books/me');await local.rememberIdentity(me);window.user=me.user.id;}''')
  return ctx,page
 try:
  a,page=reader('zachary')
  upload=a.request.put(base+'/api/hq/books/uploads?name=sync-test.pdf',headers={'Origin':base,'Content-Type':'application/pdf'},data=(root/'tests/books/generated/field-notes.pdf').read_bytes()+b'\n% isolated sync regression\n')
  assert upload.ok,upload.text()
  book=upload.json()['book'];file=book['files'][0]
  page.evaluate('(f)=>{window.file=f;window.path="/api/hq/books/files/"+f.id+"/progress";}',file)
  result=page.evaluate('''async()=>{
   const state=(progress)=>({revision:0,progress,locator:{type:'pdf',page:Math.round(progress*3)||1}}),sent=[];
   await local.queueProgress(user,file,state(0.2));
   try{await local.flushProgress(user,file,async(path,options)=>{sent.push(structuredClone(options.data));await api(path,options);throw new TypeError('Simulated lost acknowledgement');});}catch(e){if(!(e instanceof TypeError))throw e;}
   await local.queueProgress(user,file,state(0.7));
   await local.flushProgress(user,file,async(path,options)=>{sent.push(structuredClone(options.data));return api(path,options);});
   const cloud=await api(path+'?version='+encodeURIComponent(file.version)),saved=await local.localState(user,file);
   return {sent,cloud,saved,pending:await local.all(user,'pending')};
  }''')
  assert result['sent'][0]==result['sent'][1],result
  assert result['cloud']['revision']==2 and result['saved']['progress']==0.7 and not result['pending'],result
  checks.append('Real IndexedDB replays a lost progress acknowledgement, then saves the newer edit at revision 2')

  b,other=reader('guannan')
  other.evaluate('(f)=>{window.file=f;window.path="/api/hq/books/files/"+f.id+"/progress";}',file)
  isolated=other.evaluate("async()=>({cloud:await api(path+'?version='+encodeURIComponent(file.version)),local:await local.localState(user,file)})")
  assert isolated['cloud']['revision']==0 and isolated.get('local') is None,isolated
  assert b.request.get(base+'/api/hq/integrations/google-drive/status').status==403
  checks.append('The other reader has separate progress and cannot manage the Google connection')

  c,second=reader('zachary')
  second.evaluate('(f)=>{window.file=f;window.path="/api/hq/books/files/"+f.id+"/progress";}',file)
  second.evaluate("async()=>{const state=await api(path+'?version='+encodeURIComponent(file.version));await local.storeState(user,file,state);await local.queueProgress(user,file,{...state,progress:0.3,locator:{type:'pdf',page:1}});}")
  page.evaluate("async()=>{const state=await local.localState(user,file);await local.queueProgress(user,file,{...state,progress:0.9,locator:{type:'pdf',page:3}});await local.flushProgress(user,file,api);}")
  conflict=second.evaluate('''async()=>{
   let conflict;
   try{await local.flushProgress(user,file,api,(current,pending)=>{conflict={current,pending};});}catch(e){if(e.code!=='progress_conflict')throw e;}
   const kept=await local.localState(user,file);
   await local.resolveProgress(user,file,'cloud',conflict.current);
   return {conflict,kept,resolved:await local.localState(user,file),pending:await local.all(user,'pending')};
  }''')
  assert conflict['kept']['progress']==0.3 and conflict['conflict']['current']['progress']==0.9,conflict
  assert conflict['resolved']['progress']==0.9 and not conflict['pending'],conflict
  checks.append('Two devices retain both reading positions; choosing cloud clears only the local pending position')

  note=page.evaluate('''async()=>{
   const note={id:crypto.randomUUID(),fileId:file.id,version:file.version,kind:'note',locator:{type:'pdf',page:2},note:'First private thought',revision:0,deleted:false};
   await local.saveLocalNote(user,note);
   try{await local.flushNotes(user,async(path,options)=>{await api(path,options);throw new TypeError('Simulated lost note acknowledgement');});}catch(e){if(!(e instanceof TypeError))throw e;}
   await local.saveLocalNote(user,{...note,note:'Revised private thought'});await local.flushNotes(user,api);
   return await local.get(local.key(user,'note',note.id));
  }''')
  assert note['revision']==2 and note['note']=='Revised private thought',note
  notes_url=base+'/api/hq/books/files/'+file['id']+'/annotations?version='+file['version']
  assert b.request.get(notes_url).json()['annotations']==[]
  other_note={**note,'note':'Other device thought'}
  update=c.request.put(base+'/api/hq/books/annotations/'+note['id'],headers={'Origin':base},data=other_note)
  assert update.ok,update.text()
  result=page.evaluate('''async(note)=>{
   await local.saveLocalNote(user,{...note,note:'Unsynced local thought'});let conflict;
   try{await local.flushNotes(user,api);}catch(e){if(e.code!=='annotation_conflict')throw e;conflict=e.details;}
   const pending=await local.get(local.key(user,'note-pending',note.id));
   await local.resolveNote(user,note.id,'device',conflict.current);await local.flushNotes(user,api);
   return {pending,conflict,saved:await local.get(local.key(user,'note',note.id))};
  }''',note)
  assert result['pending']['note']=='Unsynced local thought' and result['conflict']['current']['note']=='Other device thought',result
  assert result['saved']['revision']==4 and result['saved']['note']=='Unsynced local thought',result
  checks.append('Lost note replies are idempotent; private notes stay separate and an explicit conflict choice saves revision 4')

  changed=page.evaluate('''async()=>{
   const state=await local.localState(user,file);await local.queueProgress(user,file,{...state,progress:0.6,locator:{type:'pdf',page:2}});
   let release,started;const gate=new Promise(r=>release=r),ready=new Promise(r=>started=r);
   const flush=local.flushProgress(user,file,async(path,options)=>{const saved=await api(path,options);started();await gate;return saved;}).then(()=>null,e=>e.code);
   await ready;await local.rememberIdentity({user:{id:'test-guannan',displayName:'Guannan'},owner:false});release();
   const code=await flush;
   return {code,oldState:await local.localState(user,file),identity:await local.get('identity')};
  }''')
  assert changed['code']=='identity_changed' and changed.get('oldState') is None,changed
  assert changed['identity']['user']['id']=='test-guannan',changed
  checks.append('A late network reply after switching reader cannot recreate the cleared account records')
  assert not errors,errors
  (evidence/'sync-browser.json').write_text(json.dumps({'passed':True,'checks':checks,'pageErrors':errors},indent=2))
  print('\n'.join('PASS '+check for check in checks))
 finally:
  (evidence/'sync-browser-diagnostics.json').write_text(json.dumps({'completed':checks,'pageErrors':errors},indent=2))
  for ctx in contexts:ctx.close()
  browser.close()
