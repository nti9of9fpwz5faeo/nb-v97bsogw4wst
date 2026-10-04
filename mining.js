/* Optional, beat-driven diamond mining. Uses the song clock; never pauses audio. */
window.NBDiamond = (() => {
  'use strict';
  let target=null, resumeBeat=-1;
  const is = note => !!note?.diamond;
  const active = () => !!target;
  const locked = () => !!target || nextBeat < resumeBeat;
  function reset(){target=null;resumeBeat=-1;}
  function prepare(note){
    const tier=NBBlockGems.info(note);
    if(!tier||moveLocked){note.gem=null;return note;}
    note.diamond=true;note.hp=tier.hits;note.maxHp=tier.hits;note.purple=false;note.hit=false;
    return note;
  }
  function freezeBeat(n,t){
    if(!target&&n>=resumeBeat)return false;
    for(const note of notes){note.from=note.idx;note.at=t;note.spin=t;}
    lastBeatAt=t;lastBeatStrength=activeChart?.accents?.[n]??1;
    pendingCheck=[];
    if(earlyInput){
      const q=earlyInput;earlyInput=null;
      if(q.n===n)doAction(q.type,n,t,q.diff,q.rec);
    }
    NBWorkshop.tick(t,true);
    return true;
  }
  function strike(note,n,t,diff,rec){
    if(state!=='play'||!is(note)||note.hp<=0||note.mineBeat===n||Math.abs(diff)>WINDOW)return false;
    if(target&&target!==note)return false;
    if(!target){
      target=note;stopRushHold();pendingCheck=[];recentHits=[];
      player.from=player.idx;player.at=t;
      for(const other of notes){other.from=other.idx;other.at=t;other.spin=t;}
      diagEv('mining_start',{noteId:note.id,type:note.gem.type,beat:n});
    }
    note.mineBeat=n;note.hp--;note.crackAt=t;
    charState='slash';charUntil=t+.22;
    const word=judgeOf(diff);
    flashBtn('bBreak');playSE(word);uiTone(640+(1-note.hp/note.maxHp)*500,.035);
    fx.push({type:'cut',idx:player.idx,t,d:.14});
    showJudge(word,`${note.maxHp-note.hp}/${note.maxHp}`);
    NBWorkshop.judged(word,n,t);
    if(word==='PERFECT')countPerfect(t);
    if(speedOn()||endlessScoreOn())elBreak(word,`${note.maxHp-note.hp}/${note.maxHp}`);
    diagResult(rec,{status:'judged',judge:word,mining:true,beat:n,noteId:note.id,noteHpAfter:note.hp,destroyed:note.hp===0});
    if(note.hp===0){
      notes.splice(notes.indexOf(note),1);
      NBWorkshop.destroyed(note,t);
      const p=cellXY(note.idx),col=NBBlockGems.types.find(x=>x.id===note.gem.type).color;
      for(let i=0;i<14;i++){const a=i*2.399;shards.push({x:p.x,y:p.y-cell*.55,vx:Math.cos(a)*cell*(1.2+i%3*.4),vy:Math.sin(a)*cell*1.7-cell,rot:a,vr:i%2?4:-4,s:cell*(.06+i%3*.025),col:i%3?col:'#536477',t0:t,life:.55});}
      target=null;resumeBeat=n+2;pendingCheck=[];earlyInput=null;stopRushHold();
      // A complete recovery beat; subsequent movement arrives on the live music grid.
      const ahead=notes.filter(x=>x.idx<=player.idx);
      for(const other of ahead){other.idx=player.idx+1;other.from=other.idx;other.at=t;}
      if(moveLocked){moveLocked=false;setLockUI(false);}
      diagEv('mining_complete',{noteId:note.id,resumeBeat});
    }
    NBWorkshop.tick(t,true);return true;
  }
  function drawBlock(note,size,t){
    const tier=NBBlockGems.types.find(x=>x.id===note.gem?.type)||NBBlockGems.types[0];
    const color=tier.color,progress=1-(note.hp||0)/(note.maxHp||tier.hits);
    const impact=reduceMotion.matches?0:Math.max(0,1-(t-(note.crackAt??-9))/.15);
    g.save();g.scale(size*(1+impact*.08),size*(1-impact*.04));g.lineJoin='round';
    const poly=(pts,fill,stroke='#0c1424',width=.022)=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle=stroke;g.lineWidth=width;g.stroke();};
    // Beveled slate faces, with fine luminous veins, matching the approved reference.
    poly([[-.46,-.24],[0,-.47],[.46,-.24],[0,-.01]],'#586c81');
    poly([[-.46,-.24],[0,-.01],[0,.49],[-.46,.24]],'#27394b');
    poly([[0,-.01],[.46,-.24],[.46,.24],[0,.49]],'#182a3c');
    poly([[-.40,-.24],[0,-.43],[.40,-.24],[0,-.05]],'#364b61','#8395a7',.011);
    poly([[-.42,-.19],[-.04,0],[-.04,.42],[-.42,.22]],'#304355','#586e82',.009);
    poly([[.04,0],[.42,-.19],[.42,.22],[.04,.42]],'#223447','#4a6178',.009);
    g.strokeStyle=color;g.lineWidth=.018;g.shadowColor=color;g.shadowBlur=size*.07;
    for(const pts of [[[-.38,-.22],[-.16,-.33],[0,-.27],[.18,-.33],[.38,-.23]],[[.01,-.04],[.01,.43]],[[-.44,-.1],[-.3,-.01],[-.33,.18],[-.44,.23]],[[.44,-.1],[.28,.01],[.32,.14],[.44,.2]]]){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
    g.shadowBlur=0;
    // Inset diamond emblem, not a collectible floating above the cube.
    poly([[-.25,-.09],[-.1,.1],[-.25,.28],[-.4,.08]],'#0f2032','#6d849b',.02);
    poly([[-.25,-.035],[-.14,.10],[-.25,.22],[-.35,.075]],color,color,.01);
    poly([[-.25,-.035],[-.25,.22],[-.35,.075]],'#ecfaff88',color,.004);
    poly([[-.25,-.035],[-.14,.10],[-.25,.08]],'#ffffffbb',color,.004);
    // Damage cracks emerge in three deterministic stages, legible at phone scale.
    const cracks=[[[.1,-.35],[.05,-.2],[.14,-.12],[.05,.03],[.16,.16],[.1,.37]],[[-.37,-.25],[-.24,-.16],[-.29,-.02],[-.16,.03]],[[.4,.05],[.26,.12],[.23,.29],[.1,.35]],[[-.4,.23],[-.27,.17],[-.19,.3],[-.04,.38]]];
    cracks.slice(0,Math.ceil(progress*cracks.length)).forEach(pts=>{g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle='#080f1d';g.lineWidth=.045;g.stroke();g.strokeStyle=color;g.lineWidth=.013;g.stroke();});
    g.restore();
  }
  function drawFront(t){
    for(const note of notes.filter(x=>is(x)&&x.idx<=player.idx)){
      const p=cellXY(playerVis(t));g.save();g.translate(p.x,Math.max(cell*.56,p.y-cell*.9));drawBlock(note,cell*.92,t);g.restore();
    }
  }
  return {is,active,locked,reset,prepare,freezeBeat,strike,drawBlock,drawFront};
})();
