/* 화면 / 입력 — 상태(S), 기록 전송(track), 이어하기(저장·복원), 언어 선택창, 그리기(render), 탭·버튼 처리. 맨 끝에서 저장된 판을 복원한 뒤 render()로 시작 */
/* 언어 검색용 국가 코드: lang.js의 LC와 lang2.js의 LC2를 합쳐서 사용 (언어코드 -> [ISO alpha-2, alpha-3, 숫자]). 언어를 추가할 때는 lang.js / lang2.js 쪽에 넣음 */
const LCODES=(typeof LC!=='undefined')?LC:{}; /* 국가 코드는 lang.js의 LC를 그대로 사용 */
if(typeof LC2!=='undefined')for(const k in LC2)LCODES[k]=[...new Set((LCODES[k]||[]).concat(LC2[k]))]; /* lang2.js가 이미 이어 붙였어도 중복 없이 */
const LRTL=['ar','he','fa','prs','ps','ug','yi','ckb','sd','ur','dv']; /* 오른쪽→왼쪽 언어: 안내 메시지·하단 카운트 방향 */
const LBRK=s=>s.replace(/([。།។။])\s*(?=\S)|([.।։።۔])\s+(?=\S)/g,(m,a,b)=>(a||b)+'<br>'); /* 문장 끝 부호: . 。 । ։ ። ། ។ ။ ۔  (공백 없이 이어지는 3.5 같은 숫자는 끊지 않도록 . । ։ ። ۔ 는 뒤에 공백이 있을 때만) */
const LPG=18; /* 한 페이지 개수: 기존 언어 18개가 1페이지, 추가 언어는 2페이지부터 */

const REC_URL='https://script.google.com/macros/s/AKfycbw_6H2IjYti4RM224PFnpQDknAGaF9g0Rjkel9GvOr---5WEJZzPMIOpIhhqGJShp1QqA/exec';
const REC_MIN_MS=20000;
const lab=i=>(C[i].r+1)+'-'+(C[i].c+1);
function track(){
 if(S.mode!=='play'||S.n0!==0||!S.t0||found().length<3||S.xs.size!==2)return;
 const X=[...S.xs].sort((a,b)=>a-b),Y=found().slice().sort((a,b)=>a-b);
 const line='x : '+X.map(lab).join(' ')+' y : '+Y.map(lab).join(' ');
 if(S.sent===line||Date.now()-S.t0<REC_MIN_MS)return;
 S.sent=line;
 const clicks=S.obs.filter(o=>'bhf'.includes(o.k)&&!o.manual).length-S.n0; /* 화면 하단 카운트와 같은 값 */
 const secs=Math.round((Date.now()-S.t0)/1000);
 const lang=String((L[S.lang]&&L[S.lang].lang)||S.lang).replace(/[\t\r\n]/g,' ');
 const body=line+'\t'+clicks+'\t'+secs+'\t'+lang;
 try{fetch(REC_URL,{method:'POST',mode:'no-cors',body:body,keepalive:true})}catch(e){}
}
 

