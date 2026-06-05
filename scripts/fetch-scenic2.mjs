// 第二轮：给仍用物种照的网红风光点抓真实景照，改用更精准的地名查询、每点多候选。
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'images/spots/scenic2');
fs.mkdirSync(DIR, { recursive: true });
const UA = { 'User-Agent': 'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TARGETS = {
  '稻城亚丁秋色': ['Yading Nature Reserve', 'Daocheng Yading autumn', 'Yading Sichuan mountain', 'Aden Yading'],
  '喀纳斯白桦': ['Kanas Lake autumn', 'Kanas Xinjiang', 'Hanas Lake', 'Kanas birch forest'],
  '婺源油菜花海': ['Wuyuan Jiangxi rape flower', 'Wuyuan terraces canola', 'Jiangling Wuyuan', 'Wuyuan rapeseed field'],
  '门源油菜花': ['Menyuan rape flower', 'Menyuan Qinghai canola', 'Menyuan County rapeseed field'],
  '伊犁杏花沟': ['Xinyuan apricot valley', 'Yili apricot blossom valley', 'Ili wild apricot', 'Xinjiang apricot valley'],
  '霍城薰衣草': ['Huocheng lavender field', 'Ili lavender Xinjiang', 'Yili lavender farm'],
  '泸沽湖格桑': ['Lugu Lake', 'Luguhu Yunnan', 'Lugu Lake scenery'],
  '香格里拉杜鹃': ['Shangri-La Yunnan meadow', 'Pudacuo National Park', 'Shangri-La rhododendron mountain', 'Napa Lake Shangri-La'],
  '平谷桃花海': ['Pinggu peach blossom Beijing', 'Pinggu peach festival', 'Pinggu peach flower sea'],
  '满觉陇桂雨': ['Manjuelong Hangzhou', 'Manjuelong osmanthus', 'Hangzhou osmanthus garden'],
};

async function searchCommons(query, want = 6) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=1280&origin=*`;
  const out = [];
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return out;
    const pages = (await r.json()).query?.pages;
    if (!pages) return out;
    for (const p of Object.values(pages).sort((a, b) => (a.index||0)-(b.index||0))) {
      const ii = p?.imageinfo?.[0];
      if (!ii?.thumburl || ii.mime === 'image/svg+xml') continue;
      if (ii.size && ii.size < 12000) continue;
      // 过滤明显的扫描书页(常为竖长 / 灰度)无法仅凭元数据判断，留给人眼核验
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
    if (n >= 6) break;
    const urls = await searchCommons(q);
    for (const u of urls) {
      if (seen.has(u) || n >= 6) continue; seen.add(u);
      try { await dl(u, path.join(DIR, `${spot}-${n + 1}.jpg`)); n++; } catch {}
      await sleep(110);
    }
    await sleep(110);
  }
  console.log(`${spot}: ${n} 张候选`);
}
console.log('\n第二轮实景候选抓取完成');
