const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v86-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.json')?'application/json':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack||String(e)));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  assert.equal(await page.locator('#verBadge').textContent(),'v88');
  await page.click('[data-nav="settings"]');await page.locator('#soundSettings summary').click();
  await page.fill('#sombraCorrection','17');await page.locator('#sombraCorrection').press('Tab');
  assert.equal(await page.evaluate(()=>songCorrSetting('charts/sombra_en_movimiento.json')),17);
  await page.click('[data-nav="songs"]');await page.click('[data-song-file="audio/sombra_en_movimiento.mp3"]');await page.waitForFunction(()=>state==='play');
  const songInfo=await page.evaluate(()=>({name:song.name,bpm:BPM,offset:beatTime(0),first:activeChart.beats[0],last:activeChart.beats.at(-1),duration:songBuf.duration,notes:chartNotes(),diag:!!diagRun,rate,normalPurple:PURPLE_RATE}));
  assert.equal(songInfo.name,'Sombra en Movimiento');assert.equal(songInfo.bpm,150);assert.ok(Math.abs(songInfo.offset-.402)<1e-9);assert.equal(songInfo.first,.385);assert.equal(songInfo.notes,false);assert.equal(songInfo.diag,false);assert.equal(songInfo.normalPurple,.15);
  const measured=await page.evaluate(()=>{
   stopMoveScheduler();const original=songTime;let now=0;songTime=()=>now;notes=[];moveLocked=false;NBDiamond.reset();let uid=91000;
   function tap(n,diff,kind='break'){
    now=beatTime(n)+diff;nextBeat=n+1;acted=-1;hurtGuardUntil=-9;rushGuardUntil=-9;moveLocked=false;
    notes=[{id:uid++,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:1,...(kind==='purple'?{purple:true}:{})}];
    input(kind==='purple'?'move':'break',{timeStamp:0},'test');
   }
   tap(10,.01);tap(80,-.06);tap(155,.11);tap(230,.16);tap(310,-.02,'purple');
   // Diamond judgment omits offsetMs in the old event payload; inherit the input target.
   now=beatTime(320)+.02;nextBeat=321;acted=-1;moveLocked=false;
   notes=[{id:uid++,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:8,maxHp:8,diamond:true,gem:{type:'novice'}}];
   input('break',{timeStamp:0},'test');
   const actualCounts={...counts};endReason='finish';end(true);finishResult(true);songTime=original;
   return {counts:actualCounts,report:NBTimingHistory.snapshot(timingHistoryRun)};
  });
  await page.evaluate(()=>timingHistoryWrites);
  let records=await page.evaluate(()=>NBTimingHistory.list());assert.equal(records.length,1);
  assert.deepEqual(records[0].summary.counts,{PERFECT:3,GREAT:1,GOOD:1,MISS:1});assert.deepEqual(records[0].summary.counts,measured.counts);
  assert.equal(records[0].inputs[1].offsetMs,-60);assert.equal(records[0].inputs.at(-1).offsetMs,20);assert.equal(records[0].inputs.at(-1).mining,true);
  assert.equal(records[0].summary.FAST,2);assert.equal(records[0].summary.SLOW,4);assert.equal(records[0].songCorrectionMs,17);
  assert.deepEqual(records[0].by30Seconds.map(x=>x.startSeconds),[0,30,60,90,120]);
  assert.equal(await page.locator('#diagLine').isVisible(),false);
  await page.evaluate(()=>returnToSongs());await page.click('[data-nav="settings"]');await page.click('#diagHistorySettings summary');await page.click('#historyOpen');
  await page.waitForFunction(()=>document.querySelectorAll('[data-history-id]').length===1);
  await page.screenshot({path:path.join(out,'history.png')});
  await page.click('#historyCopy');const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.equal(JSON.parse(copied).id,records[0].id);
  const dl=page.waitForEvent('download');await page.click('#historySave');const download=await dl;await download.saveAs(path.join(out,'diagnosis.json'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'diagnosis.json'),'utf8')),JSON.parse(copied));
  await page.click('#historyClose');
  // Detailed mode stays opt-in and works alongside automatic history.
  await page.evaluate(()=>{diagOn=true;startGame();stopMoveScheduler();const original=songTime;songTime=()=>beatTime(12)-.03;nextBeat=13;acted=-1;moveLocked=false;notes=[{id:99991,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:1}];input('break',{timeStamp:0},'test');songTime=original;pauseGame();});
  assert.ok(await page.evaluate(()=>diagRun.events.some(e=>e.type==='input_result'&&e.judge==='PERFECT')));
  await page.evaluate(()=>startGame()); // Save the previous attempt before reset.
  await page.evaluate(()=>timingHistoryWrites);records=await page.evaluate(()=>NBTimingHistory.list());assert.equal(records.length,2);assert.equal(records[0].endReason,'retry');
  await page.evaluate(()=>{pauseGame();returnToSongs();});await page.evaluate(()=>timingHistoryWrites);records=await page.evaluate(()=>NBTimingHistory.list());assert.equal(records.length,3);assert.equal(records[0].endReason,'quit');
  // Exercise source seconds at 2x and delayed/queued judgments with the real hooks.
  const timing=await page.evaluate(()=>{
   timingMs=25;diagOn=false;startGame();stopMoveScheduler();rate=2;applyRate();
   const rec=diagInput('break',{timeStamp:0},'test',{perf:null,reason:'test'},performance.now(),0,16,15);
   diagTarget(rec,nearestBeat(15),15,-.02);diagInputEnd(rec,{status:'queued'});
   diagResult(rec,{status:'judged',judge:'PERFECT',offsetMs:-20});pauseGame();returnToSongs();
   return NBTimingHistory.snapshot(timingHistoryRun).inputs[0];
  });
  assert.equal(timing.songTimeSec,30.05);assert.equal(timing.rate,2);assert.equal(timing.bpm,300);assert.equal(timing.offsetMs,-20);
  await page.evaluate(()=>timingHistoryWrites);
  // A real life-loss game over saves automatically, without an input offset for the missed note.
  await page.evaluate(()=>{startGame();stopMoveScheduler();hp=1;damage(songTime(),'期限切れ',{id:99881,idx:player.idx,hp:1});finishResult(false);});
  await page.evaluate(()=>timingHistoryWrites);records=await page.evaluate(()=>NBTimingHistory.list());
  assert.equal(records[0].endReason,'game_over');assert.equal(records[0].summary.counts.MISS,1);assert.equal(records[0].summary.meanMs,null);assert.equal(records[0].misses[0].offsetMs,null);
  await page.evaluate(()=>returnToSongs());
  // Real IndexedDB transactions retain exactly the newest 20, including same-ID updates.
  await page.evaluate(async()=>{
   const base=(await NBTimingHistory.list())[0];
   for(let i=0;i<23;i++)await NBTimingHistory.save({...base,id:'retention-'+String(i).padStart(2,'0'),createdAt:new Date(Date.UTC(2030,0,1,0,0,i)).toISOString()});
   await NBTimingHistory.save({...base,id:'retention-22',createdAt:'2030-01-01T00:00:22.000Z',endReason:'quit'});
  });
  await page.reload();await page.waitForFunction(()=>state==='ready');records=await page.evaluate(()=>NBTimingHistory.list());assert.equal(records.length,20);assert.equal(records[0].id,'retention-22');assert.equal(records.at(-1).id,'retention-03');
  assert.equal(await page.evaluate(()=>songCorrSetting('charts/sombra_en_movimiento.json')),17);
  await page.click('[data-nav="settings"]');await page.click('#diagHistorySettings summary');await page.click('#historyOpen');await page.waitForFunction(()=>document.querySelectorAll('[data-history-id]').length===20);
  await page.locator('[data-history-id="retention-03"]').click();
  const last=page.waitForEvent('download');await page.click('#historySave');await (await last).saveAs(path.join(out,'older-record.json'));assert.equal(JSON.parse(fs.readFileSync(path.join(out,'older-record.json'))).id,'retention-03');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'PASS',songInfo,checks:['audio/chart loaded','no diagnostic HUD when off','ordinary/purple/diamond judgments','MISS not double counted','30-second sections','copy and JSON download','detailed mode preserved','retry and quit save','2x source position','20-record retention','same-ID upsert','reload persistence','older record selection'],pageErrors:errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
