(function(){
  const LS='MOCKSB';
  const load=()=>JSON.parse(localStorage.getItem(LS)||'{"docs":{}}'); const save=s=>localStorage.setItem(LS,JSON.stringify(s));
  const parent=p=>p.replace(/\/[^/]+$/,''); const idOf=p=>p.replace(/^.*\//,'');
  const ADMIN='test-pass';
  const go=url=>{ history.replaceState(null,'',url); location.reload(); };
  function client(){
    let uid=sessionStorage.getItem('MOCK_UID');
    const own=p=>uid&&(p==='playtest/'+uid||p.startsWith('playtest/'+uid+'/')||p==='board/'+uid);
    const canRead=p=>p.startsWith('board/')||own(p);
    const api={
      auth:{
        // 구글 로그인 흉내: 구글 계정 → uid 짝은 localStorage(MOCK_IDS)에, 이 탭의 로그인 방식은 sessionStorage(MOCK_PROV)에 둔다.
        // 실제처럼 페이지를 다시 열어(리디렉션) 돌아온다. 이미 다른 uid에 붙은 계정을 이으려 하면 오류를 주소에 담아 돌아온다.
        getSession:async()=>{ if(!uid) return {data:{session:null}}; const prov=sessionStorage.getItem('MOCK_PROV'); return {data:{session:{user:{id:uid,is_anonymous:!prov,identities:prov?[{provider:prov}]:[],app_metadata:{provider:prov||'anonymous'},user_metadata:prov?{name:(prov==='kakao'?'카카오':'구글')+'닉'}:{}}}}}; },
        linkIdentity:async({provider,options})=>{ const ids=JSON.parse(localStorage.getItem('MOCK_IDS')||'{}'); if(ids[provider]&&ids[provider]!==uid){ go(options.redirectTo+'#error=server_error&error_code=identity_already_exists'); return {data:{},error:null}; } ids[provider]=uid; localStorage.setItem('MOCK_IDS',JSON.stringify(ids)); sessionStorage.setItem('MOCK_PROV',provider); go(options.redirectTo); return {data:{},error:null}; },
        signInWithOAuth:async({provider,options})=>{ const ids=JSON.parse(localStorage.getItem('MOCK_IDS')||'{}'); if(!ids[provider]){ ids[provider]='user-'+Math.random().toString(36).slice(2,10); localStorage.setItem('MOCK_IDS',JSON.stringify(ids)); } uid=ids[provider]; sessionStorage.setItem('MOCK_UID',uid); sessionStorage.setItem('MOCK_PROV',provider); go(options.redirectTo); return {data:{},error:null}; },
        signOut:async()=>{ uid=null; sessionStorage.removeItem('MOCK_UID'); sessionStorage.removeItem('MOCK_PROV'); return {error:null}; },
        signInAnonymously:async()=>{ uid='anon-'+Math.random().toString(36).slice(2,10); sessionStorage.setItem('MOCK_UID',uid); window.__mockWrites=(window.__mockWrites||0); return {data:{session:{user:{id:uid}}},error:null}; }
      },
      from:(t)=>{
        const q={filters:[],
          select(){return q;}, eq(c,v){q.filters.push([c,v]);return q;},
          _rows(){ const s=load(); return Object.values(s.docs).filter(r=>canRead(r.path)&&q.filters.every(([c,v])=>(c==='path'?r.path:c==='parent'?parent(r.path):r[c])===v)).map(r=>({id:idOf(r.path),data:r.data,path:r.path})); },
          async maybeSingle(){ const rows=q._rows(); return {data: rows[0]||null, error:null}; },
          then(res,rej){ return Promise.resolve({data:q._rows(),error:null}).then(res,rej); },
          async upsert(row){ if(!own(row.path)) { window.__denied=(window.__denied||0)+1; return {error:{message:'new row violates row-level security policy',code:'42501'}}; } const s=load(); s.docs[row.path]={path:row.path,data:row.data}; save(s); window.__mockWrites=(window.__mockWrites||0)+1; return {error:null}; }
        }; return q; },
      rpc: async(name,args)=>{
        if(name==='admin_check') return {data: args.pass===ADMIN, error:null};
        if(args.pass!==ADMIN) return {data:null,error:{message:'관리자 암호가 맞지 않습니다'}};
        const s=load();
        if(name==='admin_dump') return {data:Object.values(s.docs).map(r=>({path:r.path,parent:parent(r.path),id:idOf(r.path),data:r.data})),error:null};
        if(name==='admin_put'){ s.docs[args.p]={path:args.p,data:args.d}; save(s); return {data:null,error:null}; }
        if(name==='admin_delete'){ if(window.__noDeleteFn) return {data:null,error:{message:'Could not find the function public.admin_delete',code:'PGRST202'}}; let n=0; for(const k of Object.keys(s.docs)){ if((args.paths||[]).some(p=>k===p||k.startsWith(p+'/'))){ delete s.docs[k]; n++; } } save(s); return {data:n,error:null}; }
        return {data:null,error:{message:'unknown rpc'}};
      }
    };
    return api;
  }
  window.supabase={createClient:()=>client()};
})();
