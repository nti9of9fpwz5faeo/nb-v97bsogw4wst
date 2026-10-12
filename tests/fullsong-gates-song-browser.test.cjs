const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v98-gates';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=process.env.PUBLIC_URL||'http://127.0.0.1:'+server.address().port,origin=new URL(url).origin;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('neon-blade-tutorial-courses-v1',JSON.stringify({step:2,complete:true})));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(url);await page.waitForFunction(()=>state==='ready');await page.locator('[data-nav="songs"]').click();await page.locator('[data-song-mode="fullsong"]').click();
  const button=page.locator('[data-song-file="audio/Futuristic Action.mp3"]');
  await page.route('**/*Futuristic*',r=>r.fulfill({status:404,body:''}));await button.click();
  await page.waitForFunction(()=>!pickingSong&&document.getElementById('loadTxt').textContent.includes('まだ準備中'));
  assert.equal(await page.evaluate(()=>state),'ready');assert.equal(await button.isEnabled(),true);
  assert.ok(await page.evaluate(()=>[...document.querySelectorAll('.songBtn')].every(b=>!b.disabled)));
  await page.unroute('**/*Futuristic*');
  const metadata=await page.evaluate(()=>{const s=SONGS.find(s=>s.name==='Futuristic Action');return {file:s.file,bpm:s.bpm,offset:s.offset,end:s.gameplayEnd};});
  assert.deepEqual(metadata,{file:'audio/Futuristic Action.mp3',bpm:150,offset:.3,end:61.3});
  if(!process.env.PUBLIC_URL&&fs.existsSync(path.join(root,metadata.file))){
   await button.click();await page.waitForFunction(()=>state==='play');
   const actual=await page.evaluate(()=>{stopMoveScheduler();pauseGame();return {duration:songBuf.duration,bpm:BPM,offset:OFFSET};});
   assert.ok(actual.duration>63&&actual.duration<65);assert.equal(actual.bpm,150);assert.equal(actual.offset,.3);
  }else{
   await page.evaluate(()=>{setSong(SONGS.find(s=>s.name==='Futuristic Action'));songBuf=ctx.createBuffer(1,ctx.sampleRate*64,ctx.sampleRate);startGame();stopMoveScheduler();pauseGame();});
  }
  // Gate is visible at the approaching tile, with a forward route and mobile controls.
  await page.evaluate(()=>{player={idx:33,from:33,at:-9};lineK=LINES.length-1;gIdx=gIndexFor(lineK);revealEnd=EXIT_INDEX;revealFrom=EXIT_INDEX;cameraFrom=cameraTarget=Math.max(0,path[35].r-2);cameraAt=-9;notes=[];NBWorkshop.clearToasts();document.querySelectorAll('.overlay').forEach(e=>e.classList.add('hide'));draw(pausedAt);});
  for(const size of [{width:360,height:640},{width:390,height:844},{width:412,height:915}]){
   await page.setViewportSize(size);await page.evaluate(()=>{layout();draw(pausedAt);});assert.ok(await page.locator('#bMove').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));await page.screenshot({path:path.join(out,'gate-'+size.width+'.png')});
  }
  // Outro input cannot generate misses, and the actual loop enters the rest only after audio end.
  await page.evaluate(()=>{state='play';notes=[];pendingCheck=[];hp=4;nextBeat=10000;songStart=outputTime()-61.5;window.beforeMisses=counts.MISS;input('break',{timeStamp:performance.now()},'test');});
  assert.ok(await page.evaluate(()=>hp===4&&counts.MISS===window.beforeMisses&&lap===0));
  await page.evaluate(()=>{songStart=outputTime()-songBuf.duration-.1;});await page.waitForFunction(()=>state==='roundrest');
  await page.screenshot({path:path.join(out,'round-rest.png')});
  assert.ok(await page.evaluate(()=>rate===1&&lap===0&&hp===4&&document.getElementById('roundRest').textContent.includes('次のラウンドまで')));
  await page.evaluate(()=>{returnToSongs();setSong(SONGS.find(s=>!s.tutorial&&s.name!=='Futuristic Action'));songBuf=ctx.createBuffer(1,ctx.sampleRate*10,ctx.sampleRate);startGame();stopMoveScheduler();pauseGame();});
  assert.equal(await page.evaluate(()=>state),'paused');assert.deepEqual(errors,[]);
  console.log('PASS: missing audio recovery, exact filename and timing metadata, supplied MP3 decode, mobile gate view, outro without misses, round-rest view and other songs');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
