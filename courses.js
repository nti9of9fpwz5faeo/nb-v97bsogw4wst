/* Every layout has 35 playable steps + 4 source cells; rows never reverse. */
(function(root){
  const patterns=[
    {name:'ジグザグ',xs:[7,0,5,2,7,0,2]},
    {name:'ロングラン',xs:[7,1,7,1,6,2,4]},
    {name:'スネーク',xs:[7,2,6,0,7,3,6]},
    {name:'スイッチバック',xs:[7,0,4,1,7,2,6]},
    {name:'ワイドウェーブ',xs:[7,3,7,0,6,0,2]}
  ];
  function build(id){
    const xs=patterns[id].xs,out=[{c:xs[0],r:0}];
    for(let i=1;i<xs.length;i++){
      let {c,r}=out[out.length-1];const dir=Math.sign(xs[i]-c);
      while(c!==xs[i]){c+=dir;out.push({c,r});}
      if(i<xs.length-1){out.push({c,r:r+1},{c,r:r+2});}
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
  const api={patterns,build,deck};if(typeof module!=='undefined')module.exports=api;else root.NBCourses=api;
})(typeof window==='undefined'?globalThis:window);
