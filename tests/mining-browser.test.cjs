const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out='/tmp/neon-v72-qa';fs.mkdirSync(out,{recursive:true});
const url=process.env.NB_PUBLIC_URL,server=url?null:http.createServer((req,res)=>{let f=path.join(root,decodeURIComponent(req.url.split('?')[0]));if(f===root+'/')f+='index.html';fs.readFile(f,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});});
(async()=>{
 if(server)await new Promise(r=>server.listen(8140,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',proxy:url&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({ignoreHTTPSErrors:!!url,viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>(errors.push(String(e)),console.error('PAGE',String(e))));
  console.log('browser launched');await page.goto(url||'http://127.0.0.1:8140');console.log('page loaded');await page.waitForFunction(()=>state==='ready',{},{timeout:20000});console.log('ready');assert.equal(await page.evaluate(()=>APP_VERSION),'v83');
  await page.click('[data-nav="songs"]');await page.screenshot({path:out+'/songs.png'});
  const results=await page.evaluate(()=>{
   playMode='distance';endless=true;setSong(SONGS[3]);songBuf=ctx.createBuffer(1,ctx.sampleRate*120,ctx.sampleRate);startGame();stopMoveScheduler();stopSong();nextBeat=100000;moveLocked=false;notes=[];player={idx:3,from:3,at:-9};
   const check=(yes,message)=>{if(!yes)throw new Error(message);};
   let id=990000;
   const make=type=>NBDiamond.prepare({id:id++,idx:player.idx,from:player.idx,at:-9,pop:-9,hp:1,gem:{type,claimed:false},gemAssigned:true});
   const balance=()=>{NBWorkshop.flush();return (JSON.parse(localStorage.getItem(NBProgression.KEY))||{gems:0}).gems;};
   const initial=balance(),life=hp,results=[];
   for(const tier of NBBlockGems.types){const n=make(tier.id);check(n.gem.type==='novice'&&n.hp===4,'only common diamond spawns');}
   for(const tier of [NBBlockGems.types[0]]){
    NBDiamond.reset();const note=make(tier.id);notes=[note];note.idx=player.idx;const before=balance();checkHit(0,'skip');check(hp===life&&!notes.length&&balance()===before,'safe skip '+tier.id);
    const ore=make(tier.id),normal={id:id++,idx:player.idx+2,from:player.idx+2,at:-9,pop:-9,hp:1};notes=[ore,normal];nextBeat=10;
    const start=songStart;doAction('break',10,beatTime(10),0,null);check(NBDiamond.active()&&ore.hp===tier.hits-1,'first strike '+tier.id);check(ore.idx===player.idx,'anchor stays on player cell');
    doAction('break',10,beatTime(10),0,null);check(ore.hp===tier.hits-1,'same beat duplicate');
    const idx=player.idx;freeMove(beatTime(10),null);rushUnits=120;check(!doRush(beatTime(10),null,false)&&player.idx===idx,'no movement/rush');
    const beforeHp=ore.hp;NBDiamond.strike(ore,11,beatTime(11),WINDOW+.1,null);check(ore.hp===beforeHp,'offbeat no progress');
    for(let n=11;n<11+tier.hits+2;n++){nextBeat=n;onBeat(n,beatTime(n));nextBeat=n+1;checkHit(beatTime(n)+WINDOW,'mining',null,n);check(noteView(ore,beatTime(n)+.1,notesWillMove(),beatTime(nextBeat),player.idx).vis===idx,'rendered anchor remains fixed');}
    check(hp===life&&normal.idx===idx+2&&normal.spin!=null&&notes.length===2,'frozen ordinary/spawning/deadlines');
    check(songStart===start&&ore.hp===beforeHp,'clock/idle progress unchanged');check(ore.idx===idx&&ore.from===idx,'no movement or head teleport');
    for(let j=1;j<tier.hits;j++)doAction('break',30+j,beatTime(30+j),0,null);
    check(!NBDiamond.active()&&!notes.includes(ore),'complete');check(balance()-before===tier.value,'correct reward '+tier.id);
    NBWorkshop.destroyed(ore,0);check(balance()-before===tier.value,'one reward');
    const last=30+tier.hits-1;nextBeat=last+1;onBeat(last+1,beatTime(last+1));nextBeat=last+2;check(normal.idx===idx+2,'recovery beat');
    onBeat(last+2,beatTime(last+2));nextBeat=last+3;check(normal.idx===idx+1,'resumed one step');
    results.push({type:tier.id,hits:tier.hits,value:tier.value});
   }
   NBDiamond.reset();notes=[];const ore=make('divine');notes=[ore];const before=balance();rushGuardUntil=999;blastNote(ore,0);check(balance()===before,'ultimate cannot award unfinished diamond');rushGuardUntil=-9;
   const pending=make('master');notes=[pending];doAction('break',300,0,0,null);check(NBDiamond.active(),'active before pause');state='paused';const left=pending.hp;NBDiamond.strike(pending,301,1,0,null);check(pending.hp===left,'pause cannot mine');state='play';
   endReason='song_end';end(false);check(!NBDiamond.active()&&balance()===before,'end clears without award');
   startGame();stopMoveScheduler();stopSong();nextBeat=100000;check(!NBDiamond.active(),'retry clears');moveLocked=false;
   // Exercise the real input queue, including an early first tap and off-beat repeats.
   const originalChart=activeChart;activeChart={beats:Array.from({length:120},(_,i)=>i*.5),spawn:{normal:Array(120).fill(1)},fixedTypes:true};
   NBDiamond.reset();notes=[];player={idx:2,from:2,at:-9};const queued=make('adept');queued.idx=queued.from=3;notes=[queued,{id:id++,idx:5,from:5,at:-9,pop:-9,hp:1}];nextBeat=20;acted=-1;state='play';
   const realTime=songTime;let now=beatTime(20)-.04;songTime=()=>now;
   input('break',{timeStamp:performance.now()},'test');check(!NBDiamond.active()&&earlyInput?.n===20,'early first tap queued');
   onBeat(20,beatTime(20));nextBeat=21;check(NBDiamond.active()&&queued.hp===3,'early first tap starts mining');
   const lifeBefore=hp;now=beatTime(20)+SPB*.48;input('break',{timeStamp:performance.now()},'test');check(hp===lifeBefore&&queued.hp===3,'offbeat input harmless');
   now=beatTime(21)-.035;input('break',{timeStamp:performance.now()},'test');onBeat(21,beatTime(21));nextBeat=22;check(queued.hp===2,'early mining tap on frozen beat');
   now=beatTime(21)+.03;input('break',{timeStamp:performance.now()},'test');check(queued.hp===2,'input duplicate ignored');
   // A late first tap at the same encounter beat also anchors on the player cell.
   NBDiamond.reset();const late=make('novice');late.idx=late.from=3;notes=[late];nextBeat=30;acted=-1;onBeat(30,beatTime(30));nextBeat=31;now=beatTime(30)+.04;input('break',{timeStamp:performance.now()},'test');check(NBDiamond.active()&&late.idx===2&&late.hp===3,'late first hit anchors on player cell');
   // Ordinary, blue and diamond blocks accept the same early/late encounter inputs.
   for(const offset of [-WINDOW+.01,-.04,0,.04,WINDOW-.01]){
    for(const kind of ['normal','blue','diamond']){
     NBDiamond.reset();pendingCheck=[];earlyInput=null;recentHits=[];acted=-1;player={idx:2,from:2,at:-9};
     const block=kind==='diamond'?make('novice'):{id:id++,hp:kind==='blue'?2:1,purple:false};
     block.idx=block.from=3;block.at=block.pop=-9;notes=[block];nextBeat=50;
     const life=hp;now=beatTime(50)+offset;
     if(offset<0){input('break',{timeStamp:performance.now()},'test');onBeat(50,beatTime(50));nextBeat=51;}
     else{onBeat(50,beatTime(50));nextBeat=51;input('break',{timeStamp:performance.now()},'test');}
     check(hp===life,'same encounter causes no damage '+kind+' '+offset);
     check(kind==='normal'?!notes.includes(block):block.hp===(kind==='blue'?1:3),'same timing accepted '+kind+' '+offset);
     if(kind==='diamond')check(NBDiamond.active()&&block.idx===player.idx&&block.from===player.idx,'diamond holds player cell '+offset);
    }
   }
   // The previous one-cell-ahead encounter must no longer start mining.
   NBDiamond.reset();pendingCheck=[];earlyInput=null;acted=-1;player={idx:2,from:2,at:-9};
   const distant=make('novice');distant.idx=distant.from=4;notes=[distant];nextBeat=60;now=beatTime(60)+.04;
   onBeat(60,beatTime(60));nextBeat=61;input('break',{timeStamp:performance.now()},'test');
   check(!NBDiamond.active()&&distant.hp===4,'cannot mine one cell ahead');
   songTime=realTime;activeChart=originalChart;NBDiamond.reset();
   // Common diamond blocks in an actual paused game, for visual QA.
   player={idx:0,from:0,at:-9};notes=NBBlockGems.types.map((tier,i)=>{const n=make(tier.id);n.idx=n.from=i+1;return n;});state='paused';pausedAt=0;effects=[];texts=[];fx=[];shards=[];lastBeatAt=-9;draw(0);
   return results;
  });
  assert.equal(results.length,1);
  for(let stage=0;stage<5;stage++){
   await page.evaluate(stage=>{
    state='play';NBDiamond.reset();moveLocked=false;player={idx:2,from:2,at:-9};nextBeat=100000;acted=-1;
    const ore=NBDiamond.prepare({id:1000000+stage,idx:2,from:2,at:-9,pop:-9,hp:1,gem:{type:'novice',claimed:false}});
    notes=[ore,{id:1000100,idx:5,from:5,at:-9,pop:-9,hp:1}];fx=[];texts=[];effects=[];shards=[];hideJudge();
    for(let i=0;i<stage;i++)doAction('break',200+i,i*.5,0,null);
    state='paused';pausedAt=stage?((stage-1)*.5+(stage===4?.12:.29)):0;draw(pausedAt);
   },stage);
   await page.screenshot({path:out+'/stage-'+stage+'.png'});
  }
  await page.setViewportSize({width:320,height:568});await page.screenshot({path:out+'/reward-320.png'});
  assert.deepEqual(errors,[]);console.log('PASS '+(url?'public':'local')+' v72 mining: '+JSON.stringify(results)+'; safe skip, beat dedup, idle freeze/spin, pause, resume, reward, ultimate, retry, narrow viewport.');
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);if(server)server.close();process.exitCode=1;});
