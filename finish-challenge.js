/* Futuristic Action: deterministic, finite course. Timing comes from SONGS/audio. */
(function(root){
  'use strict';
  const songFile='audio/Futuristic Action.mp3',version='futuristic-finish-v1';
  // Source-audio changes: opening, rising layers, short break, dense second half, finale.
  // Values: 0 rest, 1 red, 2 blue (two beats), 3 purple (move).
  const sections=[
    {beat:0,name:'はじまり',pattern:[1,0,0,0,1,0,0,0]},
    {beat:36,name:'盛り上がり',pattern:[1,0,1,0,2,0,0,0,1,0,3,0,1,0,0,0]},
    {beat:84,name:'ひと息',pattern:[1,0,0,0]},
    {beat:88,name:'疾走',pattern:[1,1,0,0,3,0,1,0,2,0,0,0,1,0,3,0]},
    {beat:136,name:'ラスト',pattern:[1,0,3,0,1,1,0,0,2,0,0,0,3,0,1,0]}
  ];
  function section(n){return sections.filter(s=>s.beat<=n).at(-1)||sections[0];}
  function create(song,duration){
    if(song.file!==songFile||!Number.isFinite(duration)||duration<=0)throw new Error('Invalid finish-challenge audio');
    const spb=60/song.bpm,end=Math.min(duration,song.gameplayEnd??duration);
    const count=Math.floor((end-song.offset)/spb)+1;
    const beats=Array.from({length:count},(_,n)=>Number((song.offset+n*spb).toFixed(6)));
    const spawn=beats.map((_,n)=>{const s=section(n);return n<4||n>=count-6?0:s.pattern[(n-Math.max(4,s.beat))%s.pattern.length];});
    return {chartVersion:version,fixedTypes:true,beats,spawn:{normal:spawn},end,goal:Math.max(1,Math.floor((count-8)*.65)),start:song.offset+8*spb};
  }
  function limit(chart,sourceTime){
    // Six cells of room allow a burst during hit protection. The final cell opens
    // at the authored musical ending, so rushing cannot skip the song's sections.
    if(sourceTime>=chart.end)return chart.goal;
    return Math.min(chart.goal-1,Math.max(0,Math.floor((sourceTime-chart.start)/(chart.end-chart.start)*chart.goal))+6);
  }
  function percent(index,goal){return Math.floor(Math.max(0,Math.min(1,index/goal))*1000)/10;}
  function key(){return 'neon-blade-finish-best:'+version;}
  function best(){try{const n=Number(localStorage.getItem(key()));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;}catch(_){return 0;}}
  function save(value){const previous=best();if(value>previous)try{localStorage.setItem(key(),String(value));}catch(_){}return previous;}
  const api={songFile,version,sections,section,create,limit,percent,best,save};
  if(typeof module!=='undefined')module.exports=api;else root.NBFinish=api;
})(typeof window==='undefined'?globalThis:window);
