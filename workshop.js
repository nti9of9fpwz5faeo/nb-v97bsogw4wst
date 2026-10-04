/* Results, progression and optional diamonds embedded in breakable blocks. */
window.NBWorkshop = (() => {
  'use strict';
  const GEM = '<img class="gemIcon" src="img/gems/novice.webp" alt="">';
  let previewSource=null, previewToken=0, previewButton=null;
  let ledger, run, gemCourse, drops = [], gemStyle = 'glow', initialized = false, toastTimer, toastGap, toastQueue = [], returnFocus, missionTab='daily', missionSong=null;
  const $ = id => document.getElementById(id);
  const fmt = n => n.toLocaleString('en-US');
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const active = () => initialized && run && !run.finished && !isTutorial() && state === 'play';
  function toast(title, detail) {
    if(toastQueue.length>=1){toastQueue[0]={title:'MISSION CLEAR',detail:'複数のミッションを達成！ ホームで報酬を受け取れます'};}else toastQueue.push({title, detail});
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
    const rank=NBProgression.rankInfo(ledger.state.xp);
    if($('playerRank'))$('playerRank').innerHTML=`<span>RANK <b>${rank.rank}</b></span><progress value="${rank.progress}" max="${rank.need}" aria-label="次のランクまで ${rank.need-rank.progress} XP"></progress>`;
    const pending=ledger.missionEntries().filter(m=>m.done&&!m.claimed).length;
    document.querySelectorAll('[data-mission-count]').forEach(el=>{el.textContent=pending;el.hidden=!pending;});
    document.querySelectorAll('[data-mission-home]').forEach(el=>{el.textContent=pending?'報酬を受け取れます':'デイリー・通常・曲別の目標';});
    document.querySelectorAll('[data-wallet]').forEach(el => el.textContent = fmt(ledger.state.gems));
    document.querySelectorAll('[data-save-note]').forEach(el => { el.textContent = ledger.error; el.hidden = !ledger.error; });
  }
  function apply(add, maxima, gems = 0) {
    const change = ledger.update(add, maxima, gems, {songId:song.file});
    if (run) {
      run.gems += change.reward; run.tileGems += gems;
      run.missions.push(...change.awarded);
    }
    if (change.awarded.length) {
      const first = change.awarded[0];
      toast('MISSION CLEAR', `${first.title}${change.awarded.length > 1 ? ` ほか${change.awarded.length - 1}件` : ''}　報酬を受け取れます`);
    }
    if (change.reward || change.awarded.length || ledger.error) refreshWallet();
  }
  function resetRun() {
    NBDiamond.reset();
    if (!initialized) return;
    ledger.flush(); clearToasts();
    run = {gems: 0, tileGems: 0, missions: [], rushes: 0, serial: 0, hits:0, stepValue:0, id:globalThis.crypto?.randomUUID?.() || String(Date.now())+Math.random(), seen: new Set(), finished: false};
    run.gemStyle=gemStyle;run.gemCounts=Object.fromEntries(NBBlockGems.types.map(type=>[type.id,0]));run.gemClaims=new Set();run.gemSoundAt=-Infinity;
    gemCourse=NBBlockGems.create(typeof spawnSeed==='number'?spawnSeed:0);drops=[];NBMeasure.start();refreshWallet();
  }
  function suspendRun() { NBDiamond.reset(); NBMeasure.interrupt();if (ledger) ledger.flush(); run = null; gemCourse = null; drops=[]; }
  function nextCourse() {
    NBDiamond.reset();
    if (!active()) return;
    tick(songTime()); NBMeasure.warp();run.serial++; run.seen.clear();drops=[];run.gemSoundAt=-Infinity;NBSound.play('warp');
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
    if(active()&&value>run.stepValue){const delta=value-run.stepValue;run.stepValue=value;apply({steps:delta},{steps:value});}
  }
  function tick(t,rebase=false,bonus=0){
    if(!active())return;
    NBMeasure.tick(t,rebase,bonus);
  }
  function prepareNote(note){
    if(initialized&&run&&!run.finished&&!isTutorial()){NBBlockGems.assign(note,gemCourse);NBDiamond.prepare(note);}
    return note;
  }
  function destroyed(note,t){
    if(!active()||!note||run.gemClaims.has(note.id)||NBDiamond.is(note)&&note.hp>0)return null;
    const type=NBBlockGems.claim(note);if(!type)return null;
    run.gemClaims.add(note.id);run.gemCounts[type.id]++;
    apply({tiles:1},{},type.value);
    drops.push({type,idx:note.idx,t,mined:NBDiamond.is(note)});if(drops.length>8)drops.shift();
    if(t-run.gemSoundAt>=.09){NBSound.play('diamond');run.gemSoundAt=t;}
    return type;
  }
  const GEM_STYLE_KEY='neon-blade-block-diamond-style-v1';
  function style(){return gemStyle;}
  function syncGemStyle(){document.querySelectorAll('[data-gem-style]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gemStyle===gemStyle)));}
  function setGemStyle(value){
    if(!['glow','hidden'].includes(value)||state!=='ready')return false;
    gemStyle=value;syncGemStyle();
    try{localStorage.setItem(GEM_STYLE_KEY,value);$('gemStyleStatus').textContent='';}catch(_){$('gemStyleStatus').textContent='この端末では設定を保存できません';}
    return true;
  }
  function initGemStyles(){
    $('songList').insertAdjacentHTML('beforebegin',`<section id="gemStylePicker" aria-labelledby="gemStyleTitle"><h2 id="gemStyleTitle">ダイヤブロック</h2><p>見送っても安全。叩くと止まって採掘。</p><p>いつものタイミングでブレイク。そのマスで合計4回叩くとダイヤ獲得。</p></section>`);
  }

  function rush() {
    if (!active()) return;
    run.rushes++; apply({rush: 1}, {});
  }
  function finish(result) {
    if (!initialized) return;
    result.gemStyle=run?.gemStyle||gemStyle;result.gemCounts={...(run?.gemCounts||{})};
    result.measurement=NBMeasure.finish(result);
    if(run&&!run.finished&&!isTutorial()){
      const xp= Math.floor(Math.min(2000,(run.hits*.5)+(result.mode==='distance'?result.score:result.moveSteps||0)));
      result.progression=ledger.awardXP(xp);run.gems+=result.progression.reward;
    }
    clearToasts(); ledger.flush(); refreshWallet();
    result.rewards = {total: run?.gems || 0, tiles: run?.tileGems || 0, missions: [...(run?.missions || [])], balance: ledger.state.gems};
    result.rushes = run?.rushes || 0;
    if(run&&!run.finished&&!isTutorial()){
      result.rewardId=run.id;result.adEligible=ledger.prepareAdReward(run.id,result.rewards.total);
    }
    if (run) run.finished = true;
  }
  function palette(index, fallback) {
    if (!initialized || isTutorial() || ledger.state.theme === 'classic') return fallback;
    const theme = NBProgression.themes.find(t => t.id === ledger.state.theme);
    const p = theme.colors;
    return p;
  }
  function drawGemHint(note,size){
    const shine=NBBlockGems.shine(note,run?.gemStyle||gemStyle);
    if(!shine||isTutorial())return;
    // Neutral white light inside the block: no diamond icon, tier color, halo or flashing.
    g.save();g.globalAlpha*=shine;g.strokeStyle='#ffffff';g.fillStyle='#ffffff';g.lineWidth=Math.max(1,size*.028);
    g.beginPath();g.moveTo(-size*.36,-size*.12);g.lineTo(-size*.36,-size*.36);g.lineTo(-size*.12,-size*.36);g.stroke();
    g.globalAlpha*=.7;g.lineWidth=Math.max(1,size*.016);g.beginPath();g.moveTo(size*.14,size*.36);g.lineTo(size*.36,size*.36);g.lineTo(size*.36,size*.14);g.stroke();
    g.globalAlpha=shine;const x=size*.24,y=-size*.25,r=size*.065;
    g.beginPath();g.moveTo(x-r,y);g.lineTo(x+r,y);g.moveTo(x,y-r);g.lineTo(x,y+r);g.stroke();g.restore();
  }
  function drawGemDrops(t){
    if(!initialized||isTutorial())return;
    drops=drops.filter(drop=>t>=drop.t&&t-drop.t<1.2);
    for(const drop of drops){
      const k=(t-drop.t)/1.2,p=cellXY(drop.idx),size=cell*.6,art=IMG['gems/'+drop.type.id];
      g.save();g.globalAlpha=Math.min(1,(1-k)*3);g.font=`800 ${Math.max(12,cell*.24)}px system-ui`;
      const label='獲得 +'+drop.type.value,w=size+g.measureText(label).width+22,h=Math.max(size+10,32);
      const x=Math.max(w/2+4,Math.min(boardW-w/2-4,p.x)),y=Math.max(h/2+4,p.y-cell*(1.05+(reduceMotion.matches?0:k*.25)));
      g.translate(x,y);g.fillStyle='#102337';g.strokeStyle=drop.type.color;g.lineWidth=2;rr(g,-w/2,-h/2,w,h,9);g.fill();g.stroke();
      const ix=-w/2+size/2+8;
      if(drop.mined){g.fillStyle='#e4fbff';g.font=`900 ${Math.max(14,size*.65)}px system-ui`;g.textAlign='center';g.textBaseline='middle';g.fillText('✓',ix,0);g.font=`800 ${Math.max(12,cell*.24)}px system-ui`;}
      else if(art?.naturalWidth)g.drawImage(art,ix-size/2,-size/2,size,size);
      else {g.fillStyle=drop.type.color;g.beginPath();g.moveTo(ix,-size/2);g.lineTo(ix+size/2,0);g.lineTo(ix,size/2);g.lineTo(ix-size/2,0);g.closePath();g.fill();}
      g.textAlign='left';g.textBaseline='middle';g.fillStyle='#edfdff';g.fillText(label,ix+size/2+6,0);g.restore();
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
    const status=m.claimed?'受取済み':m.done?'達成！':'挑戦中';
    const condition=m.kind==='song'?m.label:`${m.label} ${fmt(m.target)}${m.stat==='steps'?' STEPS':m.stat==='combo'?'コンボ':m.stat==='tiles'?'個':'回'}`;
    return `<article class="missionCard ${m.done&&!m.claimed?'claimable':''} ${m.claimed?'claimed':''}"><div><small>${status}${m.archived?' ・ '+m.day+' 達成分':''}</small><h3>${escape(m.title)}</h3>${m.kind==='song'?'':`<p>${escape(condition)}</p>`}</div><b class="missionPrize">${GEM}＋${m.reward}</b><progress max="${m.target}" value="${m.done?m.target:m.value}" aria-label="${escape(m.title)}の進捗"></progress><span class="missionProgress">${fmt(m.done?m.target:m.value)} / ${fmt(m.target)}</span><button class="claimButton" data-claim="${escape(m.key)}" ${!m.done||m.claimed?'disabled':''}>${m.claimed?'✓ 受取済み':m.done?'受け取る':'挑戦中'}</button></article>`;
  }
  function missionContent(){
    const all=ledger.missionEntries(),pending=all.filter(m=>m.done&&!m.claimed);
    let rows=all.filter(m=>m.kind===missionTab),filter='',ready='';
    const unpaid=rows.filter(m=>m.done&&!m.claimed),amount=unpaid.reduce((n,m)=>n+m.reward,0);
    if(missionTab==='song'){
      const catalog=SONGS.filter(s=>s!==SONGS[0]);
      if(!catalog.some(s=>s.file===missionSong))missionSong=unpaid[0]?.songId||catalog[0]?.file;
      ready=unpaid.length?`<section class="songRewards"><h3>受け取れる報酬 <small>全曲まとめて ${unpaid.length}件</small></h3>${unpaid.map(m=>`<div class="songRewardRow"><span><small>${escape(catalog.find(s=>s.file===m.songId)?.name||m.songId)}</small><b>${escape(m.title)}</b></span><button data-claim="${escape(m.key)}">${GEM}＋${m.reward}<small>受け取る</small></button></div>`).join('')}</section>`:'<p class="songRewardEmpty">未受取の曲別報酬はありません</p>';
      filter=`<label class="missionSongLabel">曲ごとの目標<select id="missionSongSelect">${catalog.map(s=>`<option value="${escape(s.file)}" ${s.file===missionSong?'selected':''}>${escape(s.name)}</option>`).join('')}</select></label>`;
      rows=rows.filter(m=>m.songId===missionSong&&!(m.done&&!m.claimed));
    }
    rows.sort((a,b)=>(a.claimed?2:a.done?0:1)-(b.claimed?2:b.done?0:1));
    return `<div class="missionTabs" role="tablist" aria-label="ミッションの種類">${[['daily','デイリー'],['normal','通常'],['song','曲別']].map(([id,label])=>{const n=pending.filter(m=>m.kind===id).length;return `<button role="tab" aria-selected="${id===missionTab}" data-mission-tab="${id}">${label}${n?`<i>${n}</i>`:''}</button>`;}).join('')}</div><div class="claimToolbar"><span>${missionTab==='daily'?'毎日 0:00 更新（日本時間）':missionTab==='song'?'全曲の達成報酬':'プレイを重ねて達成しよう'}</span><button id="claimAll" ${unpaid.length?'':'disabled'}>まとめて受け取る${amount?'　💎 '+amount:''}</button></div>${ready}${filter}${rows.map(missionCard).join('')}<p class="collectionNote">練習は対象外です。達成済みのデイリー報酬は翌日も受け取れます。</p>`;
  }
  function claimFeedback(receipt){
    if(!receipt.ok)return ledger.error||'受け取り可能な報酬がありません';
    NBSound.play('claim');refreshWallet();
    document.querySelectorAll('[data-wallet]').forEach(el=>{el.classList.remove('walletPop');void el.offsetWidth;el.classList.add('walletPop');});
    return `💎 ${receipt.amount} ダイヤを受け取りました！`;
  }
  function bindMissions(){
    document.querySelectorAll('[data-mission-tab]').forEach(b=>b.onclick=()=>{missionTab=b.dataset.missionTab;panel('missions');document.querySelector('[data-mission-tab="'+missionTab+'"]').focus();});
    $('missionSongSelect')?.addEventListener('change',e=>{missionSong=e.target.value;panel('missions');});
    document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{const r=ledger.claimMissions([b.dataset.claim]);panel('missions');$('collectionStatus').textContent=claimFeedback(r);});
    if($('claimAll'))$('claimAll').onclick=()=>{const keys=ledger.missionEntries().filter(m=>m.kind===missionTab).map(m=>m.key);const r=ledger.claimMissions(keys);panel('missions');$('collectionStatus').textContent=claimFeedback(r);$('claimAll').focus();};
  }
  function openSongMissions(id){missionTab='song';missionSong=id;NBMenu.show('missions');}
  function openRank(){
    $('rankDialog')?.remove();const r=NBProgression.rankInfo(ledger.state.xp);
    const next=NBProgression.songs.filter(s=>s.rank>r.rank&&!ledger.state.songs.includes(s.id)).sort((a,b)=>a.rank-b.rank)[0];
    const name=next?SONGS.find(s=>s.file===next.id)?.name:'';
    const el=document.createElement('div');el.id='rankDialog';el.className='overlay songChoice';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','プレイヤーランク');
    el.innerHTML=`<div class="songChoicePanel"><button class="choiceClose" aria-label="閉じる">×</button><h2>RANK ${r.rank}</h2><p>次のランクまで ${r.need-r.progress} XP</p><progress max="${r.need}" value="${r.progress}" aria-label="ランク進捗"></progress><p>${next?'RANK '+next.rank+'：'+escape(name)+'を解放':'ランクアップで 💎10 を獲得'}</p></div>`;
    document.body.append(el);const close=()=>{el.remove();$('playerRank').focus();};el.querySelector('button').onclick=close;el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});el.querySelector('button').focus();
  }
  function specialStageMarkup() {
    return NBProgression.specialStages.map(stage => `<article class="specialStageCard" aria-label="${escape(stage.name)}・近日追加"><div class="specialStageArt" aria-hidden="true">✦</div><div><small>SPECIAL STAGE</small><h3>${escape(stage.name)}</h3><p>${escape(stage.description)}</p><span class="comingSoon">近日追加</span></div></article>`).join('');
  }
  function shoppingGiftMarkup(){
    const claimed=ledger.state.testGrants.includes('v56-shopping');
    return `<article class="themeCard"><div class="themeInfo"><h3>開発テスト用ダイヤ</h3><p>買い物を試すための、一度だけの受け取りです。</p><button id="shoppingGiftClaim" ${claimed?'disabled':''}>${claimed?'受け取り済み':GEM+' 100,000 ダイヤを受け取る'}</button></div></article>`;
  }
  function themeCards(){return NBProgression.themes.map(theme=>{
    const owned=ledger.state.themes.includes(theme.id),selected=ledger.state.theme===theme.id;
    return `<article class="themeCard" style="--theme-a:${theme.colors[0]};--theme-b:${theme.colors[1]};--theme-floor:${theme.colors[2]}"><div class="themePreview ${theme.id}"><i></i><b>✦</b></div><div class="themeInfo"><h3>${theme.name}</h3><p>${theme.tag}</p><button data-theme="${theme.id}" ${selected?'disabled':''}>${selected?'使用中':owned?'この景色で遊ぶ':GEM+' '+theme.price+' で解放'}</button></div></article>`;
  }).join('');}
  function panel(tab) {
    if(!initialized)return;
    const shop=tab==='shop',themes=tab==='themes';
    $('collectionOv').classList.toggle('lightCollection',!shop&&!themes);
    $('collectionHeading').textContent=shop?'ショップ':themes?'コーステーマ':'ミッション';
    $('collectionIntro').textContent=shop?'ダイヤと、快適なプレイを。':themes?'好きな景色で走ろう。':'目標を達成したら、報酬を受け取ろう。';
    $('collectionBody').innerHTML=shop?`<article class="storeProduct"><span>💎</span><h3>ダイヤ購入</h3><p>曲やキャラクターの解放に</p><button disabled>販売準備中</button></article><article class="storeProduct"><span>▣</span><h3>広告削除</h3><p>内容・価格は販売開始時にご案内</p><button disabled>販売準備中</button></article><button class="themesEntry" id="themeCatalogOpen">コーステーマ <span>›</span></button><details class="testGift"><summary>テスト用ダイヤ</summary>${shoppingGiftMarkup()}</details>`:themes?'<button class="themesEntry" id="backToShop">‹ ショップに戻る</button>'+themeCards():missionContent();
    if(!shop&&!themes)bindMissions();
    $('themeCatalogOpen')?.addEventListener('click',()=>panel('themes'));
    $('backToShop')?.addEventListener('click',()=>panel('shop'));
    $('shoppingGiftClaim')?.addEventListener('click',()=>{
      if(state!=='ready')return;const result=shoppingGift();panel('shop');
      $('collectionStatus').textContent=result.ok?(result.amount?'100,000 ダイヤを追加しました！':'すでに受け取り済みです。'):ledger.error;
    });
    $('collectionBody').querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>{
      if(state!=='ready')return;
      const theme=NBProgression.themes.find(t=>t.id===button.dataset.theme);
      if(!ledger.state.themes.includes(theme.id)&&button.dataset.confirm!=='yes'){button.dataset.confirm='yes';button.textContent=`💎${theme.price} を使って解放する`;return;}
      const result=ledger.selectTheme(theme.id);
      if(!result.ok){$('collectionStatus').textContent=result.reason==='storage'?ledger.error:'ダイヤが足りません';return;}
      setPalette(lineK);refreshWallet();panel('themes');NBSound.play('unlock');
      $('collectionStatus').textContent=`${theme.name}を${result.purchased?'解放しました！':'選びました'}`;
    }));refreshWallet();
  }
  function openPanel(tab) {
    if (state !== 'ready') return;
    stopSongPreview(); returnFocus = document.activeElement; $('collectionStatus').textContent = ''; panel(tab);
    $('collectionOv').classList.remove('hide'); $('collectionOv').scrollTop = 0; $('collectionClose').focus();
  }
  function closePanel() { const page=returnFocus?.closest?.('#page-songs')?'songs':'home';$('collectionOv').classList.add('hide'); NBMenu.show(page);if(returnFocus?.isConnected)returnFocus.focus(); }
  function init() {
    let storage;
    try { storage = localStorage; } catch (_) { storage = {getItem() { throw Error('storage unavailable'); }}; }
    ledger = NBProgression.create(storage); initialized = true;
    $('verBadge').insertAdjacentHTML('afterend','<button id="playerRank" class="playerRank" aria-label="ランクと解放予定を見る"></button>');

    $('verBadge').insertAdjacentHTML('afterend', `<div class="collectionBar"><button id="missionsOpen">ミッション <span class="missionDot"></span></button><button id="themesOpen">${GEM}<b data-wallet>0</b><span>解放 ↗</span></button></div><p class="saveNote" data-save-note hidden></p>`);

    document.body.insertAdjacentHTML('beforeend', `<div id="missionToast" role="status" aria-live="polite"></div><div id="collectionOv" class="overlay hide" role="dialog" aria-modal="true" aria-labelledby="collectionHeading"><div class="collectionPanel"><header><button id="collectionClose" aria-label="ホームへ戻る">‹</button><h2 id="collectionHeading"></h2><span class="wallet">${GEM}<b data-wallet>0</b></span></header><p id="collectionIntro"></p><div id="collectionBody"></div><p id="collectionStatus" role="status"></p><p class="saveNote" data-save-note hidden></p></div></div>`);
    $('missionsOpen').addEventListener('click', () => openPanel('missions'));
    $('themesOpen').addEventListener('click', () => openPanel('shop'));
    $('collectionClose').addEventListener('click', closePanel);
    $('collectionOv').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });
    window.addEventListener('pagehide', () => ledger.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) {ledger.flush();stopSongPreview();} refreshWallet(); });
    refreshWallet();
  }
  function resultMarkup(prefix, clear) {
    return `<div class="resultSheet arcadeResult">
      <header class="resultHeader"><p class="resultEyebrow">NEON BLADE / RESULT</p><h2 class="resultTitle">${clear?'完走！':'次は、自己ベストへ。'}</h2><p class="resultSong"><span data-result-song></span><span class="resultDifficulty" data-result-difficulty></span></p><p class="endReason" data-result-reason></p></header>
      <div class="resultMoment"><div class="resultHero"><div class="resultPortrait"><canvas id="${prefix}Hero" width="400" height="280" aria-hidden="true"></canvas><strong class="resultHeroName" data-result-hero hidden></strong></div><div class="resultRank" hidden><small>RANK</small><strong data-result-rank></strong></div></div>
      <div class="scorePanel"><div class="scoreLabel"><span>今回の歩数</span><span class="newBest" data-result-new>NEW RECORD</span></div><strong class="scoreValue" data-result-score>0</strong><div class="resultDelta" data-result-delta></div><div class="bestValue">自己ベスト <span data-result-best>0</span></div><div class="recordTrack"><i data-result-track></i></div><p class="nextRecord" data-result-next></p></div></div>
      <div class="runHighlights" data-result-highlights></div>
      <div class="resultLoot"><div class="rewardPanel"><div class="rewardHeadline"><span>${GEM}<span>ダイヤ</span></span><b data-result-gems>＋0</b></div></div><div class="resultGrowth" data-result-growth></div></div>
      <p class="saveNote" data-save-note hidden></p>
      <div class="resultActions"><button class="ovBtn" data-retry>もう一度 <span aria-hidden="true">↻</span></button><button class="ovBtn sub" data-select>曲を選ぶ</button></div>
      <button class="resultSkip" data-result-skip>演出をスキップ</button>
      <details class="resultDetails"><summary>プレイの詳細</summary><div class="resultStats"><div class="resultStat"><small>判定精度</small><b data-result-accuracy></b></div><div class="resultStat"><small>最大コンボ</small><b data-result-combo></b></div></div><dl class="judgmentList">${[['PERFECT','#a4f7ff'],['GREAT','#93dbff'],['GOOD','#d2eab5'],['MISS','#ffadb6']].map(([k,col])=>`<div class="judgmentRow" data-judgment="${k}" style="--tone:${col}"><dt>${k}</dt><dd><span>0</span><small>回</small></dd></div>`).join('')}</dl><div class="resultFoot"><span class="resultBadge" data-result-badge></span><span data-result-foot></span></div>
      <p class="resultGrowthDetail" data-result-growth-detail></p><p class="rewardBreakdown" data-result-reward-detail></p><p class="gemResultTypes" data-result-gem-types></p><div class="rewardWallet">所持ダイヤ <b data-result-balance>0</b></div><div class="rewardMissionList" data-result-missions></div>
      <button class="resultClaim" data-result-claim hidden></button><p class="resultClaimStatus" data-claim-status role="status"></p>
      <button class="doubleReward" data-double-reward disabled>▶ 広告でダイヤ2倍</button><p class="adStatus" data-ad-status role="status"></p>
      <button class="ovBtn sub diagOpenBtn" data-diag hidden>判定診断を見る</button><details class="scoreHelp"><summary>記録のしくみ</summary><p></p></details></details>
    </div>`;
  }
  function decorateResult(result, ov) {
    NBMeasure.decorate(result,ov);
    const steps = result.mode === 'distance' || result.mode === 'endless' && result.scoring === 'rush';
    const comparable = steps || result.endless || scoreOn();
    const prev = result.previousBest || 0, delta = result.score - prev;
    delete ov.dataset.celebrated;
    ov.classList.toggle('stepsResult', steps); ov.classList.toggle('personalBest', result.newBest);
    ov.querySelector('.resultTitle').textContent = result.newBest ? (prev?'自己ベスト更新！':'最初の記録！') : result.clear ? '完走！' : '次は、自己ベストへ。';
    ov.querySelector('.scoreLabel span').textContent = steps ? '今回の歩数' : result.endless ? '到達距離' : scoreOn() ? '今回のスコア' : 'SCORE / 1,000,000';
    ov.querySelector('[data-result-delta]').textContent = result.newBest ? prev ? `前の記録より ＋${fmt(delta)}${steps?'歩':result.unit || ''}` : 'はじめての自己ベスト！' : prev ? delta === 0 ? '自己ベストと同じ記録！' : `新記録まで あと${fmt(Math.max(1, prev - result.score + 1))}${steps?'歩':result.unit || '点'}` : 'ここから、記録を伸ばそう';
    if(steps)ov.querySelector('[data-result-best]').textContent=fmt(result.best)+'歩';
    const next = result.newBest||!prev ? (steps?Math.max(Math.floor(result.best/50)*50+50,50):result.best+1) : prev+1;
    const track=ov.querySelector('[data-result-track]');track.dataset.target=String(Math.min(100,result.score/Math.max(1,next)*100));track.style.width='0%';
    ov.querySelector('[data-result-next]').textContent = steps ? `次の目標 ${fmt(next)}歩` : comparable && prev ? `BEST　${fmt(result.best)}${result.unit || ''}` : '次の一回で、もっと先へ。';
    if (steps) ov.querySelector('.scoreHelp p').textContent = '記録はコンボ倍率込みのSTEPS。20コンボで1マス＝2 STEPS、50コンボで3 STEPS。必殺技で進んだマスにも倍率がかかります。PERFECT・GREATでコンボ継続、GOOD・MISSでリセット。ブレイクで力をため、満タンで必殺技。ワープごとに速度＋0.1（最大2.2倍）。ライフ切れ、またはワープ前に曲が終わると終了です。';
    else if (scoreOn()) ov.querySelector('.scoreHelp p').textContent = '進むたびに直前のブレイク判定に応じて加点。ブレイクそのものでも加点されます。曲が終わるまでにスコアを伸ばそう。';
    else if (!result.endless) ov.querySelector('.scoreHelp p').textContent = '判定精度 × 到達率 × 1,000,000点。自己ベストはクリアした記録を曲・難易度ごとに保存します。';
    if(result.mode==='distance')ov.querySelector('.scoreHelp p').textContent='曲を最後まで聴く間に進んだマス数がSTEPSになります。ワープは条件なし、曲はそのまま続きます。満タンの必殺技はブレイク長押しで発動。ライフがなくなれば終了です。';
    if(steps&&result.progression){ov.querySelector('.resultRank small').textContent='PLAYER RANK';ov.querySelector('[data-result-rank]').textContent=result.progression.rank;}
    ov.querySelectorAll('details').forEach(el => el.open = false);
    const rewards = result.rewards || {total: 0, tiles: 0, missions: [], balance: ledger?.state.gems || 0};
    ov.querySelector('[data-result-gems]').textContent = '＋' + rewards.total;
    ov.querySelector('[data-result-balance]').textContent = fmt(rewards.balance);
    ov.querySelector('[data-result-reward-detail]').textContent = rewards.total ? [rewards.tiles?'ブロックから獲得 ＋'+rewards.tiles:'',rewards.total>rewards.tiles?'ランクアップ ＋'+(rewards.total-rewards.tiles):''].filter(Boolean).join(' ／ ') : isTutorial() ? '本編ではブロックからダイヤが出ます' : 'ダイヤ入りのブロックを壊すと獲得できます';
    const gemTypes=ov.querySelector('[data-result-gem-types]');gemTypes.textContent='ダイヤ採掘 ／ '+NBBlockGems.types.filter(type=>result.gemCounts?.[type.id]).map(type=>type.name+' ×'+result.gemCounts[type.id]).join('・');gemTypes.hidden=!Object.values(result.gemCounts||{}).some(Boolean);
    const growth=ov.querySelector('[data-result-growth]');growth.innerHTML='';
    const growthDetail=ov.querySelector('[data-result-growth-detail]');growthDetail.hidden=!result.progression;growthDetail.textContent=result.progression?`ランク ${result.progression.rank} ／ 次のランクまで ${result.progression.need-result.progression.progress} XP${result.progression.unlocked.length?' ／ 新しい曲を解放！':''}`:'';
    if(result.progression){const p=result.progression;growth.innerHTML=`<div class="growthLabel"><b>${p.rank>p.oldRank?'RANK UP　'+p.oldRank+' → '+p.rank:'RANK '+p.rank}</b><span data-xp-earned>＋0 XP</span></div><progress max="${p.need}" value="0" aria-label="次のランクへの進捗"></progress><small>${p.unlocked.length?'新しい曲を解放！':'次のランクまで '+(p.need-p.progress)+' XP'}</small>`;}
    const highlights=[];
    if(result.maxCombo>=10)highlights.push(`<span>つながった！ <b>${fmt(result.maxCombo)} COMBO</b></span>`);
    if((result.counts?.PERFECT||0)>0)highlights.push(`<span>PERFECT <b>${fmt(result.counts.PERFECT)}回</b></span>`);
    if(highlights.length<2&&result.rushes)highlights.push(`<span>必殺技 <b>${result.rushes}回</b></span>`);
    const highlight=ov.querySelector('[data-result-highlights]');highlight.innerHTML=highlights.slice(0,1).join('');highlight.hidden=!highlights.length;
    const claim=ov.querySelector('[data-result-claim]'),claimStatus=ov.querySelector('[data-claim-status]');claimStatus.textContent='';
    const keys=new Set(rewards.missions.map(m=>m.key));
    const available=()=>ledger.missionEntries().filter(m=>keys.has(m.key)&&m.done&&!m.claimed);
    const paintClaim=()=>{const pending=available(),amount=pending.reduce((n,m)=>n+m.reward,0);claim.hidden=!keys.size;claim.disabled=!pending.length;claim.innerHTML=pending.length?`<span>ミッション ${pending.length}件達成<small>報酬を受け取る</small></span><b>${GEM}＋${amount}</b>`:'✓ ミッション報酬 受取済み';};paintClaim();
    claim.onclick=()=>{finishResultReveal();const receipt=ledger.claimMissions([...keys]);claimStatus.textContent=claimFeedback(receipt);rewards.balance=ledger.state.gems;paintClaim();};
    const ad=ov.querySelector('[data-double-reward]'),status=ov.querySelector('[data-ad-status]');
    ad.textContent=NBAds.available()?'▶ 広告で獲得ダイヤ2倍'+(rewards.total?'（＋'+rewards.total+'）':''):'▶ 広告でダイヤ2倍 · 準備中';
    ad.disabled=!result.adEligible||!rewards.total||!NBAds.available();ad.hidden=!NBAds.available()||!rewards.total;
    status.textContent=NBAds.available()&&!rewards.total?'今回の対象ダイヤはありません':'';
    ad.onclick=async()=>{
      if(ad.disabled)return;ad.disabled=true;status.textContent='広告を読み込み中…';
      const earned=await NBAds.show(result.rewardId);
      if(!earned){status.textContent='視聴は完了していません。追加ダイヤは付与されません。';ad.disabled=!NBAds.available();return;}
      const receipt=ledger.claimAdReward(result.rewardId);
      if(!receipt.ok){status.textContent=receipt.reason==='storage'?ledger.error:'この報酬は受け取り済みです';return;}
      rewards.total+=receipt.amount;rewards.balance=ledger.state.gems;ad.textContent='2倍のダイヤを獲得済み';status.textContent='';finishReveal(result,ov);refreshWallet();NBSound.play('diamond');
    };
    ov.querySelector('.rewardPanel').hidden=!rewards.total;growth.hidden=!result.progression?.xp;
    ov.querySelector('.resultLoot').hidden=!rewards.total&&!result.progression?.xp;
    animateResult(result,ov,0,0);
    refreshWallet();
  }
  function animateResult(result,ov,scoreProgress,rewardProgress){
    const track=ov.querySelector('[data-result-track]');track.style.width=(Number(track.dataset.target)*scoreProgress)+'%';
    const p=result.progression;
    if(p){const info=NBProgression.rankInfo((p.totalXP??p.xp)-p.xp+Math.round(p.xp*rewardProgress));const growth=ov.querySelector('[data-result-growth]');
      growth.querySelector('progress').max=info.need;growth.querySelector('progress').value=info.progress;
      growth.querySelector('[data-xp-earned]').textContent='＋'+Math.round(p.xp*rewardProgress)+' XP';
      growth.querySelector('b').textContent=info.rank>p.oldRank?'RANK UP! '+info.rank:'RANK '+info.rank;
      growth.querySelector('small').textContent=rewardProgress===1&&p.unlocked.length?'新しい曲を解放！':'次のランクまで '+(info.need-info.progress)+' XP';
    }
    ov.querySelector('[data-result-gems]').textContent='＋'+Math.round((result.rewards?.total||0)*rewardProgress);
  }
  function finishReveal(result, ov) {
    animateResult(result,ov,1,1);
    ov.querySelector('.resultLoot').classList.add('lootArrive');
    ov.querySelector('[data-result-gems]').textContent = '＋' + (result.rewards?.total || 0);
    ov.querySelector('[data-result-balance]').textContent = fmt(result.rewards?.balance || 0);
    ov.querySelector('.scorePanel').classList.add('scoreLanded');
    if (result.newBest && !reduceMotion.matches && !ov.dataset.celebrated) {
      ov.dataset.celebrated='yes';
      const box = ov.querySelector('.scorePanel'); box.querySelectorAll('.resultSpark').forEach(el => el.remove());
      for (let i = 0; i < 12; i++) { const dot = document.createElement('i'); dot.className = 'resultSpark'; dot.style.setProperty('--sx', `${Math.cos(i * Math.PI / 6) * 145}px`); dot.style.setProperty('--sy', `${Math.sin(i * Math.PI / 6) * 100}px`); dot.style.setProperty('--sc', ['#caff65','#88ffef','#fff2ab'][i % 3]); box.appendChild(dot); }
    }
  }
  function paintScore(el, value, result) {
    el.innerHTML = `<span>${fmt(value)}</span>${result.unit ? `<small>${escape(result.unit.trim()==='STEPS'?'歩':result.unit.trim())}</small>` : ''}`;
  }
  function previewIcon(kind){
    const paths={play:'<path d="M10 7l9 5-9 5z" fill="currentColor"/>',stop:'<rect x="8" y="8" width="8" height="8" rx="1" fill="currentColor"/>',loading:'<path d="M12 4a8 8 0 1 1-8 8" fill="none" stroke="currentColor" stroke-width="2"/>',retry:'<path d="M5 10a7 7 0 1 1 1 7M5 4v6h6" fill="none" stroke="currentColor" stroke-width="2"/>'};
    return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${kind==='loading'?'previewLoading':''}"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.4"/>${paths[kind]}</svg>`;
  }
  function shoppingGift(){const r=ledger.grantShoppingTest();refreshWallet();renderSongs();return r;}
  function ownsSong(sg){return ledger.state.songs.includes(sg.file)||!NBProgression.songs.some(x=>x.id===sg.file);}
  function stopSongPreview(){previewToken++;if(previewSource){try{previewSource.stop();}catch(_){}previewSource=null;}if(previewButton){previewButton.innerHTML=previewIcon('play');previewButton.setAttribute('aria-pressed','false');previewButton=null;}}
  async function previewSong(sg,button){
    if(state!=='ready'||pickingSong)return;
    const same=previewButton===button;stopSongPreview();if(same)return;
    const token=previewToken;previewButton=button;button.innerHTML=previewIcon('loading');
    try{
      await ctx.resume();const buffer=await ctx.decodeAudioData(await loadAudio(sg.file));
      if(token!==previewToken||state!=='ready')return;
      const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;src.connect(gain);gain.connect(buses().song);
      const now=ctx.currentTime,duration=Math.min(15,buffer.duration),offset=Math.min(30,Math.max(0,buffer.duration*.35));
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.8,now+.15);gain.gain.setValueAtTime(.8,now+duration-.4);gain.gain.linearRampToValueAtTime(0,now+duration);
      previewSource=src;button.innerHTML=previewIcon('stop');button.setAttribute('aria-pressed','true');src.start(now,Math.min(offset,buffer.duration-duration),duration);
      src.onended=()=>{src.disconnect();gain.disconnect();if(previewSource===src)stopSongPreview();};
    }catch(_){if(token===previewToken){stopSongPreview();button.innerHTML=previewIcon('retry');button.setAttribute('aria-label',sg.name+'の試聴を再試行');}}
  }
  function chooseSong(sg){
    stopSongPreview();
    pickSong(sg,sg===SONGS[0]?$('homeTutorial'):document.querySelector(`[data-song-file="${sg.file}"]`));
  }
  function renderSongs(){
    const list=$('songList');list.replaceChildren();
    for(const sg of SONGS){
      if(sg===SONGS[0])continue;
      const item=NBProgression.songs.find(x=>x.id===sg.file),owned=ownsSong(sg),progress=ledger.songProgress(sg.file),total=NBProgression.songMissions.length;
      const completed=NBProgression.songMissions.filter(m=>progress.claimed.includes(m.id)||progress[m.stat]>=m.target).length;
      const ratio=completed/total;
      const row=document.createElement('article');row.className='songRow songCard'+(!owned?' isLocked':'');
      const b=document.createElement('button');b.className='songBtn'+(!owned?' lockedSong':'');b.dataset.songFile=sg.file;
      b.innerHTML=`<span class="songTitle">${!owned?'<span class="chainMark" aria-label="未解放">⛓</span>':''}${escape(sg.name)}</span><small class="songUnlock">${owned?'プレイする ›':(item.rank?'ランク'+item.rank+'で解放<br>または ':'')+'💎 '+item.price+' で解放'}</small>`;
      b.addEventListener('click',()=>{
        if(state!=='ready'||pickingSong)return;stopSongPreview();
        if(ownsSong(sg)){chooseSong(sg);return;}
        if(b.dataset.confirm!=='yes'){b.dataset.confirm='yes';b.querySelector('.songUnlock').textContent=`💎 ${item.price} を使って解放する`;return;}
        const result=ledger.purchase('songs',sg.file);if(result.ok){NBSound.play('unlock');refreshWallet();renderSongs();}else b.querySelector('.songUnlock').textContent=result.reason==='funds'?'ダイヤが足りません':ledger.error;
      });row.appendChild(b);
      const preview=document.createElement('button');preview.className='songPreview';preview.innerHTML=previewIcon('play');preview.setAttribute('aria-label',sg.name+'を試聴');preview.setAttribute('aria-pressed','false');preview.addEventListener('click',()=>previewSong(sg,preview));row.appendChild(preview);
      const gauge=document.createElement('button');gauge.type='button';gauge.className='songMission';gauge.setAttribute('aria-label',sg.name+'のミッション詳細を見る');gauge.innerHTML=`<span>ミッション達成率 <b>${Math.round(ratio*100)}% <span aria-hidden="true">›</span></b></span><progress max="${total}" value="${completed}" aria-label="${escape(sg.name)}のミッション達成率"></progress>`;gauge.onclick=()=>openSongMissions(sg.file);row.append(gauge);list.append(row);
    }
    const upload=document.createElement('button');upload.className='songBtn';upload.innerHTML='<span>📁 自分の曲をえらぶ</span><small>この端末から</small>';upload.addEventListener('click',()=>{stopSongPreview();if(state==='ready'&&!pickingSong)myFile.click();});list.append(upload);
  }
  function heroLabel(id){const item=NBProgression.heroes.find(h=>h.id===id);return ledger.state.heroes.includes(id)?'このキャラで遊ぶ':`💎 ${item.price} で解放`;}
  function selectHero(id,button){
    if(ledger.state.heroes.includes(id))return true;
    const item=NBProgression.heroes.find(h=>h.id===id);
    if(button.dataset.confirm!==id){button.dataset.confirm=id;button.textContent=`💎 ${item.price} を使って解放する`;return false;}
    const result=ledger.purchase('heroes',id);refreshWallet();if(!result.ok){button.textContent=result.reason==='funds'?'ダイヤが足りません':ledger.error;return false;}NBSound.play('unlock');return true;
  }
  function ownedHero(id){return ledger.state.heroes.includes(id);}
  function flush() { if (ledger) { ledger.flush(); refreshWallet(); } }
  return {refreshWallet,openRank,shoppingGift,openPanel,specialStageMarkup,tick,ownsSong,renderSongs,stopSongPreview,heroLabel,selectHero,ownedHero,init, resetRun, suspendRun, nextCourse, judged, steps, rush, finish, palette, drawAtmosphere, style,setGemStyle,initGemStyles,prepareNote,destroyed,drawGemHint,drawGemDrops,resultMarkup, decorateResult, animateResult, finishReveal, paintScore, flush, clearToasts};
})();
