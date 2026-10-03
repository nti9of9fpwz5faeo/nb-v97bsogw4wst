const test=require('node:test'),assert=require('node:assert/strict'),C=require('../chase.js');
test('approved novice settings apply to both random and forced spawns',()=>{
 const expected={speed:25,distance:20,loss:20,gap:3};assert.deepEqual(C.testDefaults,expected);
 for(const forced of [null,'novice']){const n=C.spawn(()=>0,forced,14);for(const key in expected)assert.equal(n.rules[key],expected[key]);assert.equal(n.idx,17);assert.equal(n.remaining,20);}
});
test('synthetic 52% pace with one ultimate separates tiers; this is not an estimated real win rate',()=>{
 const wins={};for(const type of C.types){let won=0;
  for(let seed=1;seed<=200;seed++){let x=(seed*747796405)>>>0,p=0;const n=C.spawn(()=>0,type.id);
   for(let t=1;t<250&&!n.done;t++){x=(Math.imul(x,1664525)+1013904223)>>>0;p+=x/4294967296<.52?1:0;C.advance(n,t,p,1);if(t===25&&!n.done){p+=5;C.advance(n,t+.1,p,0);}}
   if(n.outcome==='won')won++;
  }wins[type.id]=won;
 }
 assert.ok(wins.novice>=wins.adept);assert.ok(wins.adept>wins.master);assert.ok(wins.master>40&&wins.master<170);assert.equal(wins.divine,0);
});
test('loss thresholds count wasted moves, not successful ones, for every rank',()=>{
 for(const type of C.types){const n=C.spawn(()=>0,type.id);for(let i=1;i<type.loss;i++)assert.equal(C.advance(n,i,0,1),null);assert.equal(n.done,false);assert.equal(C.advance(n,type.loss,0,1),'lost');assert.equal(n.reason,'missed');}
});
