/* Compact, passive judgment history. The detailed diagnostic mode remains separate. */
(function(root){
  'use strict';
  const KEY='neon-blade-timing-history-v1', LIMIT=20, JUDGES=['PERFECT','GREAT','GOOD','MISS'];
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const round=(v,n=2)=>finite(v)?Math.round(v*10**n)/10**n:null;
  const clone=v=>JSON.parse(JSON.stringify(v));
  function create(meta){
    return {meta:clone(meta),id:meta.id,inputs:[],byId:new Map(),misses:[],transitions:[],pass:1,done:false};
  }
  function observe(run,e){
    if(!run||run.done)return;
    if(e.type==='input'){
      const input={inputId:e.inputId,action:e.action,device:e.device,pass:run.pass,lap:e.lap,attempt:e.attempt,
        songTimeSec:e.sourceSongTimeSec,judgmentTimeSec:e.songTimeUsed,rate:e.rate,bpm:e.bpm,
        songCorrectionMs:run.meta.songCorrectionMs,timingMs:run.meta.timingMs,offsetMs:null,judge:null,status:'pending',beat:null};
      run.inputs.push(input);run.byId.set(e.inputId,input);
    }else if(e.type==='input_result')update(run,e);
    else if(e.type==='damage'&&!e.causeInputId){
      run.misses.push({seq:e.seq,pass:run.pass,songTimeSec:e.sourceSongTimeSec,rate:e.rate,bpm:e.bpm,judge:'MISS',offsetMs:null,reason:e.reason||'被弾',reverted:false});
    }else if(e.type==='damage_reverted'){
      const miss=run.misses.find(m=>m.seq===e.damageSeq);if(miss)miss.reverted=true;
    }else if(['speed_up','song_restart','audio_restart'].includes(e.type)){
      run.pass++;run.transitions.push({type:e.type,pass:run.pass,rate:e.rate,bpm:e.bpm});
    }
  }
  function update(run,e){
    if(!run||run.done)return;
    const input=run.byId.get(e.inputId);if(!input)return;
    for(const key of ['status','reason','beat','charge','mining'])if(e[key]!==undefined)input[key]=e[key];
    if(e.target){input.beat=e.target.beat;input.offsetMs=e.target.offsetMs;}
    if(finite(e.offsetMs))input.offsetMs=e.offsetMs;
    if(JUDGES.includes(e.judge))input.judge=e.judge;
  }
  function offsets(values){
    const a=values.filter(finite).sort((a,b)=>a-b),n=a.length;
    return {n,meanMs:n?round(a.reduce((s,v)=>s+v,0)/n):null,medianMs:n?round(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null,
      FAST:a.filter(v=>v<0).length,SLOW:a.filter(v=>v>0).length,EXACT:a.filter(v=>v===0).length};
  }
  function summarize(inputs,misses){
    const judged=inputs.filter(i=>JUDGES.includes(i.judge)),counts=Object.fromEntries(JUDGES.map(j=>[j,judged.filter(i=>i.judge===j).length]));
    counts.MISS+=misses.filter(m=>!m.reverted).length;
    return {counts,...offsets(judged.map(i=>i.offsetMs)),inputMisses:judged.filter(i=>i.judge==='MISS').length,
      noInputMisses:misses.filter(m=>!m.reverted).length,unjudgedInputs:inputs.length-judged.length};
  }
  function snapshot(run,details={}){
    if(!run)return null;
    const inputs=run.inputs.map(i=>({...i})),misses=run.misses.map(m=>({...m}));
    const groups=new Map();
    for(const i of inputs){
      if(!JUDGES.includes(i.judge)||!finite(i.offsetMs)||!finite(i.songTimeSec))continue;
      const start=Math.floor(Math.max(0,i.songTimeSec)/30)*30,key=i.pass+':'+start;
      if(!groups.has(key))groups.set(key,{pass:i.pass,startSeconds:start,endSeconds:start+30,values:[]});
      groups.get(key).values.push(i.offsetMs);
    }
    const by30Seconds=[...groups.values()].sort((a,b)=>a.pass-b.pass||a.startSeconds-b.startSeconds).map(({values,...g})=>({...g,...offsets(values)}));
    const rates=[...new Set([run.meta.initialRate,...inputs.map(i=>i.rate),...run.transitions.map(t=>t.rate)].filter(finite))];
    return {schemaVersion:1,kind:'neon-blade-timing-history',...run.meta,...details,id:run.id,playbackRates:rates,
      summary:summarize(inputs,misses),by30Seconds,inputs,misses,transitions:clone(run.transitions),
      interpretation:'ズレは実際の判定時計のms。負＝FAST、正＝SLOW。平均・中央値・FAST/SLOWは判定のある入力（入力MISSを含む）が対象。被弾など入力のないMISSはズレをnullにし、平均から除外。曲の秒数は入力発生時の音源位置（手動補正を戻し、再生速度を掛けた値）。30秒集計は音源の再開ごとに分ける。'};
  }
  function finish(run,details={}){if(!run||run.done)return null;const report=snapshot(run,details);run.done=true;return report;}
  let dbPromise=null;
  function database(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!root.indexedDB){reject(new Error('端末の保存機能を利用できません'));return;}
      const req=root.indexedDB.open(KEY,1);
      req.onupgradeneeded=()=>req.result.createObjectStore('runs',{keyPath:'id'});
      req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('別の画面が保存処理を使用しています'));
      req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();dbPromise=null;};resolve(db);};
    }).catch(e=>{dbPromise=null;throw e;});return dbPromise;
  }
  const newest=(a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||b.id.localeCompare(a.id);
  async function save(report){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('runs','readwrite'),store=tx.objectStore('runs');
      tx.oncomplete=()=>resolve(report.id);tx.onabort=()=>reject(tx.error||new Error('保存できませんでした'));tx.onerror=()=>{};
      store.put(report);
      const read=store.getAll();read.onsuccess=()=>read.result.sort(newest).slice(LIMIT).forEach(r=>store.delete(r.id));
    });
  }
  async function list(){
    const db=await database();return new Promise((resolve,reject)=>{
      const req=db.transaction('runs','readonly').objectStore('runs').getAll();
      req.onsuccess=()=>resolve(req.result.sort(newest));req.onerror=()=>reject(req.error);
    });
  }
  const api={create,observe,update,snapshot,finish,summarize,save,list,LIMIT,KEY};
  if(typeof module!=='undefined')module.exports=api;else root.NBTimingHistory=api;
})(typeof window==='undefined'?globalThis:window);
