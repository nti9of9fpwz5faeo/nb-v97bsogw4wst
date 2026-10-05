const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v91-warp';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  await page.evaluate(async()=>{
   playMode='endless';endless=true;const sg=SONGS.find(s=>s.name==='Sombra en Movimiento');chartCache[sg.chart]=await (await fetch(sg.chart)).json();setSong(sg);songBuf=ctx.createBuffer(1,ctx.sampleRate*192.7335,ctx.sampleRate);diagOn=true;NBMeasure.arm();startGame();stopMoveScheduler();pauseGame();
   window.starts=[];const create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const src=create(),start=src.start.bind(src);src.start=(at,offset)=>{window.starts.push({lead:at-ctx.currentTime,offset,rate:src.playbackRate.value});return start(at,offset);};return src;};
  });
  // Actual 35th normal move, rather than score, triggers one new source and preserves records.
  const result=await page.evaluate(()=>{
   state='play';hp=4;recordSteps=210;moveSteps=34;combo=21;maxCombo=21;rushUnits=44;notes=[];pendingCheck=[];moveLocked=false;
   player={idx:34,from:34,at:-9};lineK=LINES.length-1;revealEnd=EXIT_INDEX;gIdx=gIndexFor(lineK);cameraFrom=cameraTarget=Math.max(0,path[35].r-2);cameraAt=-9;
   window.oldSource=songSrc;freeMove(Math.max(0,songTime()),null);stopMoveScheduler();const fresh=songSrc!==window.oldSource&&!!songSrc;pauseGame();draw(pausedAt);
   return {goal:GOAL_INDEX,length:path.length,idx:player.idx,lap,courseLap,rate,hp,recordSteps,moveSteps,combo,rushUnits,nextBeat,locked:moveLocked,loop:songSrc?.loop??false,newSource:fresh,starts:window.starts,pass:timingHistoryRun.pass,scene:document.getElementById('app').dataset.songBackground};
  });
  assert.equal(result.goal,35);assert.equal(result.length,40);assert.equal(result.idx,0);assert.equal(result.lap,1);assert.equal(result.courseLap,1);assert.equal(result.rate,1.1);assert.equal(result.hp,4);assert.equal(result.recordSteps,212);assert.equal(result.moveSteps,35);assert.equal(result.combo,21);assert.equal(result.rushUnits,44);assert.equal(result.nextBeat,0);assert.ok(result.locked&&result.newSource);assert.equal(result.loop,false);assert.equal(result.pass,2);assert.equal(result.scene,'0');
  const start=result.starts.at(-1);assert.equal(start.offset,0);assert.ok(Math.abs(start.lead-.12)<.02);assert.ok(Math.abs(start.rate-1.1)<1e-6);
  // The old INTRO_BEATS=4 preparation is intact at every playback speed.
  const rest=await page.evaluate(()=>{
   const rows=[];for(const r of [1,1.1,2.2]){rate=r;applyRate();notes=[{id:9871,idx:7,from:7,at:0,pop:0,hp:1}];pendingCheck=[];state='play';for(let n=0;n<4;n++)onBeat(n,beatTime(n));const before=notes[0].idx;onBeat(4,beatTime(4));rows.push({r,before,after:notes[0].idx,first:beatTime(4)});}state='paused';return rows;
  });for(const r of rest){assert.equal(r.before,7);assert.equal(r.after,6);assert.ok(Math.abs(r.first-(.385+4*.4)/r.r)<1e-8);}
  // Rush must finish its visible travel and landing protection before a warp.
  const rush=await page.evaluate(()=>{
   startGame();stopMoveScheduler();notes=[];moveLocked=false;lineK=LINES.length-1;player={idx:30,from:30,at:-9};
   const t=1;hp=99;rushAnim={from:30,to:35,t0:t-.6,moveAt:t,dur:.5,blown:[],moved:false,trail:30};rushGuardUntil=t+1.1;
   drawRushAnim(t);const first={idx:player.idx,lap};drawRushAnim(t+.5);checkLines(t+.5);const landingLap=lap;checkLines(t+1.11);stopMoveScheduler();pauseGame();return {first,landingLap,lap,idx:player.idx,moveSteps};
  });assert.deepEqual(rush.first,{idx:35,lap:0});assert.equal(rush.landingLap,0);assert.equal(rush.lap,1);assert.equal(rush.idx,0);assert.equal(rush.moveSteps,5);
  // Fifteen checkpoints retain 35-cell sections and cap speed; restarts still happen at the cap.
  const cap=await page.evaluate(()=>{
   startGame();stopMoveScheduler();hp=99;for(let i=0;i<15;i++){player={idx:35,from:35,at:0};lineK=LINES.length-1;notes=[];checkLines(Math.max(0,songTime()));stopMoveScheduler();}
   const r={rate,lap,goal:GOAL_INDEX,length:path.length,pass:timingHistoryRun.pass,offset:window.starts.at(-1).offset,loop:songSrc.loop};pauseGame();return r;
  });assert.deepEqual(cap,{rate:2.2,lap:15,goal:35,length:40,pass:16,offset:0,loop:false});
  // Resume restores the correct media offset at accelerated speed instead of restarting the section.
  await page.evaluate(()=>{pausedAt=3;window.resumeExpected=sourceSongPosition(pausedAt);resumeGame();});await page.waitForFunction(()=>state==='play');
  assert.ok(await page.evaluate(()=>Math.abs(window.starts.at(-1).offset-window.resumeExpected)<1e-8));
  await page.evaluate(()=>{stopMoveScheduler();pauseGame();});
  // Portal and post-warp view at mobile sizes, no spirit or speed-zone stamps loaded.
  assert.equal(await page.evaluate(()=>typeof NBSpeedMarkers),'undefined');
  await page.evaluate(()=>{startGame();stopMoveScheduler();pauseGame();document.querySelectorAll('.overlay').forEach(el=>el.classList.add('hide'));NBWorkshop.clearToasts();player={idx:33,from:33,at:-9};lineK=LINES.length-1;gIdx=gIndexFor(lineK);revealEnd=EXIT_INDEX;cameraFrom=cameraTarget=Math.max(0,path[35].r-2);cameraAt=-9;notes=[];draw(pausedAt);});
  await page.screenshot({path:path.join(out,'warp-zone.png')});
  for(const size of [{width:360,height:640},{width:412,height:915}]){await page.setViewportSize(size);await page.evaluate(()=>{layout();draw(pausedAt);});assert.ok(await page.evaluate(()=>document.getElementById('bMove').getBoundingClientRect().bottom<=innerHeight));}
  // A retry fully resets music, rate, portal and background. Non-endless modes keep 35 cells.
  const retry=await page.evaluate(()=>{startGame();stopMoveScheduler();pauseGame();draw(pausedAt);const r={rate,lap,idx:player.idx,goal:GOAL_INDEX,scene:document.getElementById('app').dataset.songBackground};return r;});assert.deepEqual(retry,{rate:1,lap:0,idx:0,goal:35,scene:'0'});
  const modes=await page.evaluate(()=>{const rows=[];for(const mode of ['distance','normal']){playMode=mode;startGame();stopMoveScheduler();rows.push({goal:GOAL_INDEX,length:path.length,loop:songSrc.loop});pauseGame();}return rows;});for(const m of modes)assert.deepEqual(m,{goal:35,length:40,loop:false});
  // A buffered move processed inside onBeat can warp; never consume old-time beats afterward.
  await page.evaluate(()=>{
   playMode='endless';startGame();stopMoveScheduler();hp=99;notes=[];pendingCheck=[];nextBeat=0;songStart=ctx.currentTime-30;
   const original=onBeat;window.beatsAfterWarp=0;onBeat=(n,t)=>{if(!window.bufferedWarp){window.bufferedWarp=true;nextEndlessCourse(t);stopMoveScheduler();}else{window.beatsAfterWarp++;original(n,t);}};
  });await page.waitForFunction(()=>window.bufferedWarp);assert.ok(await page.evaluate(()=>nextBeat<4&&window.beatsAfterWarp<4&&hp===99));
  // Original time limit: finishing the music before the portal ends the run, without looping.
  await page.evaluate(()=>{playMode='endless';startGame();stopMoveScheduler();hp=99;notes=[];pendingCheck=[];nextBeat=10000;songStart=ctx.currentTime-songBuf.duration-1;});await page.waitForFunction(()=>state==='over');assert.equal(await page.evaluate(()=>endReason),'song_end');
  assert.deepEqual(errors,[]);console.log('PASS: 35-cell warp, original .12s lead + 4 beats, media restart, speed cap, HP/score/combo, rush landing, resume, retry, portal, mobile layouts, other modes, song end');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
