import {execFileSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
const files=readdirSync('.').filter(f=>/\.(mjs|js)$/.test(f));
for(const f of files)execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
const html=readFileSync('index.html','utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw Error('Duplicate element IDs');
const app=readFileSync('app.mjs','utf8');for(const [,id] of app.matchAll(/\$\('([^']+)'\)/g))if(!ids.includes(id))throw Error('Missing UI element: '+id);
console.log(`Checked ${files.length} scripts, ${ids.length} element IDs, and static UI bindings.`);
