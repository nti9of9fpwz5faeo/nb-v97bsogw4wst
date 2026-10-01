const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../chase.js'),M=require('../courses.js');
function spawn(rank=0){let a=[0,rank,0];return C.spawn(()=>a.shift());}
test('ranks bind reward to jump; divine is 0.5% of appearances',()=>{
 assert.equal(C.spawn(()=>.3),null);
 for(const [roll,id,reward,jump] of [[0,'novice',5,3],[.65,'adept',15,4],[.92,'master',40,6],[.999,'divine',150,8]]){
 const n=spawn(roll);assert.equal(n.type.id,id);assert.equal(n.rarity.reward,reward);assert.equal(n.type.jump,jump);}
 assert.equal(C.types[3].weight,.005);
});
test('invisible until midcourse; surprise then discrete three-cell warp and stationary wait',()=>{
 const n=spawn();assert.equal(C.advance(n,0,.5,0,35),null);assert.equal(n.visible,false);
 assert.equal(C.advance(n,10,.5,14,35),'appeared');assert.equal(n.idx,16);
 C.advance(n,10.2,.5,14,35);assert.equal(n.idx,16);
 assert.equal(C.advance(n,10.3,.5,14,35),'warped');assert.equal(n.idx,19);
 for(let t=10.4;t<16;t+=.1){C.advance(n,t,.5,14,35);assert.equal(n.idx,19);}
 assert.equal(C.advance(n,16.4,.5,14,35),'warped');assert.equal(n.idx,22);
});
test('saved ultimate and purple jumps catch exactly once; paused, skipped, escaped cannot pay',()=>{
 for(const roll of [0,.7,.95,.999]){const n=spawn(roll);C.advance(n,0,.5,15,35);C.advance(n,.3,.5,15,35);assert.equal(C.advance(n,.4,.5,28,35),'caught');assert.equal(C.advance(n,1,.5,30,35),null);}
 const n=spawn();C.advance(n,0,.5,15,35,false);assert.equal(n.visible,false);C.advance(n,0,.5,34,35);assert.equal(n.outcome,'skipped');
 const e=spawn(.999);C.advance(e,0,.5,17,35);for(let t=.3;t<20;t+=5)C.advance(e,t,.5,17,35);assert.equal(e.outcome,'escaped');assert.equal(C.advance(e,30,.5,35,35),null);
});
test('wait measured in beats respects accelerated playback',()=>{
 for(const rate of [1,1.5,2.2]){const n=spawn();const spb=.5/rate;C.advance(n,0,spb,14,35);C.advance(n,.3,spb,14,35);C.advance(n,.3+11*spb,spb,14,35);assert.equal(n.idx,19);C.advance(n,.3+12.1*spb,spb,14,35);assert.equal(n.idx,22);}
});
test('five valid layouts have same 35-step goal and four beyond-goal source cells',()=>{
 const signatures=[];
 for(let i=0;i<5;i++){const p=M.build(i);assert.equal(p.length,40);assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,40);for(let n=1;n<p.length;n++){assert.equal(Math.abs(p[n].c-p[n-1].c)+Math.abs(p[n].r-p[n-1].r),1);assert.ok(p[n].r>=p[n-1].r);assert.ok(p[n].c>=0&&p[n].c<8&&p[n].r<=10);}signatures.push(JSON.stringify(p));}
 assert.equal(new Set(signatures).size,5);
 const d=M.deck();let last=-1;for(let b=0;b<10;b++){const batch=[];for(let i=0;i<5;i++){const n=d.next();assert.notEqual(n,last);last=n;batch.push(n);}assert.equal(new Set(batch).size,5);}
});
