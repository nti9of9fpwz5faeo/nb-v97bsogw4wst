const test = require('node:test');
const assert = require('node:assert/strict');
const {create, KEY} = require('../progression.js');
function memory() { const data = new Map(); return {data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)}; }

test('mission rewards persist and cannot be collected twice after a reload', () => {
  const storage = memory(), p = create(storage);
  assert.equal(p.update({hits: 19}).reward, 0);
  assert.equal(p.update({hits: 1}).reward, 8);
  assert.equal(p.state.gems, 8);
  const q = create(storage);
  assert.equal(q.update({hits: 1}).reward, 0);
  assert.equal(q.state.gems, 8); q.flush(); p.flush();
});
test('record missions use a maximum, not the sum of repeated HUD updates', () => {
  const p = create(memory());
  assert.equal(p.update({}, {steps: 100}).reward, 20);
  assert.equal(p.update({}, {steps: 100}).reward, 0);
  assert.equal(p.update({}, {steps: 10}).reward, 0);
  assert.equal(p.state.stats.steps, 100); p.flush();
});
test('gem tile reward and mission reward are accounted separately and sum exactly', () => {
  const p = create(memory()), delta = p.update({tiles: 1}, {}, 3);
  assert.equal(delta.reward, 8); assert.equal(delta.awarded[0].reward, 5);
  assert.equal(p.state.gems, 8); assert.equal(p.state.earned, 8); p.flush();
});
test('unlock is persistent, insufficient funds cannot spend, owned selection is free', () => {
  const storage = memory(), p = create(storage);
  assert.equal(p.selectTheme('aurora').reason, 'funds');
  p.update({}, {steps: 400}); // 75 diamonds from four distinct first-time missions.
  assert.equal(p.selectTheme('aurora').ok, true);
  assert.equal(p.state.gems, 15);
  assert.equal(p.selectTheme('aurora').price, 0);
  assert.equal(p.state.gems, 15);
  const q = create(storage); assert.equal(q.state.theme, 'aurora');
  assert.equal(q.state.gems, 15); assert.ok(q.state.themes.includes('aurora'));
});
test('write failure rolls back an unlock and reports a visible error', () => {
  const storage = memory(), p = create(storage); p.update({}, {steps: 400});
  storage.setItem = () => {throw Error('quota');};
  assert.equal(p.selectTheme('aurora').reason, 'storage');
  assert.equal(p.state.gems, 75); assert.equal(p.state.theme, 'classic');
  assert.ok(p.error); p.flush();
});
test('a corrupt save is never silently overwritten and existing game keys are untouched', () => {
  const storage = memory(); storage.setItem(KEY, '{bad'); storage.setItem('neon-blade-rush-manual-best-v1:test:normal', '345');
  const p = create(storage); assert.ok(p.error);
  p.update({hits: 20}); p.flush();
  assert.equal(storage.getItem(KEY), '{bad');
  assert.equal(storage.getItem('neon-blade-rush-manual-best-v1:test:normal'), '345');
});
