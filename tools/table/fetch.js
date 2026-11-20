// node fetch.js — 스프레드시트에서 판 기록을 받아 records.new.txt로 저장하고 지금 records.txt와 비교
//   data 탭(gid=0) A열 A1부터(제목줄 없음) = 판 기록, prior 탭(gid=2044780455) I3 = 판 수
//   받은 줄 수가 I3와 다르면 아무것도 쓰지 않고 종료 코드 2
//   형식이 틀린 줄이 있으면 종료 코드 3
const fs=require('fs'),path=require('path');
const SHEET='https://docs.google.com/spreadsheets/d/1eHx7hT_A2hCRJ-aAVIDxFmBiARpaSkEgEOQI3dbpJDc/export?format=csv&gid=';
const OUT=path.join(__dirname,'records.new.txt'),CUR=path.join(__dirname,'records.txt');
// CSV 한 덩어리 → 행 배열(따옴표 안의 쉼표·줄바꿈 처리)
function csv(t){const rows=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch=='"'){if(t[i+1]=='"'){f+='"';i++}else q=false}else f+=ch}
  else if(ch=='"')q=true;else if(ch==','){row.push(f);f=''}else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;row.push(f);rows.push(row);row=[];f=''}else f+=ch}
 if(f!==''||row.length){row.push(f);rows.push(row)}return rows}
async function get(gid){for(let a=1;;a++){try{const r=await fetch(SHEET+gid,{redirect:'follow'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text()}
 catch(e){if(a>=3)throw new Error('시트 받기 실패(gid='+gid+'): '+e.message);await new Promise(r=>setTimeout(r,2000*a))}}}
(async()=>{
 const [data,prior]=await Promise.all([get(0),get(2044780455)]);
 const A=csv(data).map(r=>(r[0]||'').trim());while(A.length&&!A[A.length-1])A.pop();
 const empty=A.map((l,i)=>l?0:i+1).filter(Boolean);if(empty.length){console.error('A열 중간에 빈 칸: '+empty.slice(0,10).join(', ')+'행');process.exit(3)}
 const I3=+((csv(prior)[2]||[])[8]||'').trim();
 console.log('시트 판 수: A열 '+A.length+'줄, prior!I3 = '+(I3||'(비어 있음)'));
 if(A.length!==I3){console.error('판 수가 다릅니다 (A열 '+A.length+' ≠ I3 '+I3+'). 시트를 확인하세요. records.txt는 그대로 둡니다.');process.exit(2)}
 const RE=/^x\s*:\s*\d-\d\s+\d-\d\s+y\s*:\s*\d-\d\s+\d-\d\s+\d-\d$/,bad=A.map((l,i)=>RE.test(l)?0:i+1).filter(Boolean);
 if(bad.length){console.error('형식이 틀린 줄: '+bad.slice(0,10).map(i=>i+'행 "'+A[i-1]+'"').join(', '));process.exit(3)}
 fs.writeFileSync(OUT,A.join('\n')+'\n');
 const old=fs.existsSync(CUR)?fs.readFileSync(CUR,'utf8').split('\n').map(l=>l.trim()).filter(Boolean):[];
 let same=0;while(same<old.length&&same<A.length&&old[same]===A[same])same++;
 if(same===old.length&&same===A.length)console.log('지금 records.txt와 같음 ('+A.length+'판)');
 else if(same===old.length)console.log('지금 records.txt '+old.length+'판 → '+A.length+'판 (뒤에 '+(A.length-old.length)+'판 추가)\n'+A.slice(same).map(l=>'  + '+l).join('\n'));
 else console.log('주의: 기존 기록이 바뀜 — '+(same+1)+'번째 줄부터 다름 (지금 '+old.length+'판 → '+A.length+'판)\n  지금: '+(old[same]||'(없음)')+'\n  시트: '+(A[same]||'(없음)'));
})().catch(e=>{console.error(e.message);process.exit(1)});
