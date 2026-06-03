// 给知名赏花点抓真实胜地实景照（Wikimedia Commons 英文/地名查询），每点抓多张候选供人眼核验。
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'images/spots/scenic');
fs.mkdirSync(DIR, { recursive: true });
const UA = { 'User-Agent': 'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 点名 → Commons 候选查询（地名+花，英文/拼音命中率高）
const TARGETS = {
  '武汉大学樱园': ['Wuhan University cherry blossom', 'Wuhan University sakura'],
  '王城公园牡丹': ['Luoyang peony Wangcheng', 'Luoyang peony festival'],
  '中国国花园': ['Luoyang National Peony Garden', 'Luoyang peony garden'],
  '香雪海': ['Xiangxuehai plum blossom Suzhou', 'Guangfu plum blossom Suzhou'],
  '西湖荷花': ['West Lake lotus Hangzhou', 'Xihu lotus Hangzhou'],
  '婺源油菜花海': ['Wuyuan rape flower terraces', 'Wuyuan canola Jiangxi'],
  '香山红叶': ['Fragrant Hills autumn red leaves', 'Xiangshan red leaves Beijing'],
  '鼋头渚': ['Yuantouzhu cherry blossom', 'Turtle Head Isle Taihu cherry'],
  '玉渊潭公园': ['Yuyuantan cherry blossom Beijing', 'Yuyuantan park cherry'],
  '顾村公园': ['Gucun Park cherry blossom Shanghai', 'Gucun park sakura'],
  '平谷桃花海': ['Pinggu peach blossom Beijing', 'Pinggu peach flower'],
  '林芝桃花沟': ['Nyingchi peach blossom Tibet', 'Linzhi peach blossom'],
  '罗平油菜花': ['Luoping rape flower', 'Luoping canola field'],
  '门源油菜花': ['Menyuan rape flower Qinghai', 'Menyuan canola'],
  '稻城亚丁秋色': ['Daocheng Yading autumn', 'Yading Nature Reserve autumn'],
  '喀纳斯白桦': ['Kanas autumn birch Xinjiang', 'Kanas Lake autumn'],
  '霍城薰衣草': ['Huocheng lavender Xinjiang', 'Yili lavender field'],
  '伊犁杏花沟': ['Yili apricot valley blossom', 'Xinyuan apricot valley'],
  '满觉陇桂雨': ['Manjuelong osmanthus Hangzhou', 'Hangzhou osmanthus'],
  '香格里拉杜鹃': ['Shangri-La rhododendron Yunnan', 'Shangri-La azalea'],
  '开封菊花节': ['Kaifeng chrysanthemum festival', 'Kaifeng chrysanthemum'],
  '龙华玉兰': ['Shanghai white magnolia Longhua', 'Yulan magnolia Shanghai'],
  '扬州个园': ['Geyuan Garden Yangzhou', 'Ge Garden Yangzhou'],
  '瘦西湖琼花': ['Slender West Lake Viburnum Yangzhou', 'Shouxihu Yangzhou'],
  '泸沽湖格桑': ['Lugu Lake Yunnan flowers', 'Lugu Lake scenery'],
};

async function searchCommons(query, want = 4) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=1280&origin=*`;
  const out = [];
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return out;
    const pages = (await r.json()).query?.pages;
    if (!pages) return out;
    for (const p of Object.values(pages).sort((a, b) => (a.index||0)-(b.index||0))) {
      const ii = p?.imageinfo?.[0];
      if (!ii?.thumburl || ii.mime === 'image/svg+xml') continue;
      if (ii.size && ii.size < 10000) continue;
      out.push(ii.thumburl);
      if (out.length >= want) break;
    }
  } catch {}
  return out;
}
async function dl(url, dest) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw 0; fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer())); }

for (const [spot, queries] of Object.entries(TARGETS)) {
  let n = 0; const seen = new Set();
  for (const q of queries) {
    const urls = await searchCommons(q);
    for (const u of urls) {
      if (seen.has(u) || n >= 4) continue; seen.add(u);
      try { await dl(u, path.join(DIR, `${spot}-${n + 1}.jpg`)); n++; } catch {}
      await sleep(120);
    }
    await sleep(120);
  }
  console.log(`${spot}: ${n} 张候选`);
}
console.log('\n实景候选抓取完成');
