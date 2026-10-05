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
   timingMs=137;
   return NBSongBackgrounds.cues.map(c=>{
    pausedAt=(c.at+.15)/rate-timingMs/1000;draw(pausedAt);
    return {scene:Number(document.getElementById('app').dataset.songBackground),expected:c.scene,
     mix:Number(document.querySelector('#songBackground>div:last-child').style.opacity),want:c.fade?Math.min(1,.15/c.fade):1};
   });
  });for(const c of cues){assert.equal(c.scene,c.expected);assert.ok(Math.abs(c.mix-c.want)<1e-8);}
  await page.evaluate(()=>{pausedAt=(NBSongBackgrounds.cues[1].at+.15)/rate-timingMs/1000;draw(pausedAt);});
  const before=await page.locator('#app').getAttribute('style');await page.waitForTimeout(180);assert.equal(await page.locator('#app').getAttribute('style'),before);
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>draw(pausedAt));assert.equal(await page.locator('#songAtmosphere').evaluate(el=>getComputedStyle(el).display),'none');await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{timingMs=0;});
  // Capture all four backgrounds in the actual game, with a visible upcoming stamp.
  for(const [i,pos] of [1,30,80,100].entries()){
   await page.evaluate(pos=>{
    pausedAt=pos/rate;document.querySelectorAll('.overlay').forEach(el=>el.classList.add('hide'));NBWorkshop.clearToasts();hideJudge();
    player={idx:48,from:48,at:-9};lineK=LINES.length-1;revealEnd=revealFrom=EXIT_INDEX;gIdx=gIndexFor(lineK);gFrom=gIdx;
    cameraFrom=cameraTarget=Math.max(0,path[50].r-2);cameraAt=-9;cameraRow=cameraTarget;charState='idle';charUntil=0;
    notes=[{id:98001,idx:51,from:51,at:0,pop:-9,hp:1},{id:98002,idx:52,from:52,at:0,pop:-9,hp:2}];draw(pausedAt);
   },pos);await page.screenshot({path:path.join(out,`sombra-${i+1}.png`)});
  }
  await page.evaluate(()=>{returnToSongs();NBWorkshop.shoppingGift();});await page.click('[data-nav="shop"]');await page.click('#themeCatalogOpen');await page.click('[data-theme="aurora"]');await page.click('[data-theme="aurora"]');await page.click('#collectionClose');
  assert.ok(await page.evaluate(()=>{startGame();stopMoveScheduler();draw(songTime());return document.getElementById('songBackground').hidden&&!NBWorkshop.usesDefaultTheme();}));
  await page.evaluate(()=>{returnToSongs();draw(0);});assert.ok(await page.locator('#songBackground').evaluate(el=>el.hidden));
  assert.deepEqual(errors,[]);console.log('PASS: Sombra cues, source clock, pause, reduced motion, musical accents, purchased theme');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
