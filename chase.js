/* Safe movement opportunities, independent of BPM and rendering frame rate. */
(function(root){
  'use strict';
  const types=[
    {id:'novice',name:'初級',reward:5,color:'#73eaff',gap:7,budget:30,flee:8},
    {id:'adept',name:'中級',reward:15,color:'#ffd44f',gap:8,budget:28,flee:10},
    {id:'master',name:'上級',reward:40,color:'#e878ff',gap:10,budget:26,flee:12},
    {id:'divine',name:'神級',reward:150,color:'#fff4b1',gap:12,budget:24,flee:10}
  ];
  const tuning={spawnChance:.22,divineChance:.01};
  const testDefaults={speed:80,distance:30,loss:10,gap:5};
  const testLimits={speed:[10,150,5],distance:[5,300,5],loss:[1,50,1],gap:[1,30,1]};
  function normalizeTest(values={}){
    const result={};
    for(const key of Object.keys(testDefaults)){
      const [min,max,step]=testLimits[key],value=Number(values?.[key]);
      result[key]=Number.isFinite(value)?Math.max(min,Math.min(max,Math.round(value/step)*step)):testDefaults[key];
    }
    return result;
  }
  function spawn(random=Math.random,forced=null,start=0,settings=null){
    if(forced==='off'||!forced&&random()>=tuning.spawnChance)return null;
    const roll=forced?0:random();
    const type=types.find(r=>r.id===forced)||types[roll<.60?0:roll<.88?1:roll<.99?2:3];
    const test=forced==='novice'&&settings?normalizeTest(settings):null;
    const actual=test?{...type,gap:test.gap}:type;
    return {type:actual,test,origin:start,idx:start+actual.gap,from:start+actual.gap,used:0,remaining:test?test.loss:type.budget,
      missed:0,travelled:0,playerTravelled:0,lastPlayer:start,
      phase:forced?'chase':'armed',done:false,outcome:null,moveAt:-9,events:[],meter:null,expiresAt:null};
  }
  function sample(player,notes,locked=false,source=player+2){
    const sorted=notes.slice().sort((a,b)=>a.idx-b.idx),blocking=sorted.find(n=>n.idx<=player);
    if(locked||blocking)return {key:blocking?.id??'locked',capacity:0,purple:!locked&&blocking?.purple?blocking.id:null};
    const next=sorted.find(n=>n.idx>player);
    return {key:next?.id??'source',capacity:Math.max(0,(next?.idx??source)-player-2),purple:null};
  }
  function observe(n,snapshot,rebase=false){
    const old=n.meter;n.meter=snapshot;
    if(!old||rebase)return 0;
    // Only disappearing capacity counts: traversing it, or letting the next note close it.
    // A new boundary establishes a fresh window, never an instant charge for the whole gap.
    const ordinary=old.key===snapshot.key?Math.max(0,old.capacity-snapshot.capacity):0;
    const purple=old.purple!=null&&old.purple!==snapshot.purple?1:0;
    return ordinary+purple;
  }
  function settle(n,outcome,t){n.done=true;n.outcome=outcome;n.finishedAt=t;return outcome;}
  function advance(n,t,player,opportunities=0){
    if(!n||n.done||n.phase!=='chase')return null;
    if(n.retime){if(n.expiresAt!==null)n.expiresAt=t+n.graceRemaining;n.retime=false;}
    if(n.test){
      const moved=Math.max(0,player-n.lastPlayer);n.lastPlayer=player;n.playerTravelled+=moved;
      n.used+=Math.max(0,opportunities);
      n.missed+=Math.max(0,opportunities-moved);n.remaining=Math.max(0,n.test.loss-n.missed);
      // Crossing, including an ultimate, catches immediately without a hidden minimum chase length.
      if(player>=n.idx)return settle(n,'won',t);
      n.travelled=Math.min(n.test.distance,Math.floor(n.used*n.test.speed/100));
      const to=n.origin+n.test.gap+n.travelled;
      if(to>n.idx){n.from=n.idx;n.idx=to;n.moveAt=t;}
      if(!n.remaining){n.reason='missed';return settle(n,'lost',t);}
      if(n.travelled>=n.test.distance&&n.expiresAt===null){n.reason='distance';n.expiresAt=t+.32;}
      if(n.expiresAt!==null&&t>=n.expiresAt)return settle(n,'lost',t);
      return null;
    }
    // A move or an ultimate crossing wins before the opponent's next step.
    if(player>=n.idx)return settle(n,'won',t);
    n.used=Math.min(n.type.budget,n.used+Math.max(0,opportunities));n.remaining=n.type.budget-n.used;
    let steps=Math.floor(n.used/n.type.budget*n.type.flee);
    // God alternates walking and two-cell smoke jumps. All movement uses the same opportunity clock.
    if(n.type.id==='divine'&&steps%5===3)steps--;
    const to=n.origin+n.type.gap+steps;
    if(to>n.idx){const jump=to-n.idx>1&&n.type.id==='divine';n.from=n.idx;n.idx=to;n.moveAt=t;
      if(jump)n.events.push({idx:n.from,t},{idx:n.idx,t});}
    if(!n.remaining&&n.expiresAt===null)n.expiresAt=t+.32;
    if(n.expiresAt!==null&&t>=n.expiresAt)return settle(n,'lost',t);
    return null;
  }
  function warp(n,length=35,t=0){
    if(!n||n.done)return;n.idx-=length;n.from=n.idx;n.origin-=length;n.lastPlayer-=length;n.meter=null;n.events=[];n.moveAt=-9;
    // Song time may restart in endless mode. Preserve the final input window too.
    n.graceRemaining=n.expiresAt===null?0:Math.max(0,n.expiresAt-t);n.retime=true;
  }
  const api={types,rarities:types,tuning,testDefaults,testLimits,normalizeTest,spawn,sample,observe,advance,warp};
  if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
