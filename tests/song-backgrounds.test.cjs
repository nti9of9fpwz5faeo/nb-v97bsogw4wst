const test=require('node:test'),assert=require('node:assert/strict');
const bg=require('../song-backgrounds.js'),clock=require('../endless-clock.js'),markers=require('../speed-markers.js');
test('all section boundaries use source time and crossfade from the preceding scene',()=>{
  for(let i=1;i<bg.cues.length;i++){
    const c=bg.cues[i];assert.equal(bg.resolve(c.at-.001).scene,bg.cues[i-1].scene);
    assert.deepEqual(bg.resolve(c.at),{scene:c.scene,previous:bg.cues[i-1].scene,mix:0});
    assert.ok(Math.abs(bg.resolve(c.at+c.fade/2).mix-.5)<1e-10);
    assert.equal(bg.resolve(c.at+c.fade+.001).mix,1);assert.equal(bg.resolve(c.at,true).mix,1);
  }
});
test('acceleration, future slowdown, pause and looping preserve the musical scene',()=>{
  const c=clock.create({duration:192.7335,bpm:150});c.change(10,1.8);
  assert.equal(bg.resolve(c.position(19.9)).scene,0);assert.equal(bg.resolve(c.position(20.1)).scene,1);
  c.change(30,.7);for(const cue of bg.cues)assert.equal(bg.resolve(c.position(c.time(192.7335+cue.at+.01))).scene,cue.scene);
  assert.equal(bg.resolve(c.position(c.time(192.7335+.1))).scene,0);
  assert.equal(bg.resolve(-.12).scene,0);
});
test('spirits distinguish acceleration and slowdown; no mark at the speed cap',()=>{
  assert.equal(markers.kind(1,1.1),'fast');assert.equal(markers.kind(1.1,.8),'slow');assert.equal(markers.kind(2.2,2.2),null);
});
