/* Short horizontal courses at the normal game's tile scale. */
(function(root){
  const KEY='neon-blade-tutorial-courses-v1';
  const stages=[
    {kind:'break',title:'赤をブレイク',intro:'赤が重なったら ブレイク',gates:[0,2,4],types:['red','red','red']},
    {kind:'blue',title:'青は２拍で２回',intro:'青は ブレイク → 次の拍もブレイク',gates:[0,2,4],types:['blue','red','blue']},
    {kind:'purple',title:'紫には「進む」',intro:'紫が重なったら 進む',gates:[0,2,3,4],types:['purple','red','blue','purple']}
  ];
  function read(storage){try{const p=JSON.parse(storage.getItem(KEY));return {step:Number.isInteger(p?.step)?Math.max(0,Math.min(2,p.step)):0,complete:p?.complete===true};}catch(_){return {step:0,complete:false};}}
  function save(storage,step,complete=false){try{storage.setItem(KEY,JSON.stringify({step,complete}));return true;}catch(_){return false;}}
  function path(){return Array.from({length:8},(_,i)=>({c:7-i,r:2}));}
  const api={KEY,stages,read,save,path,bpm:90,goal:5,columns:8,rows:5};
  if(typeof module!=='undefined')module.exports=api;else root.NBTutorial=api;
})(typeof window==='undefined'?globalThis:window);
