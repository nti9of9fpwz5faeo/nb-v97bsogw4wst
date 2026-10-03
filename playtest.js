/* Passive movement telemetry. No difficulty changes, timing changes or rank estimates. */
(function(root){
  'use strict';
  const chase=typeof module!=='undefined'?require('./chase.js'):root.NBChase;
  const round=n=>Math.round(n*1000)/1000;
  function create(meta){return {meta:{...meta},meter:null,lastPlayer:0,lastTime:null,wasRush:false,done:false,
    seconds:0,opportunities:0,taken:0,missed:0,normalSteps:0,purpleSteps:0,rushSteps:0,rushes:0,warps:0,
    lossStreak:0,maxLossStreak:0,sections:[],events:[],eventsTruncated:false};}
  function observe(r,{player,snapshot,time,rush=false,rebase=false,bonus=0}){
    if(!r||r.done)return;
    const now=Math.max(0,time);if(r.lastTime!==null)r.seconds+=Math.max(0,now-r.lastTime);r.lastTime=now;
    const moved=Math.max(0,player-r.lastPlayer);r.lastPlayer=player;
    const special=rush||r.wasRush;
    if(special)r.rushSteps+=moved;else r.normalSteps+=moved;
    if(rush&&!r.wasRush)r.rushes++;
    const used=special?(chase.observe(r,snapshot,true),0):chase.observe(r,snapshot,rebase)+Math.max(0,bonus);
    r.wasRush=rush;
    const taken=Math.min(used,special?0:moved),missed=Math.max(0,used-taken);
    r.taken+=taken;r.missed+=missed;
    if(taken>0)r.lossStreak=0;
    r.lossStreak+=missed;r.maxLossStreak=Math.max(r.maxLossStreak,r.lossStreak);
    // Twenty-opportunity windows can be compared without confusing blocked time with hesitation.
    for(let i=0;i<used;i++){
      if(r.opportunities%20===0)r.sections.push({from:r.opportunities+1,opportunities:0,taken:0,missed:0,startSeconds:round(r.seconds),endSeconds:round(r.seconds)});
      const s=r.sections[r.sections.length-1];s.opportunities++;s.taken+=i<taken?1:0;s.missed+=i<taken?0:1;s.endSeconds=round(r.seconds);r.opportunities++;
    }
    if(used||moved){
      if(r.events.length<3000)r.events.push({seconds:round(r.seconds),opportunities:used,taken,missed,normalSteps:round(r.normalSteps),rushSteps:round(r.rushSteps),warp:r.warps});
      else r.eventsTruncated=true;
    }
  }
  function warp(r){if(!r||r.done)return;r.warps++;r.lastPlayer=0;r.meter=null;r.lastTime=null;r.wasRush=false;}
  function purple(r){if(r&&!r.done)r.purpleSteps++;}
  function finish(r,details={}){
    if(!r)return null;if(r.report)return r.report;r.done=true;
    r.report={schemaVersion:1,kind:'neon-blade-playtest',...r.meta,finishedAt:new Date().toISOString(),...details,
      seconds:round(r.seconds),opportunities:r.opportunities,taken:r.taken,missed:r.missed,
      usagePercent:r.opportunities?Math.round(r.taken/r.opportunities*1000)/10:null,
      normalSteps:round(r.normalSteps),purpleSteps:r.purpleSteps,rushSteps:round(r.rushSteps),rushes:r.rushes,
      warps:r.warps,maxConsecutiveMissed:r.maxLossStreak,sections:r.sections.map(s=>({...s})),events:r.events.slice(),eventsTruncated:r.eventsTruncated,
      interpretation:'この曲・この1回の記録。プレイヤー全体での順位や、初級の難易度を決める評価ではありません。必殺技中の機会消費は集計対象外。'};
    return r.report;
  }
  const api={create,observe,warp,purple,finish};if(typeof module!=='undefined')module.exports=api;else root.NBPlaytest=api;
})(typeof window==='undefined'?globalThis:window);
