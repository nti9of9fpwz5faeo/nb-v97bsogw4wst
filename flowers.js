/* v67: optional flower harvesting, through the ordinary break/move inputs. */
window.NBFlower = (() => {
  'use strict';
  const KEY='neon-blade-flowers-v1', NEED=2500, DELAY=200, INDEX=14;
  let flower=null, held=false, blocked=false, started=0, last=0, total=0, saveError=false;
  try { const n=Number(localStorage.getItem(KEY)); if(Number.isSafeInteger(n)&&n>=0)total=n; } catch(_){}
  const enabled=()=>!isTutorial();
  const at=()=>!!(enabled()&&flower&&!flower.gone&&!flower.taken&&player?.idx===flower.idx&&!rushAnim);
  const blocksRush=()=>at()||blocked;
  function wallet(){document.querySelectorAll('[data-flower-total]').forEach(e=>e.textContent=String(total));}
  function reset(){release();flower=enabled()?{idx:INDEX,progress:0,taken:false,gone:false,earned:0}:null;}
  function begin(){if(state!=='play'||!at())return false;held=true;blocked=true;started=last=performance.now();return true;}
  function release(){held=false;blocked=false;started=last=0;}
  function moved(){if(flower&&!at()&&!flower.taken){flower.progress=0;held=false;}paintControl();}
  function nextCourse(){release();if(flower){flower.gone=true;flower.progress=0;}paintControl();}
  function paintControl(){
    const on=at()&&state==='play', button=document.getElementById('bBreak'), cue=document.getElementById('flowerHoldHint');
    button?.classList.toggle('flowerHold',on);button?.classList.toggle('flowerHolding',on&&held);
    if(cue)cue.hidden=!on;
  }
  function tick(){
    if(state!=='play'||hp<=0){held=false;paintControl();return;}
    if(!at()){moved();return;}
    if(held){
      const now=performance.now(),from=Math.max(last,started+DELAY);
      // Do not credit background stalls as active harvesting time.
      flower.progress=Math.min(NEED,flower.progress+Math.min(100,Math.max(0,now-from)));last=now;
      if(flower.progress>=NEED){
        flower.taken=true;flower.earned=1;flower.collectedAt=songTime();held=false;total++;
        try{localStorage.setItem(KEY,String(total));saveError=false;}catch(_){saveError=true;}
        wallet();[784,1047,1568].forEach((f,i)=>uiTone(f,.13,i*.065));
        fx.push({type:'milestone',idx:flower.idx,t:songTime(),d:.65,col:'#ffe790'});
        // blocked stays true until release: harvesting must never become an ultimate.
      }
    }
    paintControl();
  }
  function draw(t){
    if(!flower||flower.gone||isTutorial()||!['play','paused','resuming'].includes(state)||flower.idx>revealEnd)return;
    const p=cellXY(flower.idx),on=at(),r=cell*.48;
    if(flower.taken){
      if(t-flower.collectedAt<1.3){g.save();g.font=`900 ${Math.max(14,cell*.32)}px sans-serif`;g.textAlign='center';g.lineWidth=4;g.strokeStyle='#14243d';g.strokeText('花 ＋1',p.x,p.y-cell*.65);g.fillStyle='#fff0a5';g.fillText('花 ＋1',p.x,p.y-cell*.65);g.restore();}return;
    }
    g.save();
    if(on){
      g.save();g.translate(p.x,p.y+cell*.34);g.scale(1,.42);
      g.lineWidth=cell*.16;g.strokeStyle='#182b42';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();
      g.lineWidth=cell*.10;g.strokeStyle='#fff4bf';g.beginPath();g.arc(0,0,r,0,Math.PI*2);g.stroke();
      g.strokeStyle='#ffc83d';g.lineCap='round';g.beginPath();g.arc(0,0,r,-Math.PI/2,-Math.PI/2+Math.PI*2*flower.progress/NEED);g.stroke();g.restore();
    }
    // The bloom sits at the tile edge, leaving the note center unobstructed.
    const side=path[flower.idx].c>=6?-1:1;
    g.translate(p.x+side*cell*.35,p.y+cell*.1);g.lineJoin='round';g.lineCap='round';
    g.strokeStyle='#153b29';g.lineWidth=cell*.075;g.beginPath();g.moveTo(0,cell*.28);g.quadraticCurveTo(cell*.1,0,0,-cell*.19);g.stroke();
    g.strokeStyle='#78cf64';g.lineWidth=cell*.035;g.stroke();
    for(const s of [-1,1]){g.fillStyle='#8dda70';g.strokeStyle='#224631';g.lineWidth=1.5;g.beginPath();g.moveTo(0,cell*.17);g.quadraticCurveTo(s*cell*.27,-cell*.05,s*cell*.19,cell*.15);g.quadraticCurveTo(s*cell*.09,cell*.28,0,cell*.17);g.fill();g.stroke();}
    g.translate(0,-cell*.19);
    for(let i=0;i<6;i++){g.save();g.rotate(i*Math.PI/3);g.fillStyle=i%2?'#fff8d7':'#ffffff';g.strokeStyle='#b57d25';g.lineWidth=1.4;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(-cell*.12,-cell*.11,-cell*.1,-cell*.29,0,-cell*.31);g.bezierCurveTo(cell*.1,-cell*.25,cell*.13,-cell*.10,0,0);g.fill();g.stroke();g.restore();}
    g.fillStyle='#ffc945';g.beginPath();g.arc(0,0,cell*.075,0,Math.PI*2);g.fill();g.restore();
    if(on){
      const label=held?'採取中':'長押しで採取';g.save();g.font=`900 ${Math.max(11,cell*.24)}px sans-serif`;g.textAlign='center';g.lineWidth=4;g.strokeStyle='#14243d';g.strokeText(label,p.x,p.y-cell*.7);g.fillStyle='#fff3b2';g.fillText(label,p.x,p.y-cell*.7);g.restore();
    }
  }
  function snapshot(){return {collected:flower?.earned||0,total,saveError,progress:flower?.progress||0,at:at(),held,blocked,idx:flower?.idx};}
  function decorate(result,ov){
    ov.querySelector('.flowerReward')?.remove();
    if(!result.flowers)return;
    const el=document.createElement('div');el.className='flowerReward';
    el.innerHTML=`<span>✿ 採取した花 <b>＋${result.flowers.collected}</b></span><small>所持 ${result.flowers.total} 個${result.flowers.saveError?'（端末に保存できませんでした）':''}</small>`;
    ov.querySelector('.resultLoot')?.before(el);
  }
  function init(){
    document.body.classList.add('flowerTrial');
    document.getElementById('homeTutorial').insertAdjacentHTML('beforebegin','<button class="flowerHome" id="flowerPlay"><span>✿ 花を採りに行く <b>›</b></span><small>花の上でブレイク長押し。1プレイに1個。</small><small>所持している花 <strong data-flower-total>0</strong> 個</small></button>');
    document.getElementById('flowerPlay').onclick=()=>NBMenu.show('songs');
    const hint=document.createElement('small');hint.id='flowerHoldHint';hint.textContent='長押しで採取';hint.hidden=true;document.getElementById('bBreak').append(hint);wallet();
  }
  return {enabled,at,blocksRush,reset,begin,release,moved,nextCourse,tick,draw,snapshot,decorate,init};
})();
