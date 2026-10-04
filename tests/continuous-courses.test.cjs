const test=require('node:test'),assert=require('node:assert/strict'),C=require('../courses.js'),P=require('../playtest.js'),M=require('../movement.js');
test('all five continuations fit every starting column, with 50 steps plus four source cells',()=>{
 for(let id=0;id<5;id++)for(let c=0;c<8;c++){
  const p=C.continuation(id,{c,r:37});assert.equal(p.length,55);assert.deepEqual(p[0],{c,r:37});assert.equal(new Set(p.map(p=>`${p.c},${p.r}`)).size,55);
  for(let i=1;i<p.length;i++){assert.ok(p[i].c>=0&&p[i].c<8);assert.ok(p[i].r>=p[i-1].r);assert.equal(Math.abs(p[i].c-p[i-1].c)+Math.abs(p[i].r-p[i-1].r),1);assert.ok(p[i].r>37);}
  const lines=[4,10,16,22,28,34,40,46,50];for(let k=0;k<lines.length;k++){const player=k?lines[k-1]:0,g=Math.min(54,lines[k]+4);assert.ok(p[g].r-p[player].r<5,JSON.stringify({id,c,k,player,g}));}
 }
});
test('100 successive courses preserve the complete old prefix, have no intersections and stay adjacent',()=>{
 let p=C.build(0,true),goal=50;
 for(let i=0;i<100;i++){
  const before=p.slice(0,goal+1),next=C.continuation(i%5,p[goal]);p.splice(goal+1,4,...next.slice(1));
  assert.deepEqual(p.slice(0,goal+1),before);goal+=50;assert.equal(p.length,goal+5);
 }
 assert.equal(new Set(p.map(p=>`${p.c},${p.r}`)).size,p.length);
 for(let i=1;i<p.length;i++)assert.equal(Math.abs(p[i].c-p[i-1].c)+Math.abs(p[i].r-p[i-1].r),1);
});
test('continuous-course telemetry never counts the preserved position again or splits an ultimate',()=>{
 const r=P.create({mode:'endless'}),sample=i=>M.sample(i,[{id:1,idx:i+4}],false,i+8,i+50);
 P.observe(r,{player:49,snapshot:sample(49),time:0,rebase:true});
 const before=r.normalSteps;P.observe(r,{player:50,snapshot:sample(50),time:1});P.warp(r,50,true);
 P.observe(r,{player:50,snapshot:sample(50),time:1.1});P.observe(r,{player:51,snapshot:sample(51),time:1.2});assert.equal(r.normalSteps-before,2);
 P.observe(r,{player:95,snapshot:sample(95),time:2,rebase:true});
 P.observe(r,{player:95,snapshot:sample(100),time:2.1,rush:true});P.warp(r,95,true);
 for(let i=96;i<=100;i++)P.observe(r,{player:i,snapshot:sample(100),time:2.1+(i-95)/10,rush:true});
 assert.equal(r.rushSteps,5);assert.equal(r.rushes,1);assert.equal(r.warps,2);
});
