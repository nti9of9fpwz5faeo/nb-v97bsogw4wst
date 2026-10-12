const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v101-endless';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.addInitScript(()=>localStorage.setItem('neon-blade-tutorial-courses-v1',JSON.stringify({step:2,complete:true})));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  await page.locator('[data-nav="songs"]').click();await page.locator('[data-song-mode="endless"]').click();
  await page.locator('[data-song-file="audio/Futuristic Action.mp3"]').click();await page.waitForFunction(()=>state==='play'&&songTime()>.65);
  // The actual audio source survives a real 35th move; its clock, HP and scoring survive too.
  const warp=await page.evaluate(()=>{
   stopMoveScheduler();hp=4;recordSteps=210;moveSteps=34;combo=21;rushUnits=44;notes=[];pendingCheck=[];moveLocked=false;
   player={idx:34,from:34,at:-9};lineK=LINES.length-1;revealEnd=EXIT_INDEX;gIdx=gIndexFor(lineK);
   window.songStarts=0;window.songStops=0;const src=songSrc,stop=src.stop.bind(src);src.stop=(...a)=>{window.songStops++;return stop(...a);};
   const create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const src=create(),start=src.start.bind(src);src.start=(...a)=>{if(src.buffer===songBuf){window.songStarts++;window.lastStart={at:a[0],offset:a[1],rate:src.playbackRate.value};}return start(...a);};return src;};
   const t=songTime(),old={start:songStart,source:sourceSongPosition(t),beat:beatTime(1)};
   freeMove(t,null);stopMoveScheduler();window.switchAt=endlessClock.segments.at(-1).t;
   return {sameSource:songSrc===src,sameClock:songStart===old.start,samePosition:sourceSongPosition(t)===old.source,pastBeat:beatTime(1)===old.beat,goal:GOAL_INDEX,length:path.length,idx:player.idx,lap,rate,hp,recordSteps,moveSteps,combo,rushUnits,locked:moveLocked,loop:songSrc.loop,pass:timingHistoryRun.pass,starts:window.songStarts,stops:window.songStops,first:nextBeat,intro:endlessIntroBeat,at:window.switchAt,beat:beatTime(nextBeat)};
  });
  assert.ok(warp.sameSource&&warp.sameClock&&warp.samePosition&&warp.pastBeat&&warp.locked&&warp.loop);
  assert.deepEqual([warp.goal,warp.length,warp.idx,warp.lap,warp.rate,warp.hp,warp.recordSteps,warp.moveSteps,warp.combo,warp.rushUnits,warp.pass,warp.starts,warp.stops],[35,40,0,1,1.1,4,212,35,21,44,1,0,0]);assert.equal(warp.intro-warp.first,4);assert.equal(warp.at,warp.beat);
  await page.waitForFunction(()=>songTime()>window.switchAt+.1);
  assert.ok(await page.evaluate(()=>Math.abs(songSrc.playbackRate.value-1.1)<1e-6&&sourceSongPosition(songTime())>window.switchAt));
  // Four preparation beats, and the same ±45 ms Perfect window after acceleration.
  const rhythm=await page.evaluate(()=>{
   stopMoveScheduler();const first=endlessIntroBeat-4;notes=[{id:9001,idx:7,from:7,at:0,pop:0,hp:1}];pendingCheck=[];
   for(let n=first;n<endlessIntroBeat;n++)onBeat(n,beatTime(n));const before=notes[0].idx;
   onBeat(endlessIntroBeat,beatTime(endlessIntroBeat));const after=notes[0].idx;
   const samples=[];for(let n=first-1;n<first+12;n++){for(const d of [-.044,0,.044]){const t=beatTime(n)+d;const nearest=nearestBeat(t);samples.push({same:nearest===n,word:judgeOf(t-beatTime(nearest))});}}
   notes=[{id:9002,idx:player.idx,from:player.idx,at:0,pop:0,hp:1}];const perfect=counts.PERFECT;doAction('break',endlessIntroBeat+1,beatTime(endlessIntroBeat+1),0,null);
   const judged=counts.PERFECT===perfect+1&&notes.length===0;pauseGame();return {before,after,samples,judged};
  });assert.equal(rhythm.before,7);assert.equal(rhythm.after,6);assert.ok(rhythm.judged);for(const x of rhythm.samples)assert.deepEqual(x,{same:true,word:'PERFECT'});
  // Pause before the scheduled speed boundary, then resume at the same media offset.
  await page.evaluate(()=>{startGame();stopMoveScheduler();nextEndlessCourse(songTime());stopMoveScheduler();pauseGame();window.resumeExpected=Math.max(0,endlessClock.source(pausedAt+timingMs/1000));resumeGame();});
  await page.waitForFunction(()=>state==='play');
  assert.ok(await page.evaluate(()=>Math.abs(window.lastStart.offset-window.resumeExpected)<1e-7));
  await page.waitForFunction(()=>songTime()>endlessClock.segments.at(-1).t+.1);
  assert.ok(await page.evaluate(()=>Math.abs(songSrc.playbackRate.value-rate)<1e-6));
  await page.evaluate(()=>{stopMoveScheduler();pauseGame();});
  // Rush landing still protects the final tile before warping.
  const rush=await page.evaluate(()=>{
   startGame();stopMoveScheduler();notes=[];moveLocked=false;lineK=LINES.length-1;player={idx:30,from:30,at:-9};
   const t=1;hp=99;rushAnim={from:30,to:35,t0:t-.6,moveAt:t,dur:.5,blown:[],moved:false,trail:30};rushGuardUntil=t+1.1;
   drawRushAnim(t);const first={idx:player.idx,lap};drawRushAnim(t+.5);checkLines(t+.5);const landingLap=lap;checkLines(t+1.11);stopMoveScheduler();pauseGame();return {first,landingLap,lap,idx:player.idx,moveSteps};
  });assert.deepEqual(rush,{first:{idx:35,lap:0},landingLap:0,lap:1,idx:0,moveSteps:5});
  // Repeated warps cannot start another source or exceed the old 2.2x cap.
  const cap=await page.evaluate(()=>{
   startGame();stopMoveScheduler();hp=99;const src=songSrc,starts=window.songStarts;
   for(let i=0;i<15;i++){player={idx:35,from:35,at:0};lineK=LINES.length-1;notes=[];checkLines(Math.max(0,songTime()));stopMoveScheduler();}
   const r={rate,lap,goal:GOAL_INDEX,length:path.length,pass:timingHistoryRun.pass,same:src===songSrc,starts:window.songStarts-starts};pauseGame();return r;
  });assert.deepEqual(cap,{rate:2.2,lap:15,goal:35,length:40,pass:1,same:true,starts:0});
  // A short real buffer loops in the frame loop without moving the player or speeding up.
  await page.evaluate(()=>{
   window.realSong=song;window.realBuf=songBuf;setSong({...song,bpm:150,offset:.1,gameplayEnd:undefined});songBuf=ctx.createBuffer(1,ctx.sampleRate*1.7,ctx.sampleRate);startGame();stopMoveScheduler();hp=99;player={idx:2,from:2,at:0};window.loopSource=songSrc;window.loopStartCount=window.songStarts;
  });await page.waitForFunction(()=>endlessSongCycle>=2);
  assert.ok(await page.evaluate(()=>state==='play'&&songSrc===window.loopSource&&lap===0&&rate===1&&player.idx===2&&timingHistoryRun.pass===2&&window.songStarts===window.loopStartCount));
  await page.evaluate(()=>{pauseGame();window.afterLoopOffset=endlessClock.position(pausedAt+timingMs/1000);window.afterLoopCycle=endlessSongCycle;resumeGame();});
  await page.waitForFunction(()=>state==='play');
  assert.ok(await page.evaluate(()=>Math.abs(window.lastStart.offset-window.afterLoopOffset)<1e-7&&endlessSongCycle===window.afterLoopCycle&&lap===0&&player.idx===2));
  // Fixed chart indices and accents repeat with the actual audio duration, including correction.
  const chart=await page.evaluate(async()=>{
   pauseGame();const sg=SONGS.find(s=>s.name==='Neon Rush');chartCache[sg.chart]=await(await fetch(sg.chart)).json();setSong(sg);songBuf=window.realBuf;startGame();stopMoveScheduler();pauseGame();
   const count=endlessClock.beatCount,rows=[];
   for(let n=0;n<20;n++)rows.push({same:chartVal(n)===chartVal(n+count)&&chartPurple(n,.15)===chartPurple(n+count,.15),delta:beatTime(n+count)-beatTime(n)});
   return {rows,duration:songBuf.duration};
  });for(const r of chart.rows){assert.ok(r.same);assert.ok(Math.abs(r.delta-chart.duration)<1e-8);}
  // A queued action can warp during onBeat without consuming stale beats or old deadlines.
  await page.evaluate(()=>{
   setSong(window.realSong);songBuf=window.realBuf;startGame();stopMoveScheduler();hp=99;notes=[];pendingCheck=[];
   const n=nextBeat;player={idx:34,from:34,at:0};lineK=LINES.length-1;moveLocked=false;earlyInput={n,type:'move',time:beatTime(n),diff:0,rec:null};
  });await page.waitForFunction(()=>lap===1);
  assert.ok(await page.evaluate(()=>player.idx===0&&nextBeat>=1&&pendingCheck.every(p=>p.n>=endlessIntroBeat-4)&&hp===99));
  // Local mobile portal view and mode isolation.
  await page.evaluate(()=>{stopMoveScheduler();pauseGame();document.querySelectorAll('.overlay').forEach(e=>e.classList.add('hide'));NBWorkshop.clearToasts();player={idx:33,from:33,at:-9};lineK=LINES.length-1;gIdx=gIndexFor(lineK);revealEnd=EXIT_INDEX;cameraFrom=cameraTarget=Math.max(0,path[35].r-2);cameraAt=-9;notes=[];});
  for(const size of [{width:360,height:640},{width:412,height:915}]){await page.setViewportSize(size);await page.evaluate(()=>{layout();draw(pausedAt);});assert.ok(await page.locator('#bMove').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));await page.screenshot({path:path.join(out,'warp-'+size.width+'.png')});}
  const modes=await page.evaluate(()=>{const rows=[];for(const mode of ['distance','normal','fullsong','shuttle']){playMode=mode;startGame();stopMoveScheduler();rows.push({mode,clock:endlessClock,loop:songSrc.loop,beat:beatTime(4)});pauseGame();}return rows;});for(const m of modes){assert.equal(m.clock,null);assert.equal(m.loop,false);assert.ok(Math.abs(m.beat-1.9)<1e-8);}
  const retry=await page.evaluate(()=>{playMode='endless';startGame();stopMoveScheduler();pauseGame();return {rate,lap,idx:player.idx,segments:endlessClock.segments.length,intro:endlessIntroBeat,cycle:endlessSongCycle};});assert.deepEqual(retry,{rate:1,lap:0,idx:0,segments:1,intro:4,cycle:1});
  assert.deepEqual(errors,[]);console.log('PASS: actual MP3 source continuity, beat-aligned acceleration, Perfect window, four-beat preparation, pending-speed pause/resume, rush landing, 15 warps/cap, actual song-end loop, repeated charts, queued warp, mobile, retry and mode isolation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
