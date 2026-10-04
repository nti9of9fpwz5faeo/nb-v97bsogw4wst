/* Five layouts: default 35 steps; endless 50 steps. Both keep four source cells. */
(function(root){
  const patterns=[
    {name:'ジグザグ',xs:[7,0,5,2,7,0,2]},
    {name:'ロングラン',xs:[7,1,7,1,6,2,4]},
    {name:'スネーク',xs:[7,2,6,0,7,3,6]},
    {name:'スイッチバック',xs:[7,0,4,1,7,2,6]},
    {name:'ワイドウェーブ',xs:[7,3,7,0,6,0,2]}
  ];
  function build(id,endless=false){
    const xs=patterns[id].xs,out=[{c:xs[0],r:0}];
    for(let i=1;i<xs.length;i++){
      let {c,r}=out[out.length-1];const dir=Math.sign(xs[i]-c);
      while(c!==xs[i]){c+=dir;out.push({c,r});}
      if(i<xs.length-1){out.push({c,r:r+1},{c,r:r+2});}
    }
    if(endless){
      // Continue below the original course: 50 moves, then four source cells.
      let {c,r}=out[out.length-1];
      while(out.length<55){
        r++;out.push({c,r});if(out.length>=55)break;
        r++;out.push({c,r});
        const target=c<4?7:0,dir=Math.sign(target-c);
        while(c!==target&&out.length<55){c+=dir;out.push({c,r});}
      }
    }
    return out;
  }
  // Start at the existing terminal cell, then enter fresh rows before turning.
  // This keeps all eight columns valid and cannot overlap the already travelled path.
  function continuation(id,anchor){
    const mirror=anchor.c<4,xs=patterns[id].xs.slice(1).map(c=>mirror?7-c:c);
    const out=[{c:anchor.c,r:anchor.r}];let c=anchor.c,r=anchor.r,i=0;
    while(out.length<55){
      for(let n=0;n<2&&out.length<55;n++)out.push({c,r:++r});
      const target=i<xs.length?xs[i++]:c<4?7:0,dir=Math.sign(target-c);
      while(c!==target&&out.length<55){c+=dir;out.push({c,r});}
    }
    return out;
  }
  function deck(random=Math.random){
    let bag=[],last=-1;
    return {next(){
      if(!bag.length){bag=patterns.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag[bag.length-1]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];}
      return last=bag.pop();
    }};
  }
  const api={patterns,build,continuation,deck};if(typeof module!=='undefined')module.exports=api;else root.NBCourses=api;
})(typeof window==='undefined'?globalThis:window);
