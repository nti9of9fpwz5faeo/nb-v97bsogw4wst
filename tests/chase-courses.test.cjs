const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../chase.js'),M=require('../courses.js');
const chase=(id='novice')=>C.spawn(()=>0,id,0);
test('random event chance and all four forced opponents',()=>{
 assert.equal(C.spawn(()=>.8),null);assert.equal(C.spawn(()=>0,'off'),null);
 for(const r of C.types){const n=chase(r.id);assert.equal(n.type.id,r.id);assert.equal(n.idx,r.gap);assert.equal(n.remaining,r.loss);}
 const values=[0,.999];assert.equal(C.spawn(()=>values.shift()).type.id,'divine');
});
test('every empty destination is a legal move; blocked and locked offer none',()=>{
 assert.equal(C.sample(0,[{id:1,idx:2}]).capacity,1);assert.equal(C.sample(0,[{id:1,idx:3}]).capacity,2);assert.equal(C.sample(0,[{id:1,idx:4}]).capacity,3);
 assert.equal(C.sample(0,[{id:1,idx:0},{id:2,idx:4}]).capacity,0);
 assert.equal(C.sample(0,[{id:1,idx:4}],true).capacity,0);
});
test('waiting wastes exactly the closing opportunities, repeated frames do not',()=>{
 const n=chase(),s=q=>C.sample(0,[{id:1,idx:q}]);
 assert.equal(C.observe(n,s(5)),0);for(let i=0;i<120;i++)assert.equal(C.observe(n,s(5)),0);
 for(const q of [4,3,2]){const used=C.observe(n,s(q));assert.equal(used,1);C.advance(n,0,0,used);}
 assert.equal(n.remaining,17);assert.equal(C.observe(n,s(1)),1);assert.equal(C.observe(n,s(0)),0);
});
test('moving uses the same capacity once; next window and purple knockback rebase correctly',()=>{
 const n=chase();C.observe(n,C.sample(0,[{id:1,idx:4}]));
 assert.equal(C.observe(n,C.sample(1,[{id:1,idx:4}])),1);
 assert.equal(C.observe(n,C.sample(2,[{id:1,idx:4}])),1);
 assert.equal(C.observe(n,C.sample(2,[{id:2,idx:7}])),0);
 assert.equal(C.observe(n,C.sample(2,[{id:2,idx:8}])),0);
 assert.equal(C.observe(n,C.sample(3,[{id:2,idx:8}])),1);
});
test('purple offers one extra move, whether taken or missed; adjacent blocks never add fake moves',()=>{
 const n=chase();C.observe(n,C.sample(0,[{id:1,idx:0,purple:true},{id:2,idx:1}]));
 assert.equal(C.observe(n,C.sample(0,[{id:2,idx:1}])),1);
 assert.equal(C.observe(n,C.sample(0,[{id:2,idx:0}])),0);
 assert.equal(C.observe(n,C.sample(0,[{id:2,idx:0,hit:true}])),0);
 assert.equal(C.observe(n,C.sample(0,[{id:3,idx:1}])),0);
});
test('perfect movement catches the first three ranks; divine needs more than ordinary running',()=>{
 for(const r of C.types.slice(0,3)){const n=chase(r.id);assert.equal(C.advance(n,1000,0,0),null);assert.equal(n.idx,r.gap);
 for(let i=1;i<=150&&!n.done;i++)C.advance(n,1000+i,i,1);assert.equal(n.outcome,'won',r.id);}
 const god=chase('divine');for(let i=1;i<=150&&!god.done;i++)C.advance(god,i,i,1);assert.equal(god.outcome,'lost');
 const skilled=chase('divine');let p=0;for(let i=1;i<=150&&!skilled.done;i++){C.advance(skilled,i,++p,1);if(i%20===0&&!skilled.done){p+=5;C.advance(skilled,i+.1,p,0);}}assert.equal(skilled.outcome,'won');
});
test('ultimate crossing is valid for every rank and settlement happens once',()=>{
 for(const r of C.types){const n=chase(r.id);assert.equal(C.advance(n,0,2,0),null);assert.equal(n.remaining,r.loss);assert.equal(C.advance(n,1,n.idx,0),'won');assert.equal(C.advance(n,2,n.idx+1,0),null);}
});
test('distance deadline allows the last input; only god emits smoke jumps',()=>{
 const n=C.spawn(()=>0,'novice',0,{speed:100,distance:5,loss:50,gap:30});C.advance(n,1,0,5);assert.equal(n.done,false);assert.equal(C.advance(n,1.1,n.idx,0),'won');
 const lost=C.spawn(()=>0,'novice',0,{speed:100,distance:5,loss:50,gap:30});C.advance(lost,1,0,5);assert.equal(C.advance(lost,1.4,0,0),'lost');
 const god=chase('divine');let walk=false,jump=false;
 for(let i=1;i<=24;i++){const old=god.idx;C.advance(god,i,i,1);walk ||=god.idx-old===1;jump ||=god.idx-old>=2;}
 assert.ok(walk&&jump);assert.ok(god.events.length);
 for(const r of C.types.slice(0,3)){const n=chase(r.id);C.advance(n,1,0,8);assert.equal(n.events.length,0);}
});
test('warp preserves relative gap and exact remaining opportunities across clock restart',()=>{
 const n=C.spawn(()=>0,'master',25);C.advance(n,100,30,8);const gap=n.idx-35,remaining=n.remaining;
 C.warp(n,35,100);assert.equal(n.idx,gap);assert.equal(n.remaining,remaining);assert.equal(n.meter,null);
 C.advance(n,0,0,0);assert.equal(n.remaining,remaining);assert.equal(n.done,false);
});
test('five valid layouts have same 35-step goal and four beyond-goal source cells',()=>{
 const signatures=[];
 for(let i=0;i<5;i++){const p=M.build(i);assert.equal(p.length,40);assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,40);for(let n=1;n<p.length;n++){assert.equal(Math.abs(p[n].c-p[n-1].c)+Math.abs(p[n].r-p[n-1].r),1);assert.ok(p[n].r>=p[n-1].r);assert.ok(p[n].c>=0&&p[n].c<8&&p[n].r<=10);}signatures.push(JSON.stringify(p));}
 assert.equal(new Set(signatures).size,5);
 const d=M.deck();let last=-1;for(let b=0;b<10;b++){const batch=[];for(let i=0;i<5;i++){const n=d.next();assert.notEqual(n,last);last=n;batch.push(n);}assert.equal(new Set(batch).size,5);}
});
