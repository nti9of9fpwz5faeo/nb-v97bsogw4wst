const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.RACE_QA_DIR||'/tmp/neon-race-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(8134,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8134');await page.waitForFunction(()=>state==='ready');
 await page.click('[data-nav=songs]');await page.click('[data-song-mode=endless]');assert.equal(await page.evaluate(()=>localStorage.getItem('neon-blade-mode')),'endless');
 await page.click('[data-song-mode=distance]');await page.screenshot({path:out+'/v62-songs.png'});
 await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>state==='play');assert.equal(await page.locator('#songChoice').count(),0);
 const safe=await page.evaluate(()=>{
   raceSettings.type='novice';startGame();nextBeat=100000;moveLocked=false;notes=[{id:501,idx:3}];NBWorkshop.tick(songTime(),true);
   freeMove(songTime(),null);const n=NBWorkshop.race(),afterMove=n.remaining;
   notes=[{id:502,idx:player.idx+5}];NBWorkshop.tick(songTime(),true);
   for(let i=0;i<3;i++){notes[0].idx--;NBWorkshop.tick(songTime());}const afterWait=n.remaining;
   const at=player.idx;notes=[{id:503,idx:at,purple:true,hp:1},{id:504,idx:at+1,hp:1}];NBWorkshop.tick(songTime(),true);
   doAction('charge',nearestBeat(songTime()),songTime(),0,null);NBWorkshop.tick(songTime());
   return {afterMove,afterWait,afterPurple:n.remaining,moved:player.idx-at,pushed:notes[0].idx-at};
 });assert.deepEqual(safe,{afterMove:29,afterWait:26,afterPurple:25,moved:1,pushed:2});
 const blocked=await page.evaluate(()=>{const n=NBWorkshop.race(),remaining=n.remaining;notes=[{id:510,idx:player.idx,from:player.idx,at:-9,pop:-9,hit:true,hp:1}];NBWorkshop.tick(songTime(),true);for(let i=0;i<100;i++)NBWorkshop.tick(songTime());return n.remaining===remaining;});assert.ok(blocked);
 // Logical destination is assigned ahead of the blade; capture follows its visual traversal.
 await page.evaluate(()=>{raceSettings.type='divine';raceSettings.full=true;startGame();nextBeat=100000;moveLocked=false;notes=[];doRush(songTime(),null,false);});
 await page.waitForFunction(()=>!rushAnim);assert.equal(await page.evaluate(()=>player.idx),5);assert.equal(await page.evaluate(()=>NBWorkshop.race().done),false);assert.equal(await page.evaluate(()=>NBWorkshop.race().remaining),24);
 await page.evaluate(()=>{player.idx=9;player.from=9;notes=[];NBWorkshop.tick(songTime(),true);rushUnits=120;doRush(songTime(),null,false);});
 await page.waitForFunction(()=>rushAnim?.moved);assert.equal(await page.evaluate(()=>NBWorkshop.race().done),false);
 await page.waitForFunction(()=>NBWorkshop.race().done);assert.equal(await page.evaluate(()=>NBWorkshop.race().outcome),'won');
 await page.evaluate(()=>{for(let i=0;i<10;i++)NBWorkshop.tick(songTime());NBWorkshop.flush();});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).stats.tiles),1);
 const warp=await page.evaluate(()=>{raceSettings.type='master';startGame();nextBeat=100000;moveLocked=false;const n=NBWorkshop.race();n.origin=28;n.idx=40;n.from=40;n.used=6;n.remaining=20;player.idx=35;notes=[];NBWorkshop.tick(songTime(),true);nextCourse(songTime());const same=NBWorkshop.race()===n;return {same,remaining:n.remaining,idx:n.idx,state};});assert.deepEqual(warp,{same:true,remaining:20,idx:5,state:'play'});
 await page.evaluate(()=>{raceSettings.type='off';startGame();nextBeat=100000;});assert.equal(await page.evaluate(()=>NBWorkshop.race()),null);
 // Real result capture, XP persistence and measured intermediate bar fill.
 await page.evaluate(()=>{courseLap=4;player.idx=32;recordSteps=172;runSteps=172;moveSteps=172;counts.PERFECT=152;maxCombo=62;NBWorkshop.steps(172);for(let i=0;i<152;i++)NBWorkshop.judged('PERFECT',i,0);endReason='hp';end(false);finishedRun.previousBest=227;finishedRun.best=227;finishedRun.newBest=false;finishResult(false);});
 await page.waitForTimeout(570);
 const middle=await page.locator('#overOv [data-result-track]').evaluate(e=>({width:parseFloat(e.style.width),target:Number(e.dataset.target)}));assert.ok(middle.width>0&&middle.width<middle.target,JSON.stringify(middle));
 await page.screenshot({path:out+'/v62-result-filling.png'});
 await page.waitForTimeout(1600);await page.screenshot({path:out+'/v62-result.png'});
 assert.ok(Math.abs(await page.locator('#overOv [data-result-track]').evaluate(e=>parseFloat(e.style.width))-middle.target)<.001);
 const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).xp);
 await page.evaluate(()=>{renderResult(finishedRun);startResultReveal(finishedRun);});await page.click('#overOv [data-result-skip]');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).xp),xp);
 assert.equal(await page.locator('#overOv [data-double-reward]').isVisible(),false);
 await page.click('#overOv [data-retry]');await page.waitForFunction(()=>state==='play');assert.equal(await page.locator('#songChoice').count(),0);
 // Multiple song rewards are visible on the song tab without finding a dropdown entry.
 await page.evaluate(()=>{returnToSongs();NBWorkshop.flush();const p=NBProgression.create(localStorage);p.update({hits:150},{steps:100},0,{songId:SONGS[2].file});p.update({hits:150},{steps:100},0,{songId:SONGS[3].file});p.flush();});
 await page.reload();await page.waitForFunction(()=>state==='ready');await page.click('#homeMissions');await page.click('[data-mission-tab=song]');
 assert.ok(await page.locator('.songRewardRow').count()>=2);await page.screenshot({path:out+'/v62-song-rewards.png'});await page.click('#claimAll');assert.equal(await page.locator('.songRewardRow').count(),0);
 // Small viewport / long score / rank up / reduced motion.
 await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{returnToSongs();setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);raceSettings.type='off';startGame();courseLap=352;player.idx=25;recordSteps=12345;counts.PERFECT=152;maxCombo=62;NBWorkshop.steps(12345);endReason='hp';end(false);finishResult(false);});
 await page.screenshot({path:out+'/v62-result-small.png'});assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);
 const retry=await page.locator('#overOv [data-retry]').boundingBox();assert.ok(retry.y>=0&&retry.y+retry.height<=568,JSON.stringify(retry));
 assert.deepEqual(errors,[]);console.log('PASS: direct song play, stored mode, safe gaps / waiting / purple, blocked notes, 5-cell ultimate traversal, one payout, warp continuity, animated/skip results, XP idempotence, cross-song claims, 320px/reduced motion.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
