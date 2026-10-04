const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function game(){
 const nodes=new Map(),memory=new Map(),timers=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,dataset:{},classList:{add(){},remove(){},toggle(){}},insertAdjacentHTML(){},addEventListener(){},querySelectorAll(){return []}});return nodes.get(id);}
 const document={getElementById:node,querySelectorAll:()=>[],body:node('body'),addEventListener(){}};
 const x={console,document,localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},Math:Object.assign(Object.create(Math),{random:()=>.1}),setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout(){},state:'play',song:{file:'audio/song.mp3'},isTutorial:()=>false,player:{idx:0},playerVis:()=>x.player.idx,SPB:.5,RUSH_CELLS:5,GOAL_INDEX:35,notes:[],gIdx:8,showHunterArrival(){},songTime:()=>x.time,time:0,raceBeat:t=>t*2,moveLocked:false,rushAnim:null,showRaceResult(){},combo:0,fx:[],texts:[],NBSound:{play(){}},addEventListener(){}};
 x.NBMeasure={start(){},interrupt(){},warp(){},tick(){},finish(){return null}};x.window=x;x.globalThis=x;vm.createContext(x);for(const file of ['progression.js','gems.js','mining.js','workshop.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'),x);x.NBWorkshop.init();x.NBWorkshop.resetRun();return {x,save:()=>{x.NBWorkshop.flush();return x.NBProgression.create(x.localStorage).state}};
}
const gem=(id,type='novice')=>({id,idx:7,hp:0,diamond:true,gem:{type,claimed:false}});
test('walking no longer awards; destroying blocks awards each tier once and preserves XP settlement',()=>{
 const {x,save}=game();x.player.idx=35;x.NBWorkshop.tick(1);assert.equal(save().gems,0);
 for(let n=0;n<10;n++)x.NBWorkshop.judged('PERFECT',n,0);x.NBWorkshop.judged('PERFECT',9,0);assert.equal(save().stats.hits,10);
 for(const [id,type] of ['novice','adept','master','divine'].entries()){const note=gem(id,type);x.NBWorkshop.destroyed(note,2);x.NBWorkshop.destroyed(note,3);x.NBWorkshop.destroyed(gem(id,type),3);}
 assert.equal(save().stats.tiles,4);assert.equal(save().gems,210);
 x.NBWorkshop.nextCourse();x.NBWorkshop.destroyed(gem(10),4);assert.equal(save().gems,215);
 x.state='over';const result={mode:'distance',score:50};x.NBWorkshop.finish(result);x.NBWorkshop.finish(result);assert.equal(save().xp,55);assert.equal(result.rewards.tiles,215);assert.equal(result.gemCounts.novice,2);
});
test('tutorial, paused and finished runs cannot award or consume a diamond',()=>{
 const {x,save}=game(),note=gem(1);x.state='paused';x.NBWorkshop.destroyed(note,0);assert.equal(note.gem.claimed,false);
 x.state='play';x.isTutorial=()=>true;x.NBWorkshop.destroyed(note,0);const tutorial=x.NBWorkshop.prepareNote({id:123});assert.equal(tutorial.gemAssigned,undefined);assert.equal(save().gems,0);
 x.isTutorial=()=>false;x.NBWorkshop.destroyed(note,1);assert.equal(save().gems,5);x.NBWorkshop.finish({mode:'distance',score:0});x.NBWorkshop.destroyed(gem(2),2);assert.equal(save().gems,5);
});
test('style selection persists separately from the wallet, and a run keeps its selected style',()=>{
 const {x,save}=game();x.state='ready';assert.equal(x.NBWorkshop.setGemStyle('hidden'),true);x.NBWorkshop.resetRun();x.state='play';assert.equal(x.NBWorkshop.setGemStyle('glow'),false);x.NBWorkshop.destroyed(gem(1),1);const result={mode:'distance',score:0};x.NBWorkshop.finish(result);assert.equal(result.gemStyle,'hidden');assert.equal(x.localStorage.getItem('neon-blade-block-diamond-style-v1'),'hidden');assert.equal(save().gems,5);
});
