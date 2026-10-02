/* v62: pursuit announcements and openly accessible playtest controls. */
let raceIntro=null,raceResult=null,racePauseKind=null;
const raceSettings={type:'auto',skip:false,full:false};
function raceBeat(t){const n=nearestBeat(t),at=beatTime(n);return t>=at?n+(t-at)/Math.max(.001,beatTime(n+1)-at):n-1+(t-beatTime(n-1))/Math.max(.001,at-beatTime(n-1));}
function raceCaption(eyebrow,title,detail,ready=false){
  const el=document.getElementById('raceCaption');el.hidden=false;el.classList.toggle('ready',ready);
  el.querySelector('small').textContent=eyebrow;el.querySelector('strong').textContent=title;el.querySelector('span').textContent=detail;
}
function clearRacePresentation(){
  raceIntro=null;raceResult=null;racePauseKind=null;
  document.getElementById('fieldWrap')?.classList.remove('raceCinema');
  for(const id of ['raceCaption','raceSkip','raceStatus']){const el=document.getElementById(id);if(el)el.hidden=true;}
  if(songGain&&ctx){songGain.gain.cancelScheduledValues(ctx.currentTime);songGain.gain.setValueAtTime(1,ctx.currentTime);}
}
function showHunterArrival(n){
  if(!raceSettings.skip){raceResult={until:songTime()+1.8,text:n.type.name+'の忍者が出現！ 追いついてダイヤを奪え',color:n.type.color};uiTone(880,.08);}
}
function startRaceEvent(){
  if(isTutorial()||state!=='play'||player.idx!==0)return false;
  clearRacePresentation();
  const previous=NBWorkshop.race();
  const n=NBWorkshop.beginRace(raceSettings.type==='auto'?null:raceSettings.type);
  if(n&&n!==previous&&n.phase==='chase')showHunterArrival(n);
  if(n&&raceSettings.type!=='auto'&&raceSettings.full)rushUnits=RUSH_FULL;
  return false; // Music, notes and controls keep their normal start timing.
}
function skipRaceIntro(){}
function updateRaceIntro(){}
function drawRaceIntro(){return false;}
function showRaceResult(won,reward,color){
  raceResult={until:songTime()+1.5,text:won?'ダイヤ獲得！ ◆ ＋'+reward:'忍者が逃げ切った！',color};
}
function drawRaceStatus(t){
  const el=document.getElementById('raceStatus'),n=NBWorkshop.race();
  let text='',color='#fff';
  if(raceResult&&t<raceResult.until){text=raceResult.text;color=raceResult.color;}
  else if(n&&!n.done&&n.phase==='chase'){text=n.type.name+'　残りチャンス '+n.remaining+' マス';color=n.type.color;}
  el.hidden=!text;if(text){el.textContent=text;el.style.color=color;}
}
function initRaceControls(){
  document.getElementById('fieldWrap').insertAdjacentHTML('beforeend','<div id="raceCaption" hidden role="status"><small></small><strong></strong><span></span></div><button id="raceSkip" hidden type="button">演出をスキップ ›</button><div id="raceStatus" hidden role="status"></div>');
  document.getElementById('raceSkip').addEventListener('click',skipRaceIntro);
  const options='<option value="auto">通常（ランダム）</option><option value="off">イベントなし</option>'+NBChase.types.map(r=>`<option value="${r.id}">${r.name}ハンター</option>`).join('');
  const markup=(pause)=>`<details class="raceTest" ${pause?'':'open'}><summary>ダイヤハンターをテスト</summary><label>出現する相手<select data-race-type aria-label="出現するハンター">${options}</select></label><label>登場通知を省略<input type="checkbox" data-race-skip></label><label>必殺技を満タンで開始<input type="checkbox" data-race-full></label><p>相手を選ぶと、開始時に登場。追跡中はワープしても残りチャンスを引き継ぎます。${pause?'変更は再スタートか次のワープから反映。':'好きな曲を選んで試せます。'}「通常」でランダム出現に戻ります。</p><button type="button" ${pause?'data-race-retry':'data-race-songs'}>${pause?'この相手で最初から':'曲を選んでテスト'}</button></details>`;
  document.getElementById('page-settings').insertAdjacentHTML('beforeend',markup(false));
  document.querySelector('#pauseOv .pausePanel').insertAdjacentHTML('beforeend',markup(true));
  document.getElementById('page-home').insertAdjacentHTML('beforeend','<button class="hunterTestLink" id="hunterTestOpen">ダイヤハンターをテスト ›</button>');
  const sync=()=>{
    document.querySelectorAll('[data-race-type]').forEach(e=>e.value=raceSettings.type);
    document.querySelectorAll('[data-race-skip]').forEach(e=>e.checked=raceSettings.skip);
    document.querySelectorAll('[data-race-full]').forEach(e=>{e.checked=raceSettings.full;e.disabled=['auto','off'].includes(raceSettings.type);});
  };
  document.querySelectorAll('[data-race-type]').forEach(e=>e.onchange=()=>{raceSettings.type=e.value;sync();});
  document.querySelectorAll('[data-race-skip]').forEach(e=>e.onchange=()=>{raceSettings.skip=e.checked;sync();});
  document.querySelectorAll('[data-race-full]').forEach(e=>e.onchange=()=>{raceSettings.full=e.checked;sync();});
  document.querySelector('[data-race-retry]').onclick=startGame;
  document.querySelector('[data-race-songs]').onclick=()=>NBMenu.show('songs');
  document.getElementById('hunterTestOpen').onclick=()=>{NBMenu.show('settings');document.querySelector('#page-settings .raceTest').scrollIntoView({block:'start'});};
  sync();
}
