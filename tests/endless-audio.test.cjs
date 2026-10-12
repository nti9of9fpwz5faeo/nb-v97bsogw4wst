// Render real Web Audio samples: source continuity, expected pitch and beat accuracy.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.addScriptTag({path:path.resolve(__dirname,'../endless-clock.js')});
  const result=await page.evaluate(async()=>{
   const sr=48000,duration=2.4,length=sr*5;
   const clock=NBEndlessClock.create({duration,bpm:150,offset:.1});
   clock.change(clock.beat(2),1.1);clock.change(clock.beat(5),2.2);
   const render=async(pulses)=>{
    const ac=new OfflineAudioContext(1,length,sr),buf=ac.createBuffer(1,sr*duration,sr),data=buf.getChannelData(0);
    for(let i=0;i<data.length;i++){
     const t=i/sr;
     if(pulses){for(let n=0;n<clock.beatCount;n++){const d=(t-clock.beatSource(n))/.004;if(Math.abs(d)<1)data[i]+=Math.cos(d*Math.PI/2)**2;}}
     else data[i]=Math.sin(2*Math.PI*220*t);
    }
    const src=ac.createBufferSource();src.buffer=buf;src.loop=true;
    for(const s of clock.segments)src.playbackRate.setValueAtTime(s.rate,s.t);
    src.connect(ac.destination);src.start();return (await ac.startRendering()).getChannelData(0);
   };
   const tone=await render(false),pulse=await render(true);
   let maxJump=0,minRms=1;
   for(let i=1;i<tone.length;i++)maxJump=Math.max(maxJump,Math.abs(tone[i]-tone[i-1]));
   for(let i=0;i<tone.length-480;i+=480){let sum=0;for(let j=i;j<i+480;j++)sum+=tone[j]**2;minRms=Math.min(minRms,Math.sqrt(sum/480));}
   const frequencies=[.2,1.1,3.2].map(t=>{let crosses=0;for(let i=Math.floor(t*sr);i<(t+.2)*sr;i++)if(tone[i]<=0&&tone[i+1]>0)crosses++;return {actual:crosses/.2,expected:220*clock.rateAt(t)};});
   let maxBeatError=0,count=0;
   for(let n=0;clock.beat(n)<4.95;n++){
    const expected=clock.beat(n),center=Math.round(expected*sr);let peak=center;
    for(let i=center-240;i<=center+240;i++)if(pulse[i]>pulse[peak])peak=i;
    maxBeatError=Math.max(maxBeatError,Math.abs(peak/sr-expected));count++;
   }
   return {maxJump,minRms,frequencies,maxBeatError,beats:count};
  });
  assert.ok(result.minRms>.6,'no unintended silent windows');assert.ok(result.maxJump<.08,'no waveform discontinuity at speed changes/loop');
  for(const x of result.frequencies)assert.ok(Math.abs(x.actual-x.expected)<=5.1,'pitch follows only the requested playback rate');
  assert.ok(result.maxBeatError<.004,'rendered beats stay within one audio render block of the judge clock');
  console.log('PASS: rendered Web Audio continuity/pitch/synchronization',JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
