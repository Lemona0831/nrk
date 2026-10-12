'use strict';
// 문서의 로컬 파일 링크만 검사한다. 웹 URL과 절 제목 앵커는 검사하지 않는다.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),inputs=process.argv.slice(2),files=[];
function collect(p){if(!fs.existsSync(p)){throw Error('검사 경로 없음: '+p);}const st=fs.statSync(p);if(st.isDirectory())for(const d of fs.readdirSync(p,{withFileTypes:true})){if(d.name==='.git')continue;collect(path.join(p,d.name));}else if(p.toLowerCase().endsWith('.md'))files.push(p);}
for(const x of inputs.length?inputs:['docs'])collect(path.resolve(root,x));
let count=0;const bad=[];
for(const file of files){const raw=fs.readFileSync(file,'utf8'),body=raw.replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm,m=>m.replace(/[^\n]/g,' ')).replace(/(`+)[^`\n]*?\1/g,m=>m.replace(/[^\n]/g,' '));const re=/\[[^\]\n]*\]\((<[^>\n]+>|[^)\n]+)\)/g;let m;
 while((m=re.exec(body))){let target=m[1].trim();if(target.startsWith('<'))target=target.slice(1,-1);else target=target.replace(/\s+["'][^"']*["']$/,'');if(!target||target.startsWith('#')||/^(?:https?:|mailto:|data:|plugin:|app:|codex:)/i.test(target))continue;
 const part=target.split('#')[0].split('?')[0];if(!part)continue;let local;try{local=decodeURIComponent(part);}catch{local=part;}
 const resolved=path.resolve(path.dirname(file),local);count++;if(!fs.existsSync(resolved))bad.push({file:path.relative(root,file).replace(/\\/g,'/'),line:body.slice(0,m.index).split('\n').length,target});
 }
}
console.log(JSON.stringify({documents:files.length,localLinks:count,missing:bad.length,problems:bad},null,2));process.exitCode=bad.length?1:0;
