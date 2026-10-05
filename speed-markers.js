/* Static tile stamps. Slow is ready for future speed events; no slow events are spawned. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NBSpeedMarkers=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const stamps={};
  function kind(from,to){return to>from?'fast':to<from?'slow':null;}
  function preload(){return Promise.all(['fast','slow'].map(name=>new Promise(resolve=>{
    const im=new Image();im.onload=()=>{
      const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
      g.drawImage(im,0,0,512,512);g.globalCompositeOperation='source-in';g.fillStyle='#183f62';g.fillRect(0,0,512,512);stamps[name]=c;resolve();
    };im.onerror=()=>resolve();im.src='img/speed/'+name+'.png';
  })));}
  function draw(g,name,x,y,cell,alpha=1){
    const stamp=stamps[name];if(!stamp)return;
    const size=cell*.72;g.save();g.globalAlpha*=.72*alpha;g.drawImage(stamp,x-size/2,y-size/2,size,size);g.restore();
  }
  return {kind,preload,draw};
});
