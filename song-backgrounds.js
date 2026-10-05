/* Source-audio seconds, independent of tiles, playback rate and input calibration. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBSongBackgrounds=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const song='audio/sombra_en_movimiento.mp3';
  const assets=['01_veil','02_motion','03_still','04_crest'].map(name=>'img/sombra/'+name+'.webp');
  // Provisional musical section boundaries; edit here after listening in-game.
  const cues=[{at:0,scene:0,fade:0},{at:28,scene:1,fade:.3},{at:77,scene:2,fade:1.2},
    {at:95,scene:3,fade:.3},{at:134,scene:2,fade:1.2},{at:149,scene:3,fade:.3},{at:187,scene:0,fade:1.5}];
  function resolve(position,reducedMotion=false){
    const t=Math.max(0,Number.isFinite(position)?position:0);
    let i=0;while(i+1<cues.length&&cues[i+1].at<=t)i++;
    const cue=cues[i],mix=reducedMotion||!cue.fade?1:Math.min(1,(t-cue.at)/cue.fade);
    return {scene:cue.scene,previous:i?cues[i-1].scene:cue.scene,mix};
  }
  let ready=false,pending=null,layers=null,host=null;
  function preload(){
    if(!pending)pending=Promise.all(assets.map(src=>new Promise(resolve=>{
      const im=new Image();im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=src;
    }))).then(results=>ready=results.every(Boolean));
    return pending;
  }
  function render(app,enabled,position,reducedMotion=false){
    if(!host){host=document.getElementById('songBackground');layers=[...host.children];}
    const visible=enabled&&ready;host.hidden=!visible;
    if(!visible){delete app.dataset.songBackground;return;}
    const cue=resolve(position,reducedMotion);app.dataset.songBackground=String(cue.scene);
    const urls=[assets[cue.previous],assets[cue.scene]];
    layers.forEach((layer,i)=>{if(layer.dataset.asset!==urls[i]){layer.style.backgroundImage=`url("${urls[i]}")`;layer.dataset.asset=urls[i];}});
    layers[1].style.opacity=String(cue.mix);
  }
  return {song,assets,cues,resolve,preload,render};
});
