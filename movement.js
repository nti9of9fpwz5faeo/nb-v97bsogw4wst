/* Passive movement opportunity accounting. Does not alter play. */
(function(root){
  'use strict';
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
  const api={sample,observe,account};
  if(typeof module!=='undefined')module.exports=api;else root.NBMovement=api;
})(typeof window==='undefined'?globalThis:window);
