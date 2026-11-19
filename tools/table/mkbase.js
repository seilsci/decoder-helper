// node mkbase.js <출력.json> [작업 폴더, 기본 이 폴더] — 이번 계산 결과(=tables.js에 넣은 표)를 비교 기준선으로 저장. 머지한 뒤 baseline.json으로 바꿔 둠
const build=require('./ovmap.js'),fs=require('fs');const B={};
for(const x of [9,10,11,12,13,15,18,19,20])B[x]=[...build(process.argv[3]||__dirname,x)];
fs.writeFileSync(process.argv[2],JSON.stringify(B));console.log('ok',Object.values(B).map(v=>v.length).join(' '));
