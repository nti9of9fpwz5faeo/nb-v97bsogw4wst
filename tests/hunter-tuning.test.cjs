const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../chase.js');
const spawn=(values={})=>C.spawn(()=>0,'novice',0,{...C.testDefaults,...values});
test('four values are clamped, defaults are independent, normal game retains its configuration',()=>{
 assert.deepEqual(C.normalizeTest({speed:Infinity,distance:999,loss:-8,gap:2.9}),{speed:80,distance:300,loss:1,gap:3});
 const settings={...C.testDefaults},n=C.spawn(()=>0,'novice',0,settings);settings.speed=150;
 assert.equal(n.test.speed,80);assert.equal(n.idx,5);assert.equal(n.remaining,10);
 assert.equal(C.spawn(()=>0,'novice',0).test,null);assert.equal(C.spawn(()=>0,'divine',0,settings).test,null);
});
test('safe movement consumes opportunities but does not count as lost; tenth wasted cell loses',()=>{
 const n=spawn({gap:20});
 for(let i=1;i<=5;i++)C.advance(n,i,i,1);
 assert.equal(n.used,5);assert.equal(n.missed,0);assert.equal(n.remaining,10);assert.equal(n.travelled,4);
 for(let i=1;i<=9;i++)assert.equal(C.advance(n,5+i,5,1),null);
 assert.equal(n.missed,9);assert.equal(C.advance(n,15,5,1),'lost');assert.equal(n.reason,'missed');
});
test('idle frames and blocked segments never move the opponent or increase losses',()=>{
 const n=spawn();for(let i=0;i<1000;i++)C.advance(n,i,0,0);
 assert.equal(n.idx,5);assert.equal(n.missed,0);assert.equal(n.used,0);
});
test('faster settings require more successful moves; novice never creates smoke jumps',()=>{
 const captures=[];
 for(const speed of [60,80,90]){const n=spawn({speed,distance:100});let p=0;
  while(!n.done&&p<100)C.advance(n,p,++p,1);
  assert.equal(n.outcome,'won');assert.equal(n.events.length,0);assert.equal(n.missed,0);captures.push(p);
 }
 assert.ok(captures[0]<captures[1]&&captures[1]<captures[2]);
});
test('total distance and loss limit end independently; crossing at the final chance still wins',()=>{
 const n=spawn({distance:5,loss:50});C.advance(n,1,0,7);
 assert.equal(n.travelled,5);assert.equal(n.done,false);assert.equal(C.advance(n,1.4,0,0),'lost');assert.equal(n.reason,'distance');
 const final=spawn({distance:5,loss:50});C.advance(final,1,0,7);assert.equal(C.advance(final,1.1,10,0),'won');
});
test('warp retains losses, distance and position accounting; ultimate crossing catches once',()=>{
 const n=spawn({gap:30,distance:100});C.advance(n,10,25,30);
 assert.equal(n.missed,5);const travelled=n.travelled;C.warp(n,35,10);C.advance(n,0,-10,0);
 assert.equal(n.missed,5);assert.equal(n.travelled,travelled);assert.equal(n.playerTravelled,25);
 C.advance(n,1,-9,1);assert.equal(n.missed,5);assert.equal(n.playerTravelled,26);
 assert.equal(C.advance(n,2,n.idx+5,0),'won');assert.equal(C.advance(n,3,100,0),null);
});
