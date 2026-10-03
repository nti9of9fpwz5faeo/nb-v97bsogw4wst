const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.RACE_QA_DIR||'/tmp/neon-tuning-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(8135,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('http://127.0.0.1:8135');await page.waitForFunction(()=>state==='ready');
 await page.click('#hunterTestOpen');assert.equal(await page.locator('#page-settings [data-race-type]').inputValue(),'novice-test');
 await page.click('#page-settings [data-race-step=speed][data-delta="5"]');assert.equal(await page.locator('#race-menu-speed').inputValue(),'30');
 await page.locator('#race-menu-distance').fill('45');await page.locator('#race-menu-distance').blur();
 await page.locator('#race-menu-loss').fill('12');await page.locator('#race-menu-loss').blur();
 await page.locator('#race-menu-gap').fill('7');await page.locator('#race-menu-gap').blur();
 assert.deepEqual(await page.evaluate(()=>raceSettings.values),{speed:30,distance:45,loss:12,gap:7});
 await page.reload();await page.waitForFunction(()=>state==='ready');await page.click('#hunterTestOpen');
 assert.deepEqual(await page.evaluate(()=>raceSettings.values),{speed:30,distance:45,loss:12,gap:7});
 await page.screenshot({path:out+'/tuning-390.png'});
 await page.setViewportSize({width:320,height:568});
 assert.equal(await page.evaluate(()=>document.querySelector('#page-settings').scrollWidth>innerWidth),false);
 for(const key of ['speed','distance','loss','gap']){
  const field=page.locator('#race-menu-'+key);await field.scrollIntoViewIfNeeded();const b=await field.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=320,JSON.stringify(b));
 }
 await page.locator('#race-menu-speed').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/tuning-320.png'});
 await page.setViewportSize({width:390,height:844});await page.click('#page-settings [data-race-reset]');
 await page.click('[data-race-songs]');await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>state==='play');
 const first=await page.evaluate(()=>{startGame();stopMoveScheduler();nextBeat=100000;moveLocked=false;notes=[{id:501,idx:5,from:5,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);return {seed:spawnSeed,path:JSON.stringify(path),test:NBWorkshop.race().test};});
 assert.deepEqual(first.test,{speed:25,distance:20,loss:20,gap:3});
 const counts=await page.evaluate(()=>{
  freeMove(songTime(),null);const n=NBWorkshop.race(),moved=n.missed;
  notes[0].idx--;NBWorkshop.tick(songTime());const waited=n.missed;
  const at=player.idx;notes=[{id:601,idx:at,from:at,at:-9,pop:-9,purple:true,hp:1},{id:602,idx:at+1,from:at+1,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);
  doAction('charge',nearestBeat(songTime()),songTime(),0,null);NBWorkshop.tick(songTime());
  return {moved,waited,purple:n.missed,player:player.idx-at,smoke:n.events.length};
 });assert.deepEqual(counts,{moved:0,waited:1,purple:1,player:1,smoke:0});
 await page.evaluate(()=>pauseGame());await page.locator('#pauseOv .raceTest>summary').click();
 await page.click('#pauseOv [data-race-step=speed][data-delta="5"]');
 assert.equal(await page.evaluate(()=>NBWorkshop.race().test.speed),25); // In-progress chase keeps its snapshot.
 await page.click('[data-race-retry]');
 const retried=await page.evaluate(()=>{stopMoveScheduler();nextBeat=100000;return {seed:spawnSeed,path:JSON.stringify(path),speed:NBWorkshop.race().test.speed};});
 assert.equal(retried.seed,first.seed);assert.equal(retried.path,first.path);assert.equal(retried.speed,30);
 const result=await page.evaluate(()=>{
  moveLocked=false;notes=[{id:700,idx:24,from:24,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);
  for(let i=0;i<20;i++){notes[0].idx--;NBWorkshop.tick(songTime());}
  return {outcome:NBWorkshop.race().outcome,missed:raceTestLast.missed,reason:raceTestLast.reason};
 });assert.deepEqual(result,{outcome:'lost',missed:20,reason:'missed'});
 await page.evaluate(()=>pauseGame());await page.locator('#pauseOv .raceTestResult>summary').click();
 assert.ok((await page.locator('#pauseOv [data-race-result]').textContent()).includes('有効マスを失って逃走'));
 await page.locator('#pauseOv [data-race-result]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/tuning-result.png'});
 await page.locator('#pauseOv [data-race-type]').selectOption('auto');await page.click('[data-race-retry]');assert.equal(await page.evaluate(()=>raceTestActive()),false);
 assert.deepEqual(errors,[]);console.log('PASS: 4 controls, persistence, 320px layout, real song, movement / waiting / purple accounting, restart snapshots, repeatable seed/course, loss at 20, results, exit test.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
