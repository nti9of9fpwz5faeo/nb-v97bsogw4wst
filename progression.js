/* Local play-test progression. Never use this ledger to validate real-money purchases. */
(function (root) {
  'use strict';
  const KEY = 'neon-blade-progress-v1';
  const groups = [
    ['hits', 'リズムをつかめ', 'GREAT以上', [20, 100, 300, 800], [8, 12, 20, 35]],
    ['steps', 'その先へ', 'エンドレスの最高STEPS', [50, 100, 200, 400], [8, 12, 20, 35]],
    ['combo', 'つなぐ力', '最大コンボ', [10, 20, 50, 100], [5, 10, 20, 30]],
    ['rush', '刃を解き放て', '必殺技の発動', [1, 5, 15, 40], [8, 12, 20, 35]],
    ['tiles', 'ダイヤハンター', 'ダイヤマス達成', [1, 5, 15, 40], [5, 12, 20, 35]]
  ];
  const missions = groups.flatMap(([stat, title, label, targets, rewards]) => targets.map((target, tier) => ({
    id: stat + '-' + target, stat, title, label, target, reward: rewards[tier], tier: tier + 1
  })));
  const themes = [
    {id: 'classic', name: 'ネオンシティ', tag: 'いつもの光の道', price: 0, colors: ['#075ffa', '#00bff2', '#11d6fb']},
    {id: 'aurora', name: 'オーロラリンク', tag: '澄んだ光と、きらめく結晶', price: 60, colors: ['#1737b8', '#00bdab', '#99ffe0']},
    {id: 'sunset', name: 'サンセットドライブ', tag: '夕空を走る、黄金の回路', price: 160, colors: ['#6831c5', '#ff8975', '#ffdc8a']}
  ];
  const fresh = () => ({version: 1, gems: 0, earned: 0, stats: {hits: 0, steps: 0, combo: 0, rush: 0, tiles: 0}, claimed: [], themes: ['classic'], theme: 'classic'});
  const integer = v => Number.isSafeInteger(v) && v >= 0;
  function validate(raw) {
    if (!raw || raw.version !== 1 || !integer(raw.gems) || !integer(raw.earned) || !raw.stats || !Array.isArray(raw.claimed) || !Array.isArray(raw.themes)) throw Error('invalid save');
    const out = fresh();
    out.gems = raw.gems; out.earned = raw.earned;
    for (const key of Object.keys(out.stats)) {
      if (!integer(raw.stats[key])) throw Error('invalid stat');
      out.stats[key] = raw.stats[key];
    }
    out.claimed = [...new Set(raw.claimed.filter(id => missions.some(m => m.id === id)))];
    out.themes = [...new Set(['classic', ...raw.themes.filter(id => themes.some(t => t.id === id))])];
    out.theme = out.themes.includes(raw.theme) ? raw.theme : 'classic';
    return out;
  }
  function create(storage) {
    let state = fresh(), timer = null, dirty = false, readOnly = false, error = '';
    try { const raw = storage.getItem(KEY); if (raw !== null) state = validate(JSON.parse(raw)); }
    catch (_) { error = '保存データを読み込めませんでした。今回は保存せずに遊べます。'; readOnly = true; }
    function flush() {
      clearTimeout(timer); timer = null;
      if (!dirty) return !error;
      if (readOnly) return false;
      try { storage.setItem(KEY, JSON.stringify(state)); dirty = false; error = ''; return true; }
      catch (_) { error = '保存できませんでした。ページを閉じると今回の進行が失われる可能性があります。'; return false; }
    }
    function schedule() { dirty = true; if (!timer) timer = setTimeout(flush, 1000); }
    function update(add = {}, maxima = {}, tileReward = 0) {
      for (const key of ['hits', 'rush', 'tiles']) if (integer(add[key])) state.stats[key] += add[key];
      for (const key of ['steps', 'combo']) if (integer(maxima[key])) state.stats[key] = Math.max(state.stats[key], maxima[key]);
      const awarded = missions.filter(m => !state.claimed.includes(m.id) && state.stats[m.stat] >= m.target);
      state.claimed.push(...awarded.map(m => m.id));
      const reward = (integer(tileReward) ? tileReward : 0) + awarded.reduce((n, m) => n + m.reward, 0);
      state.gems += reward; state.earned += reward;
      schedule();
      if (reward) flush();
      return {reward, awarded};
    }
    function selectTheme(id) {
      const theme = themes.find(t => t.id === id);
      if (!theme) return {ok: false, reason: 'unknown'};
      const owned = state.themes.includes(id), price = owned ? 0 : theme.price;
      if (state.gems < price) return {ok: false, reason: 'funds', missing: price - state.gems};
      const before = JSON.parse(JSON.stringify(state));
      state.gems -= price;
      if (!owned) state.themes.push(id);
      state.theme = id; dirty = true;
      if (!flush()) { state = before; dirty = true; return {ok: false, reason: 'storage'}; }
      return {ok: true, purchased: !owned, price};
    }
    return {
      get state() { return state; }, get error() { return error; }, update, flush, selectTheme,
      nextMissions: () => groups.map(([stat]) => missions.find(m => m.stat === stat && !state.claimed.includes(m.id))).filter(Boolean)
    };
  }
  const api = {KEY, missions, themes, create, validate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NBProgression = api;
})(typeof window === 'undefined' ? globalThis : window);
