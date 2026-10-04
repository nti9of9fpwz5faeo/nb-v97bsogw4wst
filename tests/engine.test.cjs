const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
test('one-song mode charges ultimate from actual break and purple actions',()=>{
 const x={EL_SCORING:'rush',RUSH_GAIN:{PERFECT:4},RUSH_FULL:120,rushUnits:0,rushAnim:null,rushGainAt:0,performance:{now:()=>0},showElLine(){},judgeOf:()=> 'PERFECT',speedOn:()=>false,endlessScoreOn:()=>true,isTutorial:()=>false,notes:[],player:{idx:1},effects:[],fx:[],playSE(){},flashBtn(){},showJudge(){},NBWorkshop:{judged(){},tick(){},destroyed(note){x.dropped.push(note.id)}},dropped:[],NBDiamond:{active:()=>false,is:()=>false},countPerfect(){},diagResult(){},diagShow(){},r2:x=>x,msText:()=>'',diagEv(){},freeMove(){},stepBonus:null,combo:0,secPerfect:0,warpReady:false,moveLocked:false,rushOn:()=>true,rushRelease:'manual',rushReady:()=>false,charState:'',charUntil:0};
 vm.createContext(x);
 vm.runInContext(source.slice(source.indexOf('function elBreak('),source.indexOf('function elBreak(')+source.slice(source.indexOf('function elBreak(')).indexOf('\nfunction ',1)),x);
 vm.runInContext(source.slice(source.indexOf('function doAction('),source.indexOf('let earlyInput = null;')),x);
 x.notes=[{id:1,idx:1,hp:1}];vm.runInContext("doAction('break',1,0,0,null)",x);assert.equal(x.rushUnits,4);
 x.notes=[{id:2,idx:1,hp:1,purple:true}];vm.runInContext("doAction('charge',2,0,0,null)",x);assert.equal(x.rushUnits,8);assert.deepEqual(x.dropped,[1,2]);
 x.notes=[{id:3,idx:1,hp:2}];vm.runInContext("doAction('break',3,0,0,null)",x);assert.deepEqual(x.dropped,[1,2]);vm.runInContext("doAction('break',4,0,0,null)",x);assert.deepEqual(x.dropped,[1,2,3]);
});
