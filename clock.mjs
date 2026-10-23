export function createClocks(config,count){return Array.from({length:count+1},()=>({main:config.minutes*60,period:config.periodSeconds,left:config.periods}));}
export function consumeClock(clock,config,seconds){
 if(config.clock==='none'||seconds<=0)return false;
 if(config.clock!=='overtime'){clock.main=Math.max(0,clock.main-seconds);return clock.main===0;}
 let remaining=seconds;if(clock.main>0){const spent=Math.min(clock.main,remaining);clock.main-=spent;remaining-=spent;}
 if(remaining>0){clock.period-=remaining;while(clock.period<=0&&clock.left>0){clock.left--;clock.period+=config.periodSeconds;}}
 return clock.left<=0;
}
export function finishClock(clock,config){if(config.clock==='increment')clock.main+=config.increment;if(config.clock==='overtime'&&clock.main<=0)clock.period=config.periodSeconds;}
export function formatClock(clock){const seconds=Math.max(0,Math.ceil(clock.main>0?clock.main:clock.period));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;}
