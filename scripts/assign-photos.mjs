// 给全部 111 点分配照片：17 个已核验实景点保留实景；其余按花种轮用核验过的物种照。
// 删除未入选的 sp 图，重建 SPOT_CUSTOM_IMAGES。
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const SP_DIR = path.join(ROOT, 'images/spots/sp');

// 每个花种核验通过的照片池（按好看排序）
const POOL = {
  cherry: ['cherry-1','cherry-4'],
  peach: ['peach-1','peach-3'],
  plum: ['plum-1','plum-2','plum-4'],
  canola: ['canola-3','canola-1'],
  peony: ['peony-1','peony-2'],
  azalea: ['azalea-2','azalea-4','azalea-3','azalea-5','azalea-1'],
  wisteria: ['wisteria-1','wisteria-3','wisteria-2'],
  kapok: ['kapok-1','kapok-c1','kapok-c4','kapok-c3'],
  lotus: ['lotus-1','lotus-3','lotus-5'],
  lavender: ['lavender-1','lavender-3'],
  sunflower: ['sunflower-1','sunflower-4','sunflower-2'],
  osmanthus: ['osmanthus-1','osmanthus-c1','osmanthus-c4','osmanthus-c2'],
  chrysanthemum: ['chrysanthemum-1','chrysanthemum-2','chrysanthemum-3'],
  maple: ['maple-1','maple-c2','maple-c4','maple-c3','maple-c1'],
  ginkgo: ['ginkgo-c1','ginkgo-c2','ginkgo-c4','ginkgo-c3'],
  bougainvillea: ['bougainvillea-3','bougainvillea-2','bougainvillea-1','bougainvillea-4'],
  camellia: ['camellia-2','camellia-1'],
  narcissus: ['narcissus-2','narcissus-5','narcissus-1','narcissus-3'],
  magnolia: ['magnolia-1','magnolia-3'],
  rose: ['rose-1','rose-2','rose-5'],
  bauhinia: ['bauhinia-1','bauhinia-3','bauhinia-2'],
  orchid: ['orchid-1','orchid-3','orchid-5','orchid-4'],
  clivia: ['clivia-1','clivia-2','clivia-3','clivia-5'],
  pomegranate: ['pomegranate-4'],
  tulip: ['tulip-1','tulip-3','tulip-2'],
  apricot: ['apricot-1','apricot-5'],
  jasmine: ['jasmine-3','jasmine-1','jasmine-5','jasmine-4'],
  iris: ['iris-1'],
  cosmos: ['cosmos-2','cosmos-5','cosmos-1','cosmos-4'],
  phoenix: ['phoenix-1','phoenix-4','phoenix-3'],
  qionghua: ['qionghua-4','qionghua-1','qionghua-2'],
  crapemyrtle: ['crapemyrtle-2','crapemyrtle-1'],
  birch: ['birch-1','birch-3'],
  poplar: ['poplar-2'],
  lilac: ['lilac-c4','lilac-c3','lilac-c1','lilac-1'],
};

// 17 个已核验实景点（保留 images/spots/<name>.jpg）
const SCENIC = new Set(['北海荷花','避暑山庄荷花','东湖梅花','额济纳胡杨林','海南三角梅','洪湖荷花','惠州西湖','九寨沟红叶','梅花山','攀枝花木棉','上海豫园','腾冲银杏村','兴化垛田','颐和园荷花','圆明园荷花','中山公园郁金香','中山公园樱花路']);

// 1. 删除未入选的 sp 图
const keepFiles = new Set(Object.values(POOL).flat().map(f => f + '.jpg'));
let del = 0;
for (const f of fs.readdirSync(SP_DIR)) { if (!keepFiles.has(f)) { fs.unlinkSync(path.join(SP_DIR, f)); del++; } }
// 校验池里每张都存在
const missing = [...keepFiles].filter(f => !fs.existsSync(path.join(SP_DIR, f)));
if (missing.length) { console.error('池中缺文件:', missing); process.exit(1); }
console.log(`删除未入选 sp 图 ${del} 张，保留 ${keepFiles.size} 张`);

// 2. 分配
const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SPOTS = eval(h.match(/const FLOWER_SPOTS = (\[[\s\S]*?\n\]);/)[1]);
const counter = {}; // 每种轮转计数
const mapping = {};
const noPool = [];
for (const s of SPOTS) {
  if (SCENIC.has(s.name)) { mapping[s.name] = `images/spots/${s.name}.jpg`; continue; }
  const pool = POOL[s.type];
  if (!pool || !pool.length) { noPool.push(`${s.name}(${s.type})`); continue; }
  const i = (counter[s.type] = (counter[s.type] || 0)) % pool.length;
  counter[s.type]++;
  mapping[s.name] = `images/spots/sp/${pool[i]}.jpg`;
}
console.log(`分配完成：${Object.keys(mapping).length}/${SPOTS.length} 点有照片`);
if (noPool.length) console.log('无池可分配：' + noPool.join('、'));

// 校验实景文件存在
for (const n of SCENIC) { if (!fs.existsSync(path.join(ROOT, `images/spots/${n}.jpg`))) console.error('实景缺文件:', n); }

// 3. 重建 SPOT_CUSTOM_IMAGES 块
const lines = SPOTS.filter(s => mapping[s.name]).map(s => `  '${s.name}': '${mapping[s.name]}',`);
const block = `const SPOT_CUSTOM_IMAGES = {\n  // ↓↓↓ 自动核验后内嵌(实景优先+物种兜底) ↓↓↓\n${lines.join('\n')}\n  // ↑↑↑ 自定义图片粘贴区结束 ↑↑↑\n};`;
const h2 = h.replace(/const SPOT_CUSTOM_IMAGES = \{[\s\S]*?\n\s*\};/, block);
fs.writeFileSync(path.join(ROOT, 'index.html'), h2);
console.log('SPOT_CUSTOM_IMAGES 已重建，共', lines.length, '条');
