"""Account and real WebAuthn browser acceptance. Refuses production hosts."""
import os,json,pathlib,urllib.parse
from playwright.sync_api import sync_playwright, expect
BASE=os.environ.get('ACCOUNT_BASE','http://localhost:8790')
assert urllib.parse.urlparse(BASE).hostname in ['localhost','127.0.0.1']
OUT=pathlib.Path(os.environ.get('HQ_REPORT','/mnt/data/account-browser'));OUT.mkdir(parents=True,exist_ok=True)
OWNER=os.environ.get('ACCOUNT_OWNER','hqowner');PASSWORD=os.environ.get('ACCOUNT_PASSWORD','hq-test-password-123')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 owner=browser.new_context(viewport={'width':1440,'height':1000});page=owner.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 def login(page,username,password):
  page.goto(BASE+'/sign-in/');page.get_by_label('Username or email',exact=True).fill(username);page.get_by_label('Password',exact=True).fill(password)
  page.get_by_role('button',name='Sign in',exact=True).click();page.wait_for_url('**/our-space/');page.locator('#sign-out').wait_for()
 try:
  login(page,OWNER,PASSWORD)
  page.goto(BASE+'/admin/users/create/')
  page.get_by_label('Display name',exact=True).fill('Browser test member')
  page.get_by_label('Username',exact=True).fill('account-browser-member')
  page.get_by_label('Email address (optional)',exact=True).fill('account-browser@example.test')
  page.get_by_label('New user password',exact=True).fill('browser-member-password')
  page.get_by_label('Confirm new user password',exact=True).fill('browser-member-password')
  page.get_by_label('Your current password',exact=True).fill(PASSWORD)
  page.get_by_role('button',name='Create user',exact=True).click()
  page.get_by_role('heading',name='Browser test member',exact=True).wait_for()
  user_url=page.url;uid=user_url.rstrip('/').split('/')[-1]
  page.locator('nav[aria-label="User settings"]').get_by_role('link',name='Email',exact=True).click()
  page.get_by_label('Email address',exact=True).fill('changed-account-browser@example.test')
  page.get_by_label('Your current password',exact=True).fill(PASSWORD)
  page.get_by_role('button',name='Save registered email',exact=True).click()
  page.locator('dd').filter(has_text='changed-account-browser@example.test').wait_for()
  page.screenshot(path=str(OUT/'account-email-desktop.png'),full_page=True)
  page.locator('nav[aria-label="User settings"]').get_by_role('link',name='Settings',exact=True).click()
  page.get_by_label('Theme',exact=True).select_option('night');page.get_by_label('Reduce decorative movement',exact=True).check()
  page.get_by_role('button',name='Save user settings',exact=True).click();expect(page.locator('#toast')).to_have_text('User settings saved.')
  page.locator('nav[aria-label="User settings"]').get_by_role('link',name='Security',exact=True).click()
  page.get_by_label('Your current password',exact=True).fill(PASSWORD)
  page.get_by_label('New password for Browser test member',exact=True).fill('changed-browser-password')
  page.get_by_label('Confirm new password',exact=True).fill('changed-browser-password')
  page.get_by_role('button',name='Set new password',exact=True).click();expect(page.locator('#toast')).to_contain_text('Password set')
  member=browser.new_context(viewport={'width':1280,'height':900});mp=member.new_page();mp.on('pageerror',lambda e:errors.append(str(e)))
  session=member.new_cdp_session(mp);session.send('WebAuthn.enable')
  device=session.send('WebAuthn.addVirtualAuthenticator',{'options':{'protocol':'ctap2','transport':'internal','hasResidentKey':True,'hasUserVerification':True,'isUserVerified':True,'automaticPresenceSimulation':True}})['authenticatorId']
  login(mp,'changed-account-browser@example.test','changed-browser-password')
  me=member.request.get(BASE+'/api/hq/me').json();assert me['preferences']['theme']=='night';assert not me['access']['family']['read'];assert not me['access']['scrapbook']['read']
  mp.goto(BASE+'/settings/passkeys/');mp.get_by_label('Passkey name',exact=True).fill('Browser test laptop');mp.get_by_label('Current password',exact=True).fill('changed-browser-password')
  mp.get_by_role('button',name='Add passkey',exact=True).click();expect(mp.locator('.key-row')).to_have_count(1)
  credentials=session.send('WebAuthn.getCredentials',{'authenticatorId':device})['credentials'];assert len(credentials)==1
  # Never write the authenticator's private-key bytes to an artifact.
  mp.screenshot(path=str(OUT/'passkeys-desktop.png'),full_page=True)
  mp.locator('#sign-out').click();mp.wait_for_url('**/sign-in/')
  mp.get_by_role('button',name='Sign in with a passkey',exact=True).click();mp.wait_for_url('**/our-space/')
  assert member.request.get(BASE+'/api/hq/me').json()['user']['id']==uid
  # The owner can revoke a registered key; the removed key cannot authenticate again.
  page.goto(user_url+'security/');page.locator('.key-row').wait_for()
  page.locator('.key-row').get_by_label('Your current password',exact=True).fill(PASSWORD)
  page.once('dialog',lambda dialog:dialog.accept());page.get_by_role('button',name='Revoke passkey',exact=True).click();expect(page.locator('.key-row')).to_have_count(0)
  assert member.request.get(BASE+'/api/hq/me').status==401
  mp.goto(BASE+'/sign-in/');mp.get_by_role('button',name='Sign in with a passkey',exact=True).click();expect(mp.locator('#passkey-status')).to_contain_text('could not be verified')
  login(mp,'changed-account-browser@example.test','changed-browser-password')
  # Cancellation is reported without breaking password sign-in.
  mp.goto(BASE+'/sign-in/');mp.evaluate("() => {navigator.credentials.get=async()=>{throw new DOMException('Cancelled','NotAllowedError')};}")
  mp.get_by_role('button',name='Sign in with a passkey',exact=True).click();expect(mp.locator('#passkey-status')).to_contain_text('cancelled')
  for path in ['/settings/passkeys/','/admin/users/create/',user_url.replace(BASE,'')+'email/',user_url.replace(BASE,'')+'security/',user_url.replace(BASE,'')+'settings/','/admin/email/']:
   page.set_viewport_size({'width':390,'height':844});page.goto(BASE+path);page.locator('h1').wait_for()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),path
  page.goto(BASE+'/admin/email/');page.get_by_role('heading',name='Email delivery',exact=True).wait_for();page.screenshot(path=str(OUT/'email-delivery-mobile.png'),full_page=True)
  assert not errors,errors
  (OUT/'account-browser.json').write_text(json.dumps({'status':'passed','errors':errors,'runtime':'actual local Cloudflare Worker','checks':['direct user creation','owner email replacement','owner preference edits','owner password reset','password login','private grant isolation','real virtual-authenticator registration','passkey-only login','owner passkey revocation','revoked sessions','revoked-key rejection','password fallback','cancelled prompt handling','390px user screens']},indent=2))
  print('Account and real passkey browser acceptance passed')
 except Exception as e:
  page.screenshot(path=str(OUT/'account-failure.png'),full_page=True)
  (OUT/'account-failure.json').write_text(json.dumps({'error':str(e),'url':page.url,'errors':errors,'body':page.locator('body').inner_text()},indent=2));raise
 finally:browser.close()