function load(){
 try{const v=localStorage.getItem('dh_lang');if(v&&L[v])return v}catch(e){}
 const nl=String((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase(); /* 저장된 언어가 없으면 브라우저 언어로 시작: 전체 태그(zh-tw) → 앞부분(zh) 순서로 찾고, 없으면 영어 */
 for(const k of [nl,nl.split('-')[0]])if(k&&L[k])return k;
 return L.en?'en':'ko'}
function save(){try{localStorage.setItem('dh_lang',S.lang)}catch(e){}}
let S;
function init(){S={lang:S?S.lang:load(),ov:false,q:'',pg:0,sh:[],mode:'setup',tool:'x',xs:new Set(),hs:new Set(),bs:new Set(),os:new Set(),fs:new Set(),obs:[],n0:0,rec:null,sel:null,t0:0,sent:''}}
init();
function go(){if(!pend().length)hint()}

/* ===== 이어하기(저장·복원): 처음 설정(x·!·○·★)과 그 뒤의 착수·답변 기록을 저장하고, 복원하면 같은 순서로 다시 쌓음. 퍼센트는 복원 뒤에 다시 계산 ===== */
const SAVE_KEY='dh_game'; /* 저장 기한 없음: 끝난 판·처음부터 누른 판은 저장본이 자동으로 지워짐 */
const SAVE_V=2; /* 판 중간 저장 형식 버전: obs 구조를 바꾸는 수정을 하면 이 숫자를 올릴 것 (옛 저장본은 복원하지 않고 버려짐) */
function packObs(){ /* 처음 설정 이후의 착수 기록 저장용: obs끼리의 참조(fo, r)는 번호로 바꿔서 저장 */
 const ix=new Map(S.obs.map((o,k)=>[o,k]));
 return S.obs.slice(S.n0).map(o=>{const p={...o};
  if(o.fo)p.fo=ix.has(o.fo)?ix.get(o.fo):-1;
  if(o.k=='t'&&o.r)p.r=ix.has(o.r)?ix.get(o.r):-1;
  return p})}
function saveGame(){
 try{
  if(S.mode=='play'){
   if(found().length>=3){localStorage.removeItem(SAVE_KEY);return} /* 끝난 판은 이어하지 않음 */
   /* 처음 설정(x·!·○·★)과 그 뒤의 착수·답변 기록을 그대로 저장 → 복원하면 같은 순서로 다시 쌓여서 되돌리기도 가능 */
   localStorage.setItem(SAVE_KEY,JSON.stringify({v:SAVE_V,t:Date.now(),m:'play',x:[...S.xs],h:[...S.hs],b:[...S.bs],f:[...S.fs],o:packObs(),e:Date.now()-S.t0}))}
  else if(S.xs.size||S.hs.size||S.bs.size||S.fs.size)
   localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,t:Date.now(),m:'setup',x:[...S.xs],h:[...S.hs],b:[...S.bs],f:[...S.fs]}));
  else localStorage.removeItem(SAVE_KEY)
 }catch(e){}}
function restoreGame(){ /* 저장본이 있으면 S에 되살리고 true */
 try{
  const j=localStorage.getItem(SAVE_KEY);if(!j)return false;
  const d=JSON.parse(j);
  if(!d)return false;
  const ok=a=>Array.isArray(a)&&a.every(i=>Number.isInteger(i)&&i>=0&&i<42);
  if(!ok(d.x)||!ok(d.h)||!ok(d.b)||!ok(d.f)||d.f.length>3)return false;
  if(d.v===1&&d.m=='setup'){
   S.xs=new Set(d.x);S.hs=new Set(d.h);S.bs=new Set(d.b);S.fs=new Set(d.f);return true}
  if(d.v!==SAVE_V||d.m!=='play'||!Array.isArray(d.o))return false;
  const xs=new Set(d.x),hs=new Set(d.h),bs=new Set(d.b),fs=new Set(d.f);
  const F0=[...fs],base=F0.map(i=>({i,k:'f',F:[]})).concat([...hs].map(i=>({i,k:'h',F:F0}))); /* 처음 설정에서 만들어지는 기록: 훈수 시작 때와 같은 방식 */
  const all=base.concat(d.o.map(p=>({...p}))),n=all.length;
  for(let k=base.length;k<n;k++){const o=all[k];
   if(!o||typeof o.k!=='string'||o.k.length!==1||!'bhfrt'.includes(o.k)||!Number.isInteger(o.i)||o.i<0||o.i>=42)return false;
   if(o.k=='t'){if(!Number.isInteger(o.r)||o.r<0||o.r>=n||all[o.r].k!=='r')return false}
   else{if(!ok(o.F))return false;
    if(o.fo!=null&&!(Number.isInteger(o.fo)&&o.fo>=0&&o.fo<n))return false;
    if(o.q!==undefined&&!ok(o.q))return false}}
  for(let k=base.length;k<n;k++){const o=all[k]; /* 번호로 저장해 둔 참조를 다시 객체로 연결 */
   if(o.k=='t')o.r=all[o.r];else if(o.fo!=null)o.fo=all[o.fo]}
  S.xs=xs;S.hs=hs;S.bs=bs;S.fs=fs;S.os=new Set(bs);
  S.cl=C.map((_,i)=>i).filter(i=>!xs.has(i)&&!hs.has(i)&&!bs.has(i)&&!fs.has(i)); /* 처음 설정 때 안 열려 있던 칸 */
  S.obs=all;S.n0=base.length;S.mode='play';
  S.t0=Date.now()-(Number.isFinite(d.e)&&d.e>0?d.e:0); /* 닫혀 있던 시간은 빼고, 플레이한 시간만 이어서 셈 */
  return true
 }catch(e){return false}}
