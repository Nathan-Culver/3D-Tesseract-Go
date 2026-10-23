import {chooseMove} from './ai.mjs';
self.onmessage=({data})=>{try{const placements=chooseMove(data.state,{difficulty:data.difficulty,timeMs:data.timeMs,onProgress:p=>self.postMessage({type:'progress',id:data.id,...p})});self.postMessage({type:'move',id:data.id,placements});}catch(e){self.postMessage({type:'error',id:data.id,message:e.message});}};
