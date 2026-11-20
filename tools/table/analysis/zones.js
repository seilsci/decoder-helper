// 1b·1d 보충: 가로 방향 퍼짐 특징 변형 비교 (기준 = 현재 모델) — node zones.js [records.txt]
const H=require('./hyp.js');const{F,BASE,C,G,T}=H;
const X=i=>C[i].x;
for(const b of[2,2.25,2.75,3,3.25]){const z=i=>X(i)<b?0:X(i)>8-b?2:1;F['z3_'+b]=t=>new Set(t.map(z)).size==3?1:0}
F.xspan=t=>Math.max(...t.map(X))-Math.min(...t.map(X));
F.minDx=t=>Math.min(Math.abs(X(t[0])-X(t[1])),Math.abs(X(t[0])-X(t[2])),Math.abs(X(t[1])-X(t[2])));
F.sameCol=t=>{const xs=t.map(X);return(xs[0]==xs[1])+(xs[0]==xs[2])+(xs[1]==xs[2])}; // 같은 x(세로 같은 열) 쌍 수
F.closeX=t=>{const xs=t.map(X);let s=0;for(const[a,b]of[[0,1],[0,2],[1,2]])if(Math.abs(xs[a]-xs[b])<=1)s++;return s}; // x 차이 1 이하 쌍 수
const baseM={names:BASE},cb=H.cv(baseM),TB=H.table(BASE),par=H.fit(G,baseM,TB);
const out={};
for(const f of['z3_2','z3_2.25','z3_2.75','z3_3','z3_3.25','xspan','minDx','sameCol','closeX']){const mm={names:[...BASE,f]};const c=H.cv(mm);const p2=H.fit(G,mm,H.table(mm.names));
 out[f]={stat:H.expect(F[f],par,baseM,TB).map(v=>+v.toFixed(3)),cv:+(c-cb).toFixed(2),coef:+Math.exp(p2.th[4]).toFixed(3)};console.error(f,out[f].cv)}
// 같이 넣기
for(const set of[['zone3','closeX'],['zone3','tb1','quad3'],['closeX','tb1']]){const mm={names:[...BASE,...set]};out[set.join('+')]={cv:+(H.cv(mm)-cb).toFixed(2)};console.error(set.join('+'),out[set.join('+')].cv)}
console.log(JSON.stringify(out,null,1));
