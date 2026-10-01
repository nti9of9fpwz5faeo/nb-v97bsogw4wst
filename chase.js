/* Beat-based chase: only spawn at section starts, rewards independent of speed. */
(function(root){
  'use strict';
  const rarities=[{id:'normal',name:'ダイヤ',reward:5,color:'#78ecff',weight:.70},{id:'rare',name:'スター',reward:12,color:'#ffd45e',weight:.25},{id:'rainbow',name:'レインボー',reward:30,color:'#efa6ff',weight:.05}];
  const types=[{id:'slow',name:'のんびり',speed:.12,gap:5,color:'#7be3ce'},{id:'swift',name:'すばやい',speed:.20,gap:6,color:'#9689ff'},{id:'fast',name:'疾風',speed:.28,gap:7,color:'#ff888e'}];
  function spawn(random=Math.random,{warp=false,rushCells=10}={}){
    if(random()>=.35)return null;
    const r=random();const rarity=r<.70?rarities[0]:r<.95?rarities[1]:rarities[2];
    const v=random();const type=v<.5?types[0]:v<.85?types[1]:types[2];
    // Same head start on every warp, independent of stored charge or player input.
    // A saved ultimate still helps, but its ten-cell dash cannot claim a fresh spawn.
    const gap=warp?Math.max(type.gap,rushCells+3+(type.gap-5)):type.gap;
    return {rarity,type,gap,idx:gap,start:null,done:false,outcome:null,previousPlayer:0};
  }
  function advance(chase,t,spb,player,end,playing=true){
    if(!chase||chase.done||!playing)return null;
    if(chase.start===null)chase.start=t;
    const previous=chase.idx;
    chase.idx=chase.gap+Math.max(0,(t-chase.start)/spb-2)*chase.type.speed;
    // Crossing detection handles purple jumps and ultimate movement without skipping a catch.
    if(player>=chase.idx || (player>chase.previousPlayer&&player>=previous&&chase.previousPlayer<=previous&&chase.idx<end)){
      chase.done=true;chase.outcome='caught';return 'caught';
    }
    chase.previousPlayer=player;
    if(chase.idx>=end){chase.done=true;chase.outcome='escaped';return 'escaped';}
    return null;
  }
  const api={rarities,types,spawn,advance};if(typeof module!=='undefined')module.exports=api;else root.NBChase=api;
})(typeof window==='undefined'?globalThis:window);
