/* A host adapter must use the ad SDK's earned-reward event, never dismissal.
   No adapter is shipped on GitHub Pages. This is not a real-money ledger. */
window.NBAds=(()=>{
  let adapter=null,busy=false;
  function configure(provider){adapter=provider;}
  function available(){try{return !busy&&!!adapter?.isReady();}catch(_){return false;}}
  async function show(runId){
    if(!available())return false;
    busy=true;
    try{const receipt=await adapter.showRewarded({runId});return receipt?.earned===true&&receipt.runId===runId;}
    catch(_){return false;}finally{busy=false;}
  }
  return {configure,available,show};
})();
