const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const H=require('../timing-history.js');
const meta={id:'test',createdAt:'2026-10-04T15:00:00.000Z',appVersion:'v86',song:{name:'Sombra en Movimiento'},baseBpm:150,initialRate:1,songCorrectionMs:17,timingMs:25};
const input=(r,id,time)=>H.observe(r,{type:'input',inputId:id,action:'ブレイク',sourceSongTimeSec:time,songTimeUsed:time-.025,rate:1,bpm:150});
test('queued input uses press time; MISS, null inputs, reverted damage and 30s bins reconcile',()=>{
 const r=H.create(meta);input(r,'a',29.98);H.update(r,{inputId:'a',status:'queued',target:{beat:74,offsetMs:-20}});
 H.observe(r,{type:'input_result',inputId:'a',status:'judged',judge:'PERFECT',songT:30.1});
 input(r,'b',30.02);H.update(r,{inputId:'b',status:'miss',judge:'MISS',offsetMs:160});
 H.observe(r,{type:'damage',seq:3,causeInputId:'b'}); // Already counted as the input MISS.
 input(r,'c',40);H.update(r,{inputId:'c',status:'invalid',offsetMs:-90});
 H.observe(r,{type:'damage',seq:4,sourceSongTimeSec:40});H.observe(r,{type:'damage_reverted',damageSeq:4});
 H.observe(r,{type:'damage',seq:5,sourceSongTimeSec:50});
 H.observe(r,{type:'speed_up',rate:1.1,bpm:165});assert.equal(r.pass,1);H.observe(r,{type:'song_loop',rate:1.1,bpm:165});input(r,'d',1);H.update(r,{inputId:'d',status:'judged',judge:'GREAT',offsetMs:-60});
 const out=H.finish(r,{endReason:'quit'});
 assert.deepEqual(out.summary.counts,{PERFECT:1,GREAT:1,GOOD:0,MISS:2});
 assert.equal(out.summary.meanMs,26.67);assert.equal(out.summary.medianMs,-20);assert.equal(out.summary.FAST,2);assert.equal(out.summary.SLOW,1);
 assert.deepEqual(out.by30Seconds.map(x=>[x.pass,x.startSeconds,x.n,x.meanMs]),[[1,0,1,-20],[1,30,1,160],[2,0,1,-60]]);
 assert.deepEqual(out.playbackRates,[1,1.1]);assert.equal(out.inputs[0].songTimeSec,29.98);assert.equal(H.finish(r),null);
 assert.equal(out.misses[1].offsetMs,null);
});
test('full compact history is not truncated by the detailed event cap',()=>{
 const r=H.create(meta);for(let i=0;i<3001;i++){input(r,'i'+i,i/10);H.update(r,{inputId:'i'+i,status:'judged',judge:'PERFECT',offsetMs:0});}
 assert.equal(H.snapshot(r).inputs.length,3001);assert.equal(H.snapshot(r).summary.counts.PERFECT,3001);
});
test('empty runs keep unknown timing as null rather than zero',()=>{
 const out=H.finish(H.create(meta));assert.equal(out.summary.meanMs,null);assert.equal(out.summary.medianMs,null);assert.deepEqual(out.by30Seconds,[]);
});
test('Sombra is an unvarying 150 BPM beat-only map using the uploaded MP3',()=>{
 const c=JSON.parse(fs.readFileSync(path.join(__dirname,'../charts/sombra_en_movimiento.json')));
 assert.equal(c.bpm,150);assert.equal(c.offset,.385);assert.equal(c.beatsOnly,true);assert.equal(c.spawn,undefined);assert.equal(c.beats.length,481);
 c.beats.forEach((v,i)=>assert.ok(Math.abs(v-(.385+i*.4))<1e-10));assert.ok(c.beats.at(-1)<c.duration);
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.match(html,/file: 'audio\/sombra_en_movimiento.mp3', bpm: 150, offset: 0.385/);
});
