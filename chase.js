/* Four ranked ninjas: discrete cells, timed teleports and legitimate ultimate catches. */
(function(root){
  'use strict';
  const types=[
    {id:'novice',name:'初級',reward:5,color:'#73eaff',weight:.60,jump:3,wait:12},
    {id:'adept',name:'中級',reward:15,color:'#ffd44f',weight:.30,jump:4,wait:11},
    {id:'master',name:'上級',reward:40,color:'#e878ff',weight:.095,jump:6,wait:10},
    {id:'divine',name:'神級',reward:150,color:'#fff4b1',weight:.005,jump:8,wait:9}
  ];
  function spawn(random=Math.random){
    if(random()>=.28)return null;
    const roll=random();let sum=0;const type=types.find(x=>(sum+=x.weight)>roll)||types[3];
    return {type,rarity:type,trigger:14+Math.floor(random()*4),idx:null,visible:false,done:false,outcome:null,nextAt:null,surpriseUntil:null,events:[]};
  }
  function advance(n,t,spb,player,end,playing=true){
    if(!n||n.done||!playing)return null;
    if(!n.visible){
      if(player<n.trigger)return null;
      if(player>end-5){n.done=true;n.outcome='skipped';return null;}
      n.visible=true;n.idx=Math.ceil(player)+2;n.surpriseUntil=t+.28;n.nextAt=t+.28;
      n.events.push({idx:n.idx,t});return 'appeared';
    }
    if(player>=n.idx){n.done=true;n.outcome='caught';n.events.push({idx:n.idx,t});return 'caught';}
    if(t>=n.nextAt){
      n.events.push({idx:n.idx,t});n.idx+=n.type.jump;
      if(n.idx>=end){n.done=true;n.outcome='escaped';return 'escaped';}
      n.events.push({idx:n.idx,t});n.nextAt=t+n.type.wait*spb;return 'warped';
    }
    return null;
  }
  const api={types,rarities:types,spawn,advance};
  if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
