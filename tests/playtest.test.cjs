const test=require('node:test'),assert=require('node:assert/strict'),C=require('../chase.js'),P=require('../playtest.js');
const sample=(player,idx,id=1)=>C.sample(player,[{id,idx}]);
test('successful movement, closing gaps and repeated frames are counted separately',()=>{
 const r=P.create({appVersion:'v64'});P.observe(r,{player:0,snapshot:sample(0,6),time:0});
 P.observe(r,{player:1,snapshot:sample(1,6),time:1});P.observe(r,{player:1,snapshot:sample(1,5),time:2});
 for(let i=0;i<200;i++)P.observe(r,{player:1,snapshot:sample(1,5),time:2});
 const d=P.finish(r);assert.equal(d.taken,1);assert.equal(d.missed,1);assert.equal(d.usagePercent,50);assert.equal(d.normalSteps,1);assert.equal(d.seconds,2);
 assert.strictEqual(P.finish(r),d);P.observe(r,{player:10,snapshot:sample(10,20),time:100});assert.equal(d.normalSteps,1);
});
test('blocked time is not lost capacity and a missing denominator never yields a skill rating',()=>{
 const r=P.create({});for(let t=0;t<100;t++)P.observe(r,{player:0,snapshot:sample(0,0),time:t});
 const d=P.finish(r);assert.equal(d.opportunities,0);assert.equal(d.missed,0);assert.equal(d.usagePercent,null);
});
test('purple is one useful opportunity, counted without charging the next empty gap',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:C.sample(0,[{id:1,idx:0,purple:true}]),time:0});
 P.observe(r,{player:0,snapshot:sample(0,4,2),time:1,rebase:true});
 P.observe(r,{player:1,snapshot:sample(1,4,2),time:1,rebase:true,bonus:1});P.purple(r);
 assert.equal(r.taken,1);assert.equal(r.missed,0);assert.equal(r.purpleSteps,1);
});
test('ultimate visual movement is separated, including its final frame; warp rebases without fake loss',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,8),time:0});
 P.observe(r,{player:0,snapshot:sample(0,8),time:1,rush:true});
 P.observe(r,{player:4.5,snapshot:sample(5,8),time:2,rush:true});
 P.observe(r,{player:5,snapshot:sample(5,9,2),time:2.1});
 assert.equal(r.rushSteps,5);assert.equal(r.normalSteps,0);assert.equal(r.rushes,1);assert.equal(r.missed,0);
 P.warp(r);P.observe(r,{player:0,snapshot:sample(0,4,3),time:0});P.observe(r,{player:1,snapshot:sample(1,4,3),time:1});
 assert.equal(r.normalSteps,1);assert.equal(r.taken,1);assert.equal(r.warps,1);assert.equal(P.finish(r).seconds,3.1);
});
test('twenty-opportunity windows and longest miss streak retain exact totals',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,52),time:0});
 for(let i=1;i<=23;i++)P.observe(r,{player:0,snapshot:sample(0,52-i),time:i});
 const d=P.finish(r);assert.equal(d.sections.length,2);assert.equal(d.sections[0].missed,20);assert.equal(d.sections[1].missed,3);assert.equal(d.maxConsecutiveMissed,23);
});
test('regression: advancing into the last empty cell is counted, and missing it is counted equally',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,2),time:0});P.observe(r,{player:1,snapshot:sample(1,2),time:1});
 const d=P.finish(r);assert.equal(d.normalSteps,1);assert.equal(d.taken,1);assert.equal(d.opportunities,1);assert.equal(d.missed,0);assert.equal(d.reconciled,true);
 const wait=P.create({});P.observe(wait,{player:0,snapshot:sample(0,2),time:0});P.observe(wait,{player:0,snapshot:sample(0,1),time:1});
 assert.equal(P.finish(wait).missed,1);
});
test('all empty destinations in different gaps reconcile, including boundary rebases',()=>{
 for(let gap=2;gap<=25;gap++){
  const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,gap),time:0});
  for(let p=1;p<gap;p++)P.observe(r,{player:p,snapshot:sample(p,gap),time:p,rebase:p%3===0});
  const d=P.finish(r);assert.equal(d.taken,gap-1);assert.equal(d.normalSteps,d.taken);assert.equal(d.missed,0);assert.equal(d.reconciled,true);
 }
});
test('occupied destinations are separate from useful movement; no opportunities beyond the goal',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,1),time:0});P.observe(r,{player:1,snapshot:sample(1,1),time:1});
 const d=P.finish(r);assert.equal(d.taken,0);assert.equal(d.occupiedSteps,1);assert.equal(d.normalSteps,1);assert.equal(d.reconciled,true);
 const goal=P.create({});goal.lastPlayer=4;
 P.observe(goal,{player:4,snapshot:C.sample(4,[{id:1,idx:8}],false,9,5),time:0});
 P.observe(goal,{player:5,snapshot:C.sample(5,[{id:1,idx:8}],false,9,5),time:1});
 for(const idx of [7,6,5])P.observe(goal,{player:5,snapshot:C.sample(5,[{id:1,idx}],false,9,5),time:2});
 assert.equal(goal.taken,1);assert.equal(goal.missed,0);assert.equal(goal.occupiedSteps,0);
});
test('shared hunter clock includes actual moves and does not double-charge them',()=>{
 const n=C.spawn(()=>0,'novice',0,C.testDefaults);
 C.account(n,sample(0,2));let a=C.account(n,sample(1,2),{moved:1});assert.equal(a.opportunities,1);assert.equal(a.taken,1);
 C.advance(n,1,1,a.opportunities,a);assert.equal(n.used,1);assert.equal(n.missed,0);
 a=C.account(n,sample(1,2));assert.equal(a.opportunities,0);
});
test('speed context survives acceleration and twenty-opportunity windows',()=>{
 const r=P.create({});P.observe(r,{player:0,snapshot:sample(0,30),time:0,rate:1});
 P.observe(r,{player:1,snapshot:sample(1,30),time:1,rate:1});P.observe(r,{player:2,snapshot:sample(2,30),time:2,rate:1.6});
 const d=P.finish(r);assert.equal(d.speedMin,1);assert.equal(d.speedMax,1.6);assert.equal(d.sections[0].speedMax,1.6);
});
