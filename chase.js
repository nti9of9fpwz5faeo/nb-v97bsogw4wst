/* A run-long diamond hunter: advance to grow, choose when to collect. */
(function(root){
  'use strict';
  const types=[
    {id:'novice',name:'初級',reward:5,color:'#73eaff'},
    {id:'adept',name:'中級',reward:15,color:'#ffd44f'},
    {id:'master',name:'上級',reward:40,color:'#e878ff'},
    {id:'divine',name:'神級',reward:150,color:'#fff4b1'}
  ];
  const tuning={spawnChance:.28,adeptAt:35,masterAt:105,divineFrom:175,divineEvery:35,divineChance:.005,reach:3,choiceTravel:6,passAhead:8};
  function spawn(random=Math.random){
    if(random()>=tuning.spawnChance)return null;
    return {type:types[0],rarity:types[0],trigger:14,idx:null,visible:false,done:false,outcome:null,
      distance:0,lastPlayer:0,nextDivineAt:tuning.divineFrom,offer:false,offerAt:0,deferred:false,surpriseUntil:null,events:[]};
  }
  function promote(n,random){
    let rank=n.distance>=tuning.masterAt?2:n.distance>=tuning.adeptAt?1:0;
    if(n.type.id==='divine')return;
    // Each distance milestone rolls once, independent of frame rate and waiting.
    while(n.distance>=n.nextDivineAt){
      n.nextDivineAt+=tuning.divineEvery;
      if(random()<tuning.divineChance){rank=3;break;}
    }
    n.type=n.rarity=types[rank];
  }
  function pass(n,t,player,end){
    if(!n||n.done||!n.offer)return false;
    n.events.push({idx:n.idx,t});n.offer=false;
    n.deferred=player+tuning.passAhead>=end;
    n.idx=Math.min(end-1,Math.floor(player)+tuning.passAhead);
    n.events.push({idx:n.idx,t});return true;
  }
  function advance(n,t,spb,player,end,playing=true,random=Math.random){
    if(!n||n.done||!playing)return null;
    player=Math.max(0,Math.min(end,Math.floor(player)));
    n.distance+=Math.max(0,player-n.lastPlayer);n.lastPlayer=player;
    const oldType=n.type;promote(n,random);
    if(!n.visible){
      if(player<n.trigger)return null;
      n.visible=true;n.idx=Math.min(end-1,player+tuning.reach);n.surpriseUntil=t+.28;
      n.events.push({idx:n.idx,t});
    }
    if(n.offer&&n.distance-n.offerAt>=tuning.choiceTravel){pass(n,t,player,end);return 'passed';}
    if(!n.offer&&!n.deferred&&player>=n.idx-tuning.reach){n.offer=true;n.offerAt=n.distance;}
    return oldType!==n.type?'promoted':null;
  }
  function catchHunter(n,playing=true){
    if(!playing||!n||n.done||!n.offer)return 0;
    n.done=true;n.offer=false;n.outcome='caught';return n.type.reward;
  }
  function nextCourse(n,end){
    if(!n||n.done)return;
    n.lastPlayer=0;n.events=[];n.offer=false;n.deferred=false;n.surpriseUntil=null;
    if(n.visible)n.idx=Math.min(tuning.passAhead,end-1);
  }
  function growth(n){
    if(n.type.id==='divine')return {label:'神級 · 最大報酬',value:1,max:1};
    const base=n.type.id==='novice'?0:n.type.id==='adept'?tuning.adeptAt:tuning.masterAt;
    const target=n.type.id==='novice'?tuning.adeptAt:n.type.id==='adept'?tuning.masterAt:n.nextDivineAt;
    const left=Math.max(0,target-n.distance);
    return {label:n.type.id==='master'?`神級の抽選まで ${left}マス`:`${n.type.id==='novice'?'中級':'上級'}まで ${left}マス`,value:n.distance-base,max:target-base};
  }
  const api={types,rarities:types,tuning,spawn,advance,pass,catchHunter,nextCourse,growth};
  if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
