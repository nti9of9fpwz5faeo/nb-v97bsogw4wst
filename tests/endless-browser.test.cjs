const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v87-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  await page.evaluate(()=>{
   playMode='endless';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*5.4,ctx.sampleRate);
   activeChart={beats:[.12,.61,1.13,1.60,2.13,2.61,3.12,3.62,4.13,4.61,5.13],spawn:{normal:[1,0,2,0,1]},accents:[1,.5,1,.5,1]};diagOn=true;NBMeasure.arm();startGame();
   window.savedSource=songSrc;window.savedStart=songStart;hp=99;
  });
  await page.waitForFunction(()=>songTime()>3.2);
  const first=await page.evaluate(()=>({path:path.length,goal:GOAL_INDEX,exit:EXIT_INDEX,rows:ROWS,loop:songSrc.loop}));
  assert.equal(first.path,55);assert.equal(first.goal,50);assert.equal(first.exit,54);assert.ok(first.rows>11);assert.equal(first.loop,true);
  // Artificially large score cannot trigger a course; only actual position can.
  const transition=await page.evaluate(()=>{
   stopMoveScheduler();recordSteps=999;player.idx=49;player.from=49;player.at=-9;lineK=LINES.length-1;notes=[];pendingCheck=[];moveLocked=false;
   checkLines(songTime());const before=rate,beat=nextBeat,now=songTime();effects=[{idx:49,t:now,d:.4}];
   window.cancelledVoice=false;moveVoices.add({stop(){window.cancelledVoice=true;}});freeMove(now,null);stopMoveScheduler();
   return {before,rate,idx:player.idx,lap,beatBefore:beat,beatAfter:nextBeat,sameSource:songSrc===window.savedSource,sameStart:songStart===window.savedStart,
    cancelledVoice:window.cancelledVoice,stage:document.getElementById('app').dataset.endlessStage,events:diagRun.events.filter(e=>['speed_up','course_continue','warp'].includes(e.type)),notes:notes.length,gIdx};
  });
  assert.equal(transition.cancelledVoice,true);assert.equal(transition.before,1);assert.equal(transition.rate,1.1);assert.equal(transition.idx,0);assert.equal(transition.lap,1);assert.equal(transition.beatBefore,transition.beatAfter);assert.ok(transition.sameSource&&transition.sameStart);assert.equal(transition.stage,'1');assert.equal(transition.notes,0);assert.equal(transition.gIdx,8);assert.equal(transition.events.some(e=>e.type==='warp'),false);
  const speed=transition.events.find(e=>e.type==='speed_up');assert.ok(speed.sourceSongTimeSec>.1);assert.equal(speed.courseSteps,50);
  // Live audio crosses its actual end without an ended/restart callback or gameplay reset.
  await page.evaluate(()=>{notes=[{id:80001,idx:30,from:30,at:songTime(),pop:-9,hp:1}];window.seamNote=notes[0];player.idx=6;player.from=6;player.at=-9;window.seamBeat=nextBeat;});
  await page.waitForFunction(()=>endlessCycle>=1);
  const seam=await page.evaluate(()=>({state,sameSource:songSrc===window.savedSource,beatAdvanced:nextBeat>window.seamBeat,keptNote:notes.includes(window.seamNote),idx:player.idx,rear:rearClear,
   frontAlpha:rearTileAlpha(player.idx,songTime()),aheadAlpha:rearTileAlpha(player.idx+1,songTime()),pass:timingHistoryRun.pass,chart:[chartVal(endlessClock.beatCount),chartVal(endlessClock.beatCount+2)]}));
  assert.equal(seam.state,'play');assert.ok(seam.sameSource&&seam.beatAdvanced&&seam.keptNote);assert.equal(seam.idx,6);assert.equal(seam.rear.to,5);assert.equal(seam.frontAlpha,1);assert.equal(seam.aheadAlpha,1);assert.equal(seam.pass,2);assert.deepEqual(seam.chart,[1,2]);
  // Real input path on both sides of a rate boundary and of the repeating chart seam.
  const judged=await page.evaluate(()=>{
   stopMoveScheduler();const saved=songTime;let now=0;songTime=()=>now;const result=[];let id=91000;
   const boundary=endlessClock.nearest(endlessClock.segments[1].t),seam=endlessClock.beatCount;
   for(const n of [boundary-1,boundary+1,seam-1,seam]){
    for(const delta of [-.02,.02]){
     now=beatTime(n)+delta;nextBeat=n+1;acted=-1;moveLocked=false;NBDiamond.reset();hurtGuardUntil=-9;rushGuardUntil=-9;
     notes=[{id:id++,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:1}];input('break',{timeStamp:0},'test');
     result.push(NBTimingHistory.snapshot(timingHistoryRun).inputs.at(-1));
    }
   }
   songTime=saved;nextBeat=Math.max(nextBeat,endlessClock.nearest(songTime())+1);return result;
  });
  assert.equal(judged.length,8);for(let i=0;i<judged.length;i++){assert.equal(judged[i].judge,'PERFECT',JSON.stringify(judged[i]));assert.equal(judged[i].offsetMs,i%2?20:-20);}
  // Guide reservations use the new piecewise mapping without adding the manual offset.
  await page.waitForFunction(()=>{const t=ctx.currentTime-songStart;let n=nearestBeat(t);if(beatTime(n)<=t)n++;return beatTime(n)-t<.09;});
  const guides=await page.evaluate(()=>{
   const old=playGuideClick,captured=[];playGuideClick=(n,at)=>captured.push({n,at,expected:songStart+beatTime(n)});guideOn=true;
   const t=ctx.currentTime-songStart;nextBeat=nearestBeat(t);if(beatTime(nextBeat)<=t)nextBeat++;startMoveScheduler();stopMoveScheduler();playGuideClick=old;return captured;
  });assert.ok(guides.length>0);for(const v of guides)assert.ok(Math.abs(v.at-v.expected)<1e-10);
  // Six scenes, all checkpoints, all five course layouts and mobile proportions.
  await page.evaluate(()=>{pauseGame();});
  const signatures=[];
  for(let stage=0;stage<6;stage++){
   signatures.push(await page.evaluate(stage=>{rate=1+stage*.1;applyRate();setPalette(0);setStepsHud();NBWorkshop.clearToasts();hideJudge();diagOn=false;document.getElementById('diagLine').classList.add('hide');charState='idle';charUntil=0;effects=[];fx=[];texts=[];player.idx=0;player.from=0;player.at=-9;lineK=0;cameraRow=0;cameraFrom=0;cameraTarget=0;revealEnd=REVEAL_ENDS[0];notes=[];document.getElementById('pauseOv').classList.add('hide');draw(pausedAt);return getComputedStyle(document.getElementById('app')).backgroundImage;},stage));
   await page.screenshot({path:path.join(out,`stage-${stage}.png`)});
  }assert.equal(new Set(signatures).size,6);
  const view=await page.evaluate(()=>{
   const results=[];
   for(let id=0;id<5;id++){
    path.splice(0,path.length,...NBCourses.build(id,true));ROWS=Math.max(...path.map(p=>p.r))+1;
    for(let k=0;k<LINES.length;k++){
     lineK=k;player.idx=k?LINES[k-1]:0;player.from=player.idx;player.at=-9;gIdx=gIndexFor(k);advanceView(pausedAt);cameraRow=cameraTarget;
     results.push({id,k,p:path[player.idx].r-cameraTarget,g:path[gIdx].r-cameraTarget,reveal:revealEnd>=gIdx});
    }
   }return results;
  });for(const x of view){assert.ok(x.p>=0&&x.p<5,JSON.stringify(x));assert.ok(x.g>=0&&x.g<5,JSON.stringify(x));assert.equal(x.reveal,true);}
  for(const size of [{width:360,height:640},{width:412,height:915},{width:768,height:1024}]){
   await page.setViewportSize(size);await page.evaluate(()=>{lineK=0;player.idx=0;player.from=0;gIdx=gIndexFor(0);cameraFrom=0;cameraTarget=0;cameraRow=0;layout();});
   assert.ok(await page.evaluate(()=>{const c=cv.getBoundingClientRect(),b=document.getElementById('bMove').getBoundingClientRect();return c.width<=innerWidth&&b.bottom<=innerHeight;}));
   await page.screenshot({path:path.join(out,`viewport-${size.width}.png`)});
  }
  // Resume uses the same source position after a rate change, including after a loop.
  await page.evaluate(()=>{rate=1.1;applyRate();state='play';pauseGame();window.pauseSource=sourceSongPosition(pausedAt);window.resumeOffset=null;const create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const src=create(),start=src.start.bind(src);src.start=(at,offset)=>{window.resumeOffset=offset;return start(at,offset);};return src;};resumeGame();});
  await page.waitForFunction(()=>state==='play');assert.ok(await page.evaluate(()=>Math.abs(window.resumeOffset-window.pauseSource)<1e-8));
  // Rate cap, retained last scene, no reset of source, HP or accumulated records.
  const cap=await page.evaluate(()=>{
   stopMoveScheduler();notes=[];hp=99;for(let i=0;i<14;i++){player.idx=50;player.from=50;lineK=LINES.length-1;checkLines(songTime());stopMoveScheduler();}
   return {rate,stage:endlessStage(),hp,steps:recordSteps,measure:NBMeasure.finish({counts})};
  });assert.equal(cap.rate,2.2);assert.equal(cap.stage,5);assert.equal(cap.hp,99);assert.ok(cap.steps>=999);assert.ok(cap.measure.transitions.some(e=>e.type==='speed_up'));assert.ok(cap.measure.transitions.some(e=>e.type==='song_loop'));assert.ok(cap.measure.courses>=15);
  const ultimate=await page.evaluate(()=>{
   playMode='endless';endless=true;startGame();stopMoveScheduler();moveLocked=false;notes=[];player.idx=45;player.from=45;lineK=7;recordSteps=0;moveSteps=0;
   const t=Math.max(0,songTime());rushAnim={t0:t-.6,moveAt:t,from:45,to:50,dur:.5,moved:false,blown:[]};rushGuardUntil=t+2;
   drawRushAnim(t);stopMoveScheduler();return {rate,idx:player.idx,moveSteps,lap,rush:!!rushAnim};
  });assert.deepEqual(ultimate,{rate:1.1,idx:0,moveSteps:5,lap:1,rush:false});
  // Purchased themes still supply palette; stage motifs continue to change.
  await page.evaluate(()=>{returnToSongs();NBWorkshop.shoppingGift();});await page.click('[data-nav="shop"]');await page.click('#themeCatalogOpen');await page.click('[data-theme="aurora"]');await page.click('[data-theme="aurora"]');await page.click('#collectionClose');
  assert.ok(await page.evaluate(()=>{startGame();stopMoveScheduler();rate=1.4;applyRate();setPalette(0);const theme=NBProgression.themes.find(x=>x.id==='aurora');return document.getElementById('app').style.getPropertyValue('--sky1')===theme.colors[0]&&endlessStage()===4;}));
  // Retry resets speed/background. Other modes retain 35 steps and their old music rule.
  const modes=await page.evaluate(()=>{
   startGame();stopMoveScheduler();const retry={rate,stage:endlessStage(),cycle:endlessCycle};
   const result=[];for(const mode of ['distance','normal']){playMode=mode;endless=mode!=='normal';startGame();stopMoveScheduler();result.push({mode,goal:GOAL_INDEX,length:path.length,loop:songSrc.loop,stage:document.getElementById('app').dataset.endlessStage??null});}
   setSong(SONGS[0]);startGame();stopMoveScheduler();result.push({mode:'tutorial',goal:GOAL_INDEX,length:path.length,loop:songSrc.loop});pauseGame();return {retry,result};
  });assert.deepEqual(modes.retry,{rate:1,stage:0,cycle:0});for(const m of modes.result){assert.equal(m.goal,35);assert.equal(m.length,40);assert.equal(m.loop,false);if(m.mode!=='tutorial')assert.equal(m.stage,null);}
  // Offline Web Audio samples prove the shared mapping matches real rate integration at the loop seam.
  const audioError=await page.evaluate(async()=>{
   const sr=48000,c=new OfflineAudioContext(1,sr*3,sr),b=c.createBuffer(1,sr,sr),samples=b.getChannelData(0);for(let i=0;i<sr;i++)samples[i]=i/sr;
   const src=c.createBufferSource();src.buffer=b;src.loop=true;src.connect(c.destination);src.playbackRate.setValueAtTime(1,0);src.playbackRate.setValueAtTime(1.1,.4);src.playbackRate.setValueAtTime(2.2,1.6);src.start();
   const map=NBEndlessClock.create({duration:1,bpm:120});map.change(.4,1.1);map.change(1.6,2.2);
   const rendered=(await c.startRendering()).getChannelData(0);let error=0;for(const t of [.399,.401,.94,.946,1.599,1.601,1.72,2.4,2.99])error=Math.max(error,Math.abs(rendered[Math.round(t*sr)]-map.position(t)));return error;
  });assert.ok(audioError<.001,String(audioError));assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({status:'PASS',transition,seam,judged:judged.map(x=>({judge:x.judge,offsetMs:x.offsetMs,source:x.songTimeSec})),guides,view,modes,audioError,pageErrors:errors},null,2));
  console.log('PASS: 50 cells, actual-position transition, continuous audio, loop preservation, judgments ±20ms, guides, 6 scenes, cameras, pause/resume, cap, telemetry, themes, other modes, offline audio');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
