/* Optional, beat-driven diamond mining. Uses the song clock; never pauses audio. */
window.NBDiamond = (() => {
  'use strict';
  let target=null, resumeBeat=-1, chips=[], bursts=[];
  const is = note => !!note?.diamond;
  const active = () => !!target;
  const locked = () => !!target || nextBeat < resumeBeat;
  function reset(){target=null;resumeBeat=-1;chips=[];bursts=[];}
  const isActive = note => target===note;
  const reachable = note => is(note)&&note.idx===player.idx+1;
  function prepare(note){
    let tier=NBBlockGems.info(note);
    if(!tier||moveLocked){note.gem=null;return note;}
    note.gem.type='novice';tier=NBBlockGems.types[0];
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
    if(state!=='play'||!reachable(note)||note.hp<=0||note.mineBeat===n||Math.abs(diff)>WINDOW)return false;
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
    fx.push({type:'cut',idx:note.idx,t,d:.14});
    chip(note,t);
    showJudge(word,`${note.maxHp-note.hp}/${note.maxHp}`);
    NBWorkshop.judged(word,n,t);
    if(word==='PERFECT')countPerfect(t);
    if(speedOn()||endlessScoreOn())elBreak(word,`${note.maxHp-note.hp}/${note.maxHp}`);
    diagResult(rec,{status:'judged',judge:word,mining:true,beat:n,noteId:note.id,noteHpAfter:note.hp,destroyed:note.hp===0});
    if(note.hp===0){
      notes.splice(notes.indexOf(note),1);
      NBWorkshop.destroyed(note,t);
      bursts.push({idx:note.idx,t});
      target=null;resumeBeat=n+2;pendingCheck=[];earlyInput=null;stopRushHold();
      // A complete recovery beat; subsequent movement arrives on the live music grid.
      const ahead=notes.filter(x=>x.idx<=player.idx);
      for(const other of ahead){other.idx=player.idx+1;other.from=other.idx;other.at=t;}
      if(moveLocked){moveLocked=false;setLockUI(false);}
      diagEv('mining_complete',{noteId:note.id,resumeBeat});
    }
    NBWorkshop.tick(t,true);return true;
  }
  // All damage stages share the same square silhouette and world-space center.
  const plates=[
    [[-.46,-.46],[-.2,-.46],[-.12,-.25],[-.02,-.16],[-.17,-.04],[-.46,-.2]],
    [[-.2,-.46],[.46,-.46],[.46,-.04],[.15,-.1],[-.02,-.16],[-.12,-.25]],
    [[.46,-.04],[.46,.46],[.03,.46],[.12,.23],[.15,-.1]],
    [[.03,.46],[-.46,.46],[-.46,-.2],[-.17,-.04],[-.1,.2],[.12,.23]]
  ];
  const cracks=[
    [[-.2,-.47],[-.12,-.25],[-.02,-.16],[-.17,-.04]],
    [[-.47,-.2],[-.17,-.04],[-.1,.2],[.12,.23],[.03,.47]],
    [[-.02,-.16],[.15,-.1],[.47,-.04]],
    [[.15,-.1],[.12,.23]]
  ];
  function polygon(points,fill,stroke,width=.016,ctx=g){
    const g=ctx;
    g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
    g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
  }
  function diamond(radius,ctx=g){
    const g=ctx;
    const poly=(points,fill,stroke,width)=>polygon(points,fill,stroke,width,g);
    poly([[0,-radius],[radius,0],[0,radius],[-radius,0]],'#a0eaff','#eefeff',.024);
    poly([[0,-radius],[-radius,0],[0,.06]],'#f3feff');
    poly([[0,-radius],[radius,0],[0,.06]],'#b8efff');
    poly([[0,.06],[radius,0],[0,radius]],'#54b7e5');
    poly([[0,.06],[-radius,0],[0,radius]],'#d2faff');
  }
  function chip(note,t){
    const stage=note.maxHp-note.hp;
    for(let i=0;i<stage+1;i++)chips.push({idx:note.idx,t,side:i%2?1:-1,seed:i+stage*3});
    if(chips.length>40)chips.splice(0,chips.length-40);
  }
  function drawBlock(note,size,t,g){
    const poly=(points,fill,stroke,width)=>polygon(points,fill,stroke,width,g);
    const gem=radius=>diamond(radius,g);
    const stage=Math.min(3,Math.max(0,(note.maxHp||4)-(note.hp??4)));
    const dt=t-(note.crackAt??-9),impact=reduceMotion.matches?0:Math.max(0,1-dt/.15);
    g.save();g.scale(size*(1+impact*.055),size*(1-impact*.045));g.lineJoin='round';
    // Same radius, stroke weight and front view as the pink/cyan notes.
    const shade=g.createLinearGradient(-.4,-.5,.4,.5);shade.addColorStop(0,'#55748e');shade.addColorStop(1,'#263c55');
    if(stage<3){
      rr(g,-.5,-.5,1,1,.07);g.fillStyle='#8bdfff';g.fill();g.strokeStyle='#081221';g.lineWidth=.055;g.stroke();
      rr(g,-.43,-.43,.86,.86,.035);g.fillStyle=shade;g.fill();g.strokeStyle='#c4f6ff';g.lineWidth=.016;g.stroke();
    }else{
      // The outline itself comes apart: actual gaps between displaced stone plates.
      plates.forEach((points,i)=>{g.save();g.translate(i===0?-.025:i===1?.025:i===2?.036:-.025,i<2?-.025:.03);poly(points,shade,'#081221',.065);poly(points,'#46658044','#9bdbed',.012);g.restore();});
    }
    // Small facets and quiet highlights suggest stone without hiding the fractures.
    g.strokeStyle='#a0bbce33';g.lineWidth=.009;
    for(const [x,y] of [[-.3,-.3],[.26,-.26],[-.31,.3],[.29,.29]]){g.beginPath();g.moveTo(x-.055,y-.02);g.lineTo(x+.035,y-.075);g.lineTo(x+.07,y+.04);g.stroke();}
    poly([[0,-.25],[.25,0],[0,.25],[-.25,0]],'#0c2339','#7299b0',.017);
    gem(.17+stage*.028);
    const visible=stage===0?0:stage===1?1:stage===2?3:4;
    cracks.slice(0,visible).forEach(points=>{
      g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
      g.strokeStyle='#b3efff';g.lineWidth=.042+stage*.022;g.stroke();
      g.strokeStyle='#091723';g.lineWidth=.026+stage*.021;g.stroke();
    });
    // Cut-out corners, rather than painted-on cracks alone.
    if(stage>0){
      g.globalCompositeOperation='destination-out';
      poly([[-.24,-.54],[-.13,-.54],[-.13,-.39],[-.19,-.32],[-.24,-.42]],'#fff');
      if(stage>1)poly([[.54,.25],[.37,.36],[.32,.54],[.54,.54]],'#fff');
      g.globalCompositeOperation='source-over';
    }
    if(impact>0){
      g.globalAlpha=impact;g.strokeStyle='#fff';g.lineWidth=.027;g.beginPath();g.moveTo(-.36,-.22);g.lineTo(.32,.18);g.stroke();
      g.beginPath();g.moveTo(-.15,-.35);g.lineTo(-.15,-.15);g.moveTo(-.25,-.25);g.lineTo(-.05,-.25);g.stroke();
    }
    g.restore();
  }
  // Render into a local surface so transparent chips never erase the floor.
  let sprite,spriteContext;
  function renderBlock(note,size,t){
    if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=192;spriteContext=sprite.getContext('2d');}
    spriteContext.setTransform(1,0,0,1,0,0);spriteContext.clearRect(0,0,192,192);spriteContext.save();spriteContext.translate(96,96);drawBlock(note,160,t,spriteContext);spriteContext.restore();
    g.drawImage(sprite,-size*.6,-size*.6,size*1.2,size*1.2);
  }
  function drawFront(t){
    chips=chips.filter(c=>t-c.t<.36);
    for(const c of chips){
      const age=t-c.t;if(age<0)continue;const p=cellXY(c.idx),k=age/.36;
      g.save();g.translate(p.x+cell*c.side*(.2+k*(.22+c.seed%3*.08)),p.y+cell*(-.35+k*k*.45));
      g.rotate(c.seed+k*2);g.globalAlpha=1-k;g.scale(cell*.08,cell*.08);
      polygon([[-1,-.8],[.7,-1],[1,.5],[-.4,1]],'#59788d','#b8edff',.16);g.restore();
    }
    bursts=bursts.filter(b=>t-b.t<.8);
    for(const b of bursts){
      const age=t-b.t;if(age<0)continue;const p=cellXY(b.idx),k=Math.min(1,age/.55),ease=1-Math.pow(1-k,3);
      g.save();g.translate(p.x,p.y);g.scale(cell*.93,cell*.93);
      plates.forEach((points,i)=>{const a=-Math.PI*.75+i*Math.PI/2;g.save();g.globalAlpha=1-k;g.translate(Math.cos(a)*ease*.48,Math.sin(a)*ease*.48+ease*ease*.18);g.rotate((i%2?1:-1)*ease*.25);polygon(points,'#39556d','#9be5ff',.02);g.restore();});
      g.globalAlpha=Math.min(1,(.8-age)*4);diamond(.24+Math.sin(Math.min(1,age/.18)*Math.PI)*.055);
      if(age<.2){g.globalAlpha=1-age/.2;g.strokeStyle='#e6fbff';g.lineWidth=.022;for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(Math.cos(a)*.33,Math.sin(a)*.33);g.lineTo(Math.cos(a)*(.4+ease*.4),Math.sin(a)*(.4+ease*.4));g.stroke();}}
      g.restore();
    }
  }
  return {is,active,isActive,reachable,locked,reset,prepare,freezeBeat,strike,drawBlock:renderBlock,drawFront};
})();
