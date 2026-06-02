// 针对缺口花种用 Wikimedia Commons 英文/季节关键词补抓
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const SP_DIR = path.join(ROOT, 'images/spots/sp');
const UA = { 'User-Agent': 'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const GAPS = {
  ginkgo: ['Ginkgo biloba autumn golden leaves', 'ginkgo avenue autumn', 'Ginkgo autumn yellow'],
  maple: ['Acer palmatum autumn red', 'Japanese maple autumn red leaves', 'maple red autumn foliage'],
  osmanthus: ['Osmanthus fragrans flowers', 'Osmanthus fragrans blossom'],
  kapok: ['Bombax ceiba flower', 'Bombax ceiba red flower tree'],
  lilac: ['Syringa oblata flowers', 'Syringa lilac purple flowers'],
};

async function searchCommons(query, want = 4) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=1200&origin=*`;
  const out = [];
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return out;
    const pages = (await r.json()).query?.pages;
    if (!pages) return out;
    for (const p of Object.values(pages).sort((a, b) => (a.index||0)-(b.index||0))) {
      const ii = p?.imageinfo?.[0];
      if (!ii?.thumburl || ii.mime === 'image/svg+xml') continue;
      if (ii.size && ii.size < 8000) continue;
      out.push(ii.thumburl);
      if (out.length >= want) break;
    }
  } catch {}
  return out;
}
async function dl(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

for (const [type, queries] of Object.entries(GAPS)) {
  let n = 0;
  const seen = new Set();
  for (const q of queries) {
    const urls = await searchCommons(q);
    for (const u of urls) {
      if (seen.has(u) || n >= 5) continue;
      seen.add(u);
      const fn = `${type}-c${n + 1}.jpg`;
      try { await dl(u, path.join(SP_DIR, fn)); console.log(`${type}: ✓ ${fn}  (${q})`); n++; }
      catch (e) { console.log(`${type}: ✗ ${e.message}`); }
      await sleep(150);
    }
    await sleep(150);
  }
  console.log(`${type}: 共补 ${n} 张\n`);
}
console.log('补抓完成');
