const test=require('node:test'),assert=require('node:assert/strict');
const bg=require('../song-backgrounds.js'),clock=require('../endless-clock.js');
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
test('music accents anticipate a rise, release on its beat, and respect reduced motion',()=>{
  bg.configure(150,.385);
  const c=bg.cues[1];assert.ok(Math.abs(c.at-27.985)<1e-8);
  assert.ok(bg.atmosphere(c.at-.1).build>.9);
  assert.equal(bg.atmosphere(c.at).release,1);
  assert.equal(bg.atmosphere(c.at+1).release,0);
  assert.equal(bg.atmosphere(c.at,true).release,0);
  assert.equal(bg.atmosphere(c.at,true).pulse,0);
  assert.ok(bg.atmosphere(bg.cues[3].at+2).energy>bg.atmosphere(bg.cues[2].at+2).energy);
  const a=bg.atmosphere(c.at+.1);assert.deepEqual(a,bg.atmosphere(c.at+.1));
});
