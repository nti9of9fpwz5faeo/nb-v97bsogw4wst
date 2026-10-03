const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function game(){
 const nodes=new Map(),memory=new Map(),timers=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},insertAdjacentHTML(){},addEventListener(){},querySelectorAll(){return []}});return nodes.get(id);}
 const document={getElementById:node,querySelectorAll:()=>[],body:node('body'),addEventListener(){}};
 const x={console,document,localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},Math:Object.assign(Object.create(Math),{random:()=>.1}),setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},state:'play',song:{file:'audio/song.mp3'},isTutorial:()=>false,player:{idx:0},playerVis:()=>x.player.idx,SPB:.5,RUSH_CELLS:5,GOAL_INDEX:35,notes:[],gIdx:8,showHunterArrival(){},songTime:()=>x.time,time:0,raceBeat:t=>t*2,moveLocked:false,rushAnim:null,showRaceResult(){},combo:0,fx:[],texts:[],NBSound:{play(){}},addEventListener(){}};
 x.NBMeasure={start(){},interrupt(){},warp(){},tick(){},finish(){return null}};x.window=x;x.globalThis=x;vm.createContext(x);for(const file of ['progression.js','gems.js','workshop.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),x);x.NBWorkshop.init();x.NBWorkshop.resetRun();return {x,save:()=>{x.NBWorkshop.flush();return x.NBProgression.create(x.localStorage).state}};
}
test('passage pickups pay once, renew on warp, and XP settles once',()=>{
 const {x,save}=game();for(let n=0;n<10;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.judged('PERFECT',9,0);
 assert.equal(save().stats.hits,10);
 x.player.idx=7;x.NBWorkshop.tick(1);x.NBWorkshop.tick(2);assert.equal(save().stats.tiles,1);assert.equal(save().gems,1);
 x.player.idx=23;x.NBWorkshop.tick(3);assert.equal(save().stats.tiles,3);assert.equal(save().gems,3);
 x.player.idx=35;x.NBWorkshop.nextCourse();x.player.idx=0;assert.equal(save().stats.tiles,4);
 x.player.idx=7;x.NBWorkshop.tick(4);assert.equal(save().stats.tiles,5);assert.equal(save().gems,5);
 x.state='over';const result={mode:'distance',score:50};x.NBWorkshop.finish(result);assert.equal(save().xp,55);x.NBWorkshop.finish(result);assert.equal(save().xp,55);assert.equal(result.rewards.tiles,5);
});
test('ultimate collects crossed tiles at visual passage, once',()=>{
 const {x,save}=game();x.rushAnim={};x.player.idx=15;let visual=6.9;x.playerVis=()=>visual;
 x.NBWorkshop.tick(1);assert.equal(save().gems,0);visual=7;x.NBWorkshop.tick(2);assert.equal(save().gems,1);
 visual=14.9;x.NBWorkshop.tick(3);assert.equal(save().gems,2);x.rushAnim=null;x.NBWorkshop.tick(4);assert.equal(save().gems,2);
});
test('tutorial and paused ticks cannot award diamonds or mission progress',()=>{const {x,save}=game();x.state='paused';x.player.idx=20;x.NBWorkshop.tick(1);x.NBWorkshop.judged('PERFECT',1,1);x.NBWorkshop.flush();x.state='play';x.isTutorial=()=>true;for(let n=0;n<200;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.tick(1);x.NBWorkshop.finish({mode:'distance',score:400});assert.equal(save().gems,0);assert.equal(save().xp,0);});
