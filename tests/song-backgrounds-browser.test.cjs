const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v89-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  await page.evaluate(async()=>{
   playMode='endless';endless=true;setSong(SONGS.find(s=>s.file===NBSongBackgrounds.song));songBuf=await ctx.decodeAudioData(await loadAudio(song.file));startGame();stopMoveScheduler();pauseGame();
   document.querySelectorAll('.overlay').forEach(el=>el.classList.add('hide'));NBWorkshop.clearToasts();
  });
  // Exact section boundaries, crossfade and reduced motion; manual calibration is cancelled.
  const cues=await page.evaluate(()=>{
   timingMs=137;endlessClock.change(10,1.8);
   return NBSongBackgrounds.cues.map(c=>{
    pausedAt=endlessClock.time(c.at+.15)-timingMs/1000;draw(pausedAt);
    return {scene:Number(document.getElementById('app').dataset.songBackground),expected:c.scene,
     mix:Number(document.querySelector('#songBackground>div:last-child').style.opacity),want:c.fade?Math.min(1,.15/c.fade):1};
   });
  });for(const c of cues){assert.equal(c.scene,c.expected);assert.ok(Math.abs(c.mix-c.want)<1e-8);}
  await page.evaluate(()=>{pausedAt=endlessClock.time(28.15)-timingMs/1000;draw(pausedAt);});
  const before=await page.locator('#songBackground').innerHTML();await page.waitForTimeout(180);assert.equal(await page.locator('#songBackground').innerHTML(),before);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>draw(pausedAt));assert.equal(await page.locator('#songBackground>div').last().evaluate(el=>el.style.opacity),'1');await page.emulateMedia({reducedMotion:'no-preference'});
  // A crossing changes only speed; the scene and source position remain continuous.
  const crossing=await page.evaluate(()=>{
   timingMs=0;startGame();stopMoveScheduler();hp=999;songStart=ctx.currentTime-80;
   player.idx=49;player.from=49;player.at=-9;lineK=LINES.length-1;revealFrom=revealEnd=EXIT_INDEX;gIdx=gIndexFor(lineK);notes=[];pendingCheck=[];moveLocked=false;
   const t=songTime();draw(t);const scene=document.getElementById('app').dataset.songBackground,source=sourceSongPosition(t);
   freeMove(t,null);stopMoveScheduler();draw(t);pauseGame();return {scene,after:document.getElementById('app').dataset.songBackground,drift:Math.abs(sourceSongPosition(t)-source),rate};
  });assert.equal(crossing.scene,'2');assert.equal(crossing.after,crossing.scene);assert.ok(crossing.drift<.05);assert.equal(crossing.rate,1.1);
  const loop=await page.evaluate(()=>{
   pauseGame();pausedAt=endlessClock.time(songBuf.duration+28.4);draw(pausedAt);const scene=document.getElementById('app').dataset.songBackground;
   startGame();stopMoveScheduler();pauseGame();draw(pausedAt);return {scene,retry:document.getElementById('app').dataset.songBackground};
  });assert.equal(loop.scene,'1');assert.equal(loop.retry,'0');
  // Capture all four backgrounds in the actual game, with a visible upcoming stamp.
  for(const [i,pos] of [1,30,80,100].entries()){
   await page.evaluate(pos=>{
    pausedAt=endlessClock.time(pos);document.querySelectorAll('.overlay').forEach(el=>el.classList.add('hide'));NBWorkshop.clearToasts();hideJudge();
    player={idx:48,from:48,at:-9};lineK=LINES.length-1;revealEnd=revealFrom=EXIT_INDEX;gIdx=gIndexFor(lineK);gFrom=gIdx;
    cameraFrom=cameraTarget=Math.max(0,path[50].r-2);cameraAt=-9;cameraRow=cameraTarget;charState='idle';charUntil=0;
    notes=[{id:98001,idx:51,from:51,at:0,pop:-9,hp:1},{id:98002,idx:52,from:52,at:0,pop:-9,hp:2}];draw(pausedAt);
   },pos);await page.screenshot({path:path.join(out,`sombra-${i+1}.png`)});
  }
  const cap=await page.evaluate(()=>{rate=2.2;passedSpeedGate=null;let count=0;const draw=NBSpeedMarkers.draw;NBSpeedMarkers.draw=()=>count++;drawSpeedGates(pausedAt);NBSpeedMarkers.draw=draw;return count;});assert.equal(cap,0);
  // Both masks decode and remain recognizable when future slow stamps are rendered at 40px.
  await page.evaluate(()=>{const c=document.createElement('canvas');c.id='stampQA';c.width=120;c.height=60;const g=c.getContext('2d');g.fillStyle='#a8ffdf';g.fillRect(0,0,120,60);NBSpeedMarkers.draw(g,'fast',30,30,55);NBSpeedMarkers.draw(g,'slow',90,30,55);c.style='position:fixed;left:0;top:0;z-index:99999';document.body.append(c);});
  await page.locator('#stampQA').screenshot({path:path.join(out,'spirits-40px.png')});await page.locator('#stampQA').evaluate(el=>el.remove());
  await page.evaluate(()=>{returnToSongs();NBWorkshop.shoppingGift();});await page.click('[data-nav="shop"]');await page.click('#themeCatalogOpen');await page.click('[data-theme="aurora"]');await page.click('[data-theme="aurora"]');await page.click('#collectionClose');
  assert.ok(await page.evaluate(()=>{startGame();stopMoveScheduler();draw(songTime());return document.getElementById('songBackground').hidden&&!NBWorkshop.usesDefaultTheme();}));
  await page.evaluate(()=>{returnToSongs();draw(0);});assert.ok(await page.locator('#songBackground').evaluate(el=>el.hidden));
  assert.deepEqual(errors,[]);console.log('PASS: Sombra cues, source clock, pause, rate crossing, loop, retry, reduced motion, spirits, cap, purchased theme');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
