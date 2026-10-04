const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out='/tmp/neon-v69-qa';fs.mkdirSync(out,{recursive:true});
const publicURL=process.env.NB_PUBLIC_URL,server=publicURL?null:http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(file===root+'/')file+='index.html';fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);});});
(async()=>{
 if(server)await new Promise(resolve=>server.listen(8139,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,proxy:publicURL&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({ignoreHTTPSErrors:!!publicURL,viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(publicURL||'http://127.0.0.1:8139');await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>APP_VERSION),'v69');
  for(const style of ['glow','hidden']){
   await page.click('[data-nav="songs"]');await page.click(`[data-gem-style="${style}"]`);assert.equal(await page.locator(`[data-gem-style="${style}"]`).getAttribute('aria-pressed'),'true');
   await page.setViewportSize({width:320,height:568});assert.equal(await page.locator('#gemStylePicker').evaluate(el=>el.scrollWidth>el.clientWidth),false);await page.screenshot({path:out+'/'+style+'-picker.png'});await page.setViewportSize({width:390,height:844});
   await page.evaluate(()=>{playMode='distance';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();nextBeat=100000;moveLocked=false;notes=[];fillGap(1,8,songTime());});
   assert.equal(await page.evaluate(()=>notes.length>0&&notes.every(note=>note.gemAssigned)),true);
   const passage=await page.evaluate(()=>{notes=[];NBWorkshop.flush();const before=(JSON.parse(localStorage.getItem(NBProgression.KEY))||{gems:0}).gems;for(let n=0;n<7;n++)freeMove(songTime(),null);NBWorkshop.tick(songTime());NBWorkshop.flush();return {before,after:(JSON.parse(localStorage.getItem(NBProgression.KEY))||{gems:0}).gems};});assert.equal(passage.after,passage.before);
   // Compare actual canvas rendering with and without a gem. Hidden is pixel-identical.
   const visual=await page.evaluate(()=>{
    stopSong();state='paused';pausedAt=0;player={idx:0,from:0,at:-9};notes=NBBlockGems.types.map((type,i)=>({id:910000+i,idx:i+1,from:i+1,at:-9,pop:-9,hp:1,gem:{type:type.id,claimed:false}}));effects=[];fx=[];texts=[];rushAnim=null;lastBeatAt=-9;cameraRow=cameraFrom=cameraTarget=0;cameraAt=-9;draw(0);const withGems=cv.toDataURL();const refs=notes.map(n=>n.gem);notes.forEach(n=>n.gem=null);draw(0);const plain=cv.toDataURL();notes.forEach((n,i)=>n.gem=refs[i]);draw(0);return {different:withGems!==plain,hints:notes.map(note=>NBBlockGems.shine(note,NBWorkshop.style()))};
   });assert.equal(visual.different,style==='glow');assert.equal(visual.hints.every(n=>n===0),style==='hidden');if(style==='glow')assert.ok(visual.hints.every((n,i,a)=>i===0||n>a[i-1]));
   await page.screenshot({path:out+'/'+style+'-blocks.png'});
   const actual=await page.evaluate(()=>{
    state='play';startMusicAt();nextBeat=100000;moveLocked=false;player={idx:0,from:0,at:-9};notes=[];
    const make=(id,type,hp=1,purple=false)=>({id,idx:player.idx,from:player.idx,at:-9,pop:-9,hp,purple,gem:{type,claimed:false}}),balance=()=>{NBWorkshop.flush();return (JSON.parse(localStorage.getItem(NBProgression.KEY))||{gems:0}).gems;},base=balance();
    const normal=make(920001,'novice');notes=[normal];doAction('break',1000,0,0,null);const one=balance()-base;NBWorkshop.destroyed(normal,0);const duplicate=balance()-base;
    notes=[make(920002,'adept',2)];doAction('break',1001,0,0,null);const firstBlue=balance()-base;doAction('break',1002,0,0,null);const secondBlue=balance()-base;
    notes=[make(920003,'master',1,true)];doAction('charge',1003,0,0,null);const purple=balance()-base;
    notes=[make(920004,'divine')];hurtGuardUntil=-9;rushGuardUntil=-9;checkHit(0,'test');const missed=balance()-base;
    // The ultimate retains each original gem until the visual block-shatter frame.
    player={idx:1,from:1,at:-9};moveLocked=false;notes=[{...make(920005,'divine'),idx:2,from:2},{...make(920006,'novice'),idx:3,from:3}];rushUnits=120;doRush(0,null,false);const windup=balance()-base;drawRushAnim(RUSH_WINDUP_SEC+1);const ultimate=balance()-base;drawRushAnim(RUSH_WINDUP_SEC+2);const repeat=balance()-base;
    state='paused';NBWorkshop.destroyed(make(920007,'divine'),3);const paused=balance()-base;state='play';NBWorkshop.nextCourse();notes=[make(920008,'novice')];doAction('break',1004,0,0,null);const warped=balance()-base;
    endReason='hp';hp=0;end(false);finishResult(false);finishResultReveal();return {one,duplicate,firstBlue,secondBlue,purple,missed,windup,ultimate,repeat,paused,warped,counts:finishedRun.gemCounts,style:finishedRun.gemStyle};
   });assert.deepEqual({...actual,counts:undefined,style:undefined},{one:5,duplicate:5,firstBlue:5,secondBlue:20,purple:60,missed:60,windup:60,ultimate:215,repeat:215,paused:215,warped:220,counts:undefined,style:undefined});assert.equal(actual.style,style);assert.deepEqual(actual.counts,{novice:3,adept:1,master:1,divine:1});
   assert.ok((await page.locator('#overOv [data-result-reward-detail]').textContent()).includes('ブロックから獲得'));await page.locator('#overOv .resultDetails>summary').click();assert.ok((await page.locator('#overOv [data-result-gem-types]').textContent()).includes('神級 ×1'));
   await page.screenshot({path:out+'/'+style+'-result.png'});await page.click('#overOv [data-select]');
  }
  const before=await page.evaluate(()=>localStorage.getItem(NBProgression.KEY));await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.evaluate(()=>NBWorkshop.style()),'hidden');assert.equal(await page.evaluate(()=>localStorage.getItem(NBProgression.KEY)),before);
  assert.equal(await page.locator('#gemCue').count(),0);assert.equal(await page.evaluate(()=>typeof NBWorkshop.drawTile),'undefined');assert.deepEqual(errors,[]);
  console.log('PASS '+(publicURL?'public':'local')+' v69: both style selectors, hidden pixel-identical, four brightness levels, all tiers, normal/blue/purple/ultimate breaks, no passage/miss/pause rewards, one-time grants, warp, result, persistence, 320px layout.');
 }finally{await browser.close();if(server)server.close();}
})().catch(error=>{console.error(error);if(server)server.close();process.exitCode=1;});
