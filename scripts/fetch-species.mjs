// 物种底座：按花种拉丁名从 iNaturalist 抓正确花照（物种库，准）。每种抓多张。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SP_DIR = path.join(ROOT, 'images/spots/sp');
fs.mkdirSync(SP_DIR, { recursive: true });

const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SPOTS = eval(h.match(/const FLOWER_SPOTS = (\[[\s\S]*?\n\]);/)[1]);
const T2L = eval('(' + h.match(/const TYPE_TO_LATIN = (\{[\s\S]*?\n\s*\};)/)[1].replace(/;$/, '') + ')');

const types = [...new Set(SPOTS.map(s => s.type))];
const UA = { 'User-Agent': 'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)', 'Accept': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PER = 5; // 每种抓几张

async function taxonId(latin) {
  // 逐步放宽：全名 → 去 var. → 属
  const tries = [latin, latin.replace(/\s*var\.?.*$/i, '').replace(/\s*×\s*/, ' '), latin.split(' ')[0]];
  for (const q of tries) {
    try {
      const r = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=1`, { headers: UA });
      if (!r.ok) continue;
      const t = (await r.json()).results?.[0];
      if (t?.id) return t;
    } catch {}
    await sleep(150);
  }
  return null;
}

async function dl(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

const manifest = {};
for (const type of types) {
  const latin = T2L[type];
  process.stdout.write(`${type} (${latin}): `);
  const t = await taxonId(latin);
  if (!t) { console.log('✗ 无 taxon'); manifest[type] = []; continue; }
  // 取 taxon_photos
  let photos = [];
  try {
    const r = await fetch(`https://api.inaturalist.org/v1/taxa/${t.id}`, { headers: UA });
    const detail = (await r.json()).results?.[0];
    photos = (detail?.taxon_photos || []).map(tp => tp.photo).filter(Boolean);
  } catch {}
  if (!photos.length && t.default_photo) photos = [t.default_photo];
  const files = [];
  let n = 0;
  for (const p of photos) {
    if (n >= PER) break;
    const url = p.medium_url || p.url?.replace('square', 'medium') || p.url;
    if (!url) continue;
    const fn = `${type}-${n + 1}.jpg`;
    try { await dl(url, path.join(SP_DIR, fn)); files.push(`images/spots/sp/${fn}`); n++; await sleep(120); }
    catch {}
  }
  manifest[type] = files;
  console.log(`✓ ${files.length} 张  (taxon ${t.id} ${t.name})`);
  await sleep(200);
}

fs.writeFileSync(path.join(ROOT, 'scripts/species-manifest.json'), JSON.stringify(manifest, null, 2));
const total = Object.values(manifest).reduce((a, b) => a + b.length, 0);
const empty = Object.entries(manifest).filter(([, v]) => !v.length).map(([k]) => k);
console.log(`\n共 ${total} 张，覆盖 ${types.length - empty.length}/${types.length} 种`);
if (empty.length) console.log('未抓到：' + empty.join('、'));
