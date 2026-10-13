const test=require('node:test'),assert=require('node:assert/strict'),finish=require('../finish-challenge.js');
const song={file:finish.songFile,bpm:150,offset:.3,gameplayEnd:61.3};
test('uses supplied song timing and real audio duration without changing existing metadata',()=>{
 const c=finish.create(song,64.056);assert.equal(c.beats[0],.3);assert.ok(Math.abs(c.beats[1]-c.beats[0]-.4)<1e-9);assert.equal(c.end,61.3);
 assert.equal(finish.create({...song,bpm:120},64.056).beats[1],.8);
 assert.equal(finish.create(song,40).end,40);
 assert.throws(()=>finish.create({...song,file:'other'},64));
});
test('authored sections and exact red/blue/purple types are reproducible without random calls',()=>{
 const random=Math.random;Math.random=()=>{throw new Error('random forbidden');};
 try{const a=finish.create(song,64.056),b=finish.create(song,64.056);assert.deepEqual(a,b);assert.deepEqual([...new Set(a.spawn.normal)].sort(),[0,1,2,3]);assert.ok(a.spawn.normal.slice(-6).every(n=>n===0));assert.equal(finish.section(87).name,'ひと息');assert.equal(finish.section(88).name,'疾走');}finally{Math.random=random;}
});
test('actual position controls progress; 100% and final course cell cannot appear early',()=>{
 const c=finish.create(song,64.056);assert.equal(finish.percent(0,c.goal),0);assert.ok(finish.percent(c.goal-1,c.goal)<100);assert.equal(finish.percent(c.goal,c.goal),100);assert.equal(finish.limit(c,c.end-.001),c.goal-1);assert.equal(finish.limit(c,c.end),c.goal);
 let prev=0;for(let t=0;t<65;t+=.1){const n=finish.limit(c,t);assert.ok(n>=prev&&n<=c.goal);prev=n;}
});
