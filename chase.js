/* Diamond race: one roll per course entry, deterministic beat-based opponents. */
(function(root){
  'use strict';
  const types=[
    {id:'novice',name:'初級',reward:5,color:'#73eaff',stepBeats:2.2},
    {id:'adept',name:'中級',reward:15,color:'#ffd44f',stepBeats:1.7},
    {id:'master',name:'上級',reward:40,color:'#e878ff',stepBeats:1.25},
    {id:'divine',name:'神級',reward:150,color:'#fff4b1',stepBeats:1}
  ];
  const tuning={spawnChance:.22,divineChance:.01,teleportEvery:5,teleportCells:3,warningBeats:1.5};
  function spawn(random=Math.random,forced=null,end=35){
    if(forced==='off'||!forced&&random()>=tuning.spawnChance)return null;
    const roll=forced?0:random();
    const type=types.find(r=>r.id===forced)||types[roll<.60?0:roll<.88?1:roll<1-tuning.divineChance?2:3];
    return {type,idx:end,from:end,target:end/2,visible:true,done:false,outcome:null,
      phase:'intro',nextBeat:Infinity,moveBeat:0,moves:0,warning:null,events:[],lastBeat:null,lastPlayer:0};
  }
  function start(n,beat){
    if(!n||n.done||n.phase==='race')return;
    n.phase='race';n.nextBeat=beat+n.type.stepBeats;n.lastBeat=beat;
  }
  function settle(n,outcome,beat){n.done=true;n.outcome=outcome;n.finishedBeat=beat;n.warning=null;return outcome;}
  function advance(n,beat,player,playing=true,arrivalBeat=null){
    if(!playing||!n||n.done||n.phase!=='race'||!Number.isFinite(beat))return null;
    if(beat<n.lastBeat)return null;
    const playerArrival=player>=n.target?(arrivalBeat??beat):Infinity;
    // Compare actual arrival times, so a late frame cannot give the wrong winner.
    while(n.nextBeat<=beat+1e-8){
      const at=n.nextBeat;
      if(playerArrival<=at+1e-8){n.lastBeat=beat;return settle(n,'won',playerArrival);}
      if(n.warning){
        n.from=n.idx;n.idx=n.warning.to;n.moveBeat=at;
        n.events.push({idx:n.from,beat:at},{idx:n.idx,beat:at});n.warning=null;
        n.nextBeat=at+n.type.stepBeats;
      }else if(n.type.id==='divine'&&n.moves>0&&n.moves%tuning.teleportEvery===0&&n.idx>n.target+2){
        // A visible wind-up, and the final approach is always on foot.
        n.warning={at,to:Math.max(n.target+1,n.idx-tuning.teleportCells)};
        n.moves++;n.nextBeat=at+tuning.warningBeats;
      }else{
        n.from=n.idx;n.idx=Math.max(n.target,n.idx-1);n.moveBeat=at;n.moves++;
        n.nextBeat=at+n.type.stepBeats;
      }
      if(n.idx<=n.target){n.lastBeat=beat;return settle(n,'lost',at);}
    }
    n.lastBeat=beat;n.lastPlayer=player;
    if(Number.isFinite(playerArrival))return settle(n,'won',playerArrival);
    return null;
  }
  const api={types,rarities:types,tuning,spawn,start,advance};
  if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
