// 只为「缺真实照片」的赏花点补抓图：Wikimedia Commons 搜索 + 中文维基 pageimage 双源
// 用法: node scripts/fetch-missing.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const IMAGES_DIR = path.join(ROOT, 'images/spots');
fs.mkdirSync(IMAGES_DIR, { recursive: true });

const html = fs.readFileSync(HTML_PATH, 'utf-8');
const FLOWER_SPOTS = eval(html.match(/const FLOWER_SPOTS = (\[[\s\S]*?\n\]);/)[1]);

// 已有照片的 key（SPOT_PHOTOS 映射表）
const photoBlock = html.match(/const SPOT_CUSTOM_IMAGES = \{([\s\S]*?)\n\s*\};/)[1];
const haveKeys = new Set([...photoBlock.matchAll(/'([^']+)':/g)].map(m => m[1]));

// 名胜的英文/拼音精选查询（Commons 多以英文/拉丁命名，命中率远高于中文名）
const CURATED = {
  '武汉大学樱园': ['Wuhan University cherry blossom', 'Wuhan University sakura'],
  '罗平油菜花': ['Luoping rape flower', 'Luoping rapeseed field'],
  '门源油菜花': ['Menyuan rape flower', 'Menyuan rapeseed'],
  '天平山红枫': ['Tianping Mountain Suzhou maple', 'Tianpingshan autumn'],
  '岳麓山红叶': ['Yuelu Mountain autumn', 'Yuelu Mountain Changsha'],
  '腾冲银杏村': ['Tengchong ginkgo village', 'Tengchong Ginkgo'],
  '英歌石郁金香': ['Dalian tulip', 'Yinggeshi botanical garden'],
  '中山公园郁金香': ['Zhongshan Park tulip Beijing'],
  '汉中油菜花': ['Hanzhong rape flower', 'Hanzhong rapeseed'],
  '黄陂木兰山桃花': ['Mulan Mountain peach blossom', 'Mulanshan Wuhan'],
  '亚龙湾凤凰花': ['Yalong Bay Sanya', 'Delonix regia Sanya'],
  '海南三角梅': ['Bougainvillea Hainan', 'Bougainvillea Sanya'],
  '福州茉莉': ['jasmine Fuzhou', 'Fuzhou jasmine flower'],
  '旅顺二〇三樱花': ['Lüshun cherry blossom', 'Lushun 203 cherry'],
  '瘦西湖琼花': ['Slender West Lake Yangzhou', 'Shouxihu Viburnum'],
  '焦山樱花': ['Jiaoshan Zhenjiang', 'Jiao Mountain Zhenjiang'],
  '月湖紫薇': ['Yuehu Park Ningbo', 'Moon Lake Ningbo'],
  '里运河紫藤': ['Grand Canal Huai\'an wisteria', 'Li canal Huaian'],
  '喀纳斯白桦': ['Kanas Lake birch', 'Kanas autumn birch'],
  '坝上草原秋色': ['Bashang grassland autumn', 'Bashang prairie'],
  '关门山红枫': ['Guanmenshan maple Benxi', 'Guanmen Mountain autumn'],
  '扬州个园': ['Ge Garden Yangzhou', 'Geyuan Yangzhou'],
  '龙泉驿桃花故里': ['Longquanyi peach blossom Chengdu', 'Longquan peach blossom'],
};

const missingSpots = FLOWER_SPOTS.filter(s => !haveKeys.has(s.name));
console.log(`总点 ${FLOWER_SPOTS.length}，已有照片 ${haveKeys.size}，缺图 ${missingSpots.length}：`);
console.log('  ' + missingSpots.map(s => s.name).join('、') + '\n');

const UA = { 'User-Agent': 'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=1200&origin=*`;
  try {
    const resp = await fetch(url, { headers: UA });
    if (!resp.ok) return null;
    const pages = (await resp.json()).query?.pages;
    if (!pages) return null;
    for (const page of Object.values(pages).sort((a, b) => (a.index||0)-(b.index||0))) {
      const ii = page?.imageinfo?.[0];
      if (!ii?.thumburl || ii.mime === 'image/svg+xml') continue;
      if (ii.size && ii.size < 8000) continue;
      return { url: ii.thumburl, title: page.title, via: `commons:${query}` };
    }
  } catch {}
  return null;
}

async function searchWiki(title) {
  try {
    const url = `https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1200&titles=${encodeURIComponent(title)}&origin=*&redirects=1`;
    const resp = await fetch(url, { headers: UA });
    if (!resp.ok) return null;
    const page = Object.values((await resp.json()).query?.pages || {})[0];
    const thumb = page?.thumbnail?.source;
    if (!thumb || /Question_book|Wiki_letter|Replace_this_image|No_image/i.test(thumb)) return null;
    return { url: thumb, title, via: `wiki:${title}` };
  } catch { return null; }
}

async function download(url, dest) {
  const resp = await fetch(url, { headers: UA });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

const got = {}, miss = [];
for (let i = 0; i < missingSpots.length; i++) {
  const spot = missingSpots[i];
  const stripped = spot.name.replace(/(公园|花海|花园|景区|大道|沟|村|国家|风景|生态|场|林|路|园|海|山)$/, '');
  // 查询顺序：精选英文/拼音 → 中文全名 → 去后缀名（不再用泛化"城市+花种"，避免放错图）
  const queries = [...(CURATED[spot.name] || []), spot.name];
  if (stripped && stripped !== spot.name && stripped.length >= 2) queries.push(stripped);

  process.stdout.write(`[${i+1}/${missingSpots.length}] ${spot.name}: `);
  let info = null;
  for (const q of queries) { info = await searchCommons(q); if (info) break; await sleep(120); }
  if (!info) for (const t of [...(CURATED[spot.name] || []), spot.name, stripped].filter(Boolean)) { info = await searchWiki(t); if (info) break; await sleep(120); }

  if (info) {
    try {
      const ext = (info.url.match(/\.(jpe?g|png|webp)/i)?.[1] || 'jpg').toLowerCase().replace('jpeg','jpg');
      const filename = `${spot.name}.${ext}`;
      const size = await download(info.url, path.join(IMAGES_DIR, filename));
      got[spot.name] = `images/spots/${filename}`;
      console.log(`✓ ${(size/1024).toFixed(0)}KB  (${info.via})`);
    } catch (e) { console.log('✗ 下载失败', e.message); miss.push(spot.name); }
  } else { console.log('✗ 无匹配'); miss.push(spot.name); }
  await sleep(160);
}

console.log(`\n=== 补抓结果：成功 ${Object.keys(got).length}/${missingSpots.length} ===`);
if (miss.length) console.log('仍缺：' + miss.join('、'));
const snippet = Object.entries(got).map(([n, u]) => `  '${n}': '${u}',`).join('\n');
fs.writeFileSync(path.join(ROOT, 'scripts/new-spot-photos.txt'), snippet);
console.log(`\n新增映射片段 → scripts/new-spot-photos.txt`);
