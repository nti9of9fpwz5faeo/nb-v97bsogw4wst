const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function game(){
 const nodes=new Map(),memory=new Map(),timers=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},insertAdjacentHTML(){},addEventListener(){},querySelectorAll(){return []}});return nodes.get(id);}
 const document={getElementById:node,querySelectorAll:()=>[],body:node('body'),addEventListener(){}};
 const x={console,document,localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},Math:Object.assign(Object.create(Math),{random:()=>.1}),setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},state:'play',song:{file:'audio/song.mp3'},isTutorial:()=>false,player:{idx:0},playerVis:()=>x.player.idx,SPB:.5,RUSH_CELLS:5,GOAL_INDEX:35,notes:[],gIdx:8,showHunterArrival(){},songTime:()=>x.time,time:0,raceBeat:t=>t*2,moveLocked:false,rushAnim:null,showRaceResult(){},combo:0,fx:[],texts:[],NBSound:{play(){}},addEventListener(){}};
 x.window=x;x.globalThis=x;vm.createContext(x);for(const file of ['progression.js','chase.js','workshop.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),x);x.NBWorkshop.init();x.NBWorkshop.resetRun();return {x,save:()=>{x.NBWorkshop.flush();return x.NBProgression.create(x.localStorage).state}};
}
test('capture pays once, warp preserves chase, misses pay nothing and XP settles once',()=>{
 const {x,save}=game();for(let n=0;n<10;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.judged('PERFECT',9,0);
 assert.equal(save().stats.hits,10);
 let n=x.NBWorkshop.beginRace('novice');x.NBWorkshop.tick(0);
 x.player.idx=7;x.NBWorkshop.tick(1);x.NBWorkshop.tick(2);assert.equal(save().stats.tiles,1);assert.equal(save().gems,5);
 x.NBWorkshop.nextCourse();x.player.idx=0;n=x.NBWorkshop.beginRace('master');n.idx=40;n.from=40;n.origin=28;n.used=6;n.remaining=20;
 x.player.idx=35;x.NBWorkshop.nextCourse();x.player.idx=0;
 assert.equal(x.NBWorkshop.beginRace('novice'),n);assert.equal(n.idx,5);assert.equal(n.remaining,20);
 x.NBWorkshop.tick(50,true,20);x.NBWorkshop.tick(51);assert.equal(n.outcome,'lost');assert.equal(save().gems,5);
 x.state='over';const result={mode:'distance',score:50};x.NBWorkshop.finish(result);assert.equal(save().xp,55);x.NBWorkshop.finish(result);assert.equal(save().xp,55);
});
test('no event appears midcourse and tutorial has no event',()=>{
 const {x}=game();x.player.idx=1;assert.equal(x.NBWorkshop.beginRace('divine'),null);
 x.player.idx=0;x.isTutorial=()=>true;assert.equal(x.NBWorkshop.beginRace('divine'),null);
});
test('tutorial and paused ticks cannot award diamonds or mission progress',()=>{const {x,save}=game();x.state='paused';x.player.idx=20;x.NBWorkshop.tick(1);x.NBWorkshop.judged('PERFECT',1,1);x.NBWorkshop.flush();x.state='play';x.isTutorial=()=>true;for(let n=0;n<200;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.tick(1);x.NBWorkshop.finish({mode:'distance',score:400});assert.equal(save().gems,0);assert.equal(save().xp,0);});
