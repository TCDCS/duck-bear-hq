/** Copy pinned, locally installed reader code only. No font files or private data. */
import {copyFile,mkdir,writeFile} from 'node:fs/promises';
const files={
 'jszip/dist/jszip.min.js':'jszip.min.js',
 'epubjs/dist/epub.min.js':'epub.min.js',
 'dompurify/dist/purify.min.js':'purify.min.js',
 'pdfjs-dist/build/pdf.mjs':'pdf.mjs',
 'pdfjs-dist/build/pdf.worker.mjs':'pdf.worker.mjs',
 'jszip/LICENSE.markdown':'JSZIP-LICENSE.txt',
 'epubjs/license':'EPUBJS-LICENSE.txt',
 'dompurify/LICENSE':'DOMPURIFY-LICENSE.txt',
 'pdfjs-dist/LICENSE':'PDFJS-LICENSE.txt'
};
await mkdir('public/books/vendor',{recursive:true});
for(const [source,dest] of Object.entries(files))await copyFile('node_modules/'+source,'public/books/vendor/'+dest);
await writeFile('public/books/vendor/versions.json',JSON.stringify({epubjs:'0.3.93',pdfjs:'6.3.289',dompurify:'3.4.16'},null,2));
console.log('Books reader dependencies copied; no font assets included.');
