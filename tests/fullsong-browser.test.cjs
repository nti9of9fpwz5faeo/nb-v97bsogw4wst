const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v96-fullsong';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=process.env.PUBLIC_URL||'http://127.0.0.1:'+server.address().port,origin=new URL(url).origin;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('neon-blade-tutorial-courses-v1',JSON.stringify({step:2,complete:true})));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(url);await page.waitForFunction(()=>state==='ready').catch(async e=>{console.log('BOOT',errors,await page.evaluate(()=>({state,body:document.body.innerText.slice(-2000)})));throw e;});await page.locator('[data-nav="songs"]').click();
  await page.locator('[data-song-mode="fullsong"]').click();assert.equal(await page.locator('[data-song-mode="fullsong"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#modeDesc').textContent(),/ワープしても曲と速度はそのまま/);
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});assert.ok(await page.locator('[data-song-mode="fullsong"]').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));}
  await page.screenshot({path:path.join(out,'mode-selection.png')});
  await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>playMode),'fullsong');
  await page.evaluate(async()=>{
   const sg=SONGS.find(s=>s.name==='Sombra en Movimiento');chartCache[sg.chart]=await(await fetch(sg.chart)).json();setSong(sg);songBuf=ctx.createBuffer(1,ctx.sampleRate*12,ctx.sampleRate);diagOn=true;NBMeasure.arm();startGame();stopMoveScheduler();pauseGame();
  });
  const warp=await page.evaluate(()=>{
   state='play';startMusicAt();stopMoveScheduler();hp=4;recordSteps=40;moveSteps=34;combo=21;maxCombo=21;rushUnits=44;notes=[];pendingCheck=[];moveLocked=false;
   nextBeat=12;player={idx:34,from:34,at:-9};lineK=LINES.length-1;gIdx=gIndexFor(lineK);revealEnd=EXIT_INDEX;
   const old={src:songSrc,start:songStart,epoch:musicEpoch,nextBeat,pass:timingHistoryRun.pass};freeMove(2,null);
   const r={idx:player.idx,courseLap,lap,rate,hp,recordSteps,moveSteps,combo,rushUnits,locked:moveLocked,sameSource:old.src===songSrc,sameClock:old.start===songStart&&old.epoch===musicEpoch,sameBeat:old.nextBeat===nextBeat,pass:timingHistoryRun.pass};pauseGame();return r;
  });
  assert.deepEqual(warp,{idx:0,courseLap:1,lap:0,rate:1,hp:4,recordSteps:42,moveSteps:35,combo:21,rushUnits:44,locked:true,sameSource:true,sameClock:true,sameBeat:true,pass:1});
  // End-of-song is driven through the actual frame loop, at a non-portal tile.
  await page.evaluate(()=>{
   state='play';player={idx:7,from:7,at:0};lineK=1;gIdx=gIndexFor(lineK);notes=[];pendingCheck=[];nextBeat=10000;window.beforeSource=songSrc;window.beforeEpoch=musicEpoch;songStart=ctx.currentTime-songBuf.duration-1;
  });await page.waitForFunction(()=>lap===1);
  const loop=await page.evaluate(()=>{stopMoveScheduler();const r={state,idx:player.idx,courseLap,lap,rate,hp,recordSteps,moveSteps,combo,rushUnits,newSource:!!songSrc&&songSrc!==window.beforeSource,epoch:musicEpoch-window.beforeEpoch,pass:timingHistoryRun.pass,beat:nextBeat,locked:moveLocked,rateValue:songSrc.playbackRate.value,reason:diagRun.events.findLast(e=>e.type==='audio_restart').reason};pauseGame();return r;});
  assert.equal(loop.state,'play');assert.equal(loop.idx,7);assert.equal(loop.courseLap,1);assert.equal(loop.lap,1);assert.equal(loop.rate,1.1);assert.equal(loop.hp,4);assert.equal(loop.recordSteps,42);assert.equal(loop.combo,21);assert.equal(loop.rushUnits,44);assert.ok(loop.newSource&&loop.locked);assert.equal(loop.epoch,1);assert.equal(loop.pass,2);assert.ok(loop.beat<4);assert.ok(Math.abs(loop.rateValue-1.1)<1e-6);assert.equal(loop.reason,'song_end');
  // Warp after acceleration keeps rate and source; successive song loops cap at 2.2.
  const cap=await page.evaluate(()=>{
   state='play';startMusicAt();const src=songSrc;player={idx:35,from:35,at:0};lineK=LINES.length-1;checkLines(1);const same=src===songSrc&&rate===1.1&&lap===1;
   for(let i=0;i<15;i++){restartFullSong();stopMoveScheduler();}const r={same,rate,lap,courseLap,pass:timingHistoryRun.pass};pauseGame();return r;
  });assert.deepEqual(cap,{same:true,rate:2.2,lap:16,courseLap:2,pass:17});
  // Pausing and resuming an accelerated song restores its source offset, not the beginning.
  await page.evaluate(()=>{pausedAt=2;window.starts=[];const create=ctx.createBufferSource.bind(ctx);ctx.createBufferSource=()=>{const src=create(),start=src.start.bind(src);src.start=(at,offset)=>{window.starts.push({offset,rate:src.playbackRate.value});return start(at,offset);};return src;};resumeGame();});
  await page.waitForFunction(()=>state==='play');assert.ok(await page.evaluate(()=>Math.abs(window.starts.at(-1).offset-4.4)<1e-6));await page.evaluate(()=>{stopMoveScheduler();pauseGame();});
  // A negative judgment calibration must not cut off the end of the audible song.
  await page.evaluate(()=>{startGame();stopMoveScheduler();timingMs=-250;hp=4;notes=[];pendingCheck=[];nextBeat=10000;songStart=outputTime()-(songBuf.duration-.15);});
  assert.equal(await page.evaluate(()=>lap),0);await page.waitForFunction(()=>lap===1);await page.evaluate(()=>{stopMoveScheduler();pauseGame();timingMs=0;});
  // A portal reached at the song boundary counts one warp and one audio restart.
  await page.evaluate(()=>{startGame();stopMoveScheduler();hp=4;notes=[];pendingCheck=[];nextBeat=10000;player={idx:35,from:35,at:0};lineK=LINES.length-1;songStart=ctx.currentTime-songBuf.duration-1;});
  await page.waitForFunction(()=>lap===1);assert.ok(await page.evaluate(()=>courseLap===1&&rate===1.1&&player.idx===0&&timingHistoryRun.pass===2));await page.evaluate(()=>{stopMoveScheduler();pauseGame();});
  // A song ending during an ultimate waits for the movement before resetting its clock.
  await page.evaluate(()=>{startGame();stopMoveScheduler();hp=4;notes=[];pendingCheck=[];nextBeat=10000;player={idx:5,from:5,at:0};lineK=1;gIdx=gIndexFor(lineK);songStart=ctx.currentTime-songBuf.duration-.05;const t=songTime();rushAnim={from:5,to:10,t0:t-.3,moveAt:t+.15,dur:.2,blown:[],moved:false,trail:5};rushGuardUntil=t+.7;});
  await page.waitForFunction(()=>lap===1);assert.ok(await page.evaluate(()=>player.idx===10&&moveSteps===5&&hp===4&&!rushAnim));
  await page.evaluate(()=>{stopMoveScheduler();pauseGame();});
  // End-of-song clears mining's old beat lock and keeps the run, then HP loss ends normally.
  const result=await page.evaluate(()=>{
   state='play';const diamond={id:999,idx:player.idx,from:player.idx,at:0,hp:4,maxHp:4,diamond:true,gem:{type:'novice'}};notes=[diamond];NBDiamond.strike(diamond,100,1,0,null);const miningBefore=NBDiamond.active();restartFullSong();stopMoveScheduler();const miningAfter=NBDiamond.locked();
   const oldKey=`neon-blade-rush-manual-best-v1:${song.file}:${runDifficulty}:`+activeChart.chartVersion;localStorage.setItem(oldKey,'9999');recordSteps=123;hp=0;endReason='hp';end(false);finishResultReveal();
   return {miningBefore,miningAfter,state,mode:finishedRun.mode,score:finishedRun.score,best:finishedRun.best,old:localStorage.getItem(oldKey),help:document.querySelector('#overOv .scoreHelp p').textContent,reason:endReason};
  });assert.ok(result.miningBefore&&!result.miningAfter);assert.equal(result.state,'over');assert.equal(result.mode,'fullsong');assert.equal(result.score,123);assert.equal(result.best,123);assert.equal(result.old,'9999');await page.waitForFunction(()=>document.querySelector('#overOv .scoreHelp p').textContent.includes('ワープしても曲と速度は変わりません'));await page.evaluate(()=>finishResultReveal());assert.equal(result.reason,'hp');
  await page.screenshot({path:path.join(out,'fullsong-result.png')});
  const retry=await page.evaluate(()=>{startGame();stopMoveScheduler();const r={rate,lap,courseLap,idx:player.idx,hp,recordSteps,mode:playMode};pauseGame();return r;});assert.deepEqual(retry,{rate:1,lap:0,courseLap:0,idx:0,hp:5,recordSteps:0,mode:'fullsong'});
  assert.deepEqual(errors,[]);console.log('PASS: full-song UI/persistence/mobile, warp without audio restart, song-end acceleration, position/HP/score/combo retention, cap, resume, ultimate, mining reset, separate records and retry');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
