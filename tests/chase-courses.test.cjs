const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../chase.js'),M=require('../courses.js');
const spawn=()=>C.spawn(()=>0);
const advance=(n,p,t=0,random=()=>1)=>C.advance(n,t,.5,p,35,true,random);
test('only run start is rolled; every appearance begins as novice',()=>{
 assert.equal(C.spawn(()=>.3),null);const n=spawn();assert.equal(n.type.id,'novice');assert.equal(n.type.reward,5);
 advance(n,13);assert.equal(n.visible,false);advance(n,14);assert.equal(n.visible,true);assert.equal(n.idx,17);assert.equal(n.offer,true);
});
test('waiting never teleports, grows or expires the capture offer',()=>{
 const n=spawn();advance(n,14);for(let t=1;t<100;t++)advance(n,14,t);
 assert.equal(n.idx,17);assert.equal(n.distance,14);assert.equal(n.offer,true);assert.equal(C.catchHunter(n),5);assert.equal(C.catchHunter(n),0);
});
test('purple or ultimate crossing never auto-captures; passing makes a discrete jump',()=>{
 const n=spawn();advance(n,25);assert.equal(n.done,false);assert.equal(n.offer,true);
 assert.equal(C.pass(n,1,25,35),true);assert.equal(n.idx,33);assert.equal(n.offer,false);
 advance(n,30);assert.equal(n.offer,true);assert.equal(C.catchHunter(n),5);
 const auto=spawn();advance(auto,14);advance(auto,20);assert.equal(auto.idx,28);assert.equal(auto.offer,false);assert.equal(auto.done,false);
});
test('same hunter survives goal and song clock reset; only real forward cells grow it',()=>{
 const n=spawn();advance(n,14);C.pass(n,1,14,35);advance(n,35,8);
 assert.equal(n.distance,35);assert.equal(n.type.id,'adept');assert.equal(n.done,false);
 C.nextCourse(n,35);assert.equal(n.idx,8);assert.equal(n.type.id,'adept');advance(n,0,0);assert.equal(n.distance,35);
 advance(n,5,1);assert.equal(n.offer,true);assert.equal(C.catchHunter(n),15);
});
test('growth to master and rare divine uses one roll per crossed distance milestone',()=>{
 const n=spawn();let rolls=0;
 for(let lap=0;lap<5;lap++){advance(n,35,10,()=>{rolls++;return 1});C.nextCourse(n,35);}
 assert.equal(n.distance,175);assert.equal(n.type.id,'master');assert.equal(rolls,1);
 for(let t=0;t<50;t++)advance(n,0,t,()=>{rolls++;return 0});assert.equal(rolls,1);
 advance(n,35,51,()=>{rolls++;return 0});assert.equal(n.type.id,'divine');assert.equal(rolls,2);assert.equal(n.type.reward,150);
 C.nextCourse(n,35);advance(n,5);assert.equal(C.catchHunter(n),150);
});
test('paused, closed run and distant capture do not pay; no resampling after capture',()=>{
 const n=spawn();C.advance(n,0,.5,20,35,false);assert.equal(n.distance,0);assert.equal(n.visible,false);assert.equal(C.catchHunter(n),0);
 advance(n,14);assert.equal(C.catchHunter(n,false),0);assert.equal(C.catchHunter(n),5);C.nextCourse(n,35);advance(n,35);assert.equal(C.catchHunter(n),0);
});
test('five valid layouts have same 35-step goal and four beyond-goal source cells',()=>{
 const signatures=[];
 for(let i=0;i<5;i++){const p=M.build(i);assert.equal(p.length,40);assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,40);for(let n=1;n<p.length;n++){assert.equal(Math.abs(p[n].c-p[n-1].c)+Math.abs(p[n].r-p[n-1].r),1);assert.ok(p[n].r>=p[n-1].r);assert.ok(p[n].c>=0&&p[n].c<8&&p[n].r<=10);}signatures.push(JSON.stringify(p));}
 assert.equal(new Set(signatures).size,5);
 const d=M.deck();let last=-1;for(let b=0;b<10;b++){const batch=[];for(let i=0;i<5;i++){const n=d.next();assert.notEqual(n,last);last=n;batch.push(n);}assert.equal(new Set(batch).size,5);}
});
