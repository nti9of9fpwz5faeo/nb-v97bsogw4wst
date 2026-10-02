const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../progression.js');
function memory(){let raw;return {getItem:()=>raw??null,setItem:(k,v)=>raw=v};}
test('completed missions wait for claim; repeated updates/reloads cannot duplicate notification or payout',()=>{
 const s=memory(),p=P.create(s),songId='audio/song.mp3';
 let r=p.update({hits:150,steps:100},{steps:100},5,{songId});
 assert.equal(r.reward,5);assert.equal(r.awarded.length,5);assert.equal(p.state.gems,5);
 const q=P.create(s);assert.equal(q.update({hits:1},{steps:100},0,{songId}).awarded.length,0);
 const done=q.missionEntries().filter(m=>m.kind==='song'&&m.songId===songId&&m.done);assert.equal(done.length,2);assert.ok(done.every(m=>!m.claimed));
 assert.equal(q.claimMissions([done[0].key,done[0].key,'bogus']).amount,5);assert.equal(q.claimMissions([done[0].key]).ok,false);
 assert.equal(q.claimMissions().amount,26);assert.equal(q.state.gems,36);assert.equal(P.create(s).claimMissions().ok,false);q.flush();p.flush();
});
test('v58 migration keeps already paid rewards, wallet, collection and XP',()=>{
 const s=memory(),p=P.create(s);p.update({hits:150,steps:150},{steps:100},0,{songId:'audio/song.mp3'});p.claimMissions();p.grantShoppingTest();p.purchase('heroes','veno');p.awardXP(280);p.flush();
 const raw=JSON.parse(s.getItem());raw.version=2;delete raw.pendingDaily;s.setItem(P.KEY,JSON.stringify(raw));
 const q=P.create(s);assert.equal(q.state.gems,raw.gems);assert.equal(q.state.xp,280);assert.ok(q.state.heroes.includes('veno'));assert.ok(q.state.songs.includes('audio/neon_rush.mp3'));assert.equal(q.claimMissions().amount,0);q.flush();
});
test('completed daily rewards survive rollover, reload and claim once without carrying partial progress',()=>{
 const s=memory(),p=P.create(s);p.update({hits:150,steps:20});p.flush();
 const raw=JSON.parse(s.getItem());raw.daily.day='2020-01-01';s.setItem(P.KEY,JSON.stringify(raw));
 const q=P.create(s);assert.equal(q.daily().stats.hits,0);assert.equal(q.daily().stats.steps,0);q.flush();
 const z=P.create(s),old=z.missionEntries().filter(m=>m.archived);assert.equal(old.length,1);assert.equal(z.claimMissions(old.map(m=>m.key)).amount,5);assert.equal(P.create(s).state.pendingDaily.length,0);z.flush();
});
test('claim storage failure rolls back both money and receipt, then succeeds exactly once',()=>{
 const s=memory(),p=P.create(s);p.update({hits:150});const set=s.setItem;s.setItem=()=>{throw Error('quota')};
 assert.equal(p.claimMissions().reason,'storage');assert.equal(p.state.gems,0);assert.equal(p.state.claimed.length,0);
 s.setItem=set;assert.equal(p.claimMissions().amount,13);assert.equal(P.create(s).state.gems,13);assert.equal(p.claimMissions().ok,false);
});
test('mission claims never enlarge the result ad reward',()=>{
 const p=P.create(memory());p.update({hits:150});p.prepareAdReward('r',5);p.claimMissions();assert.equal(p.state.gems,13);assert.equal(p.claimAdReward('r').amount,5);assert.equal(p.state.gems,18);p.flush();
});
