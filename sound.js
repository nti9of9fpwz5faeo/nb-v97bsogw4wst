/* Original Firefly WAVs are retained unchanged, including embedded provenance.
   Runtime envelopes make frequently repeated sounds short and comfortable. */
window.NBSound=(()=>{
  'use strict';
  const spec={veno:{gain:.40,cutoff:5200,length:.24,start:.005},diamond:{gain:.40,cutoff:6500,length:.8,start:.02},warp:{gain:.5,cutoff:5000,length:.85,start:.10},mission:{gain:.16,cutoff:4200,length:.48,start:0},result:{gain:.48,cutoff:7000,length:1.8,start:0}};
  const buffers={},voices=new Set();let lastVeno=null;
  async function load(){await Promise.all(Object.keys(spec).map(async key=>{try{buffers[key]=await ctx.decodeAudioData(await loadAudio('audio/firefly/'+key+'.wav'));}catch(e){console.warn('SE unavailable:',key);}}));}
  function play(key,judgment){
    const buffer=buffers[key],s=spec[key];if(!buffer||!ctx||ctx.state!=='running')return null;
    const now=ctx.currentTime;
    if(key==='veno'&&lastVeno){lastVeno.gain.gain.cancelScheduledValues(now);lastVeno.gain.gain.setTargetAtTime(0,now,.006);try{lastVeno.src.stop(now+.025);}catch(e){}}
    const src=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();src.buffer=buffer;
    filter.type='lowpass';filter.frequency.value=s.cutoff;filter.Q.value=.5;
    const amount=s.gain*(judgment==='GOOD'?.65:judgment==='GREAT'?.88:1),duration=Math.min(s.length,buffer.duration-s.start);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(amount,now+.003);gain.gain.setValueAtTime(amount,now+Math.max(.004,duration-.055));gain.gain.linearRampToValueAtTime(0,now+duration);
    src.connect(filter);filter.connect(gain);gain.connect(buses().se);
    const voice={src,gain};voices.add(voice);if(key==='veno')lastVeno=voice;
    src.onended=()=>{voices.delete(voice);if(lastVeno===voice)lastVeno=null;src.disconnect();gain.disconnect();filter.disconnect();};
    if(voices.size>8){const oldest=voices.values().next().value;try{oldest.src.stop();}catch(e){}}
    src.start(now,s.start,duration);return src;
  }
  function stop(){for(const v of voices)try{v.src.stop();}catch(e){}voices.clear();lastVeno=null;}
  return {load,play,stop};
})();
