const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../movement.js'),M=require('../courses.js');
const chase=()=>({meter:null});
test('every empty destination is a legal move; blocked and locked offer none',()=>{
 assert.equal(C.sample(0,[{id:1,idx:2}]).capacity,1);assert.equal(C.sample(0,[{id:1,idx:3}]).capacity,2);assert.equal(C.sample(0,[{id:1,idx:4}]).capacity,3);
 assert.equal(C.sample(0,[{id:1,idx:0},{id:2,idx:4}]).capacity,0);
 assert.equal(C.sample(0,[{id:1,idx:4}],true).capacity,0);
});
test('waiting wastes exactly the closing opportunities, repeated frames do not',()=>{
 const n=chase(),s=q=>C.sample(0,[{id:1,idx:q}]);
 assert.equal(C.observe(n,s(5)),0);for(let i=0;i<120;i++)assert.equal(C.observe(n,s(5)),0);
 for(const q of [4,3,2]){const used=C.observe(n,s(q));assert.equal(used,1);}
 assert.equal(C.observe(n,s(1)),1);assert.equal(C.observe(n,s(0)),0);
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
test('five valid layouts have same 35-step goal and four beyond-goal source cells',()=>{
 const signatures=[];
 for(let i=0;i<5;i++){const p=M.build(i);assert.equal(p.length,40);assert.equal(new Set(p.map(p=>p.c+','+p.r)).size,40);for(let n=1;n<p.length;n++){assert.equal(Math.abs(p[n].c-p[n-1].c)+Math.abs(p[n].r-p[n-1].r),1);assert.ok(p[n].r>=p[n-1].r);assert.ok(p[n].c>=0&&p[n].c<8&&p[n].r<=10);}signatures.push(JSON.stringify(p));}
 assert.equal(new Set(signatures).size,5);
 const d=M.deck();let last=-1;for(let b=0;b<10;b++){const batch=[];for(let i=0;i<5;i++){const n=d.next();assert.notEqual(n,last);last=n;batch.push(n);}assert.equal(new Set(batch).size,5);}
});
