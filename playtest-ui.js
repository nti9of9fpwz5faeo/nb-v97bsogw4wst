/* One tap arms the next ordinary song; records remain on this device until explicitly shared. */
window.NBMeasure=(()=>{
  'use strict';
  const KEY='neon-blade-play-records-v1';let armed=false,current=null,records=[],shown=null,saveFailed=false;
  try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data))records=data.filter(r=>r?.kind==='neon-blade-playtest').slice(-5);}catch(_){}
  const active=()=>!!current&&!current.done;
  const pending=()=>armed||active();
  const $=id=>document.getElementById(id);
  function refresh(){
    if($('measureNotice'))$('measureNotice').hidden=!armed;
    if($('measureLast'))$('measureLast').disabled=!records.length;
  }
  function arm(){armed=true;refresh();}
  function start(){
    if(!armed||isTutorial())return;
    armed=false;current=NBPlaytest.create({id:globalThis.crypto?.randomUUID?.()||String(Date.now()),createdAt:new Date().toISOString(),appVersion:APP_VERSION,
      song:{name:song.name,file:song.local?'local-audio':song.file,bpm:song.bpm,chartVersion:activeChart?.chartVersion??null,fixedChart:!!chartNotes()},
      mode:playMode,difficulty,hero:selectedHero,rushRelease,timingMs,seed:spawnSeed,coursePattern});refresh();
  }
  function tick(t,rebase=false,bonus=0){
    if(!active())return;
    NBPlaytest.observe(current,{player:rushAnim?playerVis(t):player.idx,snapshot:NBChase.sample(player.idx,notes,moveLocked,gIdx),time:t,rush:!!rushAnim,rebase,bonus});
  }
  function finish(result={},interrupted=false){
    if(!active())return null;
    const report=NBPlaytest.finish(current,{completed:!interrupted,outcome:interrupted?'interrupted':result.clear?'clear':'game-over',endReason:interrupted?'user-stopped':endReason,
      judgments:{...(result.counts||counts)},maxCombo:result.maxCombo??maxCombo,hp:result.hp??Math.max(0,hp),score:result.score??null});
    records=[...records,report].slice(-5);saveFailed=false;
    try{localStorage.setItem(KEY,JSON.stringify(records));}catch(_){saveFailed=true;}
    refresh();return report;
  }
  function interrupt(){if(active()){tick(songTime());finish({},true);}}
  function summary(r){
    return [`ネオンブレード プレイ記録 ${r.appVersion}`,`曲：${r.song.name}`,`モード：${({distance:'1曲チャレンジ',endless:'エンドレス'})[r.mode]||r.mode} ／ 難易度：${r.difficulty==='normal'?'通常':r.difficulty==='hard'?'ハード':r.difficulty}`,
      `結果：${r.completed?(r.outcome==='clear'?'完走':'ゲームオーバー'):'途中までの記録'}`,`計測時間：${r.seconds.toFixed(1)}秒`,
      `進むチャンス：${r.opportunities}マス ／ 活かした：${r.taken} ／ 逃した：${r.missed}`,
      `チャンスの活用率：${r.usagePercent===null?'算出できる記録なし':r.usagePercent+'%'}`,
      `前進：${r.normalSteps}マス（うち紫ノーツ ${r.purpleSteps}マス）`,
      `必殺技：${r.rushes}回 ／ ${r.rushSteps}マス`,
      `連続で逃した最多：${r.maxConsecutiveMissed}マス ／ ワープ：${r.warps}回`,
      `判定：PERFECT ${r.judgments.PERFECT||0}・GREAT ${r.judgments.GREAT||0}・GOOD ${r.judgments.GOOD||0}・MISS ${r.judgments.MISS||0}`,
      `最大コンボ：${r.maxCombo}`,`20チャンスごとの取りこぼし：${r.sections.map(s=>s.missed+'/'+s.opportunities).join('、')||'まだなし'}`,
      r.interpretation].join('\n');
  }
  function show(report=records.at(-1)){
    if(!report)return;shown=report;
    const history=$('measureHistory');history.replaceChildren();for(const r of [...records].reverse()){const option=document.createElement('option');option.value=r.id;option.textContent=new Date(r.createdAt).toLocaleString('ja-JP')+' '+r.song.name;history.append(option);}history.value=report.id;
    $('measureText').textContent=summary(report);
    $('measureQuality').textContent=report.opportunities<20?'今回は進むチャンスの記録が少なめ。もう1曲分あると比較しやすくなります。':'この記録を送ってくれれば、速度と取りこぼしの傾向を一緒に確認できます。';
    $('measureSave').textContent=saveFailed?'端末への保存に失敗しました。閉じる前に共有・保存してください。':'直近5回分をこの端末に保存しています。';
    $('measureShareStatus').textContent='';$('measureCopyText').hidden=true;$('measureOv').classList.remove('hide');$('measureClose').focus();
  }
  function payload(ext){
    const name='neon-playtest-'+shown.createdAt.replace(/[:.]/g,'-')+'.'+ext;
    return new File([ext==='json'?JSON.stringify(shown,null,2):summary(shown)],name,{type:ext==='json'?'application/json':'text/plain;charset=utf-8'});
  }
  function download(ext='json'){
    if(!shown)return;const file=payload(ext),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('measureShareStatus').textContent='保存したファイルを、このチャットに添付してください。';
  }
  async function share(){
    if(!shown)return;const file=payload('json');
    if(navigator.canShare?.({files:[file]})&&navigator.share){try{await navigator.share({files:[file],title:'ネオンブレードのプレイ記録'});}catch(e){if(e.name!=='AbortError'){$('measureShareStatus').textContent='共有できませんでした。「JSONを保存」を使ってください。';}}}
    else download();
  }
  function decorate(result,ov){
    let b=ov.querySelector('[data-measure-result]');
    if(!b){b=document.createElement('button');b.className='measureResultButton';b.dataset.measureResult='';ov.querySelector('.resultActions').before(b);}
    b.hidden=!result.measurement;b.textContent='プレイ記録を見る・渡す';b.onclick=()=>{finishResultReveal();show(result.measurement);};
  }
  function init(){
    $('page-home').insertAdjacentHTML('beforeend','<section class="measureEntry"><button id="measureStart">1曲遊んで記録する ›</button><p>数値調整なし。いつもどおり遊ぶだけ。</p><button id="measureLast" class="measureSecondary">前回の記録を見る</button></section>');
    $('page-songs').insertAdjacentHTML('afterbegin','<div id="measureNotice" class="measureNotice" hidden>次の1曲を記録します。好きな曲を選んでね。<button id="measureCancel">やめる</button></div>');
    document.body.insertAdjacentHTML('beforeend','<div class="overlay hide" id="measureOv" role="dialog" aria-modal="true" aria-labelledby="measureTitle"><div class="measurePanel"><button id="measureClose" class="measureSecondary">閉じる</button><h2 id="measureTitle">いつものプレイの記録</h2><p id="measureQuality"></p><pre id="measureText"></pre><p id="measureSave"></p><div class="measureActions"><button id="measureShare">記録を共有</button><button id="measureJson">JSONを保存</button><button id="measureTxt">TXTを保存</button><button id="measureCopy">結果をコピー</button></div><p id="measureShareStatus" role="status"></p><textarea id="measureCopyText" readonly hidden aria-label="コピーする記録"></textarea><button id="measureAgain" class="measureSecondary">もう1曲記録する</button></div></div>');
    $('measureTitle').insertAdjacentHTML('afterend','<label for="measureHistory">保存した記録</label><select id="measureHistory"></select>');
    $('measureHistory').onchange=()=>show(records.find(r=>r.id===$('measureHistory').value));
    $('hunterTestOpen').before(document.querySelector('.measureEntry'));
    const choose=()=>{
      $('measureOv').classList.add('hide');
      if(state!=='ready')returnToSongs();
      // Remove the previous manual tuning and full-ultimate start from this ordinary run.
      raceSettings.type='auto';raceSettings.full=false;saveRaceSettings();
      document.querySelectorAll('[data-race-type]').forEach(e=>e.value='auto');document.querySelectorAll('[data-race-full]').forEach(e=>{e.checked=false;e.disabled=true;});document.querySelectorAll('.raceTuning').forEach(e=>e.disabled=true);
      playMode='distance';endless=true;updateModeUI();document.querySelectorAll('[data-song-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.songMode==='distance')));
      arm();NBMenu.show('songs');
    };
    $('measureStart').onclick=choose;$('measureAgain').onclick=choose;$('measureLast').onclick=()=>show();
    $('measureCancel').onclick=()=>{armed=false;refresh();};$('measureClose').onclick=()=>$('measureOv').classList.add('hide');
    $('measureJson').onclick=()=>download();$('measureTxt').onclick=()=>download('txt');$('measureShare').onclick=share;
    $('measureCopy').onclick=async()=>{if(!shown)return;try{await navigator.clipboard.writeText(summary(shown));$('measureShareStatus').textContent='コピーしました。このチャットに貼り付けてください。';}catch(_){const e=$('measureCopyText');e.hidden=false;e.value=summary(shown);e.focus();e.select();$('measureShareStatus').textContent='表示された記録を長押ししてコピーしてください。';}};
    $('measureOv').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();$('measureOv').classList.add('hide');}});refresh();
  }
  return {active,pending,arm,start,tick,finish,interrupt,init,decorate,show,summary,warp:()=>NBPlaytest.warp(current),purple:()=>NBPlaytest.purple(current)};
})();
