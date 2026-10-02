const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../chase.js'),M=require('../courses.js');
const race=(id='novice')=>{const n=C.spawn(()=>0,id,35);C.start(n,0);return n;};
test('natural event chance, rare ranks and all explicit opponents',()=>{
 assert.equal(C.spawn(()=>.8),null);assert.equal(C.spawn(()=>0,'off'),null);
 for(const r of C.types){const n=C.spawn(()=>.99,r.id);assert.equal(n.type.id,r.id);assert.equal(n.idx,35);assert.equal(n.target,17.5);assert.equal(n.phase,'intro');}
 const values=[0,.999];assert.equal(C.spawn(()=>values.shift()).type.id,'divine');
});
test('intro and ready cannot move; paused race does not advance',()=>{
 const n=C.spawn(()=>0,'novice');C.advance(n,100,0);assert.equal(n.idx,35);
 C.start(n,0);C.advance(n,100,0,false);assert.equal(n.idx,35);
});
test('non-divine opponents only walk in one-cell steps',()=>{
 for(const type of C.types.slice(0,3)){const n=race(type.id);for(let i=1;i<=10;i++){C.advance(n,i*type.stepBeats,0);assert.equal(n.idx,35-i);assert.equal(n.warning,null);assert.equal(n.events.length,0);}}
});
test('ultimate from start cannot reach midpoint; crossing it wins once',()=>{
 for(const type of C.types){const n=race(type.id);assert.equal(C.advance(n,1,10),null);assert.equal(C.advance(n,2,18),'won');assert.equal(C.advance(n,3,30),null);}
});
test('hunter wins on exact scheduled arrival; late frames respect earlier winner and ties favor player',()=>{
 const a=race();assert.equal(C.advance(a,100,0),'lost');const arrival=a.finishedBeat;
 const b=race();assert.equal(C.advance(b,100,18,true,arrival-.1),'won');
 const c=race();assert.equal(C.advance(c,100,18,true,arrival+.1),'lost');
 const d=race();assert.equal(C.advance(d,100,18,true,arrival),'won');
});
test('divine visibly warns, teleports, walks again and never teleports onto prize',()=>{
 const n=race('divine');C.advance(n,5,0);assert.equal(n.idx,30);
 C.advance(n,6,0);assert.equal(n.idx,30);assert.ok(n.warning);assert.equal(n.warning.to,27);
 C.advance(n,7.4,0);assert.equal(n.idx,30);C.advance(n,7.5,0);assert.equal(n.idx,27);assert.equal(n.events.length,2);
 C.advance(n,8.5,0);assert.equal(n.idx,26);assert.equal(n.warning,null);
 while(!n.done){const before=n.idx;C.advance(n,n.nextBeat,0);if(n.idx-before < -1)assert.ok(n.idx>n.target);}
 assert.equal(n.outcome,'lost');assert.equal(n.idx,n.target);
});
test('new courses receive new events and clean clocks',()=>{
 const a=race('master');C.advance(a,100,0);const b=race('novice');assert.equal(b.done,false);assert.equal(b.idx,35);assert.equal(b.lastBeat,0);
});
test('five valid layouts have same 35-step goal and four beyond-goal source cells',()=>{
 const signatures=[];
 for(let i=0;i<5;i++){const p=M.build(i);assert.equal(p.length,40);assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,40);for(let n=1;n<p.length;n++){assert.equal(Math.abs(p[n].c-p[n-1].c)+Math.abs(p[n].r-p[n-1].r),1);assert.ok(p[n].r>=p[n-1].r);assert.ok(p[n].c>=0&&p[n].c<8&&p[n].r<=10);}signatures.push(JSON.stringify(p));}
 assert.equal(new Set(signatures).size,5);
 const d=M.deck();let last=-1;for(let b=0;b<10;b++){const batch=[];for(let i=0;i<5;i++){const n=d.next();assert.notEqual(n,last);last=n;batch.push(n);}assert.equal(new Set(batch).size,5);}
});
