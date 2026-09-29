"""Offline rendering of shared CSS; no HTTP access or private records."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
css='\n'.join(Path(p).read_text() for p in ['public/hq/style.css','public/hq/sketch.css'])
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,**({'executable_path':os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}),args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844})
 page.set_content('<html class="sketch-theme"><head><style>'+css+'</style></head><body data-chapter="family"><aside class="sidebar" id="sidebar"><a href="#">People</a></aside><a hidden href="#">Private link</a></body></html>')
 assert not page.locator('#sidebar').is_visible()
 page.evaluate("document.querySelector('#sidebar').classList.add('is-open')")
 assert page.locator('#sidebar').is_visible(),'Mobile navigation must open using the actual application class'
 assert not page.get_by_text('Private link',exact=True).is_visible()
 page.emulate_media(reduced_motion='reduce')
 assert page.locator('#sidebar').evaluate("e=>getComputedStyle(e).animationName")=='none'
 b.close()
print('Offline sketch CSS: mobile navigation, hidden links and reduced motion passed')
