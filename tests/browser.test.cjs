const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const qa=path.join(require('os').tmpdir(),'neon-blade-qa');fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);res.end();return}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data)})});
(async()=>{
 await new Promise(r=>server.listen(8123,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8123');await page.waitForFunction(()=>document.querySelectorAll('.songBtn').length===9);
 console.log('ready',await page.evaluate(()=>({state,hero:selectedHero,version:APP_VERSION})),errors);
 await page.screenshot({path:path.join(qa,'home.png')});
 await page.click('#missionsOpen');await page.screenshot({path:path.join(qa,'missions.png')});await page.click('#collectionClose');
 await page.click('#themesOpen');await page.screenshot({path:path.join(qa,'themes.png')});await page.click('#collectionClose');
 await page.evaluate(()=>{playMode='endless';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();state='paused';});
 const assert=require('node:assert/strict');
 const actual=await page.evaluate(()=>{
   state='play';let seed=0;for(const c of song.file)seed=(seed*31+c.charCodeAt(0))>>>0;
   player.idx=[7,13,20,25][seed%4];player.from=player.idx;moveLocked=false;
   for(let n=0;n<4;n++){notes=[{id:100+n,idx:player.idx,hp:1}];doAction('break',n,songTime(),0,null);}
   NBWorkshop.flush();const first=JSON.parse(localStorage.getItem(NBProgression.KEY));
   NBWorkshop.judged('PERFECT',3,songTime());NBWorkshop.flush();const second=JSON.parse(localStorage.getItem(NBProgression.KEY));
   state='paused';return {first,second,idx:player.idx};
 });
 assert.equal(actual.first.stats.tiles,1);assert.equal(actual.first.stats.hits,4);assert.equal(actual.first.gems,8);assert.deepEqual(actual.first,actual.second);
 console.log('real doAction: four valid hits award 3 tile + 5 mission, duplicate beat ignored');
 // A new course resets the tile once, and misses / off-tile hits cannot earn a tile.
 const course=await page.evaluate(()=>{
   state='play';nextLap(songTime(),false);stopMoveScheduler();
   player.idx=0;player.from=0;moveLocked=false;
   for(let n=0;n<5;n++)NBWorkshop.judged('PERFECT',n,songTime());
   NBWorkshop.judged('GOOD',5,songTime());NBWorkshop.flush();state='paused';return JSON.parse(localStorage.getItem(NBProgression.KEY));
 });
 assert.equal(course.stats.tiles,1);assert.equal(course.stats.hits,9);
 console.log('off-tile judgments, GOOD, and course reset verified');
 // Render, skip and render again must never pay again; retry must clear the run summary only.
 await page.evaluate(()=>{state='play';recordSteps=151;moveSteps=70;combo=20;maxCombo=20;NBWorkshop.steps(recordSteps);hp=0;endReason='hp';end(false);finishResult(false);finishResultReveal();});
 const before=await page.evaluate(()=>localStorage.getItem(NBProgression.KEY));
 await page.evaluate(()=>{renderResult(finishedRun);startResultReveal(finishedRun);finishResultReveal();renderResult(finishedRun);});
 assert.equal(await page.evaluate(()=>localStorage.getItem(NBProgression.KEY)),before);
 await page.click('#overOv [data-retry]');
 const retry=await page.evaluate(()=>{stopMoveScheduler();state='paused';return {recordSteps,counts,mode:playMode};});
 assert.equal(retry.recordSteps,0);assert.equal(retry.mode,'endless');
 await page.evaluate(()=>{state='play';hp=0;end(false);finishResult(false);finishResultReveal();});
 assert.equal(await page.evaluate(()=>finishedRun.rewards.total),0);
 console.log('result skip / rerender / retry: no duplicate diamonds, previous records preserved');
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.songBtn').length===9);
 assert.equal(await page.evaluate(()=>localStorage.getItem(NBProgression.KEY)),before);
 console.log('reload: wallet and mission state persist');
 // Purchase UI needs two taps, then selection cannot spend a second time.
 await page.evaluate(()=>{playMode='endless';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();recordSteps=400;NBWorkshop.steps(400);returnToSongs();});
 await page.click('#themesOpen');const balance0=await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).gems);
 await page.click('[data-theme="aurora"]');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).gems),balance0);
 await page.click('[data-theme="aurora"]');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).gems),balance0-60);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).theme),'aurora');
 await page.screenshot({path:path.join(qa,'unlocked.png')});await page.click('#collectionClose');
 console.log('theme preview / confirmation / selection / debit verified');
 // Real tutorial inputs must not advance the economy.
 const preTut=await page.evaluate(()=>localStorage.getItem(NBProgression.KEY));
 await page.evaluate(()=>{setSong(SONGS[0]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();for(let n=0;n<50;n++)NBWorkshop.judged('PERFECT',n,0);NBWorkshop.rush();NBWorkshop.steps(500);NBWorkshop.flush();state='paused';});
 assert.equal(await page.evaluate(()=>localStorage.getItem(NBProgression.KEY)),preTut);
 console.log('tutorial excluded');

 await page.evaluate(()=>{returnToSongs();localStorage.setItem('neon-blade-rush-manual-best-v1:audio/song.mp3:normal','300');playMode='endless';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();recordSteps=120;hp=0;endReason='hp';end(false);finishResult(false);});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>startResultReveal(finishedRun));
 assert.equal(await page.evaluate(()=>finishedRun.previousBest),300);
 assert.equal(await page.evaluate(()=>finishedRun.best),300);
 assert.equal(await page.evaluate(()=>finishedRun.newBest),false);
 assert.equal(await page.locator('#overOv .resultPending').count(),0);
 await page.setViewportSize({width:320,height:568});
 assert.equal(await page.evaluate(()=>document.querySelector('#overOv').scrollWidth>innerWidth),false);
 const retryBox=await page.locator('#overOv [data-retry]').boundingBox();assert.ok(retryBox.y>=0&&retryBox.y+retryBox.height<=568);
 await page.screenshot({path:path.join(qa,'small-result.png')});
 console.log('existing best / reduced-motion / 320px layout / visible retry verified');
 // A real new run can begin directly while a result animation is still active.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{startResultReveal(finishedRun);startGame();stopMoveScheduler();state='paused';});
 await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>resultRevealActive),null);
 assert.equal(await page.locator('#overOv').evaluate(el=>el.classList.contains('hide')),true);
 console.log('retry cancels pending result frames and sounds');
 console.log('browser errors',errors);

 await browser.close();server.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
