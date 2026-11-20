// Claude Code 상태 줄: master.log의 지금 단계와 마지막 진행 줄을 한 줄로 ("OPEN 3 진행중 · 34% 완료 (남은시간 : 예상 59분)")
//   파이프라인이 안 돌면 아무것도 출력하지 않음
//   도는지 판단: master.pid(master.sh가 씀)의 프로세스가 살아 있으면 돔.
//   master.pid가 없으면(이전 버전 master.sh) 마지막 실행에 끝 표시가 없고 로그가 30분 안에 바뀌었으면 도는 것으로 봄
const fs=require('fs'),path=require('path');
const LOG=path.join(__dirname,'master.log'),PID=path.join(__dirname,'master.pid');
process.stdin.resume();process.stdin.on('data',()=>{});process.stdin.on('end',main);setTimeout(main,300); // stdin(세션 JSON)은 쓰지 않음
let shown=false;
function main(){if(shown)return;shown=true;try{out()}catch(e){}process.exit(0)}
function alive(pid){try{process.kill(pid,0);return true}catch(e){return e.code==='EPERM'}}
function out(){
 if(!fs.existsSync(LOG))return;
 const st=fs.statSync(LOG),n=Math.min(st.size,65536),buf=Buffer.alloc(n),fd=fs.openSync(LOG,'r');fs.readSync(fd,buf,0,n,st.size-n);fs.closeSync(fd);
 let L=buf.toString('utf8').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 const s=L.map(l=>l.startsWith('===== master.sh 시작')).lastIndexOf(true);if(s<0)return;L=L.slice(s+1);
 let run;
 if(fs.existsSync(PID)){const pid=+fs.readFileSync(PID,'utf8').trim();run=pid>0&&alive(pid)}
 else run=!L.some(l=>/^MASTER_DONE$|^멈춤|실패 —|머지·push 완료|취소했습니다/.test(l))&&Date.now()-st.mtimeMs<30*60e3;
 if(!run)return;
 const stage=[...L].reverse().find(l=>/ 진행중$/.test(l)),pct=[...L].reverse().find(l=>/^\d+% 완료/.test(l));
 const t=[stage,pct].filter(Boolean).join(' · ');if(t)process.stdout.write(t);
}
