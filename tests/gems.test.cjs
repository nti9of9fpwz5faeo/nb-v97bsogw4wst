const test=require('node:test'),assert=require('node:assert/strict'),G=require('../gems.js');
test('four original tiers and reward values are retained',()=>{assert.deepEqual(G.types.map(t=>[t.id,t.value]),[['novice',5],['adept',15],['master',40],['divine',150]]);assert.equal(G.roll(.08,0),null);for(const [tier,id] of [[0,'novice'],[.60,'adept'],[.88,'master'],[.99,'divine']])assert.equal(G.roll(0,tier).type,id);for(const bad of [-1,NaN,Infinity])assert.equal(G.roll(bad,0),null);});
test('assignment is deterministic, consumes no gameplay randomness, and follows the block',()=>{
 const a=G.assign({id:34,idx:7,hp:2},G.create(128)),b=G.assign({id:34,idx:7,hp:2},G.create(128));assert.deepEqual(a.gem,b.gem);
 const before=JSON.stringify(a.gem);a.idx=3;a.hp=1;G.assign(a,G.create(555));assert.equal(JSON.stringify(a.gem),before);
 const all=new Set();let drops=0;for(let id=0;id<60000;id++){const note=G.assign({id},G.create(128));if(note.gem){drops++;all.add(note.gem.type);}}
 assert.equal(all.size,4);assert.ok(drops>4200&&drops<5400);
});
test('claim only succeeds once, including shallow restore copies; unknown tiers cannot pay',()=>{
 const a={gem:G.roll(0,.99)},copy={...a};assert.equal(G.claim(a).value,150);assert.equal(G.claim(copy),null);assert.equal(G.claim({gem:{type:'unknown'}}),null);assert.equal(G.claim({}),null);
});
test('only neutral brightness differs across tiers; hidden blocks have no hint',()=>{
 let last=0;for(const type of G.types){const note={gem:{type:type.id}};assert.ok(G.shine(note,'glow')>last);last=G.shine(note,'glow');assert.equal(G.shine(note,'hidden'),0);G.claim(note);assert.equal(G.shine(note,'glow'),0);}assert.equal(G.shine({},'glow'),0);
});
