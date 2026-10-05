/* Source-audio seconds, independent of tiles, playback rate and input calibration. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBSongBackgrounds=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const song='audio/sombra_en_movimiento.mp3';
  const assets=['01_veil','02_motion','03_still','04_crest'].map(name=>'img/sombra/'+name+'.webp');
  // Provisional musical section boundaries; edit here after listening in-game.
  const anchors=[{at:0,scene:0,fade:0},{at:28,scene:1,fade:.3},{at:77,scene:2,fade:1.2},
    {at:95,scene:3,fade:.3},{at:134,scene:2,fade:1.2},{at:149,scene:3,fade:.3},{at:187,scene:0,fade:1.5}];
  let bpm=150,offset=.385,beatGrid=null;
  const cues=anchors.map(c=>({...c}));
  function configure(tempo=150,start=.385,beats){
    bpm=tempo>0?tempo:150;offset=Number.isFinite(start)?start:0;beatGrid=beats?.length?beats:null;
    const snap=t=>beatGrid?beatGrid.reduce((best,v)=>Math.abs(v-t)<Math.abs(best-t)?v:best,beatGrid[0]):offset+Math.round((t-offset)*bpm/60)*60/bpm;
    anchors.forEach((c,i)=>Object.assign(cues[i],c,{at:i?snap(c.at):0}));
  }
  configure();
  function nearestBeat(t){
    if(!beatGrid)return {at:offset+Math.floor((t-offset)*bpm/60)*60/bpm,index:Math.floor((t-offset)*bpm/60)};
    let lo=0,hi=beatGrid.length;while(lo<hi){const mid=(lo+hi)>>1;if(beatGrid[mid]<=t)lo=mid+1;else hi=mid;}
    return {at:lo?beatGrid[lo-1]:offset-60/bpm,index:lo-1};
  }
  // All motion comes from source time; pausing, retrying and warping need no animation timers.
  function atmosphere(position,reducedMotion=false){
    const t=Math.max(0,position),beat=60/bpm,levels=[.22,.55,.12,.9];
    let i=0;while(i+1<cues.length&&cues[i+1].at<=t)i++;
    const current=cues[i],next=cues[i+1],rising=i>0&&levels[current.scene]>levels[cues[i-1].scene];
    const build=next&&levels[next.scene]>levels[current.scene]?Math.max(0,1-(next.at-t)/(4*beat)):0;
    const energy=levels[current.scene]*(1-.8*build);
    const hit=nearestBeat(t),pulse=hit.index>=0&&hit.index%2===0?Math.max(0,1-(t-hit.at)/(.75*beat)):0;
    const release=rising?Math.max(0,1-(t-current.at)/(1.5*beat)):0;
    return {energy,build,pulse:reducedMotion?0:pulse*energy,release:reducedMotion?0:release,
      spread:reducedMotion?0:rising?1-release:0,flow:reducedMotion?0:Math.sin((t-offset)*Math.PI/(8*beat))*energy};
  }
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
    const a=atmosphere(position,reducedMotion);
    app.style.setProperty('--music-light',reducedMotion?'0':(.05+a.energy*.10+a.pulse*.10).toFixed(3));
    app.style.setProperty('--music-burst',(a.release*.42).toFixed(3));
    app.style.setProperty('--music-spread',(a.spread*30).toFixed(2)+'px');
    app.style.setProperty('--music-flow',(a.flow*32).toFixed(2)+'px');
    app.style.setProperty('--music-ring-scale',(1+(1-a.release)*.55).toFixed(3));
  }
  return {song,assets,cues,configure,resolve,atmosphere,preload,render};
});
