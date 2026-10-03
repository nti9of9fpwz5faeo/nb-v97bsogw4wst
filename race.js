/* v63: repeatable novice tuning, with independent speed, distance, loss and starting gap. */
let raceIntro=null,raceResult=null,racePauseKind=null;
const RACE_TEST_KEY='neon-blade-hunter-test-v1';
const raceSettings={balanceVersion:66,type:'auto',skip:false,full:false,values:{...NBChase.testDefaults}};
let raceTestLast=null;
try{
  const saved=JSON.parse(localStorage.getItem(RACE_TEST_KEY)||'null');
  if(saved){
    raceSettings.values=NBChase.normalizeTest(saved.values);
    if(['auto','off','novice-test',...NBChase.types.map(t=>t.id)].includes(saved.type))raceSettings.type=saved.type;
    raceSettings.skip=!!saved.skip;raceSettings.full=!!saved.full;
    if(saved.balanceVersion!==66){raceSettings.type='auto';raceSettings.full=false;}
  }
}catch(_){}
function raceTestActive(){return !NBMeasure.pending()&&raceSettings.type==='novice-test';}
function saveRaceSettings(){try{localStorage.setItem(RACE_TEST_KEY,JSON.stringify(raceSettings));return true;}catch(_){return false;}}
function raceTestSummary(){
  const n=raceTestLast;if(!n)return 'まだ結果はありません';
  return `${n.won?'捕獲成功':n.reason==='missed'?'有効マスを失って逃走':'距離の上限に到達して逃走'}\n自分の前進 ${n.player}マス ／ 相手の移動 ${n.travelled}マス\n失った有効マス ${n.missed} ／ 最後の距離差 ${n.gap}マス\n速さ ${n.values.speed}%・総距離 ${n.values.distance}・失う上限 ${n.values.loss}・開始距離 ${n.values.gap}`;
}
function recordRaceTest(n){
  raceTestLast={won:n.outcome==='won',reason:n.reason,player:Math.round(n.playerTravelled),travelled:n.travelled,missed:n.missed,gap:Math.max(0,Math.round(n.idx-n.lastPlayer)),values:{...n.test}};
  document.querySelectorAll('[data-race-result]').forEach(el=>el.textContent=raceTestSummary());
}
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
  const n=NBWorkshop.beginRace(raceSettings.type==='auto'?null:raceTestActive()?'novice':raceSettings.type);
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
  else if(n&&!n.done&&n.phase==='chase'){text=(n.test?'初級テスト':n.type.name)+'　失ったマス '+n.missed+'/'+n.rules.loss+'　あと '+Math.max(0,Math.ceil(n.idx-player.idx))+'マス';color=n.type.color;}
  el.hidden=!text;if(text){el.textContent=text;el.style.color=color;}
}
function initRaceControls(){
  document.getElementById('fieldWrap').insertAdjacentHTML('beforeend','<div id="raceCaption" hidden role="status"><small></small><strong></strong><span></span></div><button id="raceSkip" hidden type="button">演出をスキップ ›</button><div id="raceStatus" hidden role="status"></div>');
  document.getElementById('raceSkip').addEventListener('click',skipRaceIntro);
  const options='<option value="novice-test">初級（調整テスト）</option><option value="auto">通常（ランダム）</option><option value="off">イベントなし</option>'+NBChase.types.map(r=>`<option value="${r.id}">${r.name}（現行設定）</option>`).join('');
  const fields=[['speed','移動スピード','%','有効マス10マス分に対し、80%なら8マス進みます。'],['distance','逃げる総距離','マス','相手がこの距離を逃げ切る前に捕まえよう。'],['loss','失った有効マスの上限','マス','進めるチャンスを逃した分。上限に達するとアウト。'],['gap','開始時の距離差','マス先','最初にどれだけ先から逃げ始めるか。']];
  const markup=(pause)=>`<details class="raceTest" ${pause?'':'open'}><summary>ダイヤハンターをテスト</summary><label>出現する相手<select data-race-type aria-label="出現するハンター">${options}</select></label><fieldset class="raceTuning"><legend>初級の4項目</legend>${fields.map(([key,title,unit,hint])=>{const [min,max,step]=NBChase.testLimits[key],id='race-'+(pause?'pause':'menu')+'-'+key;return `<div class="raceTuneRow"><label for="${id}">${title}</label><div class="raceStepper"><button type="button" data-race-step="${key}" data-delta="-${step}" aria-label="${title}を下げる">−</button><input id="${id}" data-race-value="${key}" type="number" inputmode="numeric" min="${min}" max="${max}" step="${step}" value="${raceSettings.values[key]}"><span>${unit}</span><button type="button" data-race-step="${key}" data-delta="${step}" aria-label="${title}を上げる">＋</button></div><p>${hint}</p></div>`;}).join('')}<button type="button" data-race-reset>仮の初期値に戻す</button><p>初級はドロンなし。100%以上は通常の前進だけでは追いつきにくくなります。</p></fieldset><label>登場通知を省略<input type="checkbox" data-race-skip></label><label>必殺技を満タンで開始<input type="checkbox" data-race-full></label><p>同じ曲・同じ遊び方なら、初級テストは同じ譜面とコースから始まります。調整は次の再スタートから反映。通常プレイに戻すときは「通常」を選んでください。</p><p data-race-save role="status"></p><button type="button" ${pause?'data-race-retry':'data-race-songs'}>${pause?'この設定で最初から':'曲を選んでテスト'}</button><details class="raceTestResult"><summary>直前のテスト結果</summary><p data-race-result>${raceTestSummary()}</p></details></details>`;
  document.getElementById('page-settings').insertAdjacentHTML('beforeend',markup(false));
  document.querySelector('#pauseOv .pausePanel').insertAdjacentHTML('beforeend',markup(true));
  document.getElementById('page-home').insertAdjacentHTML('beforeend','<button class="hunterTestLink" id="hunterTestOpen">初級ハンターを調整してテスト ›</button>');
  document.getElementById('hunterTestOpen').insertAdjacentHTML('beforebegin','<details class="raceTest hunterGrades"><summary>ハンターの等級を選んで試す</summary><p>相手を選んで、好きな曲で挑戦。プレイ記録も自動で残ります。</p><div class="hunterGradeButtons">'+NBChase.types.map(r=>`<button type="button" data-hunter-grade="${r.id}">${r.name}</button>`).join('')+'</div></details>');
  const sync=()=>{
    document.querySelectorAll('[data-race-type]').forEach(e=>e.value=raceSettings.type);
    document.querySelectorAll('[data-race-skip]').forEach(e=>e.checked=raceSettings.skip);
    document.querySelectorAll('[data-race-full]').forEach(e=>{e.checked=raceSettings.full;e.disabled=['auto','off'].includes(raceSettings.type);});
    document.querySelectorAll('.raceTuning').forEach(e=>e.disabled=!raceTestActive());
    document.querySelectorAll('[data-race-value]').forEach(e=>e.value=raceSettings.values[e.dataset.raceValue]);
  };
  const changed=()=>{sync();const saved=saveRaceSettings();document.querySelectorAll('[data-race-save]').forEach(e=>e.textContent=saved?'設定をこの端末に保存しました':'端末に保存できません。この画面を開いている間は調整できます。');};
  document.querySelectorAll('[data-race-type]').forEach(e=>e.onchange=()=>{raceSettings.type=e.value;changed();});
  document.querySelectorAll('[data-race-skip]').forEach(e=>e.onchange=()=>{raceSettings.skip=e.checked;changed();});
  document.querySelectorAll('[data-race-full]').forEach(e=>e.onchange=()=>{raceSettings.full=e.checked;changed();});
  document.querySelectorAll('[data-race-value]').forEach(e=>e.onchange=()=>{raceSettings.values=NBChase.normalizeTest({...raceSettings.values,[e.dataset.raceValue]:e.value===''?NaN:e.value});changed();});
  document.querySelectorAll('[data-race-step]').forEach(e=>e.onclick=()=>{const key=e.dataset.raceStep;raceSettings.values=NBChase.normalizeTest({...raceSettings.values,[key]:raceSettings.values[key]+Number(e.dataset.delta)});changed();});
  document.querySelectorAll('[data-race-reset]').forEach(e=>e.onclick=()=>{raceSettings.values={...NBChase.testDefaults};changed();});
  document.querySelector('[data-race-retry]').onclick=startGame;
  document.querySelector('[data-race-songs]').onclick=()=>NBMenu.show('songs');
  document.getElementById('hunterTestOpen').onclick=()=>{raceSettings.type='novice-test';changed();NBMenu.show('settings');document.querySelector('#page-settings .raceTest').scrollIntoView({block:'start'});};
  document.querySelectorAll('[data-hunter-grade]').forEach(e=>e.onclick=()=>{raceSettings.type=e.dataset.hunterGrade;raceSettings.full=false;changed();NBMeasure.arm();NBMenu.show('songs');});
  sync();
  saveRaceSettings();
}
