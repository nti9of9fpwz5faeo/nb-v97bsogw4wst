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
 await page.click('#measureStart');assert.equal(await page.locator('#measureNotice').isVisible(),true);
 assert.equal(await page.evaluate(()=>playMode),'distance');
 await page.screenshot({path:out+'/choose-song.png'});
 await page.locator('#songList .songBtn:not(.lockedSong)').first().click();await page.waitForFunction(()=>state==='play');assert.equal(await page.evaluate(()=>NBMeasure.active()),true);
 await page.evaluate(()=>{
  stopMoveScheduler();nextBeat=100000;moveLocked=false;// Passive telemetry continues during ordinary play.
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
 assert.equal(report.taken,4);assert.equal(report.missed,1);assert.equal(report.normalSteps,4);assert.equal(report.purpleSteps,1);assert.equal(report.rushSteps,5);assert.equal(report.rushes,1);assert.equal(report.completed,true);assert.equal(report.schemaVersion,2);assert.equal(report.reconciled,true);assert.equal(report.taken+report.occupiedSteps,report.normalSteps);assert.equal(report.appVersion,'v87');
 assert.equal(await page.locator('#clearOv [data-measure-result]').count(),1);
 await page.locator('#clearOv .resultDetails > summary').click();await page.click('#clearOv [data-measure-result]');await page.screenshot({path:out+'/record-390.png'});
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
 assert.deepEqual(errors,[]);console.log('PASS: ordinary one-song entry, passive telemetry, movement/wait/purple/ultimate separation, result, JSON+TXT downloads, reload/history, interruption, 320px layout.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
