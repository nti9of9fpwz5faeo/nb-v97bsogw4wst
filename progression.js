/* Local play-test progression. Never use this ledger to validate real-money purchases. */
(function (root) {
  'use strict';
  const KEY = 'neon-blade-progress-v1';
  const groups = [
    ['hits', 'リズムをつかめ', 'GREAT以上', [150, 500, 1500, 4000], [8, 12, 20, 35]],
    ['steps', 'その先へ', '最高STEPS', [100, 250, 600, 1200], [8, 12, 20, 35]],
    ['combo', 'つなぐ力', '最大コンボ', [30, 60, 100, 150], [5, 10, 20, 30]],
    ['rush', '刃を解き放て', '必殺技の発動', [10, 30, 80, 200], [8, 12, 20, 35]],
    ['tiles', 'ダイヤハンター', '忍者を捕まえる', [3, 15, 40, 100], [5, 12, 20, 35]]
  ];
  const legacyTargets = {hits:[20,100,300,800],steps:[50,100,200,400],combo:[10,20,50,100],rush:[1,5,15,40],tiles:[1,5,15,40]};
  const missions = groups.flatMap(([stat, title, label, targets, rewards]) => targets.map((target, tier) => ({
    id: stat + '-' + legacyTargets[stat][tier], stat, title, label, target, reward: rewards[tier], tier: tier + 1
  })));
  const themes = [
    {id: 'classic', name: 'ネオンシティ', tag: 'いつもの光の道', price: 0, colors: ['#075ffa', '#00bff2', '#11d6fb']},
    {id: 'aurora', name: 'オーロラリンク', tag: '澄んだ光と、きらめく結晶', price: 60, colors: ['#1737b8', '#00bdab', '#99ffe0']},
    {id: 'sunset', name: 'サンセットドライブ', tag: '夕空を走る、黄金の回路', price: 160, colors: ['#6831c5', '#ff8975', '#ffdc8a']}
  ];
  // Reserved content: no audio, price, purchase, or playable route until release.
  const specialStages = [
    {id: 'special-stage-01', name: '特別ステージ', description: '曲に合わせた特別な景色と演出。新しい挑戦を準備中。', status: 'coming-soon', songId: null, price: null}
  ];
  const songs = [
    {id:'audio/shatter_forward.mp3',price:0}, {id:'audio/song.mp3',price:0},
    {id:'audio/metronomic_drive.mp3',price:0}, {id:'audio/neon_rush.mp3',price:80,rank:3},
    {id:'audio/frostbite.mp3',price:100,rank:6}, {id:'audio/stutter.mp3',price:120},
    {id:'audio/bass_arcade.mp3',price:140}, {id:'audio/tutorial.mp3',price:0}
  ];
  const heroes = [{id:'ninja',price:0},{id:'volt',price:350},{id:'prism',price:400},{id:'veno',price:450},{id:'echo',price:500}];
  const rankFloor = rank => 120 * (rank - 1) + 20 * (rank - 1) * (rank - 2);
  function rankInfo(xp) { let rank=1; while(rank<999 && xp>=rankFloor(rank+1))rank++; return {rank,xp,progress:xp-rankFloor(rank),need:rankFloor(rank+1)-rankFloor(rank)}; }
  const dayKey = (now=Date.now()) => new Date(now+9*3600000).toISOString().slice(0,10);
  const dailyMissions=[{id:'hits',stat:'hits',title:'リズムに乗ろう',label:'GREAT以上',target:150,reward:5},{id:'steps',stat:'steps',title:'今日の一歩',label:'合計STEPS',target:150,reward:5},{id:'rush',stat:'rush',title:'必殺技を決めよう',label:'必殺技',target:3,reward:5}];
  const songMissions=[{id:'hits150',stat:'hits',target:150,label:'GREAT以上 150回',reward:5},{id:'steps100',stat:'steps',target:100,label:'100 STEPS到達',reward:5},{id:'hits500',stat:'hits',target:500,label:'GREAT以上 500回',reward:8},{id:'steps250',stat:'steps',target:250,label:'250 STEPS到達',reward:8},{id:'hits1500',stat:'hits',target:1500,label:'GREAT以上 1,500回',reward:12},{id:'steps500',stat:'steps',target:500,label:'500 STEPS到達',reward:12}];
  const fresh = () => ({version: 3, pendingDaily:[], daily:{day:dayKey(),stats:{hits:0,steps:0,rush:0},claimed:[]}, songStats:{}, adReward:null, xp:0, songs:songs.filter(s=>!s.price).map(s=>s.id), heroes:['ninja'], testGrants: [], gems: 0, earned: 0, stats: {hits: 0, steps: 0, combo: 0, rush: 0, tiles: 0}, claimed: [], themes: ['classic'], theme: 'classic'});
  const integer = v => Number.isSafeInteger(v) && v >= 0;
  function validate(raw) {
    if (!raw || ![1,2,3].includes(raw.version) || !integer(raw.gems) || !integer(raw.earned) || !raw.stats || !Array.isArray(raw.claimed) || !Array.isArray(raw.themes)) throw Error('invalid save');
    const out = fresh();
    out.gems = raw.gems; out.earned = raw.earned;
    out.testGrants = Array.isArray(raw.testGrants) ? raw.testGrants.filter(x=>x==='v56-shopping') : [];
    for (const key of Object.keys(out.stats)) {
      if (!integer(raw.stats[key])) throw Error('invalid stat');
      out.stats[key] = raw.stats[key];
    }
    out.claimed = [...new Set(raw.claimed.filter(id => missions.some(m => m.id === id)))];
    out.themes = [...new Set(['classic', ...raw.themes.filter(id => themes.some(t => t.id === id))])];
    out.theme = out.themes.includes(raw.theme) ? raw.theme : 'classic';
    if(raw.version>=2){
      if(!integer(raw.xp)||!Array.isArray(raw.songs)||!Array.isArray(raw.heroes))throw Error('invalid collection');
      out.xp=raw.xp;
      out.songs=[...new Set([...out.songs,...raw.songs.filter(id=>songs.some(s=>s.id===id))])];
      out.heroes=[...new Set(['ninja',...raw.heroes.filter(id=>heroes.some(h=>h.id===id))])];
    }
    if(raw.daily && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily.day) && raw.daily.stats && ['hits','steps','rush'].every(k=>integer(raw.daily.stats[k])) && Array.isArray(raw.daily.claimed))out.daily={day:raw.daily.day,stats:{...raw.daily.stats},claimed:raw.daily.claimed.filter(id=>dailyMissions.some(m=>m.id===id))};
    for(const [id,v] of Object.entries(raw.songStats||{}))if(songs.some(s=>s.id===id)&&v&&integer(v.hits)&&integer(v.steps)&&Array.isArray(v.claimed))out.songStats[id]={hits:v.hits,steps:v.steps,claimed:v.claimed.filter(id=>songMissions.some(m=>m.id===id))};
    if(raw.adReward&&typeof raw.adReward.id==='string'&&integer(raw.adReward.amount)&&typeof raw.adReward.claimed==='boolean')out.adReward={...raw.adReward};
    if(Array.isArray(raw.pendingDaily))out.pendingDaily=raw.pendingDaily.filter((v,i,a)=>v&&/^\d{4}-\d{2}-\d{2}$/.test(v.day)&&v.day<out.daily.day&&dailyMissions.some(m=>m.id===v.id)&&a.findIndex(x=>x.day===v.day&&x.id===v.id)===i).map(v=>({day:v.day,id:v.id}));
    return out;
  }
  function create(storage) {
    let state = fresh(), timer = null, dirty = false, readOnly = false, error = '';
    try { const raw = storage.getItem(KEY); if (raw !== null) {
      const parsed=JSON.parse(raw);state = validate(parsed);
      if(parsed.version===1){const previous=storage.getItem('neon-blade-character');if(heroes.some(h=>h.id===previous))state.heroes=[...new Set([...state.heroes,previous])];}
    } }
    catch (_) { error = '保存データを読み込めませんでした。今回は保存せずに遊べます。'; readOnly = true; }
    function flush() {
      clearTimeout(timer); timer = null;
      if (!dirty) return !error;
      if (readOnly) return false;
      try { storage.setItem(KEY, JSON.stringify(state)); dirty = false; error = ''; return true; }
      catch (_) { error = '保存できませんでした。ページを閉じると今回の進行が失われる可能性があります。'; return false; }
    }
    function schedule() { dirty = true; if (!timer) timer = setTimeout(flush, 1000); }
    function daily(){
      const today=dayKey();
      if(today>state.daily.day){
        const d=state.daily;
        for(const m of dailyMissions)if(!d.claimed.includes(m.id)&&d.stats[m.stat]>=m.target)state.pendingDaily.push({day:d.day,id:m.id});
        state.daily={day:today,stats:{hits:0,steps:0,rush:0},claimed:[]};schedule();
      }
      return state.daily;
    }
    function songProgress(id){return state.songStats[id]||{hits:0,steps:0,claimed:[]};}
    function missionEntries(){
      const d=daily();
      const entry=(m,kind,key,stats,claimed,extra={})=>({...m,kind,key,...extra,value:Math.min(m.target,stats[m.stat]||0),claimed:claimed.includes(m.id),done:claimed.includes(m.id)||(stats[m.stat]||0)>=m.target});
      return [
        ...missions.map(m=>entry(m,'normal','normal:'+m.id,state.stats,state.claimed)),
        ...dailyMissions.map(m=>entry(m,'daily','daily:'+d.day+':'+m.id,d.stats,d.claimed,{day:d.day})),
        ...state.pendingDaily.map(v=>{const m=dailyMissions.find(m=>m.id===v.id);return entry(m,'daily','daily:'+v.day+':'+m.id,{[m.stat]:m.target},[],{day:v.day,archived:true});}),
        ...songs.filter(s=>!s.id.includes('tutorial')).flatMap(s=>{const v=songProgress(s.id);return songMissions.map(m=>entry({...m,title:m.label},'song','song:'+s.id+':'+m.id,v,v.claimed,{songId:s.id}));})
      ];
    }
    function claimMissions(keys=null){
      const selected=keys===null?null:new Set(keys);
      const ready=missionEntries().filter(m=>m.done&&!m.claimed&&(!selected||selected.has(m.key)));
      if(!ready.length)return {ok:false,reason:'empty',amount:0};
      const before=JSON.parse(JSON.stringify(state));
      for(const m of ready){
        if(m.kind==='normal')state.claimed.push(m.id);
        else if(m.kind==='song')state.songStats[m.songId].claimed.push(m.id);
        else if(m.archived)state.pendingDaily=state.pendingDaily.filter(v=>v.day!==m.day||v.id!==m.id);
        else state.daily.claimed.push(m.id);
      }
      const amount=ready.reduce((sum,m)=>sum+m.reward,0);
      state.gems+=amount;state.earned+=amount;dirty=true;
      if(!flush()){state=before;dirty=true;return {ok:false,reason:'storage',amount:0};}
      return {ok:true,amount,count:ready.length};
    }
    function update(add = {}, maxima = {}, tileReward = 0, context = {}) {
      const before=new Set(missionEntries().filter(m=>m.done).map(m=>m.key));
      for (const key of ['hits', 'rush', 'tiles']) if (integer(add[key])) state.stats[key] += add[key];
      for (const key of ['steps', 'combo']) if (integer(maxima[key])) state.stats[key] = Math.max(state.stats[key], maxima[key]);
      const d=daily();for(const k of ['hits','steps','rush'])if(integer(add[k]))d.stats[k]+=add[k];
      if(songs.some(s=>s.id===context.songId)&&!context.songId.includes('tutorial')){
        const v=state.songStats[context.songId] ||= {hits:0,steps:0,claimed:[]};
        if(integer(add.hits))v.hits+=add.hits;if(integer(maxima.steps))v.steps=Math.max(v.steps,maxima.steps);
      }
      const awarded=missionEntries().filter(m=>m.done&&!before.has(m.key));
      // Only catches pay immediately. Completed missions wait for an explicit claim.
      const reward=integer(tileReward)?tileReward:0;
      state.gems+=reward;state.earned+=reward;schedule();
      if(reward||awarded.length)flush();
      return {reward,awarded};
    }
    function selectTheme(id) {
      const theme = themes.find(t => t.id === id);
      if (!theme) return {ok: false, reason: 'unknown'};
      const owned = state.themes.includes(id), price = owned ? 0 : theme.price;
      if (state.gems < price) return {ok: false, reason: 'funds', missing: price - state.gems};
      const before = JSON.parse(JSON.stringify(state));
      state.gems -= price;
      if (!owned) state.themes.push(id);
      state.theme = id; dirty = true;
      if (!flush()) { state = before; dirty = true; return {ok: false, reason: 'storage'}; }
      return {ok: true, purchased: !owned, price};
    }
    function purchase(kind,id){
      const catalog=kind==='songs'?songs:kind==='heroes'?heroes:[];
      const item=catalog.find(x=>x.id===id);if(!item)return {ok:false,reason:'unknown'};
      if(state[kind].includes(id))return {ok:true,price:0};
      if(state.gems<item.price)return {ok:false,reason:'funds'};
      const before=JSON.parse(JSON.stringify(state));state.gems-=item.price;state[kind].push(id);dirty=true;
      if(!flush()){state=before;dirty=true;return {ok:false,reason:'storage'};}
      return {ok:true,price:item.price};
    }
    function grantShoppingTest(){
      const id='v56-shopping';
      if(state.testGrants.includes(id))return {ok:true,amount:0};
      const before=JSON.parse(JSON.stringify(state));
      state.gems+=100000;state.testGrants.push(id);dirty=true;
      if(!flush()){state=before;dirty=true;return {ok:false,reason:'storage'};}
      return {ok:true,amount:100000};
    }
    function prepareAdReward(id,amount){if(typeof id!=='string'||!integer(amount))return false;state.adReward={id,amount,claimed:false};schedule();return flush();}
    function claimAdReward(id){
      const r=state.adReward;if(!r||r.id!==id||r.claimed||!r.amount)return {ok:false,reason:'invalid'};
      const before=JSON.parse(JSON.stringify(state));r.claimed=true;state.gems+=r.amount;state.earned+=r.amount;dirty=true;
      if(!flush()){state=before;dirty=true;return {ok:false,reason:'storage'};}return {ok:true,amount:r.amount};
    }
    function awardXP(amount){
      if(!integer(amount))return {xp:0,reward:0,unlocked:[]};
      const old=rankInfo(state.xp).rank;state.xp+=Math.min(amount,2000);const info=rankInfo(state.xp);
      const reward=(info.rank-old)*10,unlocked=[];
      for(const song of songs)if(song.rank&&song.rank<=info.rank&&!state.songs.includes(song.id)){state.songs.push(song.id);unlocked.push(song.id);}
      state.gems+=reward;state.earned+=reward;schedule();flush();
      return {...info,totalXP:state.xp,xp:Math.min(amount,2000),oldRank:old,reward,unlocked};
    }
    return {
      get state() { return state; }, get error() { return error; }, update, missionEntries, claimMissions, flush, selectTheme, purchase, awardXP, grantShoppingTest, daily, songProgress, prepareAdReward, claimAdReward,
      nextMissions: () => groups.map(([stat]) => missions.find(m => m.stat === stat && !state.claimed.includes(m.id))).filter(Boolean)
    };
  }
  const api = {dayKey, dailyMissions, songMissions, KEY, missions, themes, specialStages, songs, heroes, rankInfo, create, validate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NBProgression = api;
})(typeof window === 'undefined' ? globalThis : window);
