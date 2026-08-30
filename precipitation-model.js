(function(){
  "use strict";

  var baseAggregate=window.aggregate;
  var baseSummarize=window.summarize;
  var baseBuildUrl=window.buildUrl;
  if(typeof baseAggregate!=="function")return;

  function n(x,d){return finite(x)?Number(x):d;}
  function snowShowerCode(code){return code===85||code===86;}
  function freezingDrizzleCode(code){return code===56||code===57;}
  function freezingRainCode(code){return code===66||code===67;}
  function drizzleCode(code){return code===51||code===53||code===55;}
  function rainShowerCode(code){return code===80||code===81||code===82;}
  function violentRainShowerCode(code){return code===82;}
  function thunderCode(code){return code===95||code===96||code===99;}

  /*
   * El consenso BariSnow usa tres modelos explícitos e independientes.
   * Best Match queda disponible como referencia seleccionable, pero fuera
   * del ensemble para evitar contar dos veces información correlacionada.
   */
  if(typeof SOURCES!=="undefined"){
    SOURCES.forEach(function(s){
      if(s.id==="best_match")s.weight=1;
      else if(s.id==="ecmwf"||s.id==="gfs"||s.id==="gem")s.weight=1/3;
    });
  }

  window.sourceSelection=function(){
    var m=$("sourceMode").value;
    if(m==="ensemble")return SOURCES.filter(function(s){return s.id!=="best_match";});
    return SOURCES.filter(function(s){return s.id===m;});
  };

  function sourceSnowThermal(r){
    var T=n(r&&r.T,99),tw=n(r&&r.TwEff,99),sf=Math.max(0,n(r&&r.snowfall,0)),ps=Math.max(0,n(r&&r.Psignal,n(r&&r.P,0))),sh=n(r&&r.snowShowerScore,0),idx=n(r&&r.ptypeIdx,0),code=n(r&&r.weatherCode,-1);
    if(T>5.5||tw>2.2)return false;
    if(T>4.5)return tw<=1.0&&sf>=.05&&ps>=.20;
    if(T>3.0)return tw<=1.5&&sf>=.02&&(ps>=.08||sh>=.55);
    return tw<=1.9&&(sf>=.01||idx>=2||ps>=.12||snowShowerCode(code));
  }

  function snowKey(r){
    if(!sourceSnowThermal(r))return null;
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
    var snowProb=snowKey(r)?clamp(n(r&&r.prob,0),0,1):0;
    return Math.max(nativeLiquid,P*clamp(1-.85*snowProb,.08,1));
  }

  function rainKey(r){
    if(snowKey(r))return null;
    var code=n(r&&r.weatherCode,-1),liquid=liquidFor(r),P=Math.max(0,n(r&&r.P,0)),showers=Math.max(0,n(r&&r.showers,0));
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
    /* La lluvia usa exclusivamente el intervalo de esta fila. Psignal conserva
       el suavizado temporal para nieve, pero ya no adelanta lluvia futura. */
    if(liquid>=.08||P>=.12)return "drizzle";
    return "dry";
  }

  function skyKey(r){
    var code=n(r&&r.weatherCode,-1);
    if(code===45||code===48)return "fog";
    if(code===0)return "clear";
    if(code===1)return "mostly_clear";
    if(code===2)return "partly_cloudy";
    if(code===3)return "overcast";
    return "unknown_sky";
  }

  function phenomenonKey(r){
    var s=snowKey(r),q=rainKey(r);
    return s||(q&&q!=="dry"?q:skyKey(r));
  }

  function wmean(rows,fn){
    var sw=0,sx=0;
    rows.forEach(function(r){var x=fn(r);if(finite(x)){var w=n(r.sourceWeight,1);sw+=w;sx+=w*Number(x);}});
    return sw?sx/sw:null;
  }
  function support(rows,total,predicate){
    if(!total)return 0;
    return rows.reduce(function(s,r){var k=rainKey(r);return s+(predicate(k)?n(r.sourceWeight,1):0);},0)/total;
  }

  window.fetchSource=function(s,p){
    return fetchJSON(buildUrl(s,p)).then(function(d){
      var model=computeModel(d,s,p);
      if(!model.length)throw new Error(s.label+": sin horas");
      var h=d.hourly||{},times=h.time||[],probs=h.precipitation_probability||[],byTime={};
      for(var i=0;i<times.length;i++)if(finite(probs[i]))byTime[String(times[i])]=Number(probs[i]);
      model.forEach(function(r){r.precipProbability=finite(byTime[String(r.time)])?Number(byTime[String(r.time)]):null;});
      return {source:s,model:model,place:p};
    });
  };

  window.aggregate=function(packs){
    var rows=baseAggregate(packs),by={};
    (packs||[]).forEach(function(pack){(pack.model||[]).forEach(function(r){(by[String(r.time)]||(by[String(r.time)]=[])).push(r);});});
    rows.forEach(function(row){
      var a=by[String(row.time)]||[],weights={},rainWeights={},skyWeights={},totalW=0,snowW=0;
      a.forEach(function(r){
        var w=n(r.sourceWeight,1),pk=phenomenonKey(r),rk=rainKey(r)||"dry",sk=skyKey(r);
        weights[pk]=(weights[pk]||0)+w;
        rainWeights[rk]=(rainWeights[rk]||0)+w;
        skyWeights[sk]=(skyWeights[sk]||0)+w;
        if(snowKey(r))snowW+=w;
        totalW+=w;
      });
      var dom=Object.keys(weights).sort(function(x,y){return weights[y]-weights[x];})[0]||"unknown_sky";
      var rainDom=Object.keys(rainWeights).sort(function(x,y){return rainWeights[y]-rainWeights[x];})[0]||"dry";
      var skyDom=Object.keys(skyWeights).sort(function(x,y){return skyWeights[y]-skyWeights[x];})[0]||"unknown_sky";
      var agree=totalW?(weights[dom]||0)/totalW:.5;
      row.rainNative=wmean(a,function(r){return n(r.rainNative,0);});
      row.liquidRate=wmean(a,liquidFor);
      row.precipProbability=wmean(a,function(r){return r.precipProbability;});
      row.rainType=rainDom;
      row.skyType=skyDom;
      row.skySupport=totalW?(skyWeights[skyDom]||0)/totalW:0;
      row.rainSupport=support(a,totalW,function(k){return !!k&&k!=="dry";});
      row.drizzleSupport=support(a,totalW,function(k){return k==="drizzle";});
      row.freezingDrizzleSupport=support(a,totalW,function(k){return k==="freezing_drizzle";});
      row.freezingRainSupport=support(a,totalW,function(k){return k==="freezing_rain";});
      row.rainShowerSupport=support(a,totalW,function(k){return k==="rain_shower"||k==="rain_shower_heavy";});
      row.violentRainShowerSupport=support(a,totalW,function(k){return k==="rain_shower_heavy";});
      row.thunderSupport=support(a,totalW,function(k){return k==="thunder";});
      row.snowSupport=totalW?snowW/totalW:0;
      row.members=a.length;
      row.precipType=dom;
      row.precipConsensus=clamp(.55*agree+.45*clamp(a.length/3,.25,1),.15,.98);
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
      var url=baseBuildUrl(s,p),extras=[];
      /* GEM expone probabilidad de precipitación, mientras que la cota de
         congelación se solicita a Best Match, ECMWF y GFS. */
      if(s&&s.id!=="gem")extras.push("freezing_level_height");
      if(s&&s.id!=="ecmwf")extras.push("precipitation_probability");
      if(extras.length){
        url=url.replace("cape",encodeURIComponent("cape,"+extras.join(",")));
      }
      return url;
    };
  }
})();
