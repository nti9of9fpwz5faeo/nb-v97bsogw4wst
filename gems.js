/* Block diamonds. Reward assignment is independent of the visual style and gameplay RNG. */
(function(root){
  'use strict';
  const types=Object.freeze([
    Object.freeze({id:'novice',name:'初級',value:5,weight:.60,shine:.18,hits:4,color:'#d8f5ff'}),
    Object.freeze({id:'adept',name:'中級',value:15,weight:.28,shine:.25,hits:6,color:'#43d6ff'}),
    Object.freeze({id:'master',name:'上級',value:40,weight:.11,shine:.34,hits:8,color:'#ba7cff'}),
    Object.freeze({id:'divine',name:'神級',value:150,weight:.01,shine:.44,hits:12,color:'#ffc45c'})
  ]);
  const chance=.08;
  function hash(value){let x=value>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return (x^(x>>>16))>>>0;}
  function create(seed=0){return {seed:Number(seed)>>>0};}
  function roll(pick,tier){
    if(!Number.isFinite(pick)||pick<0||pick>=chance||!Number.isFinite(tier)||tier<0||tier>=1)return null;
    let threshold=0;const type=types.find(t=>(threshold+=t.weight)>tier)||types[types.length-1];
    return {type:type.id,claimed:false};
  }
  function assign(note,course){
    if(!note||!course||note.gemAssigned||!Number.isInteger(note.id))return note;
    const key=(course.seed^Math.imul(note.id+1,0x9e3779b1))>>>0;
    note.gem=roll(hash(key)/4294967296,hash(key^0xa5a5a5a5)/4294967296);note.gemAssigned=true;return note;
  }
  function info(note){return note?.gem&&!note.gem.claimed?types.find(t=>t.id===note.gem.type)||null:null;}
  function claim(note){const type=info(note);if(!type)return null;note.gem.claimed=true;return type;}
  function shine(note,style){return style==='glow'?(info(note)?.shine||0):0;}
  const api={types,chance,create,roll,assign,info,claim,shine};
  if(typeof module!=='undefined')module.exports=api;else root.NBBlockGems=api;
})(typeof window==='undefined'?globalThis:window);
