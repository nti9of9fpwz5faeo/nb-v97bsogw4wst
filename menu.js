/* Mobile menu shell. Gameplay keeps its own overlays and never shows bottom navigation. */
window.NBMenu=(()=>{
  const $=id=>document.getElementById(id);
  const icons={songs:'<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',heroes:'<path d="M5 5h14v9l-7 7-7-7zM8 10h2m4 0h2"/>',shop:'<path d="M3 8h18l-2-5H5zM5 8v13h14V8M9 21v-7h6v7"/>',missions:'<path d="M6 4h12v17H6zM9 2h6v4H9zM9 11l2 2 4-4m-6 8h6"/>',settings:'<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>'};
  let initialized=false,current='home';
  function icon(id){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</svg>`;}
  function show(page){
    if(!initialized||!['ready','loading'].includes(state)||pickingSong)return;
    NBWorkshop.stopSongPreview();if(typeof stopPreviewSE==='function')stopPreviewSE();
    current=page;document.body.classList.remove('inGame');
    ['heroOv','collectionOv'].forEach(id=>$(id).classList.add('hide'));
    $('startOv').classList.remove('hide');
    document.querySelectorAll('.menuPage').forEach(el=>el.hidden=el.id!=='page-'+page);
    $('menuBack').hidden=page==='home';
    $('menuTitle').textContent={home:'NEON BLADE',songs:'曲一覧',settings:'設定',special:'特別ステージ'}[page]||'NEON BLADE';
    $('heroOpen').hidden=page!=='home';
    $('startOv').scrollTop=0;
    document.querySelectorAll('[data-nav]').forEach(b=>b.setAttribute('aria-current',b.dataset.nav===(page==='special'?'home':page)?'page':'false'));
    if(page==='heroes'){$('startOv').classList.add('hide');previewCharacter(selectedHero);$('heroOv').classList.remove('hide');}
    if(page==='shop'||page==='missions'){$('startOv').classList.add('hide');NBWorkshop.openPanel(page);}
    if(page==='songs')NBWorkshop.renderSongs();
  }
  function init(){
    const root=$('startOv');
    document.addEventListener('click',e=>{const b=e.target.closest('button');if(b&&!b.disabled&&!b.closest('#controls')&&!b.hasAttribute('data-play'))NBSound.play('tap');},true);
    root.classList.add('menuShell');
    root.querySelector('.eyebrow').remove();root.querySelector('h1').remove();
    root.querySelectorAll(':scope > p:not([id]):not([class])').forEach(el=>el.remove());
    root.insertAdjacentHTML('afterbegin','<header class="menuHeader"><button id="menuBack" aria-label="ホームへ戻る" hidden>‹</button><h1 id="menuTitle">NEON BLADE</h1><span class="menuWallet"><img src="img/gems/novice.webp" alt="ダイヤ"><b data-wallet>0</b></span></header>');
    root.insertAdjacentHTML('beforeend','<main class="menuPage" id="page-home"><p class="homeLead">リズムを斬って、その先へ。</p><div id="homeModes"></div><button id="specialMode" class="modeCard special"><span>✦</span><div><strong>特別ステージ</strong><small>特別な景色と演出を楽しむ</small></div><b>›</b></button><button id="homeTutorial" class="tutorialLink">操作を練習する <span>›</span></button></main><main class="menuPage" id="page-songs" hidden></main><main class="menuPage" id="page-settings" hidden><p class="pageIntro">自分に合った音とタイミングに。</p></main><main class="menuPage" id="page-special" hidden><div class="specialHero">✦</div><h2>音楽と景色が、一つになる。</h2><p>曲ごとに作り込まれた、特別なコース。</p><div id="specialCatalog"></div></main>');
    ['songList','myFile','myPanel','loadTxt'].forEach(id=>$('page-songs').append($(id)));
    ['timingSettings','soundSettings','diagSettings'].forEach(id=>$('page-settings').append($(id)));
    $('difficultyPicker')?.remove();$('modeDesc').hidden=true;$('modePicker').remove();$('rushPicker').hidden=true;
    $('homeModes').innerHTML='<button class="modeCard distance" id="homeSongs"><span>♫</span><div><strong>曲を選んで遊ぶ</strong><small>1曲チャレンジ / エンドレス</small></div><b>›</b></button>';
    $('homeSongs').onclick=()=>show('songs');
    $('specialCatalog').innerHTML=NBWorkshop.specialStageMarkup();
    const bar=root.querySelector('.collectionBar');if(bar)bar.hidden=true;
    document.body.insertAdjacentHTML('beforeend',`<nav id="bottomNav" aria-label="メインナビゲーション">${[['home','ホーム'],['songs','曲'],['shop','ショップ'],['missions','ミッション'],['settings','設定']].map(([id,label])=>`<button data-nav="${id}" aria-current="false">${icon(id)}<span>${label}</span></button>`).join('')}</nav>`);
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.nav)));
    $('menuBack').addEventListener('click',()=>show('home'));
    $('specialMode').addEventListener('click',()=>show('special'));
    $('homeTutorial').disabled=true;$('homeTutorial').addEventListener('click',()=>{show('songs');if(state==='ready')pickSong(SONGS[0],$('homeTutorial'));});
    initialized=true;show('home');
  }
  function ready(){
    document.querySelectorAll('#homeModes button').forEach(b=>b.disabled=false);$('homeTutorial').disabled=false;
    const hash=new URLSearchParams(location.hash.slice(1));
    if(hash.get('gift')==='kurumin-v56-shopping'){
      const r=NBWorkshop.shoppingGift();
      if(r.ok){$('homeLeadGift')?.remove();$('page-home').insertAdjacentHTML('afterbegin',`<p id="homeLeadGift" class="giftNotice" role="status">${r.amount?'テスト用 100,000 ダイヤを受け取りました':'テスト用ダイヤは受け取り済みです'}</p>`);}
      else $('page-home').insertAdjacentHTML('afterbegin','<p class="giftNotice" role="alert">ダイヤを保存できませんでした。保存を許可してから再読み込みしてください。</p>');
    }
  }
  function playing(){document.body.classList.add('inGame');}
  return {init,show,ready,playing};
})();
