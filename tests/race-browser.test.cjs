const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.RACE_QA_DIR||'/tmp/neon-race-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(8134,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8134');await page.waitForFunction(()=>state==='ready');
 await page.click('#hunterTestOpen');await page.locator('#page-settings [data-race-type]').selectOption('divine');
 await page.locator('#page-settings [data-race-full]').check();await page.screenshot({path:out+'/test-settings.png'});
 await page.evaluate(async()=>{setSong(SONGS[3]);songBuf=await ctx.decodeAudioData(await loadAudio(song.file));startGame();});
 assert.equal(await page.evaluate(()=>state),'huntIntro');
 const first=await page.evaluate(()=>({clock:songStart,hp,idx:player.idx,gems:NBWorkshop.race().type.reward}));
 await page.evaluate(()=>{input('move',null,'test');input('rush',null,'test');});
 assert.equal(await page.evaluate(()=>player.idx),0);
 await page.waitForFunction(()=>raceIntro?.stage==='prize');await page.screenshot({path:out+'/intro-prize.png'});
 await page.waitForFunction(()=>raceIntro?.stage==='hunter');await page.screenshot({path:out+'/intro-hunter.png'});
 // Pause during the cinematic must preserve the exact stage and keep input locked.
 await page.evaluate(()=>pauseGame());const paused=await page.evaluate(()=>songTime());
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>songTime()),paused);
 await page.evaluate(()=>resumeGame());await page.waitForFunction(()=>state==='huntIntro');
 await page.click('#raceSkip');await page.waitForFunction(()=>state==='play');
 const resumed=await page.evaluate(()=>({hp,idx:player.idx,rushUnits,phase:NBWorkshop.race().phase,beat:nextBeat,t:songTime(),pending:pendingCheck.length}));
 assert.equal(resumed.hp,5);assert.equal(resumed.idx,0);assert.equal(resumed.rushUnits,120);assert.equal(resumed.phase,'ready');assert.ok(resumed.pending<2);
 await page.screenshot({path:out+'/ready-to-break.png'});
 // Real first-note judgment releases both racers, while notes retain music phase.
 await page.evaluate(()=>{const nt=notes[0];nt.idx=0;const t=songTime();doAction('break',nearestBeat(t),t,0,null);NBWorkshop.tick(t);});
 assert.equal(await page.evaluate(()=>NBWorkshop.race().phase),'race');
 // A full ultimate from start still cannot reach the central prize.
 await page.evaluate(()=>doRush(songTime(),null,false));await page.waitForFunction(()=>!rushAnim);
 assert.equal(await page.evaluate(()=>NBWorkshop.race().done),false);assert.equal(await page.evaluate(()=>player.idx),10);
 // Crossing the prize is awarded once, not as soon as the rush destination is assigned.
 await page.evaluate(()=>{player.idx=12;player.from=12;player.at=songTime();notes=[];rushUnits=120;doRush(songTime(),null,false);});
 await page.waitForFunction(()=>rushAnim?.moved);
 assert.equal(await page.evaluate(()=>NBWorkshop.race().done),false);
 await page.waitForFunction(()=>NBWorkshop.race().done);assert.equal(await page.evaluate(()=>NBWorkshop.race().outcome),'won');
 const gems=await page.evaluate(()=>{NBWorkshop.flush();return JSON.parse(localStorage.getItem(NBProgression.KEY)).gems;});assert.equal(gems,150);
 await page.evaluate(()=>{for(let i=0;i<5;i++)NBWorkshop.tick(songTime());NBWorkshop.flush();});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(NBProgression.KEY)).gems),150);
 await page.screenshot({path:out+'/race-win.png'});
 // Warp and retry must independently respect the selected opponent.
 await page.evaluate(()=>{raceSettings.type='master';rushAnim=null;nextCourse(songTime());});
 assert.equal(await page.evaluate(()=>NBWorkshop.race().type.id),'master');assert.equal(await page.evaluate(()=>state),'huntIntro');
 await page.evaluate(()=>{returnToSongs();raceSettings.type='novice';raceSettings.skip=true;startGame();});
 assert.equal(await page.evaluate(()=>NBWorkshop.race().type.id),'novice');
 await page.waitForFunction(()=>state==='play');
 // A losing opponent has no payout, and continues on a fresh course.
 const loss=await page.evaluate(()=>{const n=NBWorkshop.race();NBChase.start(n,raceBeat(songTime())-100);NBWorkshop.tick(songTime());NBWorkshop.flush();return {outcome:n.outcome,gems:JSON.parse(localStorage.getItem(NBProgression.KEY)).gems};});
 assert.equal(loss.outcome,'lost');assert.equal(loss.gems,150);
 await page.evaluate(()=>{returnToSongs();raceSettings.type='off';startGame();});assert.equal(await page.evaluate(()=>NBWorkshop.race()),null);
 await page.evaluate(()=>{returnToSongs();raceSettings.type='divine';setSong(SONGS[0]);startGame();});assert.equal(await page.evaluate(()=>NBWorkshop.race()),null);
 // Fixed chart: intro preserves the playing source, does not seek music or miss skipped beats.
 await page.evaluate(async()=>{returnToSongs();raceSettings.type='adept';raceSettings.skip=false;chartCache[SONGS[1].chart]=await (await fetch(SONGS[1].chart)).json();setSong(SONGS[1]);songBuf=await ctx.decodeAudioData(await loadAudio(song.file));startGame();window.raceClockBefore=songStart;window.raceSourceBefore=songSrc;});
 await page.waitForFunction(()=>state==='play');
 assert.equal(await page.evaluate(()=>songStart===window.raceClockBefore&&songSrc===window.raceSourceBefore),true);
 assert.equal(await page.evaluate(()=>counts.MISS),0);assert.equal(await page.evaluate(()=>hp),5);
 await page.evaluate(()=>{playMode='endless';endless=true;nextLap(songTime(),false);});
 assert.equal(await page.evaluate(()=>state),'huntIntro');assert.equal(await page.evaluate(()=>rate),1.1);assert.equal(await page.evaluate(()=>NBWorkshop.race().type.id),'adept');
 // Tiny screen, reduced-motion and pause test panel fit without horizontal clipping.
 await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{returnToSongs();setSong(SONGS[3]);startGame();pauseGame();});
 await page.locator('#pauseOv .raceTest').evaluate(e=>e.open=true);
 await page.screenshot({path:out+'/small-pause.png'});
 assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);
 await page.evaluate(()=>{returnToSongs();NBMenu.show('home');});await page.click('#hunterTestOpen');await page.screenshot({path:out+'/small-settings.png'});
 assert.deepEqual(errors,[]);console.log('PASS: 4 ranks, cinematic input lock, pause/resume, beat-safe restart, ultimate crossing, single reward, loss, warp, retry, off, tutorial, 320px and reduced motion.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
