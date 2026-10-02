/* Original Firefly WAVs are retained unchanged, including embedded provenance.
   Runtime envelopes make frequently repeated sounds short and comfortable. */
window.NBSound=(()=>{
  'use strict';
  const spec={veno:{gain:.95,cutoff:9000,length:.28,start:.18},diamond:{gain:.40,cutoff:6500,length:.8,start:.02},warp:{gain:.5,cutoff:5000,length:.85,start:.10},mission:{gain:.16,cutoff:4200,length:.48,start:0},result:{gain:.48,cutoff:7000,length:1.8,start:0}};
  const buffers={},voices=new Set();let lastVeno=null;
  async function load(){await Promise.all(Object.keys(spec).map(async key=>{try{buffers[key]=await ctx.decodeAudioData(await loadAudio('audio/firefly/'+key+'.wav'));}catch(e){console.warn('SE unavailable:',key);}}));}
  function tone(freq,amp=.12,length=.09,delay=0){
    if(!ctx||ctx.state!=='running')return;
    const now=ctx.currentTime+delay,o=ctx.createOscillator(),gain=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(freq*.92,now+length);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(amp,now+.003);gain.gain.exponentialRampToValueAtTime(.0001,now+length);
    o.connect(gain);gain.connect(buses().se);o.onended=()=>{o.disconnect();gain.disconnect();};o.start(now);o.stop(now+length+.01);
  }
  function play(key,judgment){
    if(key==='tap'){if(ctx?.state==='suspended'){ctx.resume().then(()=>tone(740,.10,.05)).catch(()=>{});}else tone(740,.10,.05);return;}
    if(key==='claim'){play('diamond');[784,988,1175].forEach((f,i)=>tone(f,.12,.14,i*.065));return;}
    if(key==='record'){[523,659,784,1046].forEach((f,i)=>tone(f,.12,.24,i*.085));return;}
    if(key==='unlock'){play('diamond');[660,880,1320].forEach((f,i)=>tone(f,.15,.17,i*.075));return;}
    if(key==='miss'){tone(180,.15,.09);return;}
    const buffer=buffers[key],s=spec[key];if(!buffer||!ctx||ctx.state!=='running')return null;
    const now=ctx.currentTime;
    if(key==='veno'&&lastVeno){lastVeno.gain.gain.cancelScheduledValues(now);lastVeno.gain.gain.setTargetAtTime(0,now,.006);try{lastVeno.src.stop(now+.025);}catch(e){}}
    const src=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();src.buffer=buffer;
    filter.type='lowpass';filter.frequency.value=s.cutoff;filter.Q.value=.5;
    if(key==='veno'){
      src.playbackRate.value=judgment==='PERFECT'?1.12:judgment==='GREAT'?1:.87;
      filter.frequency.value=judgment==='PERFECT'?9500:judgment==='GREAT'?5800:2400;
      if(judgment==='PERFECT'){tone(1320,.16,.09);tone(1980,.065,.075,.012);}
      else if(judgment==='GREAT')tone(660,.11,.065);
      else tone(330,.10,.055);
    }
    const amount=s.gain*(judgment==='GOOD'?.78:judgment==='GREAT'?.92:1),duration=Math.min(s.length,(buffer.duration-s.start)/src.playbackRate.value);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(amount,now+.003);gain.gain.setValueAtTime(amount,now+Math.max(.004,duration-.055));gain.gain.linearRampToValueAtTime(0,now+duration);
    src.connect(filter);filter.connect(gain);gain.connect(buses().se);
    const voice={src,gain};voices.add(voice);if(key==='veno')lastVeno=voice;
    src.onended=()=>{voices.delete(voice);if(lastVeno===voice)lastVeno=null;src.disconnect();gain.disconnect();filter.disconnect();};
    if(voices.size>8){const oldest=voices.values().next().value;try{oldest.src.stop();}catch(e){}}
    src.start(now,s.start);src.stop(now+duration+.005);return src;
  }
  function stop(){for(const v of voices)try{v.src.stop();}catch(e){}voices.clear();lastVeno=null;}
  return {load,play,stop};
})();
