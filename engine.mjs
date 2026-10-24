// Pure deterministic game rules. No DOM, network, or external dependencies.
export const DEFAULTS={size:9,diagonals:true,omino:true,borderless:true,ghost:true,obstacle:true,tier:true,coin:false,stoical:false,firstCapture:false,scoring:'counting',winTarget:0,komi:0,mode:'ai',difficulty:'normal',human:1,players:2,teams:2,schedule:'interleaved',clock:'none',minutes:15,increment:5,periods:5,periodSeconds:30,handicaps:[0,0],coinCount:0,coinStyle:'silver'};
export const COLORS=['','#b58aff','#f4f7ff','#ffe36c','#72f5ad','#60a5ff','#5ce6e6','#ffad68','#f37fce'];
export const NAMES=['','Black','White','Yellow','Green','Blue','Cyan','Orange','Magenta'];
export const physical=c=>c>=10&&c<90;
export const owner=c=>physical(c)?Math.floor(c/10):c>=101&&c<=108?c-100:0;
export const tierOf=c=>physical(c)?c%10:0;
export const ghost=c=>c>=101&&c<=108;
export const xyz=(i,n)=>[i%n,Math.floor(i/n)%n,Math.floor(i/(n*n))];
export const index=(x,y,z,n)=>x+n*(y+n*z);
export const coord=(i,n)=>{const [x,y,z]=xyz(i,n);return `${String.fromCharCode(65+x)}${y+1} · ${z+1}`;};
const cache=new Map();
export function neighborhood(c){
 const key=[c.size,!!c.diagonals,!!c.borderless].join(':');if(cache.has(key))return cache.get(key);
 const n=c.size,offsets=[];
 for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if((x||y||z)&&(c.diagonals||Math.abs(x)+Math.abs(y)+Math.abs(z)===1))offsets.push([x,y,z]);
 const map=Array.from({length:n**3},(_,i)=>{const [x,y,z]=xyz(i,n),result=[];for(const [dx,dy,dz] of offsets){let a=x+dx,b=y+dy,d=z+dz;if(c.borderless){a=(a+n)%n;b=(b+n)%n;d=(d+n)%n;}if(a>=0&&a<n&&b>=0&&b<n&&d>=0&&d<n)result.push(index(a,b,d,n));}return result;});
 cache.set(key,map);return map;
}
export function sides(c){return c.mode==='ffa'?c.players:c.mode==='rengo'?c.teams:2;}
export function turnOrder(c){
 if(c.mode!=='rengo')return Array.from({length:sides(c)},(_,i)=>({side:i+1,seat:i+1}));
 const teams=Array.from({length:c.teams},()=>[]);for(let i=0;i<c.players;i++)teams[i%c.teams].push({side:i%c.teams+1,seat:i+1});
 if(c.schedule==='blocks')return teams.flat();const result=[];for(let k=0;k<Math.ceil(c.players/c.teams);k++)for(const t of teams)if(t[k])result.push(t[k]);return result;
}
export function normalize(input={}){
 const c={...DEFAULTS,...input};if(![3,5,9,13,17,19].includes(+c.size))throw Error('Choose a 3, 5, 9, 13, 17, or 19 cube.');c.size=+c.size;
 c.winTarget=+c.winTarget;if(![0,25,50,75,100].includes(c.winTarget))throw Error('Choose no score target, 25, 50, 75, or 100 points.');
 if(!['ai','local','ffa','rengo'].includes(c.mode))throw Error('Unknown game mode.');
 if(!['easy','normal','hard'].includes(c.difficulty))throw Error('Unknown AI difficulty.');
 if(!['interleaved','blocks'].includes(c.schedule))throw Error('Unknown team order.');
 if(!['silver','dime'].includes(c.coinStyle))throw Error('Unknown coin style.');
 c.players=Math.max(2,Math.min(8,Math.trunc(+c.players)||2));c.teams=Math.max(2,Math.min(c.players,Math.trunc(+c.teams)||2));
 if(!c.omino)c.tier=false;if(c.omino)c.komi=0;c.komi=Math.max(-100,Math.min(100,+c.komi||0));
 c.minutes=Math.max(1,Math.min(240,+c.minutes||15));c.increment=Math.max(0,Math.min(120,+c.increment||0));c.periods=Math.max(1,Math.min(20,Math.trunc(+c.periods)||5));c.periodSeconds=Math.max(5,Math.min(300,+c.periodSeconds||30));
 if(!['counting','territory','capture','stones'].includes(c.scoring))throw Error('Unknown scoring.');if(!['none','total','increment','overtime'].includes(c.clock))throw Error('Unknown clock.');
 c.human=+c.human===2?2:1;c.coinCount=Math.max(0,Math.min(100,Math.trunc(+c.coinCount)||0));c.handicaps=Array.from({length:c.mode==='rengo'?c.players:sides(c)},(_,i)=>{const h=+c.handicaps?.[i]||0;return h>=2?Math.min(9,Math.trunc(h)):0;});return c;
}
// Deterministic 128-bit position fingerprint keeps long 19-cube saves compact.
export function positionKey(s){let a=2166136261,b=2246822519,c=3266489917,d=668265263;for(const v of s.board){a=Math.imul(a^v,16777619);b=Math.imul(b^(v+1),2246822519);c=Math.imul(c^(v+3),3266489917);d=Math.imul(d^(v+7),668265263);}return [a,b,c,d].map(v=>(v>>>0).toString(16).padStart(8,'0')).join('')+'|'+s.turn+'|'+(s.config.stoical?s.previousCapture:0);}
export function newGame(config={}){
 const c=normalize(config),order=turnOrder(c),count=sides(c),setup=[];c.handicaps.forEach((h,i)=>{for(let k=0;k<h;k++)setup.push({side:c.mode==='rengo'?i%c.teams+1:i+1,seat:i+1});});
 const s={config:c,board:Array(c.size**3).fill(0),order,turn:0,ply:0,passes:0,captures:Array(count+1).fill(0),previousCapture:0,history:[],seen:[],phase:setup.length?'handicap':'playing',setup,setupAt:0,result:null};
 if(c.coin&&c.coinCount){const step=Math.max(1,Math.floor(s.board.length/(c.coinCount+1)));for(let k=1;k<=c.coinCount;k++)s.board[Math.min(s.board.length-1,k*step)]=201;}
 s.seen=[positionKey(s)];return s;
}
export function current(s){return s.phase==='handicap'?s.setup[s.setupAt]:s.order[s.turn];}
export function budget(s){return s.config.omino?(s.ply===0&&current(s).side===1?2:4):1;}
export function group(board,start,c){
 const color=owner(board[start]),tier=tierOf(board[start]),adj=neighborhood(c),visited=new Set([start]),queue=[start],stones=[],liberties=new Set(),boundary=new Set();
 for(let k=0;k<queue.length;k++){const i=queue[k];if(tierOf(board[i])===tier)stones.push(i);for(const j of adj[i]){const v=board[j];if(!v||(ghost(v)&&owner(v)===color))liberties.add(j);else if(physical(v)&&owner(v)===color&&tierOf(v)>=tier){if(!visited.has(j)){visited.add(j);queue.push(j);}}else if(physical(v)&&owner(v)!==color)boundary.add(j);}}
 return {stones,liberties,boundary,tier,color};
}
function makeCell(p,color,c){
 const kind=p.kind||'stone';if(kind==='stone')return color*10;
 if(kind==='ghost'&&c.ghost)return 100+color;if(kind==='obstacle'&&c.obstacle)return 200;if(kind==='coin'&&c.coin)return 201;
 if(kind==='tier'&&c.tier&&c.omino&&[1,2,3].includes(+p.tier))return color*10+(+p.tier);
 throw Error('That piece is disabled for this game.');
}
export function applyPlacement(s,p){
 const c=s.config,color=current(s).side,i=p.i;if(!Number.isInteger(i)||i<0||i>=s.board.length)throw Error('Choose a point inside the cube.');
 const cell=makeCell(p,color,c);if(s.board[i]&&!ghost(s.board[i]))throw Error('This point is occupied.');
 if(ghost(s.board[i])&&ghost(cell))throw Error('A ghost is already here.');
 const board=s.board.slice();board[i]=cell;const adj=neighborhood(c),captured=[],checked=new Set();
 for(const j of adj[i])if(physical(board[j])&&owner(board[j])!==color&&!checked.has(j)){
  const g=group(board,j,c);g.stones.forEach(k=>checked.add(k));
  if(!g.liberties.size&&(g.tier===0||[...g.boundary].some(k=>owner(board[k])===color&&tierOf(board[k])>=g.tier)))captured.push(...g.stones);
 }
 const unique=[...new Set(captured)];for(const j of unique)board[j]=0;
 const own=physical(cell)?[i,...adj[i]]:adj[i],tested=new Set();
 for(const j of own)if(physical(board[j])&&owner(board[j])===color&&!tested.has(j)){const g=group(board,j,c);g.stones.forEach(k=>tested.add(k));if(!g.liberties.size)throw Error('Suicide: a friendly group would have no liberties.');}
 if(c.stoical&&s.previousCapture&&unique.length&&s.history.at(-1)?.side!==color)throw Error('Stoical Go: no capture directly after an opposing capture.');
 return {board,captured:unique,cost:physical(cell)?tierOf(cell)+1:1};
}
export function playTurn(s,placements){
 if(s.phase!=='playing')throw Error('The game is not accepting moves.');if(!Array.isArray(placements)||!placements.length)throw Error('Select at least one point, or pass.');
 const color=current(s).side;let draft={...s},used=0,allCaptured=[];const selected=new Set();
 for(const p of placements){if(selected.has(p.i))throw Error('A point may only be used once per turn.');selected.add(p.i);const r=applyPlacement(draft,p);used+=r.cost;if(used>budget(s))throw Error(`This turn allows ${budget(s)} stone uses.`);draft={...draft,board:r.board};allCaptured.push(...r.captured);
  if(s.config.firstCapture&&r.captured.length&&p!==placements.at(-1))throw Error('First Capture ends on the capturing placement.');
 }
 const solid=placements.filter(p=>!['ghost','obstacle','coin'].includes(p.kind));
 if(s.config.omino&&solid.length>1){const points=new Set(solid.map(p=>p.i)),reached=new Set([solid[0].i]),queue=[solid[0].i],adj=neighborhood(s.config);for(let k=0;k<queue.length;k++)for(const j of adj[queue[k]])if(points.has(j)&&!reached.has(j)){reached.add(j);queue.push(j);}if(reached.size!==points.size)throw Error('Omino stones must form one connected shape.');}
 const next={...draft,captures:s.captures.slice(),ply:s.ply+1,turn:(s.turn+1)%s.order.length,passes:0,previousCapture:allCaptured.length};next.captures[color]+=allCaptured.length;
 const key=positionKey(next);if(s.seen.includes(key))throw Error('Repetition: this move would recreate an earlier position and turn.');
 next.seen=[...s.seen,key];next.history=[...s.history,{side:color,seat:current(s).seat,placements:placements.map(p=>({...p})),captured:allCaptured,used}];
 if(s.config.firstCapture&&allCaptured.length){next.phase='ended';next.result={winner:color,reason:'First capture'};}else finishScoreTarget(next,color);return next;
}
export function placeHandicap(s,i){
 if(s.phase!=='handicap'||!Number.isInteger(i)||i<0||i>=s.board.length||s.board[i])throw Error('Place a handicap stone on an empty point.');
 const next={...s,board:s.board.slice(),setupAt:s.setupAt+1};next.board[i]=current(s).side*10;
 if(next.setupAt===s.setup.length){next.phase='playing';next.seen=[positionKey(next)];}return next;
}
export function pass(s){
 if(s.phase!=='playing')throw Error('Finish setup before passing.');const next={...s,turn:(s.turn+1)%s.order.length,ply:s.ply+1,passes:s.passes+1,previousCapture:0,history:[...s.history,{side:current(s).side,seat:current(s).seat,placements:[],captured:[],used:0}]};
 if(next.passes>=s.order.length)next.phase='scoring';finishScoreTarget(next,current(s).side);return next;
}
function finishScoreTarget(s,color){
 if(!s.config.winTarget)return;
 const result=score(s),total=result.points[color].total;
 if(total>=s.config.winTarget){s.phase='ended';s.result={winner:color,reason:`Reached ${s.config.winTarget}-point target (${total} points)`,points:result.points};}
}
export function score(s,dead=[]){
 const board=s.board.slice(),count=sides(s.config),points=Array.from({length:count+1},()=>({stones:0,territory:0,captures:0,komi:0,total:0}));
 for(const i of dead)board[i]=0;for(let color=1;color<=count;color++)points[color].captures=s.captures[color]||0;
 const adj=neighborhood(s.config),deadSet=new Set(dead),deadVisited=new Set();
 for(const i of dead){if(!physical(s.board[i])||deadVisited.has(i))continue;const color=owner(s.board[i]),queue=[i],border=new Set();deadVisited.add(i);for(let k=0;k<queue.length;k++)for(const j of adj[queue[k]]){if(deadSet.has(j)&&physical(s.board[j])&&owner(s.board[j])===color&&!deadVisited.has(j)){deadVisited.add(j);queue.push(j);}else if(physical(board[j])&&owner(board[j])!==color)border.add(owner(board[j]));}if(count===2)points[3-color].captures+=queue.length;else if(border.size===1)points[[...border][0]].captures+=queue.length;
 }
 board.forEach(v=>{if(physical(v))points[owner(v)].stones++;});
 const visited=new Uint8Array(board.length),territoryOwner=new Int8Array(board.length);
 for(let i=0;i<board.length;i++)if(!visited[i]&&(board[i]===0||ghost(board[i]))){const queue=[i],borders=new Set();visited[i]=1;for(let k=0;k<queue.length;k++)for(const j of adj[queue[k]]){const v=board[j];if(!v||ghost(v)){if(!visited[j]){visited[j]=1;queue.push(j);}}else if(physical(v))borders.add(owner(v));}
  if(borders.size===1){const color=[...borders][0];for(const j of queue)if(!ghost(board[j])){points[color].territory++;territoryOwner[j]=color;}}
 }
 for(let color=1;color<=count;color++){const p=points[color];p.komi=color===2?s.config.komi:0;p.total=(s.config.scoring==='counting'?p.stones+p.territory:s.config.scoring==='territory'?p.territory+p.captures:s.config.scoring==='capture'?p.captures:p.stones)+p.komi;}
 return {points,territoryOwner};
}
export function validateSave(data){
 if(data?.format!=='3D-Tesseract-Go'||data.version!==1||!data.state)throw Error('This is not a supported Tesseract Go save.');
 const s=data.state,c=normalize(s.config);if(!Array.isArray(s.board)||s.board.length!==c.size**3)throw Error('Invalid cube data.');
 const count=sides(c);if(s.board.some(v=>!Number.isInteger(v)||!(v===0||v===200||v===201||(physical(v)&&owner(v)<=count&&tierOf(v)<=3)||(ghost(v)&&owner(v)<=count))))throw Error('Invalid piece data.');
 const order=turnOrder(c);if(!Number.isInteger(s.turn)||s.turn<0||s.turn>=order.length||!['handicap','playing','scoring','ended'].includes(s.phase)||!Number.isInteger(s.ply)||s.ply<0||s.ply>100000||!Array.isArray(s.history)||s.history.length!==s.ply||!Array.isArray(s.seen)||s.seen.length>100001||s.seen.some(v=>typeof v!=='string'||v.length>100000)||!Array.isArray(s.captures)||s.captures.length!==count+1||s.captures.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid game history.');
 const validBoard=b=>Array.isArray(b)&&b.length===c.size**3&&b.every(v=>Number.isInteger(v)&&(v===0||v===200||v===201||(physical(v)&&owner(v)<=count&&tierOf(v)<=3)||(ghost(v)&&owner(v)<=count)));
 if(s.startBoard!==undefined&&!validBoard(s.startBoard))throw Error('Invalid starting position.');
 for(const m of s.history){if(!m||!Number.isInteger(m.side)||m.side<1||m.side>count||!Number.isInteger(m.seat)||m.seat<1||m.seat>8||!Number.isInteger(m.used)||m.used<0||m.used>4||!Array.isArray(m.captured)||m.captured.length>s.board.length||m.captured.some(i=>!Number.isInteger(i)||i<0||i>=s.board.length)||!Array.isArray(m.placements)||m.placements.length>4)throw Error('Invalid move record.');for(const p of m.placements)if(!p||!Number.isInteger(p.i)||p.i<0||p.i>=s.board.length||!['stone','ghost','obstacle','coin','tier'].includes(p.kind||'stone')||(p.kind==='tier'&&![1,2,3].includes(p.tier)))throw Error('Invalid placement record.');}
 const base=newGame(c);if(!Number.isInteger(s.setupAt)||s.setupAt<0||s.setupAt>base.setup.length||(s.phase==='handicap'&&s.setupAt>=base.setup.length))throw Error('Invalid handicap setup.');
 if(data.clocks&&(!Array.isArray(data.clocks)||data.clocks.length!==count+1||data.clocks.some(t=>!t||!Number.isFinite(t.main)||!Number.isFinite(t.period)||!Number.isInteger(t.left)||t.main<0||t.period<0||t.left<0)))throw Error('Invalid clocks.');
 return {...s,config:c,order,setup:base.setup};
}
