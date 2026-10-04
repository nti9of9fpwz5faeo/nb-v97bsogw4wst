/* History is shown only from Settings; nothing is added to the play field. */
window.NBTimingHistoryUI=(()=>{
  'use strict';
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ms=v=>v==null?'—':(v>0?'+':'')+v+' ms';
  let selected=null,records=[],pending=()=>[],flush=async()=>{};
  function renderRecord(){
    $('historyCopy').disabled=$('historySave').disabled=!selected;
    if(!selected){$('historyBody').textContent='まだ記録がありません。プレイ終了時に自動で保存されます。';return;}
    const r=selected,s=r.summary,modes={distance:'1曲チャレンジ',endless:'エンドレス',normal:'通常'},ends={clear:'クリア',game_over:'ゲームオーバー',quit:'途中終了',retry:'やり直し',tutorial_complete:'練習終了',interrupted:'中断'};
    $('historyBody').innerHTML=`<h3>${esc(r.song.name)}</h3><p>${esc(new Date(r.createdAt).toLocaleString('ja-JP'))}／${esc(r.appVersion)}<br>${esc(modes[r.mode]||r.mode)}／${esc(ends[r.endReason]||r.endReason)}／速度 ${r.playbackRates.map(v=>'×'+esc(v)).join('・')}<br>BPM ${esc(r.baseBpm)}／開始 ${esc(r.firstBeatSeconds)}秒<br>曲別補正 ${ms(r.songCorrectionMs)}／端末の判定補正 ${ms(r.timingMs)}</p>
      <table><tr><th>PERFECT</th><th>GREAT</th><th>GOOD</th><th>MISS</th></tr><tr>${['PERFECT','GREAT','GOOD','MISS'].map(k=>'<td>'+s.counts[k]+'</td>').join('')}</tr></table>
      <p>平均 ${ms(s.meanMs)}／中央値 ${ms(s.medianMs)}<br>FAST ${s.FAST}回／SLOW ${s.SLOW}回／一致 ${s.EXACT}回</p>
      <h3>曲の30秒ごとのズレ</h3><table><tr><th>再生回・区間</th><th>入力数</th><th>平均</th></tr>${r.by30Seconds.map(g=>`<tr><td>${g.pass}回目 ${g.startSeconds}〜${g.endSeconds}秒</td><td>${g.n}</td><td>${ms(g.meanMs)}</td></tr>`).join('')||'<tr><td colspan="3">判定された入力がありません</td></tr>'}</table><p class="diagNote">負の値はFAST、正の値はSLOWです。入力MISSを含めて集計します。入力のないMISSと判定対象外の操作は、ズレの平均に含めません。速度が変わる場合、各入力のBPMと速度はJSONで確認できます。</p>`;
  }
  function choose(id){selected=records.find(r=>r.id===id)||null;renderRecord();document.querySelectorAll('[data-history-id]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.historyId===id)));}
  async function open(){
    $('historyOv').classList.remove('hide');$('historyMsg').textContent='読み込み中…';
    try{await flush();records=await NBTimingHistory.list();$('historyMsg').textContent='';}
    catch(e){records=[];$('historyMsg').textContent='端末の記録を読み込めませんでした。';}
    const unsaved=pending();
    for(const r of unsaved){records=records.filter(v=>v.id!==r.id);records.unshift(r);}
    if(unsaved.length)$('historyMsg').textContent='保存できなかった記録があります。この画面を閉じる前にJSONを保存してください。';
    records.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    $('historyList').innerHTML=records.map(r=>`<button type="button" data-history-id="${esc(r.id)}" aria-pressed="false">${esc(r.song.name)}<small>${esc(new Date(r.createdAt).toLocaleString('ja-JP'))} ・ ${esc(r.appVersion)}</small></button>`).join('');
    choose(records[0]?.id);$('historyOv').scrollTop=0;$('historyClose').focus();
  }
  async function copy(){
    if(!selected)return;const text=JSON.stringify(selected,null,2);
    try{await navigator.clipboard.writeText(text);$('historyMsg').textContent='JSONをコピーしました。';return;}catch(e){}
    const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;opacity:0';document.body.append(ta);ta.select();
    try{$('historyMsg').textContent=document.execCommand('copy')?'JSONをコピーしました。':'コピーできませんでした。JSONの保存を利用してください。';}catch(e){$('historyMsg').textContent='コピーできませんでした。JSONの保存を利用してください。';}finally{ta.remove();}
  }
  function download(){
    if(!selected)return;
    try{
      const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(selected,null,2)],{type:'application/json'}));
      a.href=url;a.download='neon-blade-diagnosis-'+selected.createdAt.replace(/[:.]/g,'-')+'.json';document.body.append(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},2000);$('historyMsg').textContent='JSONの保存を開始しました。';
    }catch(e){$('historyMsg').textContent='保存できませんでした。JSONのコピーを利用してください。';}
  }
  function init(options){
    pending=options.pending;flush=options.flush;
    $('historyOpen').onclick=open;$('historyClose').onclick=()=>{$('historyOv').classList.add('hide');$('historyOpen').focus();};
    $('historyCopy').onclick=copy;$('historySave').onclick=download;
    $('historyList').onclick=e=>{const b=e.target.closest('[data-history-id]');if(b)choose(b.dataset.historyId);};
  }
  return {init,open};
})();
