/* v51: result presentation, local missions, optional gem tiles and course colors. */
window.NBWorkshop = (() => {
  'use strict';
  const GEM = '<span class="gemIcon" aria-hidden="true"></span>';
  const TILE_HITS = 4, TILE_REWARD = 3;
  let ledger, run, tile, initialized = false, toastTimer, toastGap, toastQueue = [], returnFocus;
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('en-US');
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const active = () => initialized && run && !run.finished && !isTutorial() && state === 'play';
  function toast(title, detail) {
    toastQueue.push({title, detail});
    if (!toastTimer && !toastGap) showToast();
  }
  function showToast() {
    const item = toastQueue.shift(); if (!item) return;
    $('missionToast').innerHTML = GEM + `<span><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small></span>`;
    $('missionToast').classList.add('visible');
    toastTimer = setTimeout(() => {
      $('missionToast').classList.remove('visible'); toastTimer = null;
      toastGap = setTimeout(() => { toastGap = null; showToast(); }, 200);
    }, 2500);
  }
  function clearToasts() {
    clearTimeout(toastTimer); clearTimeout(toastGap); toastTimer = toastGap = null; toastQueue = [];
    $('missionToast')?.classList.remove('visible');
  }
  function refreshWallet() {
    if (!ledger) return;
    document.querySelectorAll('[data-wallet]').forEach(el => el.textContent = fmt(ledger.state.gems));
    document.querySelectorAll('[data-save-note]').forEach(el => { el.textContent = ledger.error; el.hidden = !ledger.error; });
  }
  function apply(add, maxima, gems = 0) {
    const change = ledger.update(add, maxima, gems);
    if (run) {
      run.gems += change.reward; run.tileGems += gems;
      run.missions.push(...change.awarded);
    }
    if (change.awarded.length) {
      const first = change.awarded[0], reward = change.awarded.reduce((n, m) => n + m.reward, 0);
      toast('MISSION CLEAR', `${first.title}${change.awarded.length > 1 ? ` ほか${change.awarded.length - 1}件` : ''}　＋${reward}ダイヤ`);
    }
    if (change.reward || ledger.error) refreshWallet();
  }
  function resetRun() {
    if (!initialized) return;
    ledger.flush(); clearToasts();
    run = {gems: 0, tileGems: 0, missions: [], rushes: 0, serial: 0, seen: new Set(), finished: false};
    makeTile(0); refreshWallet();
  }
  function suspendRun() { if (ledger) ledger.flush(); run = null; }
  function makeTile(serial) {
    // One optional tile per traversal, away from start/end and the existing checkpoints.
    let seed = 0; for (const c of song.file) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const idx = [7, 13, 20, 25][(seed + serial) % 4];
    tile = {idx, hits: 0, done: false, lastBeat: -1, announced: false};
  }
  function nextCourse() {
    if (!active()) return;
    run.serial++; run.seen.clear(); makeTile(run.serial);
  }
  function judged(word, beat, t) {
    if (!active() || (word !== 'PERFECT' && word !== 'GREAT')) return;
    // A blue note's two distinct beats count. Repeated processing of one beat never does.
    const key = `${run.serial}:${beat}`;
    if (run.seen.has(key)) return;
    run.seen.add(key);
    let gems = 0, tiles = 0;
    if (speedOn() && tile && !tile.done && player.idx === tile.idx && tile.lastBeat !== beat) {
      tile.lastBeat = beat; tile.hits++;
      if (tile.hits >= TILE_HITS) {
        tile.done = true; tiles = 1; gems = TILE_REWARD;
        toast('DIAMOND GET!', `ダイヤマス達成　＋${TILE_REWARD}ダイヤ`);
        fx.push({type: 'milestone', idx: tile.idx, t, d: .75, col: '#8affed'});
        [1046, 1318, 1568].forEach((f, i) => uiTone(f, .075, i * .04));
      }
    }
    apply({hits: 1, tiles}, {combo}, gems);
  }
  function steps(value) {
    if (active() && speedOn() && value > ledger.state.stats.steps) apply({}, {steps: value});
  }
  function rush() {
    if (!active()) return;
    run.rushes++; apply({rush: 1}, {});
  }
  function finish(result) {
    if (!initialized) return;
    clearToasts(); ledger.flush(); refreshWallet();
    result.rewards = {total: run?.gems || 0, tiles: run?.tileGems || 0, missions: [...(run?.missions || [])], balance: ledger.state.gems};
    result.rushes = run?.rushes || 0;
    if (run) run.finished = true;
  }
  function palette(index, fallback) {
    if (!initialized || isTutorial() || ledger.state.theme === 'classic') return fallback;
    const theme = NBProgression.themes.find(t => t.id === ledger.state.theme);
    const p = theme.colors;
    return p;
  }
  function drawTile(t) {
    if (!initialized || !run || !speedOn() || !tile || tile.idx > revealEnd || player.idx > tile.idx || tile.done) {
      if ($('gemCue')) $('gemCue').hidden = true;
      return;
    }
    const p = cellXY(tile.idx), size = cell * .34;
    if (p.y < -cell || p.y > boardH + cell) return;
    g.save(); g.globalAlpha = tileAlpha(tile.idx, t);
    g.fillStyle = '#b3fff3'; g.strokeStyle = '#073443'; g.lineWidth = Math.max(2, cell * .05);
    const k = reduceMotion.matches ? 1 : 1 + Math.sin(t * 4) * .05;
    g.translate(p.x, p.y); g.scale(k, k);
    g.beginPath(); g.moveTo(-size, -size * .24); g.lineTo(-size * .5, -size * .8); g.lineTo(size * .5, -size * .8); g.lineTo(size, -size * .24); g.lineTo(0, size * .9); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#00bdb7'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-size, -size * .24); g.lineTo(size, -size * .24); g.moveTo(-size * .45, -size * .24); g.lineTo(0, size * .9); g.lineTo(size * .45, -size * .24); g.stroke();
    for (let i = 0; i < TILE_HITS; i++) { g.beginPath(); g.arc((i - 1.5) * cell * .16, cell * .38, cell * .045, 0, Math.PI * 2); g.fillStyle = i < tile.hits ? '#eaff73' : '#074451'; g.fill(); }
    g.restore();
    const cue = $('gemCue');
    cue.hidden = !(state === 'play' && player.idx === tile.idx);
    if (!cue.hidden) {
      cue.textContent = `◆ GREAT以上 ${tile.hits} / ${TILE_HITS}`;
      const cr = cv.getBoundingClientRect(), wr = $('fieldWrap').getBoundingClientRect();
      cue.style.left = Math.max(4, Math.min(wr.width - cue.offsetWidth - 4, cr.left - wr.left + p.x - cue.offsetWidth / 2)) + 'px';
      cue.style.top = Math.max(4, Math.min(wr.height - cue.offsetHeight - 4, cr.top - wr.top + p.y + cell * 1.05)) + 'px';
    }
  }
  function drawAtmosphere(t) {
    if (!initialized || isTutorial() || ledger.state.theme === 'classic') return;
    const sunset = ledger.state.theme === 'sunset';
    g.save(); g.globalAlpha = .16; g.strokeStyle = '#fff'; g.lineWidth = 1;
    if (sunset) {
      const x = boardW * .8, y = boardH * .22, r = boardW * .22;
      g.fillStyle = '#ffe599'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = .13;
      for (let i = 0; i < 7; i++) { const yy = boardH * (.45 + i * .09); g.beginPath(); g.moveTo(0, yy); g.lineTo(boardW, yy); g.stroke(); }
    } else {
      for (let i = 0; i < 10; i++) {
        const x = (i * 73 + 17) % boardW, y = (i * 107 + 19) % boardH;
        const s = 2 + (i % 3), pulse = reduceMotion.matches ? 1 : .6 + .4 * Math.sin(t * .8 + i);
        g.globalAlpha = .12 + pulse * .14; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      }
    }
    g.restore();
  }
  function missionCard(m) {
    const value = Math.min(m.target, ledger.state.stats[m.stat]), pct = value / m.target * 100;
    const unit = m.stat === 'steps' ? ' STEPS' : m.stat === 'combo' ? 'コンボ' : '回';
    return `<article class="missionCard"><div><small>MISSION ${String(m.tier).padStart(2, '0')}</small><h3>${m.title}</h3><p>${m.label} ${fmt(m.target)}${unit}</p></div><b class="missionPrize">${GEM}＋${m.reward}</b><div class="missionTrack"><i style="width:${pct}%"></i></div><span class="missionProgress">${fmt(value)} / ${fmt(m.target)}</span></article>`;
  }
  function panel(tab) {
    if (!initialized) return;
    const shop = tab === 'shop';
    $('collectionHeading').textContent = shop ? 'コーステーマ' : 'ミッション';
    $('collectionIntro').textContent = shop ? '集めたダイヤで、走る景色を変えよう。' : '達成した瞬間にダイヤGET。何度でも挑戦しよう。';
    $('collectionBody').innerHTML = shop ? NBProgression.themes.map(theme => {
      const owned = ledger.state.themes.includes(theme.id), selected = ledger.state.theme === theme.id;
      const missing = Math.max(0, theme.price - ledger.state.gems);
      return `<article class="themeCard" style="--theme-a:${theme.colors[0]};--theme-b:${theme.colors[1]};--theme-floor:${theme.colors[2]}"><div class="themePreview ${theme.id}"><i></i><b>${theme.id === 'sunset' ? '☀' : theme.id === 'aurora' ? '✧' : '↗'}</b><span>${selected ? '選択中' : owned ? '解放済み' : 'THEME'}</span></div><div class="themeInfo"><h3>${theme.name}</h3><p>${theme.tag}</p><button data-theme="${theme.id}" ${selected || (!owned && missing) ? 'disabled' : ''}>${selected ? '使用中' : owned ? 'この景色で遊ぶ' : `${GEM} ${theme.price} で解放`}</button>${!owned && missing ? `<small>あと ${missing} ダイヤ</small>` : ''}</div></article>`;
    }).join('') + '<p class="collectionNote">コーステーマは背景・床の見た目を変更します。<br>曲・譜面・キャラの強さは共通です。</p>' : ledger.nextMissions().map(missionCard).join('') + `<p class="collectionNote">達成済み ${ledger.state.claimed.length} / ${NBProgression.missions.length}<br>ダイヤマスはエンドレスに出現。<br>そのマスでGREAT以上を4回取ると＋3ダイヤ。<br>練習中のプレイはミッションの対象外です。</p>`;
    $('collectionBody').querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
      if (state !== 'ready') return;
      const theme = NBProgression.themes.find(t => t.id === button.dataset.theme);
      if (!ledger.state.themes.includes(theme.id)) {
        // The second tap confirms the exact virtual-currency spend; no real purchase exists here.
        if (button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = `💎${theme.price} を使って解放する`; return; }
      }
      const result = ledger.selectTheme(theme.id);
      if (!result.ok) { $('collectionStatus').textContent = result.reason === 'storage' ? ledger.error : 'ダイヤが足りません'; return; }
      setPalette(lineK); refreshWallet(); panel('shop');
      $('collectionStatus').textContent = `${theme.name}を${result.purchased ? '解放しました！' : '選びました'}`;
      [659, 988, 1318].forEach((f, i) => uiTone(f, .08, i * .07));
    }));
    refreshWallet();
  }
  function openPanel(tab) {
    if (state !== 'ready') return;
    returnFocus = document.activeElement; $('collectionStatus').textContent = ''; panel(tab);
    $('collectionOv').classList.remove('hide'); $('collectionOv').scrollTop = 0; $('collectionClose').focus();
  }
  function closePanel() { $('collectionOv').classList.add('hide'); returnFocus?.focus(); }
  function init() {
    let storage;
    try { storage = localStorage; } catch (_) { storage = {getItem() { throw Error('storage unavailable'); }}; }
    ledger = NBProgression.create(storage); initialized = true;
    $('verBadge').insertAdjacentHTML('afterend', `<div class="collectionBar"><button id="missionsOpen">ミッション <span class="missionDot"></span></button><button id="themesOpen">${GEM}<b data-wallet>0</b><span>解放 ↗</span></button></div><p class="saveNote" data-save-note hidden></p>`);
    $('fieldWrap').insertAdjacentHTML('beforeend', '<div id="gemCue" hidden></div>');
    document.body.insertAdjacentHTML('beforeend', `<div id="missionToast" role="status" aria-live="polite"></div><div id="collectionOv" class="overlay hide" role="dialog" aria-modal="true" aria-labelledby="collectionHeading"><div class="collectionPanel"><header><button id="collectionClose" aria-label="曲えらびへ戻る">‹</button><h2 id="collectionHeading"></h2><span class="wallet">${GEM}<b data-wallet>0</b></span></header><p id="collectionIntro"></p><div id="collectionBody"></div><p id="collectionStatus" role="status"></p><p class="saveNote" data-save-note hidden></p></div></div>`);
    $('missionsOpen').addEventListener('click', () => openPanel('missions'));
    $('themesOpen').addEventListener('click', () => openPanel('shop'));
    $('collectionClose').addEventListener('click', closePanel);
    $('collectionOv').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
    window.addEventListener('pagehide', () => ledger.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) ledger.flush(); refreshWallet(); });
    refreshWallet();
  }
  function resultMarkup(prefix, clear) {
    return `<div class="resultSheet">
      <header class="resultHeader"><span class="resultEyebrow">NEON BLADE / RUN REPORT</span><h2 class="resultTitle">${clear ? 'CLEAR!' : 'NICE RUN!'}</h2><p class="resultSong"><span data-result-song></span><span class="resultDifficulty" data-result-difficulty></span></p><p class="endReason" data-result-reason></p></header>
      <div class="resultHero"><div class="resultPortrait"><canvas id="${prefix}Hero" width="400" height="280" aria-hidden="true"></canvas><strong class="resultHeroName" data-result-hero></strong></div><div class="resultRank"><small>RANK</small><strong data-result-rank></strong></div><div class="recordEmblem" aria-hidden="true">✦<small>KEEP<br>GOING</small></div></div>
      <div class="scorePanel"><div class="scoreLabel"><span>SCORE / 1,000,000</span><span class="newBest" data-result-new>NEW BEST!</span></div><strong class="scoreValue" data-result-score>0</strong><div class="resultDelta" data-result-delta></div><div class="bestValue">自己ベスト <span data-result-best>0</span></div><div class="recordTrack"><i data-result-track></i></div><p class="nextRecord" data-result-next></p></div>
      <div class="resultStats"><div class="resultStat"><small>判定精度</small><b data-result-accuracy></b></div><div class="resultStat"><small>最大コンボ</small><b data-result-combo></b></div></div>
      <div class="rewardPanel"><div class="rewardHeadline"><span>${GEM}今回のダイヤ</span><b data-result-gems>＋0</b></div><p data-result-reward-detail></p><div class="rewardWallet">所持ダイヤ <b data-result-balance>0</b></div><div class="rewardMissionList" data-result-missions></div><p class="saveNote" data-save-note hidden></p></div>
      <div class="resultFoot"><span class="resultBadge" data-result-badge></span><span data-result-foot></span></div>
      <div class="resultActions"><button class="ovBtn" data-retry>もう一回！ <span>↻</span></button><button class="ovBtn sub" data-select>曲えらび</button></div>
      <button class="resultSkip" data-result-skip>タップでまとめて表示</button>
      <details class="resultDetails"><summary>判定の内訳を見る</summary><dl class="judgmentList">${[['PERFECT','#fff064'],['GREAT','#5de8ff'],['GOOD','#bcff66'],['MISS','#ff93b6']].map(([k,col])=>`<div class="judgmentRow" data-judgment="${k}" style="--tone:${col}"><dt>${k}</dt><dd><span>0</span><small>回</small></dd></div>`).join('')}</dl></details>
      <button class="ovBtn sub diagOpenBtn" data-diag hidden>判定診断を見る</button><details class="scoreHelp"><summary>記録のしくみ</summary><p></p></details>
    </div>`;
  }
  function decorateResult(result, ov) {
    const steps = result.mode === 'endless' && result.scoring === 'rush';
    const comparable = steps || result.endless || scoreOn();
    const prev = result.previousBest || 0, delta = result.score - prev;
    ov.classList.toggle('stepsResult', steps); ov.classList.toggle('personalBest', result.newBest);
    ov.querySelector('.resultTitle').textContent = result.newBest ? '自己ベスト更新！' : result.clear ? 'CLEAR!' : 'NICE RUN!';
    ov.querySelector('.scoreLabel span').textContent = steps ? 'TOTAL STEPS' : result.endless ? '到達距離' : scoreOn() ? 'TOTAL SCORE' : 'SCORE / 1,000,000';
    ov.querySelector('[data-result-delta]').textContent = result.newBest ? prev ? `前の記録より ＋${fmt(delta)}${result.unit || ''}` : 'はじめての自己ベスト！' : prev ? delta === 0 ? '自己ベストと同じ記録！' : `自己ベスト更新まで あと${fmt(Math.max(1, prev - result.score + 1))}${result.unit || ''}` : 'ここから、記録を伸ばそう';
    const next = steps ? Math.max(Math.floor(result.best / 50) * 50 + 50, 50) : result.best + 1;
    ov.querySelector('[data-result-track]').style.width = `${Math.min(100, result.score / Math.max(1, result.newBest ? next : prev) * 100)}%`;
    ov.querySelector('[data-result-next]').textContent = steps ? `NEXT TARGET　${fmt(next)} STEPS` : comparable && prev ? `BEST　${fmt(result.best)}${result.unit || ''}` : '次の一回で、もっと先へ。';
    if (steps) ov.querySelector('.scoreHelp p').textContent = '記録はコンボ倍率込みのSTEPS。20コンボで1マス＝2 STEPS、50コンボで3 STEPS。必殺技で進んだマスにも倍率がかかります。PERFECT・GREATでコンボ継続、GOOD・MISSでリセット。ブレイクで力をため、満タンで必殺技。ワープごとに速度＋0.1（最大2.2倍）。ライフ切れ、またはワープ前に曲が終わると終了です。';
    else if (scoreOn()) ov.querySelector('.scoreHelp p').textContent = '進むたびに直前のブレイク判定に応じて加点。ブレイクそのものでも加点されます。曲が終わるまでにスコアを伸ばそう。';
    else if (!result.endless) ov.querySelector('.scoreHelp p').textContent = '判定精度 × 到達率 × 1,000,000点。自己ベストはクリアした記録を曲・難易度ごとに保存します。';
    ov.querySelectorAll('details').forEach(el => el.open = false);
    const rewards = result.rewards || {total: 0, tiles: 0, missions: [], balance: ledger?.state.gems || 0};
    ov.querySelector('[data-result-gems]').textContent = '＋' + rewards.total;
    ov.querySelector('[data-result-balance]').textContent = fmt(rewards.balance);
    ov.querySelector('[data-result-reward-detail]').textContent = rewards.total ? `ダイヤマス ＋${rewards.tiles}　／　ミッション ＋${rewards.total - rewards.tiles}` : isTutorial() ? '練習のあとは、本編でダイヤに挑戦！' : 'ミッション達成やダイヤマスでGET！';
    const earned = rewards.missions.slice(0, 2);
    ov.querySelector('[data-result-missions]').innerHTML = earned.map(m => `<span>✓ ${m.title} <b>＋${m.reward}</b></span>`).join('') + (rewards.missions.length > 2 ? `<small>ほか${rewards.missions.length - 2}件達成</small>` : '');
    refreshWallet();
  }
  function finishReveal(result, ov) {
    ov.querySelector('[data-result-gems]').textContent = '＋' + (result.rewards?.total || 0);
    ov.querySelector('[data-result-balance]').textContent = fmt(result.rewards?.balance || 0);
    ov.querySelector('.scorePanel').classList.add('scoreLanded');
    if (result.newBest && !reduceMotion.matches) {
      const box = ov.querySelector('.scorePanel'); box.querySelectorAll('.resultSpark').forEach(el => el.remove());
      for (let i = 0; i < 12; i++) { const dot = document.createElement('i'); dot.className = 'resultSpark'; dot.style.setProperty('--sx', `${Math.cos(i * Math.PI / 6) * 145}px`); dot.style.setProperty('--sy', `${Math.sin(i * Math.PI / 6) * 100}px`); dot.style.setProperty('--sc', ['#caff65','#88ffef','#fff2ab'][i % 3]); box.appendChild(dot); }
    }
  }
  function paintScore(el, value, result) {
    el.innerHTML = `<span>${fmt(value)}</span>${result.unit ? `<small>${escape(result.unit.trim())}</small>` : ''}`;
  }
  function flush() { if (ledger) { ledger.flush(); refreshWallet(); } }
  return {init, resetRun, suspendRun, nextCourse, judged, steps, rush, finish, palette, drawTile, drawAtmosphere, resultMarkup, decorateResult, finishReveal, paintScore, flush, clearToasts};
})();
