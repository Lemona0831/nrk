'use strict';
// 게임 파일이 바뀐 배포마다 식별자와 파일별 캐시 키를 갱신한다.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
let bad=false;
for(const dir of ['.']){
 const base=path.join(root,dir),index=path.join(base,'index.html');
 const before=fs.readFileSync(index,'utf8');
 let html=before.replace(/<meta name="nrk-release" content="[a-f0-9]+">\r?\n/g,'').replace(/\?v=[a-f0-9]+/g,'');
 const assets={};
 html=html.replace(/((?:src|href)=")((?:data|js|css)\/[^"?]+)(")/g,(_,a,file,z)=>{const digest=hash(fs.readFileSync(path.join(base,file)));assets[file]=digest;return a+file+'?v='+digest.slice(0,16)+z;});
 const revision=hash(html+JSON.stringify(assets));
 html=html.replace(/(<meta charset="utf-8">\r?\n)/,'$1<meta name="nrk-release" content="'+revision+'">\n');
 const manifest=JSON.stringify({revision},null,2)+'\n',out=path.join(base,'release.json');
 if(check){if(before!==html||!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==manifest){bad=true;console.error('갱신 필요: '+dir);}}
 else{fs.writeFileSync(index,html);fs.writeFileSync(out,manifest);}
}
if(bad)process.exitCode=1;
