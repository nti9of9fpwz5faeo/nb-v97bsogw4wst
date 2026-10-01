const test=require('node:test'),assert=require('node:assert/strict');
const {create,KEY,rankInfo}=require('../progression.js');
const chase=require('../chase.js');
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
test('no early mission flood; rewards persist and cannot be awarded twice',()=>{const s=memory(),p=create(s);assert.equal(p.update({hits:10},{steps:10,combo:10}).reward,0);assert.equal(p.update({hits:140}).reward,8);const q=create(s);assert.equal(q.update({hits:1}).reward,0);assert.equal(q.state.gems,8);p.flush();q.flush();});
test('record missions use maximum rather than repeated HUD sums',()=>{const p=create(memory());assert.equal(p.update({}, {steps:100}).reward,8);assert.equal(p.update({}, {steps:100}).reward,0);assert.equal(p.update({}, {steps:10}).reward,0);p.flush();});
test('catch payout and mission payout accounted once',()=>{const p=create(memory());assert.equal(p.update({tiles:1},{},30).reward,30);assert.equal(p.update({tiles:1},{},5).reward,5);assert.equal(p.update({tiles:1},{},12).reward,17);assert.equal(p.state.gems,52);p.flush();});
test('unlock exact debit, owned free, reload and insufficient funds',()=>{const s=memory(),p=create(s);assert.equal(p.purchase('heroes','veno').reason,'funds');p.update({}, {},500);assert.equal(p.purchase('heroes','veno').price,450);assert.equal(p.state.gems,50);assert.equal(p.purchase('heroes','veno').price,0);assert.ok(create(s).state.heroes.includes('veno'));assert.equal(p.purchase('songs','audio/stutter.mp3').reason,'funds');assert.equal(p.purchase('songs','special-stage-01').reason,'unknown');});
test('failed writes rollback purchases',()=>{const s=memory(),p=create(s);p.update({}, {},500);s.setItem=()=>{throw Error('quota');};assert.equal(p.purchase('heroes','veno').reason,'storage');assert.equal(p.state.gems,500);assert.ok(!p.state.heroes.includes('veno'));p.flush();});
test('v1 save migrates wallet, prior claims, theme and selected hero',()=>{const s=memory();s.setItem(KEY,JSON.stringify({version:1,gems:80,earned:90,stats:{hits:200,steps:20,combo:15,rush:1,tiles:1},claimed:['hits-20','combo-10'],themes:['classic'],theme:'classic'}));s.setItem('neon-blade-character','veno');const p=create(s);assert.equal(p.state.gems,80);assert.ok(p.state.heroes.includes('veno'));assert.equal(p.update({hits:1}).reward,0);assert.equal(p.state.xp,0);p.flush();assert.equal(create(s).state.version,2);});
test('rank milestones unlock only selected songs and grant no duplicate level rewards',()=>{const s=memory(),p=create(s);assert.equal(p.state.songs.filter(x=>!x.includes('tutorial')).length,3);let r=p.awardXP(280);assert.equal(r.rank,3);assert.equal(r.reward,20);assert.ok(p.state.songs.includes('audio/neon_rush.mp3'));assert.ok(!p.state.songs.includes('audio/stutter.mp3'));assert.equal(p.awardXP(0).reward,0);assert.equal(create(s).state.xp,280);assert.equal(rankInfo(119).rank,1);});
test('corrupt saves are never overwritten',()=>{const s=memory();s.setItem(KEY,'{broken');const p=create(s);p.update({hits:150});p.awardXP(120);p.flush();assert.equal(s.getItem(KEY),'{broken');});
function spawn(vals){return chase.spawn(()=>vals.shift());}
test('spawn limited to chance roll, rarity and speed are independent',()=>{assert.equal(spawn([.36]),null);const r=spawn([.1,.99,.1]);assert.equal(r.rarity.reward,30);assert.equal(r.type.id,'slow');const n=spawn([.1,.1,.99]);assert.equal(n.rarity.reward,5);assert.equal(n.type.id,'fast');});
test('purple movement and ultimate sweep catch once; pause and escape never reward',()=>{const n=spawn([0,.99,0]);chase.advance(n,0,.5,0,40);assert.equal(chase.advance(n,1,.5,10,40),'caught');assert.equal(chase.advance(n,2,.5,11,40),null);const s=spawn([0,0,.99]);chase.advance(s,0,.5,0,40);chase.advance(s,20,.5,0,40,false);assert.equal(s.idx,7);assert.equal(chase.advance(s,100,.5,0,40),'escaped');assert.equal(chase.advance(s,101,.5,40,40),null);});
test('speed follows beats at all playback rates and dense sections leave recovery room',()=>{for(const rate of [1,1.5,2.2]){const n=spawn([0,0,.99]);const spb=.5/rate;chase.advance(n,0,spb,0,40);chase.advance(n,10*spb,spb,0,40);assert.ok(n.idx<10);assert.equal(chase.advance(n,12*spb,spb,12,40),'caught');}});
test('all warp ninja types start beyond one ultimate, without reacting to stored charge',()=>{
 for(const typeRoll of [.1,.7,.99])for(const rate of [1,1.5,2.2]){
   const values=[.1,.5,typeRoll];const n=chase.spawn(()=>values.shift(),{warp:true,rushCells:10}),spb=.5/rate;
   assert.ok(n.idx>=13&&n.idx<=15);chase.advance(n,0,spb,0,39);
   for(let frame=1;frame<=20;frame++)assert.equal(chase.advance(n,frame*.025/rate,spb,frame*.5,39),null);
   assert.equal(n.done,false,'an immediate ten-cell ultimate must not collect a new warp spawn');
   assert.equal(chase.advance(n,4*spb,spb,20,39),'caught','ordinary follow-up movement can still catch it');
   assert.equal(chase.advance(n,5*spb,spb,21,39),null);
 }
});
test('normal start stays approachable and head start follows changes to ultimate distance',()=>{
 let values=[.1,.5,.1];assert.equal(chase.spawn(()=>values.shift()).idx,5);
 values=[.1,.5,.1];assert.equal(chase.spawn(()=>values.shift(),{warp:true,rushCells:14}).idx,17);
});