/* ===== /이어하기 ===== */


/* 언어 목록: 기본 순서(LG 묶음 순서 + 나머지). 검색어가 있으면 일치하는 언어를 맨 위로 */
function langList(){
 const used=new Set(LG.flat()),base=LG.flat().concat(Object.keys(L).filter(k=>!used.has(k))).filter(k=>L[k]);
 const q=S.q.trim().toUpperCase(),ql=S.q.trim().toLowerCase();
 if(!q)return base;
 const rk=k=>{const cs=(LCODES[k]||[]).map(c=>c.toUpperCase());
  if(cs.includes(q))return 0;
  if(q.length>=2&&cs.some(c=>c.startsWith(q)))return 1;
  if(L[k].lang.toLowerCase().includes(ql))return 2;
  return 9};
 return base.map((k,i)=>[rk(k),i,k]).filter(a=>a[0]<9).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(a=>a[2])}
function buildLg(){
 ov.innerHTML='<div class="lgl"><div class="lgh">Enter your country code to find your language.<br>e.g. Korean: KR or KOR</div><input id="lq" type="text" placeholder="KR / KOR" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"><div class="lgg" id="lgb"></div><div class="lpg"><button data-a="pg:-1" id="lpp">◀</button><span id="lpi"></span><button data-a="pg:1" id="lpn">▶</button></div></div>'}
function fillLg(){
 const a=langList(),P=Math.max(1,Math.ceil(a.length/LPG));
 S.pg=((S.pg%P)+P)%P; /* 순환: 1페이지에서 ◀ → 마지막, 마지막에서 ▶ → 1페이지 */
 document.getElementById('lgb').innerHTML=a.length?a.slice(S.pg*LPG,S.pg*LPG+LPG).map(k=>`<button data-a="L:${k}"${k==S.lang?' class="p"':''}>${L[k].lang}</button>`).join(''):'<div class="lgh" style="grid-column:1/-1">No match</div>';
 document.getElementById('lpi').textContent=(S.pg+1)+' / '+P}

/* 확률 → 표시 숫자: 진짜 확정일 때만 0·100, 나머지는 1~99로 표시 */
function pct(p){
 if(p>=.999999)return 100;
 if(p<=0)return 0;
 return Math.min(99,Math.max(1,Math.round(p*100)))}

