const test=require('node:test'),assert=require('node:assert/strict');
const Clock=require('../endless-clock.js'),Courses=require('../courses.js'),H=require('../timing-history.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('rate changes preserve source time, past beats and round-trip mapping across 12 accelerations',()=>{
 const c=Clock.create({duration:17.317,bpm:150,offset:.385,rate:1});
 for(let i=1;i<=12;i++){
  const at=i*4.123,before=c.source(at),past=c.beat(0);c.change(at,1+i*.1);close(c.source(at),before);close(c.beat(0),past);
  for(const t of [at-.03,at,at+.03,at+1])close(c.time(c.source(t)),t);
 }
 for(let n=0;n<2000;n++){const t=c.beat(n);assert.equal(c.nearest(t),n);close(c.source(t),c.beatSource(n));for(const delta of [-.02,.02]){assert.equal(c.nearest(t+delta),n);close(t+delta-c.beat(n),delta);}}
});
test('irregular charts repeat at actual buffer length with corrections, no duplicate seam beat',()=>{
 const c=Clock.create({duration:2.19,bpm:120,beats:[0,.51,1.03,1.52,2.1,2.4],correction:-.03});
 assert.equal(c.beatCount,4);assert.equal(c.chartIndex(0),1);assert.equal(c.chartIndex(4),1);
 close(c.beat(4)-c.beat(0),2.19);close(c.position(2.19),0);assert.equal(c.cycle(2.19),1);
 c.change(1.97,1.4);
 for(let n=0;n<100;n++){const t=c.beat(n);assert.equal(c.nearest(t),n);assert.ok(c.beat(n+1)>t);}
 const seam=c.time(2.19);close(c.source(seam-.01),2.19-.014);close(c.source(seam+.01),2.19+.014);
});
test('each endless layout is 50 actual moves plus 4 source cells, adjacent and unique; original layouts unchanged',()=>{
 for(let i=0;i<5;i++){
  const normal=Courses.build(i),p=Courses.build(i,true);assert.equal(normal.length,40);assert.equal(p.length,55);assert.deepEqual(p.slice(0,40),normal);
  assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,55);
  for(let j=1;j<p.length;j++){assert.equal(Math.abs(p[j].c-p[j-1].c)+Math.abs(p[j].r-p[j-1].r),1);assert.ok(p[j].r>=p[j-1].r);assert.ok(p[j].c>=0&&p[j].c<8);}
 }
});
test('acceleration keeps the same song pass; looping starts a new pass and records source/time',()=>{
 const r=H.create({id:'endless',initialRate:1});
 H.observe(r,{type:'speed_up',rate:1.1,bpm:165,gameTimeSec:22,sourceSongTimeSec:22,fromRate:1});assert.equal(r.pass,1);
 H.observe(r,{type:'course_continue',course:2,rate:1.1,gameTimeSec:22,sourceSongTimeSec:22});assert.equal(r.pass,1);
 H.observe(r,{type:'song_loop',cycle:2,rate:1.1,gameTimeSec:100,sourceSongTimeSec:.01});assert.equal(r.pass,2);
 const s=H.snapshot(r);assert.equal(s.transitions[0].gameTimeSec,22);assert.equal(s.transitions[2].sourceSongTimeSec,.01);
});

test('a delayed input is grouped by the cycle at press time, not by the frame that logs it',()=>{
 const r=H.create({id:'late',initialRate:1});H.observe(r,{type:'song_loop',rate:1,cycle:2});
 H.observe(r,{type:'input',inputId:'before',songCycle:1,sourceSongTimeSec:59.99});H.update(r,{inputId:'before',judge:'PERFECT',offsetMs:-10});
 H.observe(r,{type:'input',inputId:'after',songCycle:2,sourceSongTimeSec:.01});H.update(r,{inputId:'after',judge:'PERFECT',offsetMs:10});
 assert.deepEqual(H.snapshot(r).by30Seconds.map(x=>[x.pass,x.startSeconds]),[[1,30],[2,0]]);
});
