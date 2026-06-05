import fs from 'node:fs';import path from 'node:path';
const ROOT=path.resolve(import.meta.dirname,'..');const DIR=path.join(ROOT,'images/spots/scenic3');fs.mkdirSync(DIR,{recursive:true});
const UA={'User-Agent':'BaichengHuaxin/1.0 (https://github.com/ziyi125229/Baicheng-huaxin)'};const sleep=m=>new Promise(r=>setTimeout(r,m));
const T={
 '喀纳斯白桦':['Kanas','Kanas Lake','Hanas','Kanasi Xinjiang','喀纳斯'],
 '门源油菜花':['Menyuan','门源','Menyuan rapeseed','Qinghai rape flower field'],
 '伊犁杏花沟':['杏花沟','Xinyuan Xinjiang','Ili apricot','Yili apricot','吐尔根杏花'],
 '平谷桃花海':['平谷 桃花','Pinggu','Pinggu District Beijing','Beijing peach blossom festival'],
};
async function sc(q,want=6){const url=`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Csize%7Cmime&iiurlwidth=1280&origin=*`;const o=[];try{const r=await fetch(url,{headers:UA});if(!r.ok)return o;const p=(await r.json()).query?.pages;if(!p)return o;for(const x of Object.values(p).sort((a,b)=>(a.index||0)-(b.index||0))){const ii=x?.imageinfo?.[0];if(!ii?.thumburl||ii.mime==='image/svg+xml')continue;if(ii.size&&ii.size<12000)continue;o.push(ii.thumburl);if(o.length>=want)break;}}catch{}return o;}
async function dl(u,d){const r=await fetch(u,{headers:UA});if(!r.ok)throw 0;fs.writeFileSync(d,Buffer.from(await r.arrayBuffer()));}
for(const[s,qs]of Object.entries(T)){let n=0;const seen=new Set();for(const q of qs){if(n>=6)break;const us=await sc(q);for(const u of us){if(seen.has(u)||n>=6)continue;seen.add(u);try{await dl(u,path.join(DIR,`${s}-${n+1}.jpg`));n++;}catch{}await sleep(110);}await sleep(110);}console.log(`${s}: ${n} 张`);}
console.log('\n第三轮完成');
