const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=process.env.QA_DIR||'/tmp/neon-v88-continuous';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());await page.goto(origin);await page.waitForFunction(()=>state==='ready');
  await page.evaluate(()=>{playMode='endless';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();});
  await page.waitForFunction(()=>songTime()>.1);
  const continuity=await page.evaluate(()=>{
   const checks=[];
   for(let i=0;i<25;i++){
    const t=songTime(),goal=GOAL_INDEX;notes=[];lineK=LINES.length-1;player={idx:goal,from:goal-1,at:t};
    const oldPath=JSON.stringify(path.slice(0,goal+1));cameraFrom=cameraTarget=Math.max(0,path[goal].r-2);cameraAt=t-1;cameraRow=cameraAtTime(t);
    const before={point:cellXY(playerVis(t)),camera:cameraAtTime(t),from:player.from,at:player.at};
    checkLines(t);stopMoveScheduler();cameraRow=cameraAtTime(t);
    const after={point:cellXY(playerVis(t)),camera:cameraAtTime(t),from:player.from,at:player.at};
    checks.push({i,goal,nextGoal:GOAL_INDEX,idx:player.idx,before,after,oldPathPreserved:oldPath===JSON.stringify(path.slice(0,goal+1)),g:gIdx,visibleCount:revealEnd-firstVisibleTile()+1,firstVisible:firstVisibleTile(),gate:passedSpeedGate.idx});
   }return checks;
  });
  for(const c of continuity){assert.deepEqual(c.before,c.after);assert.equal(c.idx,c.goal);assert.equal(c.nextGoal,c.goal+50);assert.equal(c.g,c.goal+8);assert.equal(c.oldPathPreserved,true);assert.equal(c.gate,c.goal);assert.ok(c.visibleCount<45);}
  assert.ok(continuity.at(-1).firstVisible>1000);
  // Capture the exact crossing frame: the same character/ground location survives it.
  await page.evaluate(()=>{
   startGame();stopMoveScheduler();const t=songTime();window.qaT=t;state='paused';pausedAt=t;notes=[];moveLocked=false;lineK=LINES.length-1;gIdx=gIndexFor(lineK);gFrom=gIdx;revealEnd=revealFrom=EXIT_INDEX;
   player={idx:49,from:49,at:t-1};cameraFrom=cameraTarget=Math.max(0,path[50].r-2);cameraAt=t-1;cameraRow=cameraTarget;NBWorkshop.clearToasts();hideJudge();draw(t);
  });
  await page.screenshot({path:path.join(out,'01-before-gate.png')});
  const pixel=await page.evaluate(()=>{
   const t=window.qaT,before=cellXY(playerVis(t)),labels=[],text=g.fillText.bind(g);g.fillText=(s,...args)=>{labels.push(s);text(s,...args);};draw(t);const upcoming=labels.some(s=>s==='加速 ×1.1');
   state='play';freeMove(t,null);stopMoveScheduler();state='paused';pausedAt=t;draw(t);const after=cellXY(playerVis(t));g.fillText=text;
   return {before,after,upcoming,passed:labels.some(s=>s==='速度 ×1.1'),idx:player.idx,goal:GOAL_INDEX};
  });assert.deepEqual(pixel.before,pixel.after);assert.equal(pixel.upcoming,true);assert.equal(pixel.passed,true);assert.equal(pixel.idx,50);assert.equal(pixel.goal,100);
  await page.screenshot({path:path.join(out,'02-crossing-gate.png')});
  await page.evaluate(()=>{pausedAt=window.qaT+.4;draw(pausedAt);});await page.screenshot({path:path.join(out,'03-connected-road.png')});
  // Ultimate starts its visual travel at 45, remains interpolated after reaching logical 50,
  // and completes at the same world cell rather than appearing at the next course start.
  const rush=await page.evaluate(()=>{
   startGame();stopMoveScheduler();const t=Math.max(0,songTime());moveLocked=false;notes=[];lineK=7;player={idx:45,from:45,at:t-1};
   cameraFrom=cameraTarget=Math.max(0,path[50].r-2);cameraAt=t-1;cameraRow=cameraTarget;
   rushAnim={from:45,to:50,t0:t-.6,moveAt:t,dur:.5,blown:[],moved:false,trail:45};rushGuardUntil=t+1.1;
   const before=cellXY(playerVis(t));drawRushAnim(t);stopMoveScheduler();const after=cellXY(playerVis(t));
   const mid=playerVis(t+.25);drawRushAnim(t+.5);return {before,after,mid,end:playerVis(t+.5),idx:player.idx,goal:GOAL_INDEX,done:rushAnim===null};
  });assert.deepEqual(rush.before,rush.after);assert.equal(rush.mid,47.5);assert.equal(rush.end,50);assert.equal(rush.idx,50);assert.equal(rush.goal,100);assert.equal(rush.done,true);
  // Loop fade follows cumulative positions and survives the next continuation.
  const rear=await page.evaluate(()=>{
   const t=endlessClock.time(songBuf.duration)+.01;player={idx:99,from:99,at:t-1};updateEndlessCycle(t);
   const before={...rearClear};player={idx:100,from:99,at:t};lineK=LINES.length-1;checkLines(t);stopMoveScheduler();
   return {before,after:rearClear,oldAlpha:rearTileAlpha(98,t+.6),standingAlpha:rearTileAlpha(100,t+.6),nextAlpha:rearTileAlpha(101,t+.6),goal:GOAL_INDEX};
  });assert.deepEqual(rear.before,rear.after);assert.equal(rear.before.to,98);assert.equal(rear.oldAlpha,0);assert.equal(rear.standingAlpha,1);assert.equal(rear.nextAlpha,1);assert.equal(rear.goal,150);
  // Accessibility still preserves the screen location at the exact boundary.
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.evaluate(()=>{const t=songTime();notes=[];lineK=LINES.length-1;player={idx:GOAL_INDEX,from:GOAL_INDEX-1,at:t};cameraFrom=cameraTarget=path[player.idx].r-3;cameraAt=t-1;cameraRow=cameraAtTime(t);const before=cellXY(playerVis(t));checkLines(t);stopMoveScheduler();cameraRow=cameraAtTime(t);return {before,after:cellXY(playerVis(t))};});assert.deepEqual(reduced.before,reduced.after);
  await page.evaluate(()=>pauseGame());assert.deepEqual(errors,[]);
  const result={status:'PASS',continuity,pixel,rush,rear,reduced,errors};fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(result,null,2));console.log('PASS: 25 seamless boundaries, exact screen coordinates, gate labels, preserved ultimate, cumulative rear fade, visible-only rendering, reduced motion');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
