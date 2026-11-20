// master.sh 출력 필터: node logtee.js <로그 파일> [tty]
//   모든 줄을 로그 파일에 남김.
//   tty(터미널)이면: "○○ 진행중"과 "N% 완료 ..." 줄은 맨 아래 한 줄("○○ 진행중 · N% 완료 ...")을 \r로 덮어쓰고,
//   나머지 줄(단계 완료, 실패, 요약 등)은 그 위에 새 줄로 찍은 뒤 진행 줄을 다시 그림. 100%가 되면 진행 줄을 새 줄로 확정.
//   tty가 아니면 받은 그대로 출력.
const fs=require('fs');
const log=fs.openSync(process.argv[2],'a'),TTY=process.argv[3]==='tty',W=s=>process.stdout.write(s);
let buf='',stage='',pct='',drawn=false;
const status=()=>[stage,pct].filter(Boolean).join(' · ');
const draw=()=>{const s=status();if(s){W('\r\x1b[K'+s);drawn=true}};
const clear=()=>{if(drawn){W('\r\x1b[K');drawn=false}};
function line(l){fs.writeSync(log,l+'\n');
 if(!TTY){W(l+'\n');return}
 if(/^===== master\.sh 시작/.test(l)){stage='';pct=''}
 if(/ 진행중$/.test(l)){stage=l;draw();return}
 if(/^\d+% 완료/.test(l)){pct=l;if(/^100%/.test(l)){draw();W('\n');drawn=false;stage='';pct=''}else draw();return}
 clear();W(l+'\n');
 if(/ 완료$/.test(l)&&stage&&l.replace(/ 완료$/,'')===stage.replace(/ 진행중$/,''))stage='';
 draw()}
process.stdin.setEncoding('utf8');
process.stdin.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){line(buf.slice(0,i).replace(/\r$/,''));buf=buf.slice(i+1)}});
process.stdin.on('end',()=>{if(buf)line(buf);if(drawn)W('\n')});
