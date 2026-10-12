const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v99-shuttle';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,origin=new URL(url).origin;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.addInitScript(()=>localStorage.setItem('neon-blade-tutorial-courses-v1',JSON.stringify({step:2,complete:true})));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(url);await page.waitForFunction(()=>state==='ready');await page.locator('[data-nav="songs"]').click();await page.locator('[data-song-mode="shuttle"]').click();
  await page.screenshot({path:path.join(out,'selection.png')});await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>playMode),'shuttle');
  await page.locator('[data-nav="songs"]').click();await page.locator('[data-song-file="audio/Futuristic Action.mp3"]').click();await page.waitForFunction(()=>state==='play');
  const initial=await page.evaluate(()=>{stopMoveScheduler();pauseGame();return {goal:GOAL_INDEX,length:path.length,duration:songBuf.duration,unique:new Set(path.map(p=>p.c+','+p.r)).size===path.length,adjacent:path.every((p,i)=>!i||Math.abs(p.c-path[i-1].c)+Math.abs(p.r-path[i-1].r)===1),gems:NBWorkshop.distanceGemPositions()};});
  assert.equal(initial.goal,80);assert.equal(initial.length,85);assert.ok(initial.duration>63&&initial.duration<65);assert.ok(initial.unique&&initial.adjacent);assert.deepEqual(initial.gems,[]);
  const gate=await page.evaluate(()=>{state='play';moveLocked=false;notes=[];pendingCheck=[];nextBeat=10000;lineK=6;player={idx:35,from:35,at:-9};const old={src:songSrc,clock:songStart,epoch:musicEpoch};checkLines(1);const r={gate:shuttleGate,count:courseLap,idx:player.idx,goal:GOAL_INDEX,rate,lap,same:old.src===songSrc&&old.clock===songStart&&old.epoch===musicEpoch};pauseGame();return r;});
  assert.deepEqual(gate,{gate:35,count:1,idx:35,goal:80,rate:1,lap:0,same:true});
  const arrived=await page.evaluate(()=>{state='play';player={idx:80,from:80,at:0};notes=[{id:999,idx:82,from:82,at:-9,pop:-9,hp:1,purple:true}];checkLines(2);const r={state,arrived:shuttleArrived,goal:GOAL_INDEX,idx:player.idx,gate:shuttleGate,purple:notes.some(n=>n.purple),lap,rate};pauseGame();return r;});
  assert.deepEqual(arrived,{state:'play',arrived:true,goal:80,idx:80,gate:70,purple:false,lap:0,rate:1});
  // Goal stops movement; break still destroys incoming notes and missed defense costs life.
  const defense=await page.evaluate(()=>{state='play';moveLocked=false;notes=[{id:1001,idx:80,from:80,at:-9,pop:-9,hp:1}];pendingCheck=[];hp=4;const before=counts.PERFECT;doAction('break',30,12,0,null);const broke=notes.length===0&&counts.PERFECT===before+1;freeMove(12,null);notes=[{id:1002,idx:80,from:80,at:-9,pop:-9,hp:1}];hurtGuardUntil=-9;rushGuardUntil=-9;checkHit(13);const r={broke,idx:player.idx,hp,state};pauseGame();return r;});
  assert.deepEqual(defense,{broke:true,idx:80,hp:3,state:'play'});
  for(const size of [{width:360,height:640},{width:390,height:844},{width:412,height:915}]){
   await page.setViewportSize(size);await page.evaluate(()=>{lineK=LINES.length-1;gIdx=gIndexFor(lineK);revealEnd=EXIT_INDEX;revealFrom=EXIT_INDEX;cameraFrom=cameraTarget=Math.max(0,path[GOAL_INDEX].r-2);cameraAt=-9;notes=[];document.querySelectorAll('.overlay').forEach(e=>e.classList.add('hide'));layout();updateWarpHud();draw(pausedAt);});
   assert.ok(await page.locator('#bMove').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));assert.ok(await page.locator('#warpHud').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));await page.screenshot({path:path.join(out,'goal-'+size.width+'.png')});
  }
  // The real frame loop must wait until audio end, then offer five seconds of rest.
  await page.evaluate(()=>{state='play';nextBeat=10000;notes=[];pendingCheck=[];songStart=outputTime()-songBuf.duration-.05;});await page.waitForFunction(()=>state==='roundrest');
  assert.ok(await page.evaluate(()=>lap===0&&rate===1&&fullSongRest.until-ctx.currentTime>4.5));
  // Pause during rest freezes the countdown; resuming rest leads to a longer fresh round.
  await page.evaluate(()=>pauseGame());assert.equal(await page.evaluate(()=>state),'paused');await page.evaluate(()=>{resumeGame();fullSongRest.until=ctx.currentTime-.1;});await page.waitForFunction(()=>state==='play'&&lap===1);
  const restart=await page.evaluate(()=>{stopMoveScheduler();pauseGame();return {goal:GOAL_INDEX,idx:player.idx,rate,hp,arrived:shuttleArrived,sourceRate:songSrc?.playbackRate.value??rate};});assert.deepEqual(restart,{goal:85,idx:0,rate:1.1,hp:3,arrived:false,sourceRate:1.1});
  const cap=await page.evaluate(()=>{for(let i=0;i<15;i++){restartFullSong();stopMoveScheduler();}const r={goal:GOAL_INDEX,rate,unique:new Set(path.map(p=>p.c+','+p.r)).size===path.length};pauseGame();return r;});assert.deepEqual(cap,{goal:110,rate:2.2,unique:true});
  // A song ending one tile short must fail; it cannot silently advance to another round.
  await page.evaluate(()=>{startGame();stopMoveScheduler();hp=4;nextBeat=10000;notes=[];pendingCheck=[];player={idx:79,from:79,at:0};songStart=outputTime()-songBuf.duration-.05;});await page.waitForFunction(()=>state==='over');
  assert.ok(await page.evaluate(()=>endReason==='shuttle_timeout'&&lap===0&&!fullSongRest&&finishedRun.mode==='shuttle'&&finishedRun.goalDistance===80&&finishedRun.roundsCleared===0));
  await page.waitForFunction(()=>document.querySelector('#overOv [data-result-reason]').textContent.includes('時間切れ'));
  await page.screenshot({path:path.join(out,'timeout-result.png')});
  // Tutorial remains independent of the saved new mode.
  await page.evaluate(()=>{returnToSongs();setSong(SONGS[0]);startGame();stopMoveScheduler();pauseGame();});assert.ok(await page.evaluate(()=>isTutorial()&&!shuttleOn()&&!speedOn()&&GOAL_INDEX===NBTutorial.goal));
  assert.deepEqual(errors,[]);console.log('PASS: shuttle selection/persistence, actual 64-second audio, 80→85→110 distance, continuous gates, goal defense, mobile layout, rest pause/resume, acceleration cap, timeout/result, diamond removal and tutorial isolation');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
