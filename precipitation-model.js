(function(){
  "use strict";

  var baseAggregate=window.aggregate;
  var baseSummarize=window.summarize;
  var baseBuildUrl=window.buildUrl;
  if(typeof baseAggregate!=="function")return;

  function n(x,d){return finite(x)?Number(x):d;}
  function snowCode(code){return code===71||code===73||code===75||code===77||code===85||code===86;}
  function snowShowerCode(code){return code===85||code===86;}
  function freezingDrizzleCode(code){return code===56||code===57;}
  function freezingRainCode(code){return code===66||code===67;}
  function drizzleCode(code){return code===51||code===53||code===55;}
  function rainCode(code){return code===61||code===63||code===65;}
  function rainShowerCode(code){return code===80||code===81||code===82;}
  function violentRainShowerCode(code){return code===82;}
  function thunderCode(code){return code===95||code===96||code===99;}

  function snowKey(r){
    var p=n(r&&r.prob,0),c=n(r&&r.cmh,0),idx=n(r&&r.ptypeIdx,0),sf=n(r&&r.snowfall,0),sh=n(r&&r.snowShowerScore,0),tw=n(r&&r.TwEff,9),code=n(r&&r.weatherCode,-1);
    if(idx>=5||c>=.8)return "snow_accum";
    if((snowShowerCode(code)||sh>=.45||n(r&&r.localSnowShower,0)>=.35)&&(idx>=2||p>=.30||sf>=.01))return "snow_shower";
    if(idx>=4||sf>=.16||(p>=.58&&tw<=.8))return "snow";
    if(idx>=3||(p>=.42&&tw<=1.3))return "wet_snow";
    if(idx>=2)return "mixed";
    if(p>=.23||idx>=1||sf>=.01)return "flakes";
    return null;
  }

  function liquidFor(r){
    var nativeLiquid=Math.max(0,n(r&&r.rainNative,0)+n(r&&r.showers,0));
    var P=Math.max(0,n(r&&r.P,0));
    var snowProb=clamp(n(r&&r.prob,0),0,1);
    return Math.max(nativeLiquid,P*clamp(1-.85*snowProb,.08,1));
  }

  function rainKey(r){
    if(snowKey(r))return null;
    var code=n(r&&r.weatherCode,-1),liquid=liquidFor(r),P=Math.max(0,n(r&&r.P,0)),signal=Math.max(P,n(r&&r.Psignal,P)),showers=Math.max(0,n(r&&r.showers,0));
    if(thunderCode(code))return "thunder";
    if(freezingRainCode(code))return "freezing_rain";
    if(freezingDrizzleCode(code))return "freezing_drizzle";
    if(violentRainShowerCode(code))return "rain_shower_heavy";
    if(rainShowerCode(code))return "rain_shower";
    if(drizzleCode(code))return "drizzle";
    if(code===65)return "rain_heavy";
    if(code===63)return "rain_moderate";
    if(code===61)return "rain_light";
    if(showers>=.6&&showers>=.35*Math.max(P,.01))return "rain_shower_heavy";
    if(showers>=.18&&showers>=.25*Math.max(P,.01))return "rain_shower";
    if(liquid>=5)return "rain_heavy";
    if(liquid>=2)return "rain_moderate";
    if(liquid>=.4)return "rain_light";
    if(liquid>=.08||signal>=.12)return "drizzle";
    return "dry";
  }

  function phenomenonKey(r){return snowKey(r)||rainKey(r)||"dry";}
  function wmean(rows,fn){
    var sw=0,sx=0;
    rows.forEach(function(r){var x=fn(r);if(finite(x)){var w=n(r.sourceWeight,1);sw+=w;sx+=w*Number(x);}});
    return sw?sx/sw:null;
  }

  window.aggregate=function(packs){
    var rows=baseAggregate(packs),by={};
    (packs||[]).forEach(function(pack){(pack.model||[]).forEach(function(r){(by[String(r.time)]||(by[String(r.time)]=[])).push(r);});});
    rows.forEach(function(row){
      var a=by[String(row.time)]||[],weights={},rainWeights={},totalW=0;
      a.forEach(function(r){
        var w=n(r.sourceWeight,1),pk=phenomenonKey(r),rk=rainKey(r)||"dry";
        weights[pk]=(weights[pk]||0)+w;rainWeights[rk]=(rainWeights[rk]||0)+w;totalW+=w;
      });
      var dom=Object.keys(weights).sort(function(x,y){return weights[y]-weights[x];})[0]||"dry";
      var rainDom=Object.keys(rainWeights).sort(function(x,y){return rainWeights[y]-rainWeights[x];})[0]||"dry";
      var agree=totalW?(weights[dom]||0)/totalW:.5;
      row.rainNative=wmean(a,function(r){return n(r.rainNative,0);});
      row.liquidRate=wmean(a,liquidFor);
      row.rainType=rainDom;
      row.rainSupport=totalW?a.reduce(function(s,r){return s+(rainKey(r)!=="dry"?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.drizzleSupport=totalW?a.reduce(function(s,r){var k=rainKey(r);return s+((k==="drizzle")?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.freezingDrizzleSupport=totalW?a.reduce(function(s,r){return s+(rainKey(r)==="freezing_drizzle"?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.freezingRainSupport=totalW?a.reduce(function(s,r){return s+(rainKey(r)==="freezing_rain"?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.rainShowerSupport=totalW?a.reduce(function(s,r){var k=rainKey(r);return s+((k==="rain_shower"||k==="rain_shower_heavy")?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.violentRainShowerSupport=totalW?a.reduce(function(s,r){return s+(rainKey(r)==="rain_shower_heavy"?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.thunderSupport=totalW?a.reduce(function(s,r){return s+(rainKey(r)==="thunder"?n(r.sourceWeight,1):0);},0)/totalW:0;
      row.precipType=dom;
      row.precipConsensus=clamp(.55*agree+.45*clamp(a.length/4,.25,1),.15,.98);
    });
    return rows;
  };

  if(typeof baseSummarize==="function"){
    window.summarize=function(model,p){
      var s=baseSummarize(model,p),rows72=(model||[]).slice(0,Math.min(72,(model||[]).length)),rain=0,conf=0;
      rows72.forEach(function(r){rain+=Math.max(0,n(r.liquidRate,0));conf+=n(r.precipConsensus,n(r.consensus,.5));});
      s.rain72=rain;
      if(rows72.length)s.confidence=conf/rows72.length;
      return s;
    };
  }

  if(typeof baseBuildUrl==="function"){
    window.buildUrl=function(s,p){
      var url=baseBuildUrl(s,p);
      if(url.indexOf("freezing_level_height")<0){
        url=url.replace("cape",encodeURIComponent("cape,freezing_level_height"));
      }
      return url;
    };
  }
})();
