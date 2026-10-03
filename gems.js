/* Static tile pickups: advancing across a tile collects it once, without changing inputs. */
(function(root){
  'use strict';
  function create(goal=35){
    const limit=Number.isFinite(Number(goal))?Math.max(0,Math.floor(Number(goal))):0;
    const tiles=[];
    for(let idx=7;idx<limit;idx+=7)tiles.push({idx,value:1,collected:false});
    return {tiles,last:0};
  }
  function collect(course,position){
    if(!course||!Number.isFinite(position)||position<=course.last)return [];
    const from=course.last;course.last=position;
    const found=course.tiles.filter(tile=>!tile.collected&&tile.idx>from&&tile.idx<=position);
    found.forEach(tile=>{tile.collected=true;});
    return found;
  }
  const api={create,collect};
  if(typeof module!=='undefined')module.exports=api;else root.NBPickup=api;
})(typeof window==='undefined'?globalThis:window);
