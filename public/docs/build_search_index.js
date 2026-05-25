import fs from 'fs'; import path from 'path'; import { JSDOM } from 'jsdom';
const ROOT = path.resolve('.'); const OUTPUT = path.join(ROOT, 'assets/js/search_index.json');
function extract(file){ const html = fs.readFileSync(file,'utf8'); const dom = new JSDOM(html); const main = dom.window.document.querySelector('main'); const text = (main?.textContent||'').replace(/\s+/g,' ').trim(); const title = dom.window.document.querySelector('title')?.textContent || file; const rel = file.replace(ROOT + path.sep, '').replace(/\\/g,'/'); return { href: rel, title, content: text }; }
function crawl(dir){ return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=> e.isDirectory()? crawl(path.join(dir,e.name)) : (e.name.endsWith('.html')? [extract(path.join(dir,e.name))] : []) ); }
const data = crawl(ROOT); fs.writeFileSync(OUTPUT, JSON.stringify(data,null,2)); console.log(`✅ Built search_index.json (${data.length} pages)`);
