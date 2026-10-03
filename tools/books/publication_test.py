"""Exercise the EPUB DOM sanitizer with in-memory synthetic input only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import os

root = Path(__file__).resolve().parents[2]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('BOOKS_BROWSER_PATH') or None,
                                headless=True, args=['--no-sandbox'])
    page = browser.new_page()
    page.add_script_tag(content=(root/'public/books/vendor/purify.min.js').read_text())
    # No HTTP access is needed. Load the same production sanitizer into this DOM.
    page.add_script_tag(content=(root/'public/books/publication.mjs').read_text().replace('export ', ''))
    result = page.evaluate('''() => {
      const source = '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml#start">The shore</a></li></ol></nav></body></html>';
      const clean = cleanChapter(source);
      const doc = new DOMParser().parseFromString(clean, 'application/xml');
      return {error:doc.querySelector('parsererror')?.textContent,
        type:doc.querySelector('nav')?.getAttributeNS('http://www.idpf.org/2007/ops','type'),
        href:doc.querySelector('a')?.getAttribute('href'), label:doc.querySelector('a')?.textContent};
    }''')
    assert not result.get('error'), result
    assert result['type']=='toc' and result['href']=='one.xhtml#start' and result['label']=='The shore', result
    malicious = page.evaluate('''() => {
      const clean=cleanChapter('<html><head><style>@import url(https://malicious.invalid/a);p{background:url(https://malicious.invalid/b)}</style></head><body><script>parent.pwned=1</script><iframe src="https://malicious.invalid/c"></iframe><form action="https://malicious.invalid/d"><input></form><img onerror="alert(1)" src="https://malicious.invalid/e"><a href="javascript:alert(1)">bad</a><p style="background:url(https://malicious.invalid/f)">safe text</p></body></html>');
      const doc=new DOMParser().parseFromString(clean,'application/xml');
      return {error:doc.querySelector('parsererror')?.textContent,
        forbidden:doc.querySelectorAll('script,iframe,form,input,[onerror]').length,
        unsafe:[...doc.querySelectorAll('[href],[src],style,[style]')].some(el=>el.outerHTML.includes('malicious.invalid')),
        policy:doc.querySelector('meta')?.getAttribute('content'), text:doc.querySelector('p')?.textContent};
    }''')
    assert not malicious.get('error'), malicious
    assert malicious['forbidden']==0 and not malicious['unsafe'], malicious
    assert "script-src 'none'" in malicious['policy'] and "connect-src 'none'" in malicious['policy'], malicious
    assert malicious['text']=='safe text', malicious
    print('PASS EPUB navigation stays valid namespace-aware XML; local chapter links and labels survive; active content and external resources stay blocked.')
    browser.close()
