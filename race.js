/* v61: course-entry cinematics and test controls. All timing follows songTime(). */
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
function startRaceEvent(){
  if(isTutorial()||state!=='play'||player.idx!==0)return false;
  clearRacePresentation();
  // Do not consume the end of a song with a natural event introduction.
  if(raceSettings.type==='auto'&&songBuf.duration/rate-songTime()<10)return false;
  const n=NBWorkshop.beginRace(raceSettings.type==='auto'?null:raceSettings.type);
  if(!n)return false;
  stopMoveScheduler();stopRushHold();earlyInput=null;pendingCheck=[];notes=[];hideJudge();texts=[];
  moveLocked=true;setLockUI(true);rushAnim=null;rushFade=null;rushGuardUntil=-9;hurtGuardUntil=-9;
  if(raceSettings.type!=='auto'&&raceSettings.full)rushUnits=RUSH_FULL;
  document.getElementById('fieldWrap').classList.add('raceCinema');
  state='huntIntro';raceIntro={at:songTime(),stage:'',countAt:null,goAt:null,lastCount:null};
  document.querySelectorAll('#controls button').forEach(b=>{b.disabled=true;b.classList.remove('press');});
  document.getElementById('raceSkip').hidden=false;
  songGain?.gain.setTargetAtTime(.62,ctx.currentTime,.06);
  if(raceSettings.skip)skipRaceIntro();
  return true;
}
function skipRaceIntro(){
  if(state!=='huntIntro'||!raceIntro)return;
  // Even a skipped cinematic returns to the player before its musical count-in.
  raceIntro.at=songTime()-2.25;raceIntro.stage='';raceIntro.countAt=null;raceIntro.goAt=null;
  document.getElementById('raceSkip').hidden=true;
}
function updateRaceIntro(t){
  if(!raceIntro||state!=='huntIntro')return;
  if(t>=songBuf.duration/rate){finishRaceIntro(t);return;}
  const a=t-raceIntro.at,stage=a<.3?'notice':a<1.2?'prize':a<2.25?'hunter':a<2.65?'return':'count';
  if(stage!==raceIntro.stage){
    raceIntro.stage=stage;
    const n=NBWorkshop.race();
    if(stage==='notice'){raceCaption('CHANCE','ダイヤ争奪戦','中央のダイヤを先に取れ！');uiTone(660,.07);}
    if(stage==='prize'){raceCaption('TARGET','◆ '+n.type.reward,'中央のダイヤを先に取れ！');uiTone(1046,.09);}
    if(stage==='hunter'){raceCaption('RIVAL',n.type.name+'ハンター',n.type.id==='divine'?'歩行 ＋ 予告つきドロン':'ゴールからダイヤへ向かってくる');uiTone(n.type.id==='divine'?220:330,.1);}
    if(stage==='return')raceCaption('READY','位置について','最初のブレイクで競争開始');
    if(stage==='count'){
      const b=Math.ceil(raceBeat(t));raceIntro.countAt=b;raceIntro.goAt=beatTime(b+3);
      document.getElementById('raceSkip').hidden=true;
    }
  }
  if(stage==='count'){
    const count=Math.min(3,Math.max(0,Math.ceil(raceIntro.countAt+3-raceBeat(t)-1e-6)));
    if(count!==raceIntro.lastCount){raceIntro.lastCount=count;raceCaption('READY',count?String(count):'GO!','最初のブレイクで競争開始',true);uiTone(count?660:1046,.06);}
    if(t>=raceIntro.goAt)finishRaceIntro(t);
  }
}
function finishRaceIntro(t){
  if(!raceIntro)return;
  raceIntro=null;document.getElementById('fieldWrap').classList.remove('raceCinema');state='play';resumePerf=performance.now();
  const n=NBWorkshop.race();if(n)n.phase='ready';
  cameraRow=0;cameraFrom=0;cameraTarget=0;cameraAt=-9;
  // BGM never seeks. Skip only beats covered by the cinematic; no catch-up damage.
  nextBeat=Math.max(INTRO_BEATS,Math.floor(raceBeat(t))+1);acted=nextBeat-1;pendingCheck=[];earlyInput=null;recentHits=[];
  notes=[{id:noteId++,idx:FIRST_GAP,from:FIRST_GAP,at:t,pop:t,hp:1,purple:false}];
  player.at=t;player.from=0;charState='idle';charUntil=t;
  document.getElementById('raceCaption').hidden=true;document.getElementById('raceSkip').hidden=true;
  document.querySelectorAll('#controls button').forEach(b=>b.disabled=false);
  songGain?.gain.setTargetAtTime(1,ctx.currentTime,.08);
  startMoveScheduler();
}
function drawRaceIntro(t){
  if(!raceIntro)return false;
  const n=NBWorkshop.race();if(!n)return false;
  const stage=raceIntro.stage,focus=stage==='prize'?n.target:stage==='hunter'?GOAL_INDEX:0;
  const reveal=revealEnd,from=revealFrom;
  cameraRow=Math.max(0,Math.min(ROWS-VIEW_ROWS,path[Math.floor(focus)].r-VIEW_ROWS*.6));
  revealEnd=EXIT_INDEX;revealFrom=EXIT_INDEX;
  const p=cellXY(focus),zoom=['prize','hunter'].includes(stage)?1.65:1;
  g.save();
  if(zoom>1){g.translate(boardW*.5-p.x*zoom,boardH*.64-p.y*zoom);g.scale(zoom,zoom);}
  g.globalAlpha=.65;drawCourse(t);g.globalAlpha=1;
  const radius=cell*2.2;
  // A soft spotlight and pool link the close-up to the actual tile.
  if(stage==='prize'||stage==='hunter'){
    const beam=g.createLinearGradient(p.x,0,p.x,p.y+cell*.4);beam.addColorStop(0,'#fff5cf00');beam.addColorStop(1,'#fff5cf44');
    g.fillStyle=beam;g.beginPath();g.moveTo(p.x-cell*.15,0);g.lineTo(p.x+cell*.15,0);g.lineTo(p.x+cell*.7,p.y+cell*.25);g.lineTo(p.x-cell*.7,p.y+cell*.25);g.closePath();g.fill();
    g.strokeStyle=n.type.color;g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y+cell*.25,cell*.65,cell*.18,0,0,Math.PI*2);g.stroke();
  }
  NBWorkshop.drawTile(t,true);drawChar(t);g.restore();
  // Very short dip between shots; reduced-motion uses static cuts, never a pan.
  const starts={notice:0,prize:.3,hunter:1.2,return:2.25};
  const age=t-raceIntro.at-(starts[stage]??-10);
  if(!reduceMotion.matches&&age>=0&&age<.14){g.fillStyle=`rgba(5,17,35,${.65*(1-age/.14)})`;g.fillRect(0,0,boardW,boardH);}
  revealEnd=reveal;revealFrom=from;
  document.getElementById('beatWash').style.opacity='0';cv.style.transform='';return true;
}
function showRaceResult(won,reward,color){
  raceResult={until:songTime()+1.5,text:won?'ダイヤ獲得！ ◆ ＋'+reward:'ハンターが獲得',color};
}
function drawRaceStatus(t){
  const el=document.getElementById('raceStatus'),n=NBWorkshop.race();
  let text='',color='#fff';
  if(raceResult&&t<raceResult.until){text=raceResult.text;color=raceResult.color;}
  else if(n&&!n.done&&n.warning){text='神級がドロンする！';color=n.type.color;}
  el.hidden=!text;if(text){el.textContent=text;el.style.color=color;}
}
function initRaceControls(){
  document.getElementById('fieldWrap').insertAdjacentHTML('beforeend','<div id="raceCaption" hidden role="status"><small></small><strong></strong><span></span></div><button id="raceSkip" hidden type="button">演出をスキップ ›</button><div id="raceStatus" hidden role="status"></div>');
  document.getElementById('raceSkip').addEventListener('click',skipRaceIntro);
  const options='<option value="auto">通常（ランダム）</option><option value="off">イベントなし</option>'+NBChase.types.map(r=>`<option value="${r.id}">${r.name}ハンター</option>`).join('');
  const markup=(pause)=>`<details class="raceTest" ${pause?'':'open'}><summary>ダイヤハンターをテスト</summary><label>出現する相手<select data-race-type aria-label="出現するハンター">${options}</select></label><label>登場演出を省略<input type="checkbox" data-race-skip></label><label>必殺技を満タンで開始<input type="checkbox" data-race-full></label><p>相手を選ぶと、開始時・ワープ後に毎回登場。${pause?'変更は再スタートか次のワープから反映。':'好きな曲を選んで試せます。'}「通常」でランダム出現に戻ります。</p><button type="button" ${pause?'data-race-retry':'data-race-songs'}>${pause?'この相手で最初から':'曲を選んでテスト'}</button></details>`;
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
