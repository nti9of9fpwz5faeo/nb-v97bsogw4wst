const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v97-checkpoints';fs.mkdirSync(out,{recursive:true});
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

  await page.evaluate(()=>{
   setSong(SONGS.find(s=>!s.tutorial));songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);diagOn=true;startGame();stopMoveScheduler();pauseGame();
   window.wallet=()=>Number(document.querySelector('[data-wallet]').textContent.replaceAll(',',''));window.initialWallet=window.wallet();
   window.advanceTo=(idx)=>{state='play';notes=[];pendingCheck=[];rushAnim=null;moveLocked=false;player={idx,from:idx,at:0};NBWorkshop.tick(1);};
  });
  assert.deepEqual(await page.evaluate(()=>NBWorkshop.distanceGemPositions()),[{distance:15,idx:15},{distance:30,idx:30}]);
  const first=await page.evaluate(()=>{
   advanceTo(14);combo=50;recordSteps=999;const before=wallet();freeMove(1,null);NBWorkshop.tick(1);NBWorkshop.tick(1);
   const r={award:wallet()-before,idx:player.idx,positions:NBWorkshop.distanceGemPositions(),events:diagRun.events.filter(e=>e.type==='distance_diamond').map(e=>e.distance)};pauseGame();return r;
  });assert.deepEqual(first,{award:1,idx:15,positions:[{distance:30,idx:30}],events:[15]});
  // Music restarts preserve the next distance and cannot award the same tile twice.
  const restart=await page.evaluate(()=>{state='play';restartFullSong();stopMoveScheduler();NBWorkshop.tick(0);const r={wallet:wallet()-initialWallet,positions:NBWorkshop.distanceGemPositions(),idx:player.idx,rate};pauseGame();return r;});
  assert.equal(restart.wallet,1);assert.equal(restart.idx,15);assert.equal(restart.rate,1.1);assert.equal(restart.positions[0].distance,30);
  const warp=await page.evaluate(()=>{advanceTo(29);freeMove(2,null);advanceTo(35);lineK=LINES.length-1;checkLines(2);const r={wallet:wallet()-initialWallet,courseLap,positions:NBWorkshop.distanceGemPositions(),rate};pauseGame();return r;});
  assert.deepEqual(warp,{wallet:2,courseLap:1,positions:[{distance:45,idx:10},{distance:60,idx:25}],rate:1.1});
  // Rush collects only when the visible character crosses the gem, including a jump over it.
  const rush=await page.evaluate(()=>{advanceTo(8);rushAnim={from:8,to:13,t0:0,moveAt:1,dur:.5,blown:[],moved:false,trail:8};rushGuardUntil=2;NBWorkshop.tick(.8);const before=wallet();drawRushAnim(1.5);NBWorkshop.tick(1.5);NBWorkshop.tick(1.6);const r={award:wallet()-before,idx:player.idx,positions:NBWorkshop.distanceGemPositions()};pauseGame();return r;});
  assert.equal(rush.award,1);assert.equal(rush.idx,13);assert.deepEqual(rush.positions,[{distance:60,idx:25}]);
  // A checkpoint coinciding with the 105th tile/portal is credited once before warping.
  const end=await page.evaluate(()=>{advanceTo(25);advanceTo(35);lineK=LINES.length-1;rushGuardUntil=-9;checkLines(3);advanceTo(20);advanceTo(34);lineK=LINES.length-1;freeMove(4,null);NBWorkshop.tick(4);const r={wallet:wallet()-initialWallet,courseLap,idx:player.idx,positions:NBWorkshop.distanceGemPositions(),events:diagRun.events.filter(e=>e.type==='distance_diamond').map(e=>e.distance)};pauseGame();return r;});
  assert.deepEqual(end,{wallet:7,courseLap:3,idx:0,positions:[{distance:120,idx:15},{distance:135,idx:30}],events:[15,30,45,60,75,90,105]});
  const result=await page.evaluate(()=>{state='play';hp=0;endReason='hp';end(false);return {checkpoints:finishedRun.rewards.checkpoints,tiles:finishedRun.rewards.tiles};});assert.deepEqual(result,{checkpoints:7,tiles:7});
  await page.waitForFunction(()=>document.querySelector('#overOv [data-result-reward-detail]').textContent.includes('15マスごとのダイヤ ＋7'));
  // Retry creates fresh pickups, while other modes have no floor gems or checkpoint rewards.
  for(const mode of ['distance','endless']){
   const r=await page.evaluate(mode=>{playMode=mode;startGame();stopMoveScheduler();advanceTo(30);const r={positions:NBWorkshop.distanceGemPositions(),wallet:wallet()};NBWorkshop.tick(2);r.unchanged=wallet()===r.wallet;pauseGame();return r;},mode);assert.deepEqual(r.positions,[]);assert.ok(r.unchanged);
  }
  await page.evaluate(()=>{playMode='fullsong';startGame();stopMoveScheduler();pauseGame();document.querySelectorAll('.overlay').forEach(e=>e.classList.add('hide'));player={idx:11,from:11,at:-9};lineK=2;gIdx=gIndexFor(lineK);revealEnd=26;revealFrom=26;cameraFrom=cameraTarget=Math.max(0,path[15].r-3);cameraAt=-9;notes=[];NBWorkshop.clearToasts();draw(pausedAt);});
  assert.deepEqual(await page.evaluate(()=>NBWorkshop.distanceGemPositions()),[{distance:15,idx:15},{distance:30,idx:30}]);
  for(const width of [360,412]){await page.setViewportSize({width,height:844});await page.evaluate(()=>{layout();draw(pausedAt);});await page.screenshot({path:path.join(out,'distance-gem-'+width+'.png')});}
  const storedWallet=await page.evaluate(()=>wallet());await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.locator('[data-wallet]').first().evaluate(e=>Number(e.textContent.replaceAll(',',''))),storedWallet);
  assert.deepEqual(errors,[]);console.log('PASS: 15-tile physical spacing, combo independence, collection, rush crossing, warp continuity, 105-tile portal, song restart, no duplicate rewards, result/persistence, retry and other modes');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
