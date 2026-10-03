/* Safe movement opportunities, independent of BPM and rendering frame rate. */
(function(root){
  'use strict';
  const types=[
    {id:'novice',name:'初級',reward:5,color:'#73eaff',speed:25,distance:20,loss:20,gap:3},
    {id:'adept',name:'中級',reward:15,color:'#ffd44f',speed:40,distance:28,loss:20,gap:5},
    {id:'master',name:'上級',reward:40,color:'#e878ff',speed:50,distance:36,loss:18,gap:7},
    {id:'divine',name:'神級',reward:150,color:'#fff4b1',speed:75,distance:60,loss:5,gap:12,smokeEvery:8,smokeStep:2}
  ];
  const tuning={spawnChance:.22,divineChance:.01};
  const testDefaults={speed:25,distance:20,loss:20,gap:3};
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
    const rules=test?{...test}:{speed:type.speed,distance:type.distance,loss:type.loss,gap:type.gap,smokeEvery:type.smokeEvery||0,smokeStep:type.smokeStep||0};
    return {type:actual,test,rules,smokeCount:0,origin:start,idx:start+actual.gap,from:start+actual.gap,used:0,remaining:rules.loss,
      missed:0,travelled:0,playerTravelled:0,lastPlayer:start,observedPlayer:start,observedRush:false,
      phase:forced?'chase':'armed',done:false,outcome:null,moveAt:-9,events:[],meter:null,expiresAt:null};
  }
  function sample(player,notes,locked=false,source=player+2,goal=Infinity){
    const sorted=notes.slice().sort((a,b)=>a.idx-b.idx),blocking=sorted.find(n=>n.idx<=player);
    if(locked||blocking||player>=goal)return {key:blocking?.id??'locked',capacity:0,blocked:!!locked||!!blocking,purple:!locked&&player<goal&&blocking?.purple?blocking.id:null};
    const next=sorted.find(n=>n.idx>player);
    // Every empty destination before the next note is traversable by freeMove.
    return {key:next?.id??'source',capacity:Math.max(0,Math.min(goal-player,(next?.idx??source)-player-1)),blocked:false,purple:null};
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
  function account(n,snapshot,{moved=0,rebase=false,bonus=0,special=false}={}){
    const closed=observe(n,snapshot,rebase||special)+(special?0:Math.max(0,bonus));
    if(special)return {opportunities:0,taken:0,missed:0,occupied:0};
    const steps=Math.max(0,moved),taken=snapshot.blocked?0:steps,occupied=steps-taken;
    // Actual successful moves remain counted across boundary changes/rebases. Never charge them twice.
    const missed=Math.max(0,closed-steps);
    return {opportunities:taken+missed,taken,missed,occupied};
  }
  function settle(n,outcome,t){n.done=true;n.outcome=outcome;n.finishedAt=t;return outcome;}
  function advance(n,t,player,opportunities=0,accounting=null){
    if(!n||n.done||n.phase!=='chase')return null;
    if(n.retime){if(n.expiresAt!==null)n.expiresAt=t+n.graceRemaining;n.retime=false;}
    {
      const rules=n.rules;
      const moved=Math.max(0,player-n.lastPlayer);n.lastPlayer=player;n.playerTravelled+=moved;
      n.used+=Math.max(0,opportunities);
      n.missed+=accounting?.missed??Math.max(0,opportunities-moved);n.remaining=Math.max(0,rules.loss-n.missed);
      // Crossing, including an ultimate, catches immediately without a hidden minimum chase length.
      if(player>=n.idx)return settle(n,'won',t);
      const smokeCount=rules.smokeEvery?Math.floor(n.used/rules.smokeEvery):0;
      const jumped=smokeCount>n.smokeCount;n.smokeCount=smokeCount;
      n.travelled=Math.min(rules.distance,Math.floor(n.used*rules.speed/100)+smokeCount*(rules.smokeStep||0));
      const to=n.origin+rules.gap+n.travelled;
      if(to>n.idx){n.from=n.idx;n.idx=to;n.moveAt=t;if(jumped)n.events.push({idx:n.from,t},{idx:n.idx,t});}
      if(!n.remaining){n.reason='missed';return settle(n,'lost',t);}
      if(n.travelled>=rules.distance&&n.expiresAt===null){n.reason='distance';n.expiresAt=t+.32;}
      if(n.expiresAt!==null&&t>=n.expiresAt)return settle(n,'lost',t);
      return null;
    }
  }
  function warp(n,length=35,t=0){
    if(!n||n.done)return;n.idx-=length;n.from=n.idx;n.origin-=length;n.lastPlayer-=length;n.observedPlayer=0;n.observedRush=false;n.meter=null;n.events=[];n.moveAt=-9;
    // Song time may restart in endless mode. Preserve the final input window too.
    n.graceRemaining=n.expiresAt===null?0:Math.max(0,n.expiresAt-t);n.retime=true;
  }
  const api={types,rarities:types,tuning,testDefaults,testLimits,normalizeTest,spawn,sample,observe,account,advance,warp};
  if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
