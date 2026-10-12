const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v98-checkpoints';fs.mkdirSync(out,{recursive:true});
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
  assert.match(await page.locator('#modeDesc').textContent(),/35マスごとにゲート突破/);
  for(const width of [360,390,412]){await page.setViewportSize({width,height:844});assert.ok(await page.locator('[data-song-mode="fullsong"]').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));}
  await page.screenshot({path:path.join(out,'mode-selection.png')});

  for(const mode of ['fullsong','shuttle','distance','endless']){
   const result=await page.evaluate(mode=>{
    playMode=mode;setSong(SONGS.find(s=>!s.tutorial));songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);diagOn=true;startGame();stopMoveScheduler();pauseGame();
    const wallet=()=>Number(document.querySelector('[data-wallet]').textContent.replaceAll(',','')),before=wallet();
    state='play';moveLocked=false;notes=[];pendingCheck=[];player={idx:14,from:14,at:0};freeMove(1,null);
    NBWorkshop.tick(1);NBWorkshop.tick(1);player={idx:30,from:30,at:0};NBWorkshop.tick(2);
    const r={positions:NBWorkshop.distanceGemPositions(),unchanged:wallet()===before,events:diagRun.events.filter(e=>e.type==='distance_diamond').length};
    hp=0;endReason='hp';end(false);r.checkpoints=finishedRun.rewards.checkpoints;return r;
   },mode);
   assert.deepEqual(result,{positions:[],unchanged:true,events:0,checkpoints:0});
  }
  await page.waitForFunction(()=>!document.getElementById('overOv').classList.contains('hide'));
  assert.ok(!(await page.locator('#overOv').textContent()).includes('15マス先のダイヤ'));
  const storedWallet=await page.locator('[data-wallet]').first().textContent();await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.locator('[data-wallet]').first().textContent(),storedWallet);
  assert.deepEqual(errors,[]);console.log('PASS: roadside diamonds removed in all modes; walking across former pickups gives no award, no events, no result checkpoints, and preserves saved balances');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

