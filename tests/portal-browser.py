"""Acceptance checks against a disposable LOCAL Workers runtime, never production."""
from pathlib import Path
import base64, json, os, struct, time, urllib.request, urllib.error, zlib, zipfile
from playwright.sync_api import sync_playwright
BASE=os.environ.get('PORTAL_BASE','http://127.0.0.1:8787')
assert BASE.startswith(('http://127.0.0.1:','http://localhost:')), 'This suite creates test accounts: local only.'
OUT=Path(os.environ.get('PORTAL_REPORT','portal-test-report'));OUT.mkdir(exist_ok=True)
PASSWORD='a-disposable-test-password-7'
def call(path,body=None):
 req=urllib.request.Request(BASE+path, data=None if body is None else json.dumps(body).encode(),headers={'Origin':BASE,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=5) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
for _ in range(90):
 try:
  status,data=call('/api/setup/status')
  if status==200:break
 except Exception:time.sleep(1)
else:raise RuntimeError('Local Workers runtime did not start.')
assert data['setupRequired'], 'Use a clean disposable local database.'
status,_=call('/api/setup',{'setupSecret':'portal-local-fixture','admin':{'username':'portalowner','displayName':'Owner fixture','password':PASSWORD},'member':{'username':'portalduck','displayName':'Companion fixture','password':PASSWORD}})
assert status==201

def png():
 def chunk(tag,data):return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0'+bytes([255,195,95])*2+b'\0'+bytes([80,175,145])*2))+chunk(b'IEND',b'')
fixture_images=OUT/'sample-images.json'
fixture_images.write_text(json.dumps({'format':'duck-bear-private-images','version':1,'images':[{'title':'Fixture photo '+str(n),'mime':'image/png','base64':base64.b64encode(png()).decode()} for n in range(1,5)]}))
report={'checks':[],'errors':[]}
def checked(name,condition=True):
 assert condition,name
 report['checks'].append(name)
 print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def visit(path):
  page.goto(BASE+path,wait_until='networkidle');page.locator('#content .loading').wait_for(state='hidden');
  assert 'This page could not open.' not in page.locator('#content').inner_text(),path+': '+page.locator('#content').inner_text()
 def save(label):
  page.get_by_role('button',name=label,exact=True).click();page.wait_for_timeout(200)
  if page.locator('.save-status.error').count():raise AssertionError(page.locator('.save-status.error').inner_text())
 def add_person(name):
  visit('/family-tree/people/new/');page.locator('[name=title]').fill(name);save('Save person');page.get_by_role('heading',name=name,exact=True).wait_for();return page.url.split('/')[-2]
 visit('/');checked('public homepage renders');page.screenshot(path=str(OUT/'public-desktop.png'),full_page=True)
 visit('/account/');page.locator('[name=username]').fill('portalowner');page.locator('[name=password]').fill(PASSWORD);save('Enter our space →');page.wait_for_url('**/our-space/');checked('owner signs in through the new account screen')
 for path in ['/settings/profile/','/settings/email/','/settings/security/','/settings/devices/','/settings/appearance/','/settings/language/','/settings/images/','/settings/data/','/admin/users/','/menus/current/','/menus/archive/','/menus/planner/','/games/together/','/games/updates/','/shop/','/orders/','/points/history/','/rewards/']:
  visit(path);page.reload(wait_until='networkidle');checked('direct link and refresh '+path,'This page could not open.' not in page.locator('#content').inner_text())
 visit('/image-library/import/');page.locator('#image-package').set_input_files(fixture_images);page.locator('[data-action=import-images]').click();page.wait_for_url('**/image-library/',timeout=30000);checked('private image package creates a selectable library')
 visit('/scrapbook/memories/');checked('each supplied image gets a private scrapbook page',page.locator('.card').count()==4)
 visit('/our-space/');page.screenshot(path=str(OUT/'private-desktop.png'),full_page=True)
 a=add_person('First family fixture');b=add_person('Second family fixture');checked('family members can be created')
 visit('/family-tree/relationships/new/');page.locator('[name=from]').select_option(a);page.locator('[name=to]').select_option(b);page.locator('[name=type]').select_option('adoptive-parent');save('Save relationship');page.wait_for_timeout(250)
 visit('/family-tree/');checked('interactive tree includes the two connected people',page.locator('.person-node').count()==2)
 visit('/family-tree/people/'+a+'/');page.get_by_role('link',name='Edit',exact=True).first.click();page.locator('[name=title]').fill('Edited family fixture');save('Save person');page.get_by_role('heading',name='Edited family fixture',exact=True).wait_for();checked('record edit is persisted')
 visit('/plans/polls/new/');page.locator('[name=title]').fill('Weekend choice');page.locator('[name=options]').fill('Garden\nBeach');save('Save poll');page.get_by_role('heading',name='Weekend choice',exact=True).wait_for();page.locator('[data-action=vote]').first.click();page.wait_for_timeout(200);checked('decision board accepts a vote',page.locator('.poll-choice.selected').count()==1)
 visit('/menus/planner/new/');page.locator('[name=title]').fill('Next fixture week');page.locator('[name=startDate]').fill('2026-10-05');save('Save menu week');page.wait_for_url('**/menus/planner/*/');week=page.url.split('/')[-2]
 visit('/menus/meals/new/?weekId='+week+'&date=2026-10-05');page.locator('[name=title]').fill('Fixture noodles');save('Save meal');page.get_by_role('heading',name='Fixture noodles',exact=True).wait_for();meal=page.url.split('/')[-2]
 visit('/menus/planner/'+week+'/');page.locator('[data-move-meal]').select_option('2026-10-06');page.wait_for_timeout(250);checked('meal can be moved with an ordinary day selector')
 page.once('dialog',lambda dialog:dialog.accept());page.locator('[data-action=publish-week]').click();page.wait_for_timeout(500);visit('/menus/weeks/2026-10-05/');checked('published dated menu includes the selected serving','Fixture noodles' in page.locator('#content').inner_text())
 visit('/menus/reviews/new/?mealId='+meal);page.locator('[name=overall][value="6"]').check();page.locator('[name=taste][value="5"]').check();page.locator('[name=plating][value="4"]').check();page.locator('[name=comment]').fill('Private fixture verdict.');save('Save meal review');page.wait_for_timeout(250);checked('private review stores taste plating and overall rating','Private fixture verdict.' in page.locator('#content').inner_text())
 visit('/admin/users/');page.locator('#inviteForm [name=displayName]').fill('Invited fixture');page.locator('#inviteForm [name=username]').fill('portalguest');save('Create invitation');page.locator('.token-link').wait_for();invitation=page.locator('.token-link').inner_text();permission_link=page.locator('#invitation-result a').get_attribute('href')
 page.get_by_role('link',name='Choose their permissions →').click();page.locator('#permission-family [name=level]').select_option('1');page.locator('#permission-family button[type=submit]').click();page.wait_for_timeout(200);checked('owner can invite and grant read-only family access')
 guest=browser.new_page(viewport={'width':390,'height':844});guest.on('pageerror',lambda e:report['errors'].append(str(e)));guest.goto(BASE+'/account/invite/#'+invitation.split('#')[-1],wait_until='networkidle');guest.locator('[name=password]').fill(PASSWORD);guest.locator('[name=confirm]').fill(PASSWORD);guest.locator('form button[type=submit]').click();guest.wait_for_timeout(500);guest.locator('[name=username]').fill('portalguest');guest.locator('[name=password]').fill(PASSWORD);guest.locator('form button[type=submit]').click();guest.wait_for_url('**/our-space/');guest.goto(BASE+'/family-tree/people/'+a+'/',wait_until='networkidle');checked('reader can view family but not edit or comment',guest.locator('#commentForm').count()==0 and guest.locator('a[href$="/edit/"]').count()==0)
 response=guest.request.get(BASE+'/api/portal/records?section=scrapbook');checked('invited family reader cannot fetch Scrapbook',response.status==403)
 all_images=page.request.get(BASE+'/api/portal/records?section=images&kind=media').json()['records'];private_url=BASE+'/media/portal/'+all_images[0]['id'];checked('direct private photo URL refuses invited reader',guest.request.get(private_url).status==404)
 anonymous=browser.new_context();checked('private original refuses signed-out fetch',anonymous.request.get(private_url).status==401)
 visit('/admin/backups/');with_download=page.expect_download()
 with with_download as captured:page.locator('[data-action=download-backup]').click()
 download=captured.value;backup_path=OUT/'fixture-backup.zip';download.save_as(backup_path)
 with zipfile.ZipFile(backup_path) as archive:
  manifest=json.loads(archive.read('manifest.json'));checked('backup ZIP includes all four real original files',len(manifest['media'])==4 and all(archive.read(m['path'])==png() for m in manifest['media']))
 page.locator('#restore-file').set_input_files(backup_path);page.once('dialog',lambda d:d.accept());page.locator('[data-action=restore-backup]').click();page.wait_for_timeout(800);checked('backup restores without a reported conflict or invalid link','restore complete' in page.locator('#backup-status').inner_text().lower())
 for width in [390,320]:
  page.set_viewport_size({'width':width,'height':844});visit('/our-space/');checked('mobile layout has no horizontal overflow '+str(width),page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'));page.screenshot(path=str(OUT/f'private-mobile-{width}.png'),full_page=True)
 checked('browser remained free of JavaScript errors',not report['errors']);report['status']='passed';(OUT/'report.json').write_text(json.dumps(report,indent=2));browser.close()
