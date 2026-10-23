import {current,budget,neighborhood,physical,ghost,owner,tierOf,xyz,group,playTurn} from './engine.mjs';
function seeds(s,limit=70){
 const adj=neighborhood(s.config),color=current(s).side,map=new Map(),middle=(s.config.size-1)/2;
 for(let i=0;i<s.board.length;i++)if(s.board[i])for(const j of adj[i])if(!s.board[j]||ghost(s.board[j])){let value=map.get(j)||0;value+=owner(s.board[i])===color?2:3;map.set(j,value);}
 if(!map.size){for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const n=s.config.size,i=(middle+x)+n*((middle+y)+n*(middle+z));if(!s.board[i])map.set(i,5-Math.abs(x)-Math.abs(y)-Math.abs(z));}}
 // Tactical liberties outrank geometric preferences.
 const checked=new Set();for(let i=0;i<s.board.length;i++)if(physical(s.board[i])&&!checked.has(i)){const g=group(s.board,i,s.config);g.stones.forEach(j=>checked.add(j));if(g.liberties.size<=4)for(const j of g.liberties)map.set(j,(map.get(j)||0)+60/(g.liberties.size||1)+g.stones.length*3);}
 if(map.size<limit)for(let k=0;k<limit;k++){const i=Math.floor((k+.5)*s.board.length/limit);if(!s.board[i])map.set(i,0);}
 return [...map].sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([i])=>i);
}
function evaluate(s,color){
 let value=(s.captures[color]||0)*20-s.captures.reduce((a,v,i)=>a+(i!==color?v*20:0),0),checked=new Set();
 for(let i=0;i<s.board.length;i++){const v=s.board[i];if(physical(v)){const sign=owner(v)===color?1:-1;value+=sign*(2+tierOf(v)*1.1);if(!checked.has(i)){const g=group(s.board,i,s.config);g.stones.forEach(j=>checked.add(j));value+=sign*(Math.min(12,g.liberties.size)*.4-(g.liberties.size<3?(3-g.liberties.size)*g.stones.length*6:0));}}else if(ghost(v))value+=owner(v)===color?.25:-.25;}
 if(s.phase==='ended')value+=s.result?.winner===color?100000:-100000;return value;
}
function variants(s,i){const a=[{i,kind:'stone'}];if(s.config.tier)for(let t=1;t<=3;t++)if(t+1<=budget(s))a.push({i,kind:'tier',tier:t});if(s.config.ghost&&!s.board[i])a.push({i,kind:'ghost'});if(s.config.obstacle)a.push({i,kind:'obstacle'});if(s.config.coin)a.push({i,kind:'coin'});return a;}
function candidates(s,end,limit,random=0){
 const color=current(s).side,roots=seeds(s,limit),adj=neighborhood(s.config),all=[],seen=new Set();let beam=[];
 const consider=ps=>{if(performance.now()>end)return;const key=ps.map(p=>`${p.i}:${p.kind}:${p.tier||0}`).join('|');if(seen.has(key))return;seen.add(key);try{const next=playTurn(s,ps),v=evaluate(next,color)+Math.random()*random;const c={ps,state:next,v};all.push(c);return c;}catch{return null;}};
 for(const i of roots)for(const p of variants(s,i)){const c=consider([p]);if(c)beam.push(c);}
 beam.sort((a,b)=>b.v-a.v);beam=beam.slice(0,8);
 if(s.config.omino)for(let depth=1;depth<budget(s)&&performance.now()<end;depth++){
  const expanded=[];for(const c of beam){if(c.state.phase==='ended')continue;const used=c.ps.reduce((n,p)=>n+(p.kind==='tier'?p.tier+1:1),0);if(used>=budget(s))continue;const solid=c.ps.filter(p=>['stone','tier'].includes(p.kind));if(!solid.length)continue;const nextPoints=new Set();for(const p of solid)for(const j of adj[p.i])if(!c.state.board[j]&&!c.ps.some(p=>p.i===j))nextPoints.add(j);
   const ranked=[...nextPoints].sort((a,b)=>adj[b].filter(i=>physical(s.board[i])).length-adj[a].filter(i=>physical(s.board[i])).length).slice(0,12);
   for(const i of ranked){const d=consider([...c.ps,{i,kind:'stone'}]);if(d)expanded.push(d);}
  }expanded.sort((a,b)=>b.v-a.v);beam=expanded.slice(0,6);
 }
 all.sort((a,b)=>b.v-a.v);return all;
}
export function chooseMove(s,{difficulty=s.config.difficulty,timeMs,onProgress=()=>{}}={}){
 const duration=timeMs||({easy:300,normal:1300,hard:6500}[difficulty]||1300),start=performance.now(),end=start+duration,color=current(s).side;
 const list=candidates(s,start+duration*(difficulty==='hard'?.45:1),difficulty==='easy'?18:60,difficulty==='easy'?12:0);
 if(!list.length)return [];if(difficulty==='easy')return list[Math.floor(Math.random()*Math.min(5,list.length))].ps;
 let best=list[0];if(difficulty==='hard'){
  let bestValue=-Infinity;const top=list.slice(0,10);for(let k=0;k<top.length&&performance.now()<end;k++){const c=top[k];let v=c.v;if(c.state.phase!=='ended'){const replies=candidates(c.state,Math.min(end,performance.now()+Math.max(100,(end-performance.now())/(top.length-k))),22);if(replies.length)v=evaluate(replies[0].state,color);}
   if(v>bestValue){bestValue=v;best=c;}onProgress({percent:Math.round(45+50*(k+1)/top.length),nodes:list.length});
  }
 }
 // Avoid filling the board forever after an opponent passes with no useful gain.
 if(s.passes&&best.v<=evaluate(s,color)+.1)return [];return best.ps;
}
