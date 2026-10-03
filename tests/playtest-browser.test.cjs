const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out='/tmp/neon-playtest-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(8136,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:8136');await page.waitForFunction(()=>state==='ready');
 await page.evaluate(()=>{raceSettings.type='novice-test';raceSettings.full=true;raceSettings.values.speed=150;});
 await page.click('#measureStart');assert.equal(await page.locator('#measureNotice').isVisible(),true);
 assert.deepEqual(await page.evaluate(()=>({mode:playMode,manual:raceTestActive(),type:raceSettings.type,full:raceSettings.full})),{mode:'distance',manual:false,type:'auto',full:false});
 await page.screenshot({path:out+'/choose-song.png'});
 await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>state==='play');assert.equal(await page.evaluate(()=>NBMeasure.active()),true);
 await page.evaluate(()=>{
  stopMoveScheduler();nextBeat=100000;moveLocked=false;const n=NBWorkshop.race();if(n)n.done=true; // Telemetry must outlive a hunter.
  notes=[{id:501,idx:5,from:5,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);
  freeMove(songTime(),null);notes[0].idx--;NBWorkshop.tick(songTime());
  const at=player.idx;notes=[{id:601,idx:at,from:at,at:-9,pop:-9,purple:true,hp:1},{id:602,idx:at+1,from:at+1,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);
  doAction('charge',nearestBeat(songTime()),songTime(),0,null);NBWorkshop.tick(songTime());
  // Two advances into the last empty destination reproduced the v64 undercount.
  for(let i=0;i<2;i++){notes=[{id:650+i,idx:player.idx+2,from:player.idx+2,at:-9,pop:-9,hp:1}];NBWorkshop.tick(songTime(),true);freeMove(songTime(),null);}
  notes=[];NBWorkshop.tick(songTime(),true);rushUnits=120;doRush(songTime(),null,false);
 });
 await page.waitForFunction(()=>!rushAnim);await page.evaluate(()=>{NBWorkshop.tick(songTime());endReason='song';end(true);finishResult(true);finishResultReveal();});
 const report=await page.evaluate(()=>finishedRun.measurement);
 assert.equal(report.taken,4);assert.equal(report.missed,1);assert.equal(report.normalSteps,4);assert.equal(report.purpleSteps,1);assert.equal(report.rushSteps,5);assert.equal(report.rushes,1);assert.equal(report.completed,true);assert.equal(report.schemaVersion,2);assert.equal(report.reconciled,true);assert.equal(report.taken+report.occupiedSteps,report.normalSteps);assert.equal(report.appVersion,'v66');
 assert.equal(await page.locator('#clearOv [data-measure-result]').isVisible(),true);
 await page.click('#clearOv [data-measure-result]');await page.screenshot({path:out+'/record-390.png'});
 assert.ok((await page.locator('#measureText').textContent()).includes('順位や、初級の難易度を決める評価ではありません'));
 const jsonDownload=page.waitForEvent('download');await page.click('#measureJson');const json=await jsonDownload;await json.saveAs(out+'/record.json');
 assert.deepEqual(JSON.parse(fs.readFileSync(out+'/record.json','utf8')),report);
 const txtDownload=page.waitForEvent('download');await page.click('#measureTxt');const txt=await txtDownload;await txt.saveAs(out+'/record.txt');
 assert.equal(fs.readFileSync(out+'/record.txt','utf8'),await page.locator('#measureText').textContent());
 await page.setViewportSize({width:320,height:568});await page.locator('#measureJson').scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.querySelector('.measurePanel').scrollWidth>innerWidth),false);await page.screenshot({path:out+'/record-320.png'});
 await page.click('#measureClose');await page.evaluate(()=>{renderResult(finishedRun);renderResult(finishedRun);});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-blade-play-records-v1')).length),1);
 await page.reload();await page.waitForFunction(()=>state==='ready');await page.click('#measureLast');assert.ok((await page.locator('#measureText').textContent()).includes('必殺技：1回 ／ 5マス'));
 await page.click('#measureAgain');await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>NBMeasure.active());
 await page.evaluate(()=>returnToSongs());
 const history=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-blade-play-records-v1')));assert.equal(history.length,2);assert.equal(history[1].completed,false);
 await page.evaluate(()=>NBMeasure.show());assert.equal(await page.locator('#measureHistory option').count(),2);await page.locator('#measureHistory').selectOption(report.id);
 assert.ok((await page.locator('#measureText').textContent()).includes('必殺技：1回 ／ 5マス'));
 await page.click('#measureClose');await page.setViewportSize({width:390,height:844});
 for(const id of ['novice','adept','master','divine']){
  await page.evaluate(()=>{returnToSongs();NBMenu.show('home');document.querySelector('.hunterGrades').open=true;});
  await page.click(`[data-hunter-grade=${id}]`);await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>state==='play');
  const actual=await page.evaluate(()=>({id:NBWorkshop.race().type.id,rules:NBWorkshop.race().rules,active:NBMeasure.active(),full:rushUnits}));
  assert.equal(actual.id,id);assert.equal(actual.active,true);assert.equal(actual.full,0);
  if(id==='novice'){
   assert.deepEqual(actual.rules,{speed:25,distance:20,loss:20,gap:3,smokeEvery:0,smokeStep:0});
   const hunt=await page.evaluate(()=>{stopMoveScheduler();nextBeat=100000;moveLocked=false;notes=[];NBWorkshop.tick(songTime(),true);for(let i=0;i<3;i++)freeMove(songTime(),null);endReason='hp';end(false);finishResult(false);return finishedRun.measurement.hunters[0];});
   assert.equal(hunt.id,'novice');assert.equal(hunt.outcome,'won');assert.equal(hunt.missed,0);
  }
 }
 await page.evaluate(()=>{returnToSongs();localStorage.setItem(RACE_TEST_KEY,JSON.stringify({...raceSettings,balanceVersion:65,type:'novice-test',full:true}));});
 await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>raceSettings.type),'auto');assert.equal(await page.evaluate(()=>raceSettings.full),false);
 assert.deepEqual(errors,[]);console.log('PASS: ordinary one-song entry, no manual tuning, telemetry after hunter ends, movement/wait/purple/ultimate separation, result, JSON+TXT downloads, reload/history, interruption, 320px layout, all four grade buttons, capture record, old-test migration.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
