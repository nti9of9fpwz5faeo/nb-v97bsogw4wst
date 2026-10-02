const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function game(){
 const nodes=new Map(),memory=new Map(),timers=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},insertAdjacentHTML(){},addEventListener(){},querySelectorAll(){return []}});return nodes.get(id);}
 const document={getElementById:node,querySelectorAll:()=>[],body:node('body'),addEventListener(){}};
 const x={console,document,localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},Math:Object.assign(Object.create(Math),{random:()=>.1}),setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},state:'play',song:{file:'audio/song.mp3'},isTutorial:()=>false,player:{idx:0},playerVis:()=>x.player.idx,SPB:.5,RUSH_CELLS:10,GOAL_INDEX:40,songTime:()=>x.time,time:0,combo:0,fx:[],texts:[],NBSound:{play(){}},addEventListener(){}};
 x.window=x;x.globalThis=x;vm.createContext(x);for(const file of ['progression.js','chase.js','workshop.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),x);x.NBWorkshop.init();x.NBWorkshop.resetRun();return {x,save:()=>{x.NBWorkshop.flush();return x.NBProgression.create(x.localStorage).state}};
}
test('manual catches pay exactly once; no respawn after catching; XP settles once',()=>{
 const {x,save}=game();for(let n=0;n<10;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.judged('PERFECT',9,0);
 assert.equal(save().stats.hits,10);assert.equal(save().gems,0);
 x.player.idx=15;x.NBWorkshop.tick(1);assert.equal(save().stats.tiles,0);
 x.NBWorkshop.chooseHunter(true);x.NBWorkshop.chooseHunter(true);assert.equal(save().stats.tiles,1);assert.equal(save().gems,5);
 x.NBWorkshop.nextCourse();x.player.idx=0;x.NBWorkshop.tick(0);x.player.idx=16;x.NBWorkshop.tick(2);x.NBWorkshop.chooseHunter(true);assert.equal(save().stats.tiles,1);
 x.state='over';let result={mode:'distance',score:50};x.NBWorkshop.finish(result);assert.equal(save().xp,55);x.NBWorkshop.finish(result);assert.equal(save().xp,55);
});
test('passing grows the same ninja across warps, pending reward is lost on run end',()=>{
 const {x,save}=game();x.player.idx=15;x.NBWorkshop.tick(1);x.NBWorkshop.chooseHunter(false);
 x.player.idx=40;x.NBWorkshop.nextCourse();x.player.idx=0;x.NBWorkshop.tick(0);x.player.idx=5;x.NBWorkshop.tick(1);
 assert.equal(save().gems,0);x.NBWorkshop.chooseHunter(true);assert.equal(save().gems,15);
 x.NBWorkshop.resetRun();x.player.idx=15;x.NBWorkshop.tick(1);x.state='over';x.NBWorkshop.finish({mode:'distance',score:0});x.NBWorkshop.chooseHunter(true);assert.equal(save().gems,15);
 x.state='play';x.NBWorkshop.resetRun();x.player.idx=0;x.NBWorkshop.tick(0);x.player.idx=14;x.NBWorkshop.tick(1);x.NBWorkshop.chooseHunter(true);assert.equal(save().gems,20);
});
test('tutorial and paused ticks cannot award diamonds or mission progress',()=>{const {x,save}=game();x.state='paused';x.player.idx=20;x.NBWorkshop.tick(1);x.NBWorkshop.judged('PERFECT',1,1);x.NBWorkshop.flush();x.state='play';x.isTutorial=()=>true;for(let n=0;n<200;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.tick(1);x.NBWorkshop.finish({mode:'distance',score:400});assert.equal(save().gems,0);assert.equal(save().xp,0);});
