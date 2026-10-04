const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const P=require('../progression.js');
const memory=()=>{let raw=null;return {getItem:()=>raw,setItem:(_,v)=>{raw=v}}};
test('JST daily boundary and rollover preserve lifetime progress and never reaward same day',()=>{
 assert.equal(P.dayKey(Date.parse('2026-10-01T14:59:59Z')),'2026-10-01');assert.equal(P.dayKey(Date.parse('2026-10-01T15:00:00Z')),'2026-10-02');
 const s=memory(),p=P.create(s);p.update({hits:150,steps:150,rush:3});assert.equal(p.daily().claimed.length,0);p.claimMissions();assert.equal(p.daily().claimed.length,3);const balance=p.state.gems;
 assert.equal(p.update({hits:1,steps:1,rush:1}).reward,0);p.flush();assert.equal(P.create(s).state.gems,balance);
 const raw=JSON.parse(s.getItem());raw.daily.day='2020-01-01';s.setItem(P.KEY,JSON.stringify(raw));const q=P.create(s);assert.equal(q.daily().stats.hits,0);assert.equal(q.state.stats.hits,151);assert.equal(q.state.gems,balance);q.flush();
});
test('song-specific missions persist, are isolated and cannot pay twice',()=>{
 const s=memory(),p=P.create(s),a='audio/song.mp3',b='audio/neon_rush.mp3';
 p.update({hits:150},{steps:100},0,{songId:a});assert.equal(p.songProgress(a).claimed.length,0);p.claimMissions();assert.equal(p.songProgress(a).claimed.length,2);assert.equal(p.songProgress(b).hits,0);
 assert.equal(p.update({hits:1},{steps:100},0,{songId:a}).reward,0);p.flush();assert.equal(P.create(s).songProgress(a).hits,151);
});
test('ad reward is tied to one result and survives reload; storage failures roll back',()=>{
 const s=memory(),p=P.create(s);p.prepareAdReward('run1',15);assert.equal(p.claimAdReward('other').ok,false);assert.equal(p.state.gems,0);
 assert.equal(p.claimAdReward('run1').amount,15);assert.equal(P.create(s).claimAdReward('run1').ok,false);
 p.prepareAdReward('run2',30);s.setItem=()=>{throw Error('quota')};assert.equal(p.claimAdReward('run2').reason,'storage');assert.equal(p.state.gems,15);assert.equal(p.state.adReward.claimed,false);
});
test('ad adapter does not award for unconfigured, dismissed, failed, or wrong-run ads',async()=>{
 const x={window:{}};vm.createContext(x);vm.runInContext(fs.readFileSync('monetization.js','utf8'),x);const ads=x.window.NBAds;
 assert.equal(await ads.show('r'),false);for(const receipt of [{earned:false,runId:'r'},{earned:true,runId:'other'}]){ads.configure({isReady:()=>true,showRewarded:async()=>receipt});assert.equal(await ads.show('r'),false)}
 ads.configure({isReady:()=>true,showRewarded:async({runId})=>({earned:true,runId})});assert.equal(await ads.show('r'),true);
});
const html=fs.readFileSync('index.html','utf8');
test('off-beat MISS consumes target and loses exactly one life; empty presses do nothing',()=>{
 const start=html.indexOf('function input('),end=html.indexOf('// 判定で音を変える',start);
 const x={NBDiamond:{active:()=>false,is:()=>false},state:'play',isTutorial:()=>false,songTime:()=>1,eventPerfTime:()=>({perf:1000}),performance:{now:()=>1000},diagInput:()=>({inputId:1}),diagInputEnd(){},diagTarget(){},diagShow(){},resumePerf:0,rushAnim:null,nearestBeat:()=>2,beatTime:()=>.75,WINDOW:.13,nextBeat:3,notesWillMove:()=>true,notes:[{id:1,idx:0}],player:{idx:0},r2:v=>v,hitGuard:()=>false,damage:()=>{x.hp--;x.misses++},NBSound:{play(){}},speedOn:()=>false,msText:String,earlyInput:null,acted:-1,hp:5,misses:0};
 vm.createContext(x);vm.runInContext(html.slice(start,end),x);x.input('break',{},'test');assert.equal(x.hp,4);assert.equal(x.notes.length,0);assert.equal(x.misses,1);x.input('break',{},'test');assert.equal(x.hp,4);
});
test('resume countdown removes pause overlay, keeps gameplay stopped through five beats, then resumes once',async()=>{
 let callback;const nodes=new Map();function node(id){if(!nodes.has(id))nodes.set(id,{hidden:false,classList:{add(){this.hidden=true}},setAttribute(){},append(n){nodes.set(n.id,n)},remove(){nodes.delete(this.id)},focus(){}});return nodes.get(id)}
 const x={racePauseKind:null,state:'paused',resumeToken:0,resumeTimer:null,ctx:{currentTime:10,resume:async()=>{}},document:{getElementById:node,createElement:()=>({setAttribute(){},remove(){nodes.delete(this.id)}}),querySelectorAll:()=>[]},SPB:.5,pausedAt:2.1,timingMs:0,performance:{now:()=>0},uiTone(){},setTimeout:fn=>(callback=fn,1),startMusicAt:()=>{x.starts++},starts:0,diagEv(){},r4:v=>v,isTutorial:()=>false,startMoveScheduler(){},resumeStarted:0};
 vm.createContext(x);vm.runInContext(html.slice(html.indexOf('async function resumeGame(){'),html.indexOf('\nfunction returnToSongs')),x);await x.resumeGame();assert.equal(x.state,'resuming');assert.equal(node('pauseOv').classList.hidden,true);assert.equal(node('resumeCount').textContent,5);
 x.ctx.currentTime=12.49;callback();assert.equal(x.state,'resuming');assert.equal(node('resumeCount').textContent,1);assert.equal(x.starts,0);
 x.ctx.currentTime=12.5;callback();assert.equal(x.state,'play');assert.equal(node('resumeCount').textContent,0);assert.equal(x.starts,1);
});
