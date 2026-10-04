/* Passive movement telemetry. No difficulty changes, timing changes or rank estimates. */
(function(root){
  'use strict';
  const chase=typeof module!=='undefined'?require('./movement.js'):root.NBMovement;
  const round=n=>Math.round(n*1000)/1000;
  function create(meta){return {meta:{...meta},meter:null,lastPlayer:0,lastTime:null,wasRush:false,done:false,
    seconds:0,opportunities:0,taken:0,missed:0,normalSteps:0,occupiedSteps:0,purpleSteps:0,rushSteps:0,rushes:0,warps:0,transitions:[],speedMin:Infinity,speedMax:0,
    lossStreak:0,maxLossStreak:0,sections:[],events:[],hunters:[],eventsTruncated:false};}
  function observe(r,{player,snapshot,time,rush=false,rebase=false,bonus=0,rate=1}){
    if(!r||r.done)return;
    const now=Math.max(0,time);if(r.lastTime!==null)r.seconds+=Math.max(0,now-r.lastTime);r.lastTime=now;
    const moved=Math.max(0,player-r.lastPlayer);r.lastPlayer=player;
    r.speedMin=Math.min(r.speedMin,rate);r.speedMax=Math.max(r.speedMax,rate);
    const special=rush||r.wasRush;
    if(special)r.rushSteps+=moved;else r.normalSteps+=moved;
    if(rush&&!r.wasRush)r.rushes++;
    const a=chase.account(r,snapshot,{moved,rebase,bonus,special}),used=a.opportunities;
    r.wasRush=rush;
    const {taken,missed}=a;r.occupiedSteps+=a.occupied;
    r.taken+=taken;r.missed+=missed;
    if(taken>0)r.lossStreak=0;
    r.lossStreak+=missed;r.maxLossStreak=Math.max(r.maxLossStreak,r.lossStreak);
    // Twenty-opportunity windows can be compared without confusing blocked time with hesitation.
    for(let i=0;i<used;i++){
      if(r.opportunities%20===0)r.sections.push({from:r.opportunities+1,opportunities:0,taken:0,missed:0,startSeconds:round(r.seconds),endSeconds:round(r.seconds),speedMin:rate,speedMax:rate});
      const s=r.sections[r.sections.length-1];s.opportunities++;s.taken+=i<taken?1:0;s.missed+=i<taken?0:1;s.endSeconds=round(r.seconds);s.speedMin=Math.min(s.speedMin,rate);s.speedMax=Math.max(s.speedMax,rate);r.opportunities++;
    }
    if(used||moved){
      if(r.events.length<3000)r.events.push({seconds:round(r.seconds),opportunities:used,taken,missed,occupied:a.occupied,normalSteps:round(r.normalSteps),rushSteps:round(r.rushSteps),warp:r.warps,rate});
      else r.eventsTruncated=true;
    }
  }
  function transition(r,e){if(!r||r.done)return;r.transitions.push({type:e.type,gameTimeSec:e.gameTimeSec??e.songT,sourceSongTimeSec:e.sourceSongTimeSec,rate:e.rate,fromRate:e.fromRate,course:e.course,cycle:e.cycle});}
  function warp(r,player=0,continuous=false){if(!r||r.done)return;r.warps++;r.lastPlayer=player;r.meter=null;if(!continuous){r.lastTime=null;r.wasRush=false;}}
  function purple(r){if(r&&!r.done)r.purpleSteps++;}
  function finish(r,details={}){
    if(!r)return null;if(r.report)return r.report;r.done=true;
    r.report={schemaVersion:2,counting:'legal-empty-cells-v2',kind:'neon-blade-playtest',...r.meta,finishedAt:new Date().toISOString(),...details,
      seconds:round(r.seconds),opportunities:r.opportunities,taken:r.taken,missed:r.missed,
      usagePercent:r.opportunities?Math.round(r.taken/r.opportunities*1000)/10:null,
      normalSteps:round(r.normalSteps),occupiedSteps:r.occupiedSteps,purpleSteps:r.purpleSteps,rushSteps:round(r.rushSteps),rushes:r.rushes,
      speedMin:Number.isFinite(r.speedMin)?r.speedMin:1,speedMax:r.speedMax||1,reconciled:Math.abs(r.normalSteps-r.taken-r.occupiedSteps)<.001,
      warps:r.warps,courses:r.warps,transitions:r.transitions.map(e=>({...e})),maxConsecutiveMissed:r.maxLossStreak,sections:r.sections.map(s=>({...s})),events:r.events.slice(),hunters:r.hunters.slice(),eventsTruncated:r.eventsTruncated,
      interpretation:'この曲・この1回の記録。プレイヤー全体での順位や、初級の難易度を決める評価ではありません。必殺技中の機会消費は集計対象外。'};
    return r.report;
  }
  const api={create,transition,observe,warp,purple,finish};if(typeof module!=='undefined')module.exports=api;else root.NBPlaytest=api;
})(typeof window==='undefined'?globalThis:window);
