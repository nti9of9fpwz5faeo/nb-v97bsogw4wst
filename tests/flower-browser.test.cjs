const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out='/tmp/neon-flower-qa';fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'application/octet-stream');res.end(d);});});
(async()=>{await new Promise(r=>server.listen(8141,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
try{
const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await page.goto('http://127.0.0.1:8141');await page.waitForFunction(()=>state==='ready');
assert.equal(await page.locator('#flowerPlay').isVisible(),true);assert.equal(await page.locator('.hunterGrades').isVisible(),false);
await page.screenshot({path:out+'/home.png'});await page.click('#flowerPlay');await page.getByRole('button',{name:'Metronomic Drive プレイする ›',exact:true}).click();await page.waitForFunction(()=>state==='play');
assert.equal(await page.evaluate(()=>NBWorkshop.race()),null);assert.equal(await page.evaluate(()=>rushUnits),0);
// Fixtures isolate input semantics; no edited timings/health are used as gameplay balance evidence.
async function fixture(){await page.keyboard.up('k');await page.evaluate(()=>{document.getElementById('pauseOv').classList.add('hide');stopRushHold();stopMoveScheduler();nextBeat=100000;pendingCheck=[];notes=[];earlyInput=null;acted=-1;moveLocked=false;player={idx:14,from:14,at:-9};lineK=1;gIdx=22;revealEnd=25;cameraRow=0;cameraAt=-9;cameraTarget=0;cameraFrom=0;rushAnim=null;hp=5;NBFlower.reset();});}
await fixture();
await page.evaluate(()=>{const n=nearestBeat(songTime())+1;songStart=outputTime()-beatTime(n)-.015;syncClock();notes=[{id:990,idx:14,from:14,at:-9,pop:-9,hp:1,purple:true},{id:991,idx:15,from:15,at:-9,pop:-9,hp:1}];input('break',{timeStamp:performance.now()},'flower-test');input('move',{timeStamp:performance.now()},'flower-test');});
assert.deepEqual(await page.evaluate(()=>({idx:player.idx,purple:notes.some(x=>x.id===990),next:notes.find(x=>x.id===991)?.idx})),{idx:14,purple:false,next:15});
await fixture();await page.evaluate(()=>rushUnits=RUSH_FULL);assert.equal(await page.evaluate(()=>doRush(songTime(),null,false)),false);
await page.keyboard.down('k');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>NBFlower.snapshot().progress),0);await page.waitForTimeout(650);await page.keyboard.up('k');
const partial=await page.evaluate(()=>NBFlower.snapshot().progress);assert.ok(partial>200&&partial<1100,partial);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>NBFlower.snapshot().progress),partial);
await page.screenshot({path:out+'/harvesting.png'});
await page.keyboard.down('k');await page.waitForFunction(()=>NBFlower.snapshot().collected===1);await page.waitForTimeout(500);
assert.equal(await page.evaluate(()=>rushAnim),null);assert.equal(await page.evaluate(()=>rushUnits),120);assert.equal(await page.evaluate(()=>NBFlower.snapshot().total),1);assert.equal(await page.evaluate(()=>localStorage.getItem('neon-blade-flowers-v1')),'1');
await page.screenshot({path:out+'/collected.png'});await page.keyboard.up('k');await page.keyboard.down('k');await page.waitForFunction(()=>!!rushAnim);await page.keyboard.up('k');await page.waitForFunction(()=>!rushAnim);
await fixture();await page.keyboard.down('k');await page.waitForTimeout(650);await page.keyboard.press('j');assert.equal(await page.evaluate(()=>player.idx),15);assert.equal(await page.evaluate(()=>NBFlower.snapshot().progress),0);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>rushAnim),null);await page.keyboard.up('k');
await fixture();await page.keyboard.down('k');await page.waitForTimeout(650);await page.evaluate(()=>pauseGame());const paused=await page.evaluate(()=>NBFlower.snapshot().progress);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>NBFlower.snapshot().progress),paused);await page.keyboard.up('k');
await page.evaluate(()=>{state='play';NBFlower.nextCourse();player.idx=14;});assert.equal(await page.evaluate(()=>NBFlower.at()),false);
await fixture();await page.keyboard.down('k');await page.waitForTimeout(400);await page.evaluate(()=>{endReason='hp';hp=0;end(false);});await page.waitForTimeout(2800);assert.equal(await page.evaluate(()=>NBFlower.snapshot().collected),0);
assert.equal(await page.locator('#overOv .flowerReward').isVisible(),true);await page.setViewportSize({width:320,height:568});await page.screenshot({path:out+'/result-small.png'});assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth),false);
await page.reload();await page.waitForFunction(()=>state==='ready');assert.equal(await page.locator('[data-flower-total]').innerText(),'1');assert.equal(await page.evaluate(()=>NBFlower.snapshot().collected),0);
assert.deepEqual(errors,[]);console.log('PASS: flower UI; hunter disabled; empty initial gauge; purple stationary; hold threshold/cumulative/release; rush blocked and fresh-press recovery; leave reset; pause/end/warp; single persistent award; 320px results.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