function render(){
 const t=L[S.lang],play=S.mode=='play',A=play?analyze():null,PQ=play?pend():[];
 document.documentElement.lang=S.lang;
 ti.textContent=t.t;lg.textContent='🌐 '+t.lang;bh.textContent=t.hint;bu.textContent=t.undo;br.textContent=t.reset;
 const pm=A&&A.N?Math.max(...A.p,.01):1;let g='';const CF=(play&&S.imp)?S.imp.cells:(A&&!A.N&&!S.sure)?conflict():[];
 C.forEach((q,i)=>{
  const cx=q.x*40+20,cy=q.r*34.64+23,s=st=state(i),sw=17.6,w=15.2; /* 칸 사이 틈 (게임 화면처럼) */
  /* 게임 화면과 같은 규칙: 아직 안 연 칸 = 주황 테두리 + 점무늬 금색 빛(처음엔 전부 이 모양), 열린 빈칸·!·✕ = 어두운 칸, 당첨 = 밝은 금색 + 검은 별 */
  let F='url(#gO)',K='#f0961c',KW=2,tx='',tc='#2a1a00',to=1,fs=14,dot=1;
  if(s=='x'){F='url(#gC)';K='#4a4a52';KW=1.2;dot=0;tx='✕';tc='#8a8a90';fs=11}
  else if(s=='o'){F='url(#gC)';K='#4a4a52';KW=1.2;dot=0}
  else if(s=='h'){F='url(#gC)';K='#4a4a52';KW=1.2;dot=0;tx='!';tc='#f7c23a';fs=21}
  else if(s=='f'){F='url(#gF)';K='#ffd25a';KW=2.2;tx='★';tc='#1a1300';fs=17}
  else if(A&&A.N){tx=pct(A.p[i]);tc='#fff'} /* 확률 숫자: 흰 굵은 글씨 + 검은 외곽선 */
  const pts=[[0,-sw],[w,-sw/2],[w,sw/2],[0,sw],[-w,sw/2],[-w,-sw/2]].map(p=>(cx+p[0]).toFixed(1)+','+(cy+p[1]).toFixed(1)).join(' ');
  g+=`<polygon data-i="${i}" class="${S.rec===i?'rec':''}" points="${pts}" fill="${F}" stroke="${K}" stroke-width="${KW}"${CF.includes(i)?' style="stroke:#ef4444;stroke-width:3.5"':''}/>`;
  if(dot)g+=`<polygon points="${pts}" fill="url(#pD)" pointer-events="none"/>`;
  const ring=S.sel===i||PQ[0]===i?1.6:S.rec===i?2.4:0; /* 선택·추천: 게임처럼 바깥에 흰 테두리 (추천 칸은 조금 더 진하게) */
  if(ring)g+=`<polygon points="${[[0,-sw],[w,-sw/2],[w,sw/2],[0,sw],[-w,sw/2],[-w,-sw/2]].map(p=>(cx+p[0]*1.17).toFixed(1)+','+(cy+p[1]*1.17).toFixed(1)).join(' ')}" fill="none" stroke="#fff" stroke-width="${ring}" pointer-events="none"/>`;
  if(tx!=='')g+=`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${s=='c'?10:fs}" font-weight="${s=='h'||s=='c'?900:700}" fill="${tc}" fill-opacity="${to}"${s=='c'?' stroke="#000" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"':''} pointer-events="none">${tx}</text>`});
 bd.innerHTML='<defs>'+
  '<radialGradient id="gC" cx=".5" cy=".55" r=".62"><stop offset="0" stop-color="#0f0f11"/><stop offset=".55" stop-color="#151518"/><stop offset=".85" stop-color="#1f1f23"/><stop offset="1" stop-color="#2a2a2f"/></radialGradient>'+
  '<radialGradient id="gO"><stop offset="0" stop-color="#e4d8a4"/><stop offset=".45" stop-color="#c9b273"/><stop offset=".78" stop-color="#9a6c20"/><stop offset="1" stop-color="#c47612"/></radialGradient>'+
  '<radialGradient id="gF"><stop offset="0" stop-color="#fff0a8"/><stop offset=".55" stop-color="#ffc63a"/><stop offset="1" stop-color="#e0901a"/></radialGradient>'+
  '<pattern id="pD" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.2" r=".45" fill="#5a3a08" fill-opacity=".28"/></pattern>'+
  '</defs><rect x="1" y="1" width="358" height="184" rx="14" fill="#141416" stroke="#2a2a2e"/>'+g;
 let m;
 const nt='';
 if(!play)m=LBRK(t.tip0)+`<div class="st">${(t.st||L.en.st).replace(/([.。।։።།។။۔])\s*/,'$1<br>')}</div>`;
 else if(S.busy)m=t.calc;
 else if(PQ.length)m=`<b>${LB(t,PQ[0])}</b> — ${t.qn||L.en.qn}<div class="row eq"><button data-a="Q:b">${t.b}</button><button class="p" data-a="Q:h">${t.h}</button></div>`+oops(t);
 else if(S.imp)m=F(t[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]]||L.en[{many:'need4',noplace:'nopl',fin3:'fin3'}[S.imp.k]],{n:S.imp.n})+(CF.length?`<div class="nt2">${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'');
 else if(found().length==3)m=t.done+oops(t);
 else if(S.sel!=null){
  const oc=outcomes(S.sel),can=k=>!oc||oc.has(k); /* 남은 후보에서 나올 수 없는 결과(빈칸/느낌표/당첨) 버튼은 숨김 */
  m=`<b>${LB(t,S.sel)}</b> — ?<div class="row eq">${can('b')?`<button data-a="b">${t.b}</button>`:''}${can('h')?`<button data-a="h">${t.h}</button>`:''}${can('f')?`<button class="p" data-a="f">${t.f}</button>`:''}<button data-a="cancel">✕</button></div>`}
 else if(A.N==0&&!S.fb)m=LBRK(t.bad)+(CF.length?`<div class="nt2">${t.badc||L.en.badc}: ${CF.map(i=>LB(t,i)).join(' · ')}</div>`:'')+nt;
 else if(S.rec!=null&&S.rec>=0){m=F(t.rec,{c:LB(t,S.rec),p:S.fb?pct(S.fbp):pct(A.p[S.rec])})+(S.fb&&!S.sure?`<div class="nt">${t.fbn||L.en.fbn}${CF.length?': '+CF.map(i=>LB(t,i)).join(' · '):''}</div>`:'')+oops(t)+nt+(nt?'':`<div class="nt2">${LBRK(t.tip1.replace(/^[^.。।։።།។။۔]*[.。।։።།។။۔]\s*/,''))}</div>`)}
 else m=LBRK(t.tip1)+nt;
 msg.innerHTML=m;msg.dir=cn.dir=LRTL.includes(S.lang)?'rtl':'ltr';
 cn.textContent=play?F(t.n,{a:clicks(),b:found().length}):'';
 tl.hidden=play;
 if(!play)tl.innerHTML=['x','h','b','f'].map(k=>`<button data-a="T:${k}"${S.tool==k?' class="p"':''}>${k=='x'?'✕':k=='h'?'!':k=='b'?'○ '+t.b:'★ '+t.f}</button>`).join('');
 ov.hidden=!S.ov;
 if(!S.ov)ov.innerHTML='';
 else{if(!ov.firstChild)buildLg();fillLg()}
 saveGame();
}

function tap(i){
 if(S.mode=='play'&&pend().length)return;
 if(S.mode=='play'&&S.fb&&i===S.rec){S.sel=i;return}
 if(S.mode=='setup'){
  const tl=S.tool,M={x:S.xs,h:S.hs,b:S.bs,f:S.fs},has=M[tl].has(i);
  if(tl=='f'&&!has&&S.fs.size>=3)return;
  S.sh.push([[...S.xs],[...S.hs],[...S.bs],[...S.fs]]);
  S.xs.delete(i);S.hs.delete(i);S.bs.delete(i);S.fs.delete(i);
  if(!has)M[tl].add(i);
 }else{const s=state(i);
  if((s=='o'||s=='h')&&lastR(i)){S.obs.push({i,k:'t',r:lastR(i)});S.rec=null}
  else if(s=='o'&&!S.obs.some(o=>o.i==i)){S.obs.push({i,k:'h',F:found(),manual:true});S.rec=null}
  else if(s=='h'&&S.obs.some(o=>o.i==i&&o.manual)){
   S.obs=S.obs.filter(o=>!(o.i==i&&(o.manual||o.k=='r'))&&!(o.k=='t'&&o.r&&o.r.i==i));S.rec=null}
  else if(s=='c'){
   if(found().length>=3)return; /* 당첨 3개를 다 찾은 뒤에는 빈 칸 탭을 무시 (클릭 수가 늘어나지 않게) */
   const oc=outcome(i); /* 남은 후보 전부에서 결과가 같으면(당첨 100% / 느낌표 확정 / 빈칸 확정) 묻지 않고 바로 입력 */
   if(oc){addObs(i,oc);S.rec=null;S.sel=null}
   else S.sel=i}}}

function autoFinish(){ /* 남은 당첨이 전부 100% 확정이면 자동으로 당첨 처리하고 완료(클릭 수에도 반영) */
 if(S.mode!=='play')return;
 for(let g=0;g<3;g++){
  if(pend().length)return;
  const k=3-found().length;if(k<1)return;
  const A=analyze();if(!A.N)return;
  const sure=[];for(let x=0;x<42;x++)if(A.p[x]>=.999999)sure.push(x);
  if(sure.length!==k)return; /* 100% 칸 수 = 남은 당첨 수 일 때만 */
  addObs(sure[0],'f')}}

function hint(){S.sel=null;S.rec=null;S.fb=false;S.sure=false;S.imp=null;S.busy=true;setTimeout(()=>{
 let wait=false;
 try{autoFinish();S.rec=openRec();
  if(S.rec==null&&found().length<3&&cands().length&&sureRec()<0){wait=true;
   /* 롤아웃 추천은 웹 워커에서 계산(화면이 멈추지 않게). 가중치(PF)를 넣어 계산 */
   rollRecAsync(typeof PF!=='undefined'?PF:null).then(r=>{S.rec=r}).catch(e=>{console.error(e);S.rec=deepRec()})
    .then(()=>{S.busy=false;render();track()})}
  else{if(S.rec==null)S.rec=deepRec();
  if(found().length>=3){if(!cands().length)S.imp={k:'fin3',cells:visH()}}
  else if(S.rec<0&&!cands().length){S.imp=impossible();const f=S.imp?null:fallback();if(f){S.rec=f.i;S.fb=true;S.fbp=f.p;S.sure=!!f.sure}}
  }}
 catch(e){console.error(e);S.rec=-1;wait=false} /* 계산 시작 중 예외가 나면 대기 상태를 풀어서 "계산 중"에서 멈추지 않게 함 */
 if(!wait){S.busy=false;render();track()}},40)}
function act(a){
 if(a=='lang'){S.ov=true;S.q='';S.pg=0;ov.innerHTML=''}
 else if(a=='ovx')S.ov=false;
 else if(a.startsWith('pg:'))S.pg+=+a.slice(3);
 else if(a.startsWith('T:'))S.tool=a.slice(2);
 else if(a.startsWith('L:')){S.lang=a.slice(2);S.ov=false;save()}
 else if(a=='hint'){
  if(S.mode=='play'&&pend().length)return;
  if(S.mode=='setup'){S.cl=C.map((_,i)=>i).filter(i=>state(i)=='c');const F0=[...S.fs];S.os=new Set(S.bs);S.obs=F0.map(i=>({i,k:'f',F:[]})).concat([...S.hs].map(i=>({i,k:'h',F:F0})));S.n0=S.obs.length;S.mode='play';S.t0=Date.now()}
  hint()}
 else if(a=='undo'){
  let again=false; /* 첫 설정 이후(훈수 모드)에서 한 수를 되돌린 경우에만 훈수를 자동으로 다시 계산 */
  if(S.mode=='play'){if(S.obs.length>S.n0){undoObs();again=true}else{S.obs=[];S.mode='setup'}}
  else if(S.sh.length){const p=S.sh.pop();S.xs=new Set(p[0]);S.hs=new Set(p[1]);S.bs=new Set(p[2]);S.fs=new Set(p[3])}
  S.rec=null;S.sel=null;S.imp=null;
  if(again)go()} /* 되돌린 뒤 ! 질문이 남아 있으면 go()가 훈수를 건너뛰고 질문을 먼저 보여줌 */
 else if(a=='reset'){const l=S.lang;init();S.lang=l}
 else if(a=='cancel')S.sel=null;
 else if(a.startsWith('Q:')){answer(a=='Q:h');go()}
 else if('bhf'.includes(a)&&S.sel!=null){addObs(S.sel,a);S.sel=null;S.rec=null;go()}}
document.onclick=e=>{const el=e.target.closest('[data-a],[data-i]');if(!el)return;if(S.busy)return; /* 계산 중에는 입력을 받지 않음 */
 if(el.id=='ov'&&e.target!==el)return; /* 오버레이 안쪽(입력창·빈 공간) 클릭은 닫지 않음, 어두운 배경만 닫기 */
 if(el.dataset.i!==undefined){const n=S.obs.length;tap(+el.dataset.i);if(S.mode=='play'&&S.obs.length!=n)go()}else act(el.dataset.a);render();track()};
document.addEventListener('input',e=>{if(e.target.id=='lq'){S.q=e.target.value;S.pg=0;fillLg()}});
function boot(){ /* 저장된 판이 있으면 이어서 시작 (! 질문이 남아 있으면 질문부터). 저장본 때문에 시작이 실패하면 저장본을 버리고 새로 시작 */
 try{restoreGame();render();if(S.mode=='play')go()}
 catch(e){console.error(e);try{localStorage.removeItem(SAVE_KEY)}catch(_){}const l=S.lang;init();S.lang=l;render()}}
boot();
