/* Piecewise playback clock. Game seconds never jump when rate or song cycle changes. */
(function(root){
  'use strict';
  function create({duration,bpm,offset=0,beats,correction=0,rate=1}){
    if(!(duration>0&&bpm>0&&rate>0))throw new Error('Invalid playback clock');
    const spb=60/bpm;
    const grid=(beats?.length?beats:Array.from({length:Math.ceil(duration/spb)+1},(_,n)=>offset+n*spb))
      .map((s,index)=>({s:s+correction,index})).filter(b=>b.s>=0&&b.s<duration);
    if(!grid.length)grid.push({s:0,index:0});
    const segments=[{t:0,s:0,rate}];
    function atTime(t){let i=segments.length-1;while(i>0&&segments[i].t>t)i--;return segments[i];}
    function atSource(s){let i=segments.length-1;while(i>0&&segments[i].s>s)i--;return segments[i];}
    function source(t){const a=atTime(t);return a.s+(t-a.t)*a.rate;}
    function time(s){const a=atSource(s);return a.t+(s-a.s)/a.rate;}
    function change(t,rate){if(!(rate>0)||t<segments.at(-1).t)throw new Error('Invalid rate change');const s=source(t);segments.push({t,s,rate});return {t,s,rate};}
    const local=n=>((n%grid.length)+grid.length)%grid.length;
    function beatSource(n){return Math.floor(n/grid.length)*duration+grid[local(n)].s;}
    function nearest(t){const s=source(t),cycle=Math.floor(s/duration),pos=s-cycle*duration;let lo=0,hi=grid.length;
      while(lo<hi){const m=(lo+hi)>>1;if(grid[m].s<pos)lo=m+1;else hi=m;}
      const right=cycle*grid.length+lo,left=right-1;
      return t-time(beatSource(left))<time(beatSource(right))-t?left:right;
    }
    return {source,time,change,segments,duration,beatCount:grid.length,beatSource,beat:n=>time(beatSource(n)),nearest,
      chartIndex:n=>grid[local(n)].index,cycle:t=>Math.max(0,Math.floor(source(t)/duration)),
      position:t=>{const s=source(t);return s<0?s:((s%duration)+duration)%duration;}};
  }
  const api={create};if(typeof module!=='undefined')module.exports=api;else root.NBEndlessClock=api;
})(typeof window==='undefined'?globalThis:window);
