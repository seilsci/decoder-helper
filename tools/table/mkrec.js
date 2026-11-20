// node mkrec.js — records.txt로 검증용 파일을 다시 만듦
//   verify/records.json : R(판별 ✕·당첨 칸), cnt(칸별 당첨 횟수), ex(칸별 노출 판 수), xw(9쌍별 판 수, simx·ui_plain의 ✕ 뽑기 비율)
//   verify/kibo.txt     : records.txt 각 줄 끝에 "\t0"(사용자 클릭 수 자리)을 붙인 것 (kiboV.js 기본 입력)
const fs=require('fs'),path=require('path');
const R=[8,9,8,9,8],ST=[0,8,17,25,34],idx=s=>{const[r,c]=s.split('-').map(Number);if(!(r>=1&&r<=5&&c>=1&&c<=R[r-1]))throw new Error('칸 '+s);return ST[r-1]+c-1};
const PAIRS=[9,10,11,12,13,15,18,19,20];
const L=fs.readFileSync(path.join(__dirname,'records.txt'),'utf8').split('\n').map(l=>l.trim()).filter(Boolean);
const out={R:[],cnt:Array(42).fill(0),ex:Array(42).fill(0),xw:PAIRS.map(()=>0)};
L.forEach((l,n)=>{const m=l.match(/x\s*:\s*(\S+)\s+(\S+)\s+y\s*:\s*(\S+)\s+(\S+)\s+(\S+)/);if(!m)throw new Error((n+1)+'번째 줄 형식: '+l);
 const x=[idx(m[1]),idx(m[2])].sort((a,b)=>a-b),y=[idx(m[3]),idx(m[4]),idx(m[5])].sort((a,b)=>a-b);
 const k=PAIRS.indexOf(x[0]);if(k<0||x[0]+x[1]!==41)throw new Error((n+1)+'번째 줄: ✕ 쌍 '+x);
 out.R.push({x,y});out.xw[k]++;for(let i=0;i<42;i++)if(!x.includes(i))out.ex[i]++;for(const i of y)out.cnt[i]++});
const V=path.join(__dirname,'verify');
fs.writeFileSync(path.join(V,'records.json'),JSON.stringify(out));
fs.writeFileSync(path.join(V,'kibo.txt'),L.map(l=>l+'\t0').join('\n')+'\n');
console.log('verify/records.json, verify/kibo.txt: '+L.length+'판, 쌍별 '+out.xw.join(','));
