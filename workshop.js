/* v51: result presentation, local missions, optional gem tiles and course colors. */
window.NBWorkshop = (() => {
  'use strict';
  const GEM = '<span class="gemIcon" aria-hidden="true"></span>';
  let previewSource=null, previewToken=0, previewButton=null;
  let ledger, run, tile, initialized = false, toastTimer, toastGap, toastQueue = [], returnFocus;
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('en-US');
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const active = () => initialized && run && !run.finished && !isTutorial() && state === 'play';
  function toast(title, detail) {
    if(toastQueue.length>=1){toastQueue[0]={title:'MISSION CLEAR',detail:'複数のミッションを達成！ 詳細はリザルトへ'};}else toastQueue.push({title, detail});
    if (!toastTimer && !toastGap) showToast();
  }
  function showToast() {
    const item = toastQueue.shift(); if (!item) return;
    $('missionToast').innerHTML = GEM + `<span><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small></span>`;
    $('missionToast').classList.add('visible'); NBSound.play('mission');
    toastTimer = setTimeout(() => {
      $('missionToast').classList.remove('visible'); toastTimer = null;
      toastGap = setTimeout(() => { toastGap = null; showToast(); }, 8000);
    }, 2500);
  }
  function clearToasts() {
    clearTimeout(toastTimer); clearTimeout(toastGap); toastTimer = toastGap = null; toastQueue = [];
    $('missionToast')?.classList.remove('visible');
  }
  function refreshWallet() {
    if (!ledger) return;
    const rank=NBProgression.rankInfo(ledger.state.xp); if($('playerRank'))$('playerRank').textContent=`PLAYER RANK ${rank.rank}　${rank.progress} / ${rank.need} XP`;
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
    run = {gems: 0, tileGems: 0, missions: [], rushes: 0, serial: 0, hits:0, seen: new Set(), finished: false};
    makeTile(0); refreshWallet();
  }
  function suspendRun() { if (ledger) ledger.flush(); run = null; }
  function makeTile(serial) {
    tile = NBChase.spawn();
  }
  function nextCourse() {
    if (!active()) return;
    tick(songTime()); run.serial++; run.seen.clear(); makeTile(run.serial); NBSound.play('warp');
  }
  function judged(word, beat, t) {
    if (!active() || (word !== 'PERFECT' && word !== 'GREAT')) return;
    // A blue note's two distinct beats count. Repeated processing of one beat never does.
    const key = `${run.serial}:${beat}`;
    if (run.seen.has(key)) return;
    run.seen.add(key);
    run.hits++; apply({hits: 1}, {combo});
  }
  function steps(value) {
    if (active() && value > ledger.state.stats.steps) apply({}, {steps: value});
  }
  function tick(t){
    if(!active()||!tile)return;
    const outcome=NBChase.advance(tile,t,SPB,playerVis(t),GOAL_INDEX);
    if(outcome==='caught'){
      apply({tiles:1},{},tile.rarity.reward);NBSound.play('diamond');
      const idx=Math.min(player.idx,GOAL_INDEX);
      fx.push({type:'milestone',idx,t,d:.65,col:tile.rarity.color});
      texts.push({s:`◆ +${tile.rarity.reward}`,idx,t,col:tile.rarity.color,big:true});
    }
  }

  function rush() {
    if (!active()) return;
    run.rushes++; apply({rush: 1}, {});
  }
  function finish(result) {
    if (!initialized) return;
    if(run&&!run.finished&&!isTutorial()){
      const xp= Math.floor(Math.min(2000,(run.hits*.5)+(result.mode==='distance'?result.score:result.moveSteps||0)));
      result.progression=ledger.awardXP(xp);run.gems+=result.progression.reward;
    }
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
    if($('gemCue'))$('gemCue').hidden=true;
    if(!initialized||!run||isTutorial()||!tile||tile.done||tile.idx>revealEnd)return;
    const p=cellXY(tile.idx),c=tile.type.color,r=tile.rarity;
    if(p.y < -cell || p.y>boardH+cell)return;
    g.save();g.translate(p.x,p.y);g.scale(cell/48,cell/48);
    const bounce=reduceMotion.matches?0:Math.sin(t/SPB*Math.PI*2)*2;
    g.translate(0,bounce-5);
    // Compact masked runner, with a trailing scarf and a clearly visible reward.
    g.fillStyle=c;g.beginPath();g.moveTo(-5,-5);g.lineTo(-27,-10);g.lineTo(-22,-1);g.closePath();g.fill();
    g.strokeStyle='#15233f';g.lineWidth=7;g.lineCap='round';
    const stride=reduceMotion.matches?3:Math.sin(t/SPB*Math.PI*2)*6;
    g.beginPath();g.moveTo(-2,9);g.lineTo(-7-stride,20);g.moveTo(3,9);g.lineTo(8+stride,20);g.stroke();
    g.fillStyle='#1e2849';g.beginPath();g.ellipse(0,3,9,12,0,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(0,-12,11,0,Math.PI*2);g.fill();g.fillStyle=c;g.fillRect(-9,-15,18,6);
    g.fillStyle='#fff';g.fillRect(1,-14,5,3);
    let fill=r.color;if(r.id==='rainbow'){fill=g.createLinearGradient(7,-26,30,-8);['#ff8cbd','#ffe68a','#8dffda','#8faaff'].forEach((v,i)=>fill.addColorStop(i/3,v));}
    g.fillStyle=fill;g.strokeStyle='#fff';g.lineWidth=1.4;g.beginPath();g.moveTo(8,-17);g.lineTo(12,-24);g.lineTo(23,-24);g.lineTo(28,-17);g.lineTo(18,-5);g.closePath();g.fill();g.stroke();
    g.font='bold 10px system-ui';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#071326';g.strokeText('+'+r.reward,18,-29);g.fillStyle='#fff';g.fillText('+'+r.reward,18,-29);
    g.restore();
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
  function specialStageMarkup() {
    return NBProgression.specialStages.map(stage => `<article class="specialStageCard" aria-label="${escape(stage.name)}・近日追加"><div class="specialStageArt" aria-hidden="true">✦</div><div><small>SPECIAL STAGE</small><h3>${escape(stage.name)}</h3><p>${escape(stage.description)}</p><span class="comingSoon">近日追加</span></div></article>`).join('');
  }
  function panel(tab) {
    if (!initialized) return;
    const shop = tab === 'shop';
    $('collectionHeading').textContent = shop ? 'ショップ' : 'ミッション';
    $('collectionIntro').textContent = shop ? '集めたダイヤで、走る景色を変えよう。' : '達成した瞬間にダイヤGET。何度でも挑戦しよう。';
    $('collectionBody').innerHTML = shop ? specialStageMarkup() + '<h3 class="collectionSection">コーステーマ</h3>' + NBProgression.themes.map(theme => {
      const owned = ledger.state.themes.includes(theme.id), selected = ledger.state.theme === theme.id;
      const missing = Math.max(0, theme.price - ledger.state.gems);
      return `<article class="themeCard" style="--theme-a:${theme.colors[0]};--theme-b:${theme.colors[1]};--theme-floor:${theme.colors[2]}"><div class="themePreview ${theme.id}"><i></i><b>${theme.id === 'sunset' ? '☀' : theme.id === 'aurora' ? '✧' : '↗'}</b><span>${selected ? '選択中' : owned ? '解放済み' : 'THEME'}</span></div><div class="themeInfo"><h3>${theme.name}</h3><p>${theme.tag}</p><button data-theme="${theme.id}" ${selected || (!owned && missing) ? 'disabled' : ''}>${selected ? '使用中' : owned ? 'この景色で遊ぶ' : `${GEM} ${theme.price} で解放`}</button>${!owned && missing ? `<small>あと ${missing} ダイヤ</small>` : ''}</div></article>`;
    }).join('') + '<p class="collectionNote">コーステーマは背景・床の見た目を変更します。<br>曲・譜面・キャラの強さは共通です。</p>' : ledger.nextMissions().map(missionCard).join('') + `<p class="collectionNote">達成済み ${ledger.state.claimed.length} / ${NBProgression.missions.length}<br>スタート・ワープ直後に、ときどき忍者が登場。<br>追いつくと5・12・30ダイヤ。色と速さの違いも見つけよう。<br>練習中のプレイはミッションの対象外です。</p>`;
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
    stopSongPreview(); returnFocus = document.activeElement; $('collectionStatus').textContent = ''; panel(tab);
    $('collectionOv').classList.remove('hide'); $('collectionOv').scrollTop = 0; $('collectionClose').focus();
  }
  function closePanel() { $('collectionOv').classList.add('hide'); returnFocus?.focus(); }
  function init() {
    let storage;
    try { storage = localStorage; } catch (_) { storage = {getItem() { throw Error('storage unavailable'); }}; }
    ledger = NBProgression.create(storage); initialized = true;
    $('verBadge').insertAdjacentHTML('afterend','<p id="playerRank" class="playerRank"></p>');
    $('songList').insertAdjacentHTML('afterend', `<section class="specialStageShelf" aria-label="特別ステージ">${specialStageMarkup()}</section>`);
    $('verBadge').insertAdjacentHTML('afterend', `<div class="collectionBar"><button id="missionsOpen">ミッション <span class="missionDot"></span></button><button id="themesOpen">${GEM}<b data-wallet>0</b><span>解放 ↗</span></button></div><p class="saveNote" data-save-note hidden></p>`);
    $('fieldWrap').insertAdjacentHTML('beforeend', '<div id="gemCue" hidden></div>');
    document.body.insertAdjacentHTML('beforeend', `<div id="missionToast" role="status" aria-live="polite"></div><div id="collectionOv" class="overlay hide" role="dialog" aria-modal="true" aria-labelledby="collectionHeading"><div class="collectionPanel"><header><button id="collectionClose" aria-label="曲えらびへ戻る">‹</button><h2 id="collectionHeading"></h2><span class="wallet">${GEM}<b data-wallet>0</b></span></header><p id="collectionIntro"></p><div id="collectionBody"></div><p id="collectionStatus" role="status"></p><p class="saveNote" data-save-note hidden></p></div></div>`);
    $('missionsOpen').addEventListener('click', () => openPanel('missions'));
    $('themesOpen').addEventListener('click', () => openPanel('shop'));
    $('collectionClose').addEventListener('click', closePanel);
    $('collectionOv').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
    window.addEventListener('pagehide', () => ledger.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) {ledger.flush();stopSongPreview();} refreshWallet(); });
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
    const steps = result.mode === 'distance' || result.mode === 'endless' && result.scoring === 'rush';
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
    if(result.mode==='distance')ov.querySelector('.scoreHelp p').textContent='曲を最後まで聴く間に進んだマス数がSTEPSになります。ワープは条件なし、曲はそのまま続きます。満タンの必殺技はブレイク長押しで発動。ライフがなくなれば終了です。';
    if(steps&&result.progression){ov.querySelector('.resultRank small').textContent='PLAYER RANK';ov.querySelector('[data-result-rank]').textContent=result.progression.rank;}
    ov.querySelectorAll('details').forEach(el => el.open = false);
    const rewards = result.rewards || {total: 0, tiles: 0, missions: [], balance: ledger?.state.gems || 0};
    ov.querySelector('[data-result-gems]').textContent = '＋' + rewards.total;
    ov.querySelector('[data-result-balance]').textContent = fmt(rewards.balance);
    ov.querySelector('[data-result-reward-detail]').textContent = rewards.total ? `忍者 ＋${rewards.tiles}　／　ミッション・ランク ＋${rewards.total - rewards.tiles}` : isTutorial() ? '練習のあとは、本編でダイヤに挑戦！' : 'ミッション達成や忍者を捕まえてGET！';
    ov.querySelector('.rankProgressResult')?.remove();
    if(result.progression){const p=result.progression;ov.querySelector('.rewardPanel').insertAdjacentHTML('beforeend',`<div class="rankProgressResult"><b>${p.rank>p.oldRank?'RANK UP!　':''}PLAYER RANK ${p.rank}</b><span>＋${p.xp} XP${p.reward?'　💎＋'+p.reward:''}</span><progress max="${p.need}" value="${p.progress}"></progress><small>${p.progress} / ${p.need} XP${p.unlocked.length?'　新しい曲を解放！':''}</small></div>`);}
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
  function ownsSong(sg){return ledger.state.songs.includes(sg.file)||!NBProgression.songs.some(x=>x.id===sg.file);}
  function stopSongPreview(){previewToken++;if(previewSource){try{previewSource.stop();}catch(_){}previewSource=null;}if(previewButton){previewButton.textContent='▶ 15秒試聴';previewButton=null;}}
  async function previewSong(sg,button){
    if(state!=='ready'||pickingSong)return;
    const same=previewButton===button;stopSongPreview();if(same)return;
    const token=previewToken;previewButton=button;button.textContent='読み込み中…';
    try{
      await ctx.resume();const buffer=await ctx.decodeAudioData(await loadAudio(sg.file));
      if(token!==previewToken||state!=='ready')return;
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.connect(gain);gain.connect(buses().song);
      const now=ctx.currentTime,duration=Math.min(15,buffer.duration),offset=Math.min(30,Math.max(0,buffer.duration*.35));
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.8,now+.15);gain.gain.setValueAtTime(.8,now+duration-.4);gain.gain.linearRampToValueAtTime(0,now+duration);
      previewSource=src;button.textContent='■ 試聴を止める';src.start(now,Math.min(offset,buffer.duration-duration),duration);
      src.onended=()=>{src.disconnect();gain.disconnect();if(previewSource===src)stopSongPreview();};
    }catch(_){if(token===previewToken){stopSongPreview();button.textContent='試聴を再試行';}}
  }
  function renderSongs(){
    const list=$('songList');list.replaceChildren();
    const makeGroup=(title,locked)=>{
      const section=document.createElement('section');section.className='songGroup'+(locked?' lockedGroup':'');section.setAttribute('aria-label',title);
      const heading=document.createElement('h3');heading.className='songGroupHeading';heading.textContent=title;section.appendChild(heading);return section;
    };
    const playable=makeGroup('プレイできる曲',false),locked=makeGroup('未解放の曲',true);
    let lockedCount=0;
    for(const sg of SONGS){
      const item=NBProgression.songs.find(x=>x.id===sg.file),owned=ownsSong(sg),tutorial=sg===SONGS[0];
      const row=document.createElement('div');row.className='songRow';
      const b=document.createElement('button');b.className='songBtn'+(sg.hard?' hard':'')+(!owned?' lockedSong':'');
      b.innerHTML=`<span>${escape(sg.name)}</span><small>${tutorial?'操作を練習する':owned?escape(sg.level):`💎 ${item.price}${item.rank?' ／ RANK '+item.rank:''}`}</small>`;
      b.addEventListener('click',()=>{
        if(state!=='ready'||pickingSong)return;
        stopSongPreview();
        if(ownsSong(sg)){pickSong(sg,b);return;}
        if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.querySelector('small').textContent=`💎 ${item.price} を使って解放する`;return;}
        const result=ledger.purchase('songs',sg.file);if(result.ok){refreshWallet();renderSongs();}else b.querySelector('small').textContent=result.reason==='funds'?'ダイヤが足りません':ledger.error;
      });row.appendChild(b);
      if(!tutorial){const preview=document.createElement('button');preview.className='songPreview';preview.textContent='▶ 15秒試聴';preview.setAttribute('aria-label',sg.name+'を15秒試聴');preview.addEventListener('click',()=>previewSong(sg,preview));row.appendChild(preview);}
      if(tutorial)list.appendChild(row);else if(owned)playable.appendChild(row);else{locked.appendChild(row);lockedCount++;}
    }
    const upload=document.createElement('button');upload.className='songBtn';upload.innerHTML='<span>📁 自分の曲をえらぶ</span><small>この端末から</small>';upload.addEventListener('click',()=>{stopSongPreview();if(state==='ready'&&!pickingSong)myFile.click();});playable.appendChild(upload);
    list.appendChild(playable);if(lockedCount)list.appendChild(locked);
  }
  function heroLabel(id){const item=NBProgression.heroes.find(h=>h.id===id);return ledger.state.heroes.includes(id)?'このキャラで遊ぶ':`💎 ${item.price} で解放`;}
  function selectHero(id,button){
    if(ledger.state.heroes.includes(id))return true;
    const item=NBProgression.heroes.find(h=>h.id===id);
    if(button.dataset.confirm!==id){button.dataset.confirm=id;button.textContent=`💎 ${item.price} を使って解放する`;return false;}
    const result=ledger.purchase('heroes',id);refreshWallet();if(!result.ok){button.textContent=result.reason==='funds'?'ダイヤが足りません':ledger.error;return false;}return true;
  }
  function ownedHero(id){return ledger.state.heroes.includes(id);}
  function flush() { if (ledger) { ledger.flush(); refreshWallet(); } }
  return {tick,ownsSong,renderSongs,stopSongPreview,heroLabel,selectHero,ownedHero,init, resetRun, suspendRun, nextCourse, judged, steps, rush, finish, palette, drawTile, drawAtmosphere, resultMarkup, decorateResult, finishReveal, paintScore, flush, clearToasts};
})();
