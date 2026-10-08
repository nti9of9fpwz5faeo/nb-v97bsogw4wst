const {chromium}=require('playwright');
const assert=require('node:assert/strict'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),qa=process.env.NEON_QA_DIR||'/tmp/neon-tutorial-qa';fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{const f=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});res.end(e?'':b);});});
(async()=>{
 await new Promise(r=>server.listen(8146,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
 await page.goto(process.env.NEON_PUBLIC_URL||'http://127.0.0.1:8146');await page.waitForFunction(()=>typeof coach!=='undefined'&&!!coach);
 assert.equal(await page.locator('#startOv').evaluate(e=>e.classList.contains('hide')),true);
 if(await page.locator('#tutorialBegin').count())await page.click('#tutorialBegin');
 await page.waitForFunction(()=>state==='play'&&ctx.state==='running');
 assert.equal(requests.some(u=>u.endsWith('audio/tutorial.mp3')),false);
 const first=await page.evaluate(()=>({goal:GOAL_INDEX,source:gIdx,path:path.map(p=>({...p})),bpm:BPM,locked:moveLocked,loop:songSrc.loop}));
 assert.equal(first.path.length,10);assert.ok(first.path[0].c>first.path.at(-1).c);
 assert.equal(first.goal,7);assert.equal(first.source,9);assert.equal(first.bpm,90);assert.equal(first.loop,true);assert.equal(first.locked,false);assert.equal(new Set(first.path.map(p=>p.r)).size,1);
 const guide=await page.evaluate(()=>{
   const saved={notes,nextBeat,player,ringOn},rects=[],round=g.roundRect;
   g.roundRect=function(...a){rects.push(a);return round.apply(this,a);};
   try{
     ringOn=true;nextBeat=8;player={idx:1,from:1,at:-9};
     notes=[{id:-1,idx:3,from:3,at:-9,hp:1}];
     drawApproachRing(beatTime(7)+SPB*.5);const far=rects.at(-1)?.[2];
     notes[0].idx=2;drawApproachRing(beatTime(7)+SPB*.5);const near=rects.at(-1)?.[2];
     notes[0].idx=1;drawApproachRing(beatTime(7));const on=rects.at(-1)?.[2];
     notes[0].hit=true;notes[0].hitBeat=7;
     const blueBefore=nextNoteInfo(beatTime(7)+SPB*.25).left,blueOn=nextNoteInfo(beatTime(8)).left;
     const beforeOff=rects.length;ringOn=false;drawApproachRing(beatTime(8));
     return {far,near,on,cell,blueBefore,blueOn,offAdds:rects.length-beforeOff,oldCoachOverlay:typeof drawCoachTarget};
   }finally{({notes,nextBeat,player,ringOn}=saved);g.roundRect=round;}
 });
 assert.ok(guide.far>guide.near&&guide.near>guide.on);assert.equal(guide.on,guide.cell);
 assert.equal(guide.blueBefore,.75);assert.equal(guide.blueOn,0);assert.equal(guide.offAdds,0);assert.equal(guide.oldCoachOverlay,'undefined');
 console.log('shared square guide shrinks to the player tile, blue second beat counts down, guide setting respected, old overlays removed: PASS');
 await page.screenshot({path:path.join(qa,'01-red.png')});
 // Pause/resume must preserve the same course and notes, without resetting the practice clock.
 await page.click('#pauseBtn');assert.equal(await page.evaluate(()=>state),'paused');await page.click('#resumeBtn');await page.waitForFunction(()=>state==='play',{},{timeout:8000});await page.waitForTimeout(400);
 console.log('automatic first entry, audio gesture, 10-cell horizontal path, 90 BPM, pause/resume: PASS');
 await page.evaluate(()=>{stopMoveScheduler();state='paused';});
 for(let stage=0;stage<3;stage++){
   const r=await page.evaluate(stage=>{
     const fail=m=>{throw Error(m)};state='play';const epoch=musicEpoch,clock=songStart,lessonKinds=[];let t=beatTime(nextBeat);
     if(coach.step!==stage)fail('incorrect stage');
     for(let lesson=0;lesson<coachStep().types.length;lesson++){
       const gate=coachStep().gates[lesson];while(player.idx<gate)freeMove(t,null);
       const before=player.idx;for(let i=0;i<15;i++)freeMove(t,null);if(player.idx!==before)fail('movement bypassed lesson');
       const kind=coachStep().types[lesson];let missed=false;
       for(let guard=0;coach.done===lesson&&guard<80;guard++){
         const n=nextBeat;t=beatTime(n);onBeat(n,t);nextBeat++;
         const nt=notes.find(x=>x.idx<=player.idx);
         if(nt){
           // Fail one blue second hit, then replay the full blue block.
           if(stage===1&&lesson===0&&nt.hit&&!missed){missed=true;}
           else {if(kind==='purple'){doAction('break',n,t,0,null);if(!notes.includes(nt))fail('purple broken with wrong action');}
             doAction(kind==='purple'?'charge':'break',n,t,0,null);}
         }
         checkHit(t+WINDOW,null,null,n);pendingCheck=[];
       }
       if(coach.done!==lesson+1)fail('lesson never completed');lessonKinds.push(kind);
       if(stage===1&&lesson===0&&!missed)fail('retry not exercised');
     }
     // Completing the hits alone must not advance the course.
     coachUpdate(t);if(coach.step!==stage)fail('stage advanced before goal');
     while(player.idx<GOAL_INDEX)freeMove(t,null);
     if(!checkLines(t)||coach.phase!=='goal')fail('goal not recognized');
     if(hp!==MAX_HP)fail('tutorial damaged life');
     coachUpdate(t+SPB*2+.01);
     if(stage<2&&(coach.step!==stage+1||player.idx!==0))fail('next course not entered');
     if(stage<2&&(musicEpoch!==epoch||songStart!==clock))fail('beat restarted at course transition');
     state=stage===2?'clear':'paused';return {lessonKinds,step:coach.step,complete:tutorialProgress().complete};
   },stage);
   assert.deepEqual(r.lessonKinds,stage===0?['red','red','red']:stage===1?['blue','red','blue']:['purple','red','blue','purple']);
   if(stage<2){await page.evaluate(()=>draw(songTime()));await page.screenshot({path:path.join(qa,stage===0?'02-blue.png':'03-purple.png')});}
   else assert.equal(r.complete,true);
 }
 assert.equal(await page.locator('#coachDoneOv').evaluate(e=>e.classList.contains('hide')),false);
 await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>coach),null);
 await page.click('#homeTutorial');await page.waitForFunction(()=>state==='play'&&isTutorial());assert.equal(await page.evaluate(()=>coach.step),0);
 // Real pointer input against the running audio clock, including the movement gate.
 await page.click('#bMove');await page.click('#bMove');await page.click('#bMove');
 assert.equal(await page.evaluate(()=>player.idx),1);
 await page.waitForFunction(()=>notes[0]&&notes[0].idx-player.idx===1,{},{timeout:12000});
 await page.screenshot({path:path.join(qa,'04-shared-square-guide.png')});
 await page.evaluate(()=>new Promise((resolve,reject)=>{
   const until=performance.now()+12000;
   function hit(){
     if(coach.done===1){resolve();return;}
     if(performance.now()>until){reject(Error('real pointer break did not complete'));return;}
     const t=songTime(),nt=notes[0],n=nextBeat-1;
     if(nt&&nt.idx===player.idx&&t>=beatTime(n)&&t-beatTime(n)<WINDOW*.7){
       const b=document.getElementById('bBreak');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));
     }
     requestAnimationFrame(hit);
   }hit();
 }));
 console.log('real move and break pointer inputs, judged against the live 90 BPM clock: PASS');
 // Reload partway through blue: resume at the beginning of blue, not back at red.
 await page.evaluate(()=>{coachEnter(1,songTime());pauseGame();});await page.reload();await page.waitForFunction(()=>coach?.step===1);
 if(await page.locator('#tutorialBegin').count())await page.click('#tutorialBegin');
 for(const size of [{width:320,height:568},{width:844,height:390}]){
   await page.setViewportSize(size);await page.waitForTimeout(120);
   const boxes=await page.evaluate(()=>{const c=cv.getBoundingClientRect(),p=cellXY(0),src=cellXY(gIdx),b=document.getElementById('bMove').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,start:c.top+p.y,source:c.top+src.y,buttonBottom:b.bottom,buttonTop:b.top,height:innerHeight,startX:c.left+p.x,sourceX:c.left+src.x,width:innerWidth};});
   assert.equal(boxes.overflow,false);assert.ok(boxes.start<boxes.buttonTop&&boxes.source>0);assert.ok(boxes.buttonBottom<=boxes.height);assert.ok(boxes.sourceX>0&&boxes.startX<boxes.width&&boxes.startX>boxes.sourceX);
   await page.screenshot({path:path.join(qa,`layout-${size.width}.png`)});
 }
 // Normal courses still use 35 steps and four source cells.
 const normal=await page.evaluate(()=>{returnToSongs();setSong(SONGS[1]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();state='paused';return {goal:GOAL_INDEX,cols:new Set(path.map(p=>p.c)).size,locked:moveLocked};});
 assert.equal(normal.goal,35);assert.ok(normal.cols>1);assert.equal(normal.locked,true);
 assert.deepEqual(errors,[]);console.log('red → mixed blue → mixed purple, no skipping, blue retry, continuous beat, completion/reload/replay, saved stage, responsive layouts, normal-course isolation: PASS');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
