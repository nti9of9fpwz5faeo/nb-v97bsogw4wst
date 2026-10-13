const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v103-finish';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,origin=new URL(url).origin;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.addInitScript(()=>{localStorage.setItem('neon-blade-tutorial-courses-v1',JSON.stringify({step:2,complete:true}));localStorage.setItem('neon-blade-best-v1:audio/Futuristic Action.mp3:normal','12345');});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(url);await page.waitForFunction(()=>state==='ready');await page.locator('[data-nav="songs"]').click();await page.locator('[data-song-mode="finish"]').click();
  assert.equal(await page.locator('[data-song-file]').count(),1);assert.ok((await page.locator('#songList').textContent()).includes('ミッション達成率'));
  await page.screenshot({path:path.join(out,'selection.png')});
  await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>playMode),'finish');await page.locator('[data-nav="songs"]').click();
  await page.locator('[data-song-file="audio/Futuristic Action.mp3"]').click();await page.waitForFunction(()=>state==='play');
  const initial=await page.evaluate(()=>{stopMoveScheduler();pauseGame();return {hp,hearts:document.querySelectorAll('#hud svg').length,progress:finishProgress(),hud:document.getElementById('scoreNum').textContent,bpm:BPM,offset:OFFSET,duration:songBuf.duration,end:finishChart.end,goal:GOAL_INDEX,path:path.slice(),chart:activeChart,rate,rush:rushOn()};});
  assert.equal(initial.hp,1);assert.equal(initial.hearts,1);assert.equal(initial.progress,0);assert.equal(initial.hud,'0%');assert.equal(initial.bpm,150);assert.equal(initial.offset,.3);assert.ok(initial.duration>64&&initial.duration<64.1);assert.equal(initial.end,61.3);assert.equal(initial.rate,1);assert.equal(initial.rush,false);
  assert.equal(new Set(initial.path.map(p=>p.c+','+p.r)).size,initial.path.length);assert.ok(initial.path.every((p,i)=>!i||Math.abs(p.c-initial.path[i-1].c)+Math.abs(p.r-initial.path[i-1].r)===1));
  if(process.env.LIVE_AUDIO_TEST==='1'){
   await page.evaluate(()=>{
    diagOn=true;startGame();window.liveMove=0;
    window.liveBot=setInterval(()=>{
     if(state!=='play'){clearInterval(window.liveBot);return;}
     const t=songTime(),n=nearestBeat(t),target=notes.find(nt=>nt.idx<=player.idx);
     if(target&&Math.abs(t-beatTime(n))<WINDOW-.01&&acted!==n)input(target.purple?'move':'break',null,'test');
     if(!moveLocked&&!notes.some(nt=>nt.idx<=player.idx+1)&&player.idx<NBFinish.limit(finishChart,sourceSongPosition(t)))input('move',null,'test');
    },8);
   });
   await page.waitForFunction(()=>['clear','over'].includes(state),null,{timeout:70000});
   const live=await page.evaluate(()=>({state,hp,progress:finishProgress(),rate,lap,time:songTime(),damage:diagRun?.events?.filter(e=>e.type==='damage').slice(-3)}));console.log('LIVE AUDIO',live);assert.equal(live.state,'clear');assert.equal(live.hp,1);assert.equal(live.progress,100);
  }
  // Run real input/beat/collision/course handlers through the entire authored song.
  const run=()=>page.evaluate(()=>{
   startGame();stopMoveScheduler();const originalClock=songTime;let t=0;songTime=()=>t;
   const trace=[];let seen=new Set(),peak=0;
   for(let frame=0;frame<6500&&state==='play';frame++){
    t=frame/100;
    while(state==='play'){
     const bt=beatTime(nextBeat),hit=pendingCheck[0]?.checkAt??Infinity;
     if(Math.min(bt,hit)>Math.min(t,finishChart.end))break;
     if(hit<=bt){const pc=pendingCheck.shift();checkHit(hit,null,null,pc.n);}else onBeat(nextBeat++,bt);
    }
    if(t>=finishChart.end){notes=[];pendingCheck=[];earlyInput=null;}
    for(const nt of notes)if(!seen.has(nt.id)){seen.add(nt.id);trace.push([nextBeat,nt.idx,nt.hp,!!nt.purple]);}
    const n=nearestBeat(t),atBeat=Math.abs(t-beatTime(n))<.015;
    const target=notes.find(nt=>nt.idx<=player.idx);
    if(target&&atBeat&&acted!==n)input(target.purple?'move':'break',null,'test');
    if(!moveLocked&&!notes.some(nt=>nt.idx<=player.idx+1)&&player.idx<NBFinish.limit(finishChart,t))input('move',null,'test');
    checkLines(t);peak=Math.max(peak,finishProgress());
    if(t>songBuf.duration&&state==='play'){endReason='song_end';end(false);}
   }
   const result={state,hp,progress:finishProgress(),peak,trace,result:finishedRun,steps:recordSteps,rate,lap,clock:t};songTime=originalClock;return result;
  });
  const first=await run();console.log('full run',JSON.stringify({state:first.state,hp:first.hp,progress:first.progress,clock:first.clock,notes:first.trace.length}));assert.equal(first.state,'clear');assert.equal(first.progress,100);assert.equal(first.hp,1);assert.equal(first.steps,0);assert.equal(first.rate,1);assert.equal(first.lap,0);assert.ok(first.clock>=61.3&&first.clock<64.1);
  const second=await run();assert.deepEqual(second.trace,first.trace);assert.equal(second.state,'clear');
  await page.evaluate(()=>finishResult(true));await page.waitForTimeout(950);assert.ok((await page.locator('#clearOv').textContent()).includes('コース到達率'));assert.ok(!(await page.locator('#clearOv').textContent()).includes('歩数'));await page.screenshot({path:path.join(out,'clear.png')});
  // Hit protection must allow a burst with zero life, then fail exactly once.
  const collision=await page.evaluate(()=>{
   startGame();stopMoveScheduler();const orig=songTime;let t=20;songTime=()=>t;moveLocked=false;notes=[];player={idx:10,from:10,at:-9};
   notes=[{id:99901,idx:11,from:11,at:-9,pop:-9,hp:1}];input('move',null,'test');
   const before={state,hp,idx:player.idx,until:finishFailureAt};
   for(let i=0;i<4;i++){t+=.1;notes.push({id:99902+i,idx:player.idx+1,from:player.idx+1,at:-9,pop:-9,hp:1});input('move',null,'test');}
   const after={state,hp,idx:player.idx,miss:counts.MISS};t=20.61;checkLines(t);const result={before,after,state,progress:finishedRun.progress,score:finishedRun.score};songTime=orig;finishResult(false);finishResultReveal();return result;
  });
  assert.deepEqual(collision.before,{state:'play',hp:0,idx:11,until:20.6});assert.deepEqual(collision.after,{state:'play',hp:0,idx:15,miss:1});assert.equal(collision.state,'over');assert.equal(collision.score,Math.floor(15/initial.goal*1000)/10);
  await page.screenshot({path:path.join(out,'failure.png')});
  // Retry returns to 0%, one life and the exact chart/course. Pause freezes protection.
  const retry=await page.evaluate(()=>{startGame();stopMoveScheduler();const snapshot={hp,p:finishProgress(),chart:activeChart,path:path.slice()};pauseGame();return snapshot;});assert.equal(retry.hp,1);assert.equal(retry.p,0);assert.deepEqual(retry.chart,initial.chart);assert.deepEqual(retry.path,initial.path);
  for(const size of [{width:360,height:640},{width:390,height:844},{width:1280,height:720}]){
   await page.setViewportSize(size);await page.evaluate(()=>{document.getElementById('pauseOv').classList.add('hide');layout();draw(pausedAt);finishHud();});
   assert.ok(await page.locator('#bMove').evaluate(e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).closest('button')===e;}));await page.screenshot({path:path.join(out,'play-'+size.width+'.png')});
  }
  // Both input types expose existing judgement windows; move keeps its immediate behavior.
  const judges=await page.evaluate(()=>{
   state='play';moveLocked=false;notes=[];const orig=songTime;let t=20.3;songTime=()=>t;player.idx=10;const words=[];
   for(const offset of [0,.08,.13,.19]){t=20.3+offset;input('move',null,'test');words.push(document.getElementById('jWord').textContent);}
   t=21.1;nextBeat=53;acted=-1;notes=[{id:100002,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:1}];input('break',null,'test');words.push(document.getElementById('jWord').textContent);const life=hp;songTime=orig;pauseGame();return {words,life};
  });assert.deepEqual(judges.words,['PERFECT','GREAT','GOOD','MISS','PERFECT']);assert.equal(judges.life,1);
  // Actual animation loop handles zero-life expiry and song timeout.
  await page.evaluate(()=>{startGame();stopMoveScheduler();nextBeat=10000;notes=[];pendingCheck=[];damage(songTime(),'test',null,null);});await page.waitForFunction(()=>state==='over');assert.equal(await page.evaluate(()=>finishedRun.mode),'finish');
  await page.evaluate(()=>{startGame();stopMoveScheduler();nextBeat=10000;notes=[];pendingCheck=[];songStart=outputTime()-songBuf.duration-.1;});await page.waitForFunction(()=>state==='over');assert.equal(await page.evaluate(()=>endReason),'song_end');
  // Pausing preserves the remaining collision window and permits resumed movement.
  const paused=await page.evaluate(()=>{startGame();stopMoveScheduler();nextBeat=10000;notes=[];pendingCheck=[];damage(songTime(),'pause test',null,null);pauseGame();return {at:pausedAt,until:finishFailureAt};});
  await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>state),'paused');assert.equal(await page.evaluate(()=>songTime()),paused.at);
  await page.evaluate(()=>resumeGame());await page.waitForFunction(()=>state==='play');assert.ok(await page.evaluate(()=>finishFailureAt-songTime()>0));await page.waitForFunction(()=>state==='over');
  // A final burst may clear during protection; after the deadline it must fail.
  for(const afterDeadline of [false,true]){
   const last=await page.evaluate(after=>{startGame();stopMoveScheduler();const original=songTime;let t=finishChart.end;songTime=()=>t;player={idx:GOAL_INDEX-1,from:GOAL_INDEX-1,at:-9};moveLocked=false;notes=[];damage(t,'last burst',null,null);if(after)t+=.61;input('move',null,'test');const r={state,progress:finishProgress()};songTime=original;return r;},afterDeadline);
   assert.equal(last.state,afterDeadline?'over':'clear');assert.equal(last.progress===100,!afterDeadline);
  }
  // Legacy best key and five-life endless gameplay survive mode switching.
  assert.equal(await page.evaluate(()=>localStorage.getItem('neon-blade-best-v1:audio/Futuristic Action.mp3:normal')),'12345');
  await page.evaluate(()=>returnToSongs());await page.locator('[data-song-mode="endless"]').click();assert.ok(await page.locator('[data-song-file]').count()>1);await page.locator('[data-song-file="audio/Futuristic Action.mp3"]').click();await page.waitForFunction(()=>state==='play');
  assert.deepEqual(await page.evaluate(()=>{stopMoveScheduler();pauseGame();return {hp,goal:GOAL_INDEX,chart:activeChart,rush:rushOn()};}),{hp:5,goal:35,chart:null,rush:true});
  assert.deepEqual(errors,[]);console.log('PASS finish: full chart clear/replay, positions, one life, collision burst/failure, retry, move/break judgement, mobile layout, real loop expiry/timeout, isolated best and legacy mode');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
