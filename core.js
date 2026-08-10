  "use strict";

  var API_TIMEOUT=16000;
  var latestModel=[];
  var latestSummary=null;
  var latestObs=null;
  var placeResults={};
  var runId=0;
  var placeRunId=0;

  var SOURCES=[
    {id:"best_match",label:"Best Match",endpoint:"https://api.open-meteo.com/v1/forecast",weight:.38},
    {id:"ecmwf",label:"ECMWF IFS",endpoint:"https://api.open-meteo.com/v1/ecmwf",weight:.28},
    {id:"gfs",label:"NOAA GFS",endpoint:"https://api.open-meteo.com/v1/gfs",weight:.22},
    {id:"gem",label:"CMC GEM",endpoint:"https://api.open-meteo.com/v1/gem",weight:.12}
  ];

  var PLACES={
    bustillo_95:{name:"Bustillo km 9,5 / Centro Atómico",lat:-41.11369,lon:-71.41412,elev:800,oro:.44,coldBias:-.1},
    lago_moreno:{name:"Barrio Lago Moreno",lat:-41.1000,lon:-71.4500,elev:778,oro:.42,coldBias:0},
    melipal:{name:"Barrio Melipal",lat:-41.1240,lon:-71.3660,elev:790,oro:.34,coldBias:0},
    centro:{name:"Barrio Centro",lat:-41.1343,lon:-71.3085,elev:770,oro:.24,coldBias:.2},
    las_victorias:{name:"Las Victorias",lat:-41.1355,lon:-71.2540,elev:780,oro:.18,coldBias:.1},
    dina_huapi:{name:"Dina Huapi",lat:-41.0705,lon:-71.1635,elev:780,oro:.12,coldBias:.1},
    cerro_catedral:{name:"Cerro Catedral",lat:-41.1677,lon:-71.4381,elev:1030,oro:.58,coldBias:-1.4},
    llao_llao:{name:"Llao Llao",lat:-41.0525,lon:-71.5310,elev:785,oro:.48,coldBias:-.1},
    el_alto:{name:"El Alto / Frutillar / 2 de Abril",lat:-41.1678,lon:-71.3389,elev:860,oro:.32,coldBias:-.4}
  };
  var PLACE_KEYS=Object.keys(PLACES);

  function $(id){return document.getElementById(id)}
  function finite(x){return x!==null&&x!==""&&typeof x!=="undefined"&&isFinite(Number(x))}
  function num(x,d){return finite(x)?Number(x):d}
  function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
  function sigmoid(x){return 1/(1+Math.exp(-x))}
  function rad(d){return d*Math.PI/180}
  function fmt(x,d){if(typeof d==="undefined")d=1;return finite(x)?Number(x).toFixed(d):"—"}
  function pad2(n){return Number(n)<10?"0"+Number(n):String(n)}
  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;")}
  function text(id,v){var e=$(id);if(e)e.textContent=v}
  function html(id,v){var e=$(id);if(e)e.innerHTML=v}

  function selectedKey(){return $("locationPreset").value}
  function selectedPlace(){var base=PLACES[selectedKey()]||PLACES.lago_moreno;return {name:base.name,lat:base.lat,lon:base.lon,elev:base.elev,oro:num($("oro").value,base.oro),coldBias:num($("coldBias").value,base.coldBias)}}
  function syncAdjustments(){var p=PLACES[selectedKey()]||PLACES.lago_moreno;$("oro").value=p.oro.toFixed(2);$("coldBias").value=p.coldBias.toFixed(1)}

  function setStatus(kind,msg){
    text("statusText",msg);
    var d=$("statusDot"); d.className="status-dot"+(kind?" "+kind:"");
  }

  function fetchText(url,timeout){
    return new Promise(function(resolve,reject){
      var c=new AbortController();
      var timer=setTimeout(function(){c.abort()},timeout||API_TIMEOUT);
      fetch(url,{signal:c.signal,cache:"no-store"}).then(function(r){clearTimeout(timer);if(!r.ok)throw new Error("HTTP "+r.status);return r.text()}).then(resolve).catch(function(e){clearTimeout(timer);reject(e)});
    });
  }
  function fetchJSON(url,timeout){return fetchText(url,timeout).then(function(t){return JSON.parse(t)})}

  function parseModelDate(t){
    var s=String(t||"").replace("T"," ");
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2})(?::(\d{2}))?/);
    return m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+(m[5]||0),0,0):null;
  }
  function localTime(t){var d=parseModelDate(t);return d?pad2(d.getDate())+"/"+pad2(d.getMonth()+1)+" "+pad2(d.getHours())+"h":"—"}
  function hourOnly(t){var d=parseModelDate(t);return d?pad2(d.getHours())+"h":"—"}
  function filterNow(rows){
    var n=new Date(),cut=new Date(n.getFullYear(),n.getMonth(),n.getDate(),n.getHours(),0,0,0).getTime()-5*60000;
    var a=rows.filter(function(r){var d=parseModelDate(r.time);return !d||d.getTime()>=cut});
    return a.length?a:rows;
  }
  function horizon(rows,h){var target=Date.now()+h*3600000,best=rows[0],diff=Infinity;rows.forEach(function(r){var d=parseModelDate(r.time);if(d){var x=Math.abs(d.getTime()-target);if(x<diff){diff=x;best=r}}});return best}

  function sourceSelection(){var m=$("sourceMode").value;if(m==="ensemble")return SOURCES.slice();return SOURCES.filter(function(s){return s.id===m})}
  function buildUrl(s,p){
    var hourly="temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape";
    return s.endpoint+"?latitude="+p.lat+"&longitude="+p.lon+"&elevation="+p.elev+"&hourly="+encodeURIComponent(hourly)+"&timezone="+encodeURIComponent("America/Argentina/Buenos_Aires")+"&forecast_days=9&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
  }
  function wetBulb(T,RH){RH=clamp(RH,1,100);return T*Math.atan(.151977*Math.sqrt(RH+8.313659))+Math.atan(T+RH)-Math.atan(RH-1.676331)+.00391838*Math.pow(RH,1.5)*Math.atan(.023101*RH)-4.686035}
  function feels(T,w){if(!finite(T))return null;w=Math.max(0,num(w,0));if(T<=10&&w>=4.8)return 13.12+.6215*T-11.37*Math.pow(w,.16)+.3965*T*Math.pow(w,.16);return T-Math.min(1.6,w/34)}
  function phaseRankLabel(idx){if(idx>=5)return "Nieve acumulable";if(idx>=4)return "Nieve probable";if(idx>=3)return "Nieve húmeda";if(idx>=2)return "Aguanieve";if(idx>=1)return "Lluvia/copos";return "Lluvia"}
  function snowWeatherCode(code){return code===71||code===73||code===75||code===77||code===85||code===86}
  function snowShowerCode(code){return code===85||code===86}

  function computeModel(data,s,p){
    var h=data.hourly||{},times=h.time||[],out=[];
    for(var i=0;i<times.length;i++){
      var Traw=num(h.temperature_2m&&h.temperature_2m[i],null),RH=num(h.relative_humidity_2m&&h.relative_humidity_2m[i],null);
      if(!finite(Traw)||!finite(RH))continue;
      var Pbase=Math.max(0,num(h.precipitation&&h.precipitation[i],0));
      var prevP=Math.max(0,num(h.precipitation&&h.precipitation[i-1],0)),nextP=Math.max(0,num(h.precipitation&&h.precipitation[i+1],0));
      var rainNative=Math.max(0,num(h.rain&&h.rain[i],0));
      var showers=Math.max(0,num(h.showers&&h.showers[i],0));
      var prevShowers=Math.max(0,num(h.showers&&h.showers[i-1],0)),nextShowers=Math.max(0,num(h.showers&&h.showers[i+1],0));
      var snowNative=Math.max(0,num(h.snowfall&&h.snowfall[i],0));
      var prevSnow=Math.max(0,num(h.snowfall&&h.snowfall[i-1],0)),nextSnow=Math.max(0,num(h.snowfall&&h.snowfall[i+1],0));
      var code=num(h.weather_code&&h.weather_code[i],null);
      var wind=num(h.wind_speed_10m&&h.wind_speed_10m[i],0),dir=num(h.wind_direction_10m&&h.wind_direction_10m[i],270);
      var gust=Math.max(wind,num(h.wind_gusts_10m&&h.wind_gusts_10m[i],wind));
      var cape=Math.max(0,num(h.cape&&h.cape[i],0));
      var freezing=num(h.freezing_level_height&&h.freezing_level_height[i],null);
      var T=Traw+p.coldBias;
      var windward=Math.max(0,Math.cos(rad(dir-280))),moist=clamp(RH/90,.3,1.3),windTerm=clamp(wind/45,0,1.5);
      var oroIndex=windward*moist*windTerm,mult=clamp(1+p.oro*oroIndex,.85,1.55),cool=clamp(.13*oroIndex,0,.45);
      var P=Pbase*mult;
      var temporalSignal=Math.max(Pbase,.42*prevP,.42*nextP,.70*showers,.32*prevShowers,.32*nextShowers,.22*(prevP+nextP));
      var nativeSnowSignal=Math.max(snowNative,.38*prevSnow,.38*nextSnow);
      var Psignal=Math.max(P,temporalSignal*mult,nativeSnowSignal/0.7);
      var Tw=wetBulb(T,RH),evap=clamp(.12*Math.sqrt(Math.max(P,Psignal*.45))+.28*clamp((100-RH)/50,0,1)*Math.sqrt(Math.max(P,Psignal*.45)),0,.75),TwEff=Tw-evap-cool;
      var snowLine=Math.max(0,p.elev+(TwEff-.15)*230);
      if(finite(freezing))snowLine=Math.min(snowLine,Math.max(0,freezing-180));
      var melt=Math.max(0,TwEff+.1)*650,refreeze=Math.max(0,-TwEff)*420;
      var survival=clamp(Math.exp(-melt/380)*(1+refreeze/1400),0,1),dgz=clamp((RH-72)/26,0,1.25)*clamp(Psignal/.9,0,1.3)*clamp((.9-TwEff)/1.7,0,1.2);
      var gustiness=clamp((gust-wind)/20,0,1),instability=clamp(cape/90,0,1),coldShower=clamp((1.35-TwEff)/1.8,0,1),humidShower=clamp((RH-78)/18,0,1),precipContext=clamp(Psignal/.16,0,1);
      var snowShowerScore=clamp(precipContext*(.34*humidShower+.30*coldShower+.16*gustiness+.10*instability+.10*clamp(oroIndex/.75,0,1)),0,1);
      if(snowShowerCode(code))snowShowerScore=Math.max(snowShowerScore,.82);
      else if(snowWeatherCode(code))snowShowerScore=Math.max(snowShowerScore,.62);
      if(snowNative>=.03)snowShowerScore=Math.max(snowShowerScore,.50+clamp(snowNative/.5,0,.28));
      var localSnowShower=TwEff<=1.45&&RH>=80&&(Psignal>=.025||snowNative>=.01||snowWeatherCode(code))&&snowShowerScore>=.42;
      var score=1.55*clamp((.75-TwEff)/1.6,0,1)+1.15*clamp((p.elev-snowLine+260)/540,0,1)+.85*clamp(survival/.75,0,1)+.55*clamp(dgz,0,1)+.35*clamp(Psignal/1.2,0,1)-.85*clamp(melt/900,0,1)+.55*snowShowerScore;
      if(TwEff>2.2)score-=1.2;if(snowLine>p.elev+650)score-=1;
      var hasHydrometeor=P>=.04||Psignal>=.025||snowNative>=.01||snowWeatherCode(code);
      var idx=!hasHydrometeor?0:(score>=3.75?5:score>=3.05?4:score>=2.25?3:score>=1.45?2:score>=.75?1:0);
      if(snowNative>=.18||snowShowerCode(code))idx=Math.max(idx,4);else if(snowNative>=.04||snowWeatherCode(code))idx=Math.max(idx,3);else if(localSnowShower)idx=Math.max(idx,TwEff<=.55?3:2);
      var probScore=-1.10+1.55*((.45-TwEff)/.55)+1.05*((p.elev-snowLine+140)/240)+.85*Math.log(1+Psignal)+1.15*(survival-.45)+.55*clamp(dgz,0,1.3)-.65*clamp(melt/950,0,1)+.80*snowShowerScore;
      var prob=sigmoid(probScore);
      if(Psignal<.025&&!snowNative&&!snowWeatherCode(code))prob*=.1;
      if(TwEff>1.8)prob*=.35;if(snowLine>p.elev+700)prob*=.25;
      if(snowWeatherCode(code))prob=Math.max(prob,.62);if(snowNative>=.03)prob=Math.max(prob,.45+clamp(snowNative/.6,0,.35));if(localSnowShower)prob=Math.max(prob,.38+.35*snowShowerScore);
      prob=clamp(prob,0,1);
      var slr=clamp(8.5+2.6*Math.max(0,-TwEff)-6*Math.max(0,TwEff)+1.8*dgz+.4*oroIndex,1.2,20);
      if(idx<=1)slr=Math.min(slr,2.5);if(idx===2)slr=Math.min(slr,4);if(idx===3)slr=Math.min(slr,7);
      var stick=sigmoid((.25-TwEff)/.32)*clamp(.75+.18*Math.sqrt(Math.max(P,Psignal*.5)),.70,1.22)*clamp(1-melt/1300,.22,1);
      if(idx<=1)stick*=.1;else if(idx===2)stick*=.32;else if(idx===3)stick*=.62;else stick*=.9;
      stick=clamp(stick,0,1);
      var derivedCmh=P*prob*slr/10*stick;
      var nativeAccum=snowNative*clamp(.35+.75*stick,.15,1);
      var cmh=Math.max(derivedCmh,nativeAccum*.78);
      var phaseLabel=!hasHydrometeor?"Sin precip.":phaseRankLabel(idx);
      if(localSnowShower&&idx>=2){phaseLabel=gustiness>=.25?"Chaparrón nival con ráfagas":"Chaparrón nival local"}
      else if(snowShowerCode(code))phaseLabel="Chaparrón de nieve";
      out.push({time:times[i],T:T,RH:RH,P:P,Psignal:Psignal,rainNative:rainNative,showers:showers,snowfall:snowNative,weatherCode:code,wind:wind,gust:gust,dir:dir,cape:cape,freezingLevel:freezing,TwEff:TwEff,snowLine:snowLine,prob:prob,cmh:cmh,ptypeIdx:idx,phaseLabel:phaseLabel,snowShowerScore:snowShowerScore,localSnowShower:localSnowShower?1:0,feels:feels(T,wind),sourceWeight:s.weight,sourceName:s.label});
    }
    return out;
  }
  function fetchSource(s,p){return fetchJSON(buildUrl(s,p)).then(function(d){var model=computeModel(d,s,p);if(!model.length)throw new Error(s.label+": sin horas");return {source:s,model:model,place:p}})}

  function weightedMean(items,key){var sw=0,sx=0;items.forEach(function(r){if(finite(r[key])){var w=r.sourceWeight||1;sw+=w;sx+=w*r[key]}});return sw?sx/sw:null}
  function aggregate(packs){
    var by={};packs.forEach(function(pack){pack.model.forEach(function(r){var k=String(r.time);(by[k]||(by[k]=[])).push(r)})});
    var out=[];Object.keys(by).sort().forEach(function(k){var a=by[k],phaseWeights={},totalW=0,snowSupport=0;a.forEach(function(r){var key=r.phaseLabel||"—",w=r.sourceWeight||1;phaseWeights[key]=(phaseWeights[key]||0)+w;totalW+=w;if(num(r.prob,0)>=.35||num(r.snowfall,0)>=.03||num(r.snowShowerScore,0)>=.45)snowSupport+=w});
      var dom=Object.keys(phaseWeights).sort(function(x,y){return phaseWeights[y]-phaseWeights[x]})[0]||"—",agree=totalW?phaseWeights[dom]/totalW:.5,support=totalW?snowSupport/totalW:0;
      var row={time:k,T:weightedMean(a,"T"),RH:weightedMean(a,"RH"),P:weightedMean(a,"P"),Psignal:weightedMean(a,"Psignal"),showers:weightedMean(a,"showers"),snowfall:weightedMean(a,"snowfall"),wind:weightedMean(a,"wind"),gust:weightedMean(a,"gust"),cape:weightedMean(a,"cape"),freezingLevel:weightedMean(a,"freezingLevel"),TwEff:weightedMean(a,"TwEff"),snowLine:weightedMean(a,"snowLine"),prob:weightedMean(a,"prob"),cmh:weightedMean(a,"cmh"),snowShowerScore:weightedMean(a,"snowShowerScore"),localSnowShower:weightedMean(a,"localSnowShower"),feels:weightedMean(a,"feels"),phaseLabel:dom,ptypeIdx:weightedMean(a,"ptypeIdx"),members:a.length,consensus:clamp(.55*agree+.45*clamp(a.length/4,.25,1),.15,.98)};
      row.prob=Math.max(num(row.prob,0),support*.72);
      if(num(row.localSnowShower,0)>=.36&&num(row.snowShowerScore,0)>=.42&&num(row.TwEff,9)<=1.45)row.phaseLabel=num(row.gust,0)-num(row.wind,0)>=5?"Chaparrón nival con ráfagas":"Chaparrón nival local";
      out.push(row);
    });return filterNow(out);
  }

  function rainLevel(r){var P=num(r&&r.P,0),signal=num(r&&r.Psignal,P);if(P>=5)return {label:"Lluvia fuerte",cls:"red"};if(P>=2)return {label:"Lluvia moderada",cls:"orange"};if(P>=.5)return {label:"Lluvia débil",cls:"yellow"};if(P>=.2)return {label:"Gotas posibles",cls:"blue"};if(signal>=.08&&num(r&&r.snowShowerScore,0)<.42)return {label:"Chaparrón aislado posible",cls:"blue"};return {label:"Sin lluvia relevante",cls:"green"}}
  function snowLevel(r){var c=num(r&&r.cmh,0),p=num(r&&r.prob,0),idx=num(r&&r.ptypeIdx,0),fall=num(r&&r.snowfall,0),shower=num(r&&r.snowShowerScore,0);if(c>=1&&p>=.65)return {label:"Nieve fuerte",cls:"red"};if(fall>=.18&&p>=.58)return {label:"Nieve probable",cls:"orange"};if(shower>=.62&&p>=.48)return {label:"Chaparrón nival probable",cls:"orange"};if(c>=.35&&p>=.5)return {label:"Nieve probable",cls:"orange"};if(shower>=.42&&p>=.35)return {label:"Chaparrón nival posible",cls:"yellow"};if(fall>=.04||c>=.08||idx>=2)return {label:"Mezcla / nieve húmeda",cls:"yellow"};if(p>=.25||idx>=1)return {label:"Copos posibles",cls:"blue"};return {label:"Sin nieve relevante",cls:"green"}}
  function roadLevel(r,p){var T=num(r.T,99),f=num(r.feels,99),c=num(r.cmh,0),P=num(r.P,0),line=num(r.snowLine,9999),idx=num(r.ptypeIdx,0),shower=num(r.snowShowerScore,0),gust=num(r.gust,r.wind),wind=num(r.wind,0);if((c>=1&&T<=1.2)||(idx>=4&&T<=.5)||(line<p.elev+80&&P>=1.5))return {label:"Condiciones complicadas",short:"Rojo",cls:"red",text:"Puede haber nieve acumulable, hielo o muy baja adherencia."};if(c>=.25||(idx>=2&&T<=2)||(f<=0&&P>=.5)||(shower>=.62&&T<=1.2))return {label:"Precaución alta",short:"Naranja",cls:"orange",text:"Puede aparecer nieve húmeda, chaparrones nivales, hielo localizado o visibilidad reducida."};if(P>=.5||idx>=1||(shower>=.42&&T<=2.2))return {label:"Precaución",short:"Amarillo",cls:"yellow",text:(gust-wind)>=7?"Posibles chaparrones y ráfagas con reducción rápida de visibilidad.":"Calzada mojada, visibilidad reducida o nieve/mezcla localizada posible."};return {label:"Normal",short:"Verde",cls:"green",text:"No aparece una señal meteorológica relevante para circular."}}
  function iconFor(r){if(!r)return "◌";var s=snowLevel(r),q=rainLevel(r);if(s.cls==="red"||s.cls==="orange")return "❄️";if(s.cls==="yellow")return "🌨️";if(q.cls==="red"||q.cls==="orange")return "🌧️";if(q.cls==="yellow"||q.cls==="blue")return "🌦️";if(num(r.T,5)<=0)return "🥶";return "⛅"}
  function clsPriority(a,b){var order={green:0,blue:1,yellow:2,orange:3,red:4};return order[a.cls]>=order[b.cls]?a:b}
  function severityClass(cls){return ({green:0,blue:1,yellow:2,orange:3,red:4})[cls]||0}
  function shortWeather(row){var rain=rainLevel(row),snow=snowLevel(row),main=clsPriority(rain,snow);return {rain:rain,snow:snow,main:main}}
  function worstRoad(hours,p){var best=null;hours.forEach(function(x){var level=roadLevel(x.row,p),score=severityClass(level.cls);if(!best||score>best.score)best={h:x.h,row:x.row,level:level,score:score}});return best}
  function combinedShortRisk(hours,p){var best={cls:"green",score:0,label:"Tiempo tranquilo",h:1,row:hours[0].row};hours.forEach(function(x){var w=shortWeather(x.row),road=roadLevel(x.row,p),weatherScore=severityClass(w.main.cls),roadScore=severityClass(road.cls),candidate=weatherScore>=roadScore?{cls:w.main.cls,score:weatherScore,label:w.main.label}:{cls:road.cls,score:roadScore,label:road.label};if(candidate.score>best.score)best={cls:candidate.cls,score:candidate.score,label:candidate.label,h:x.h,row:x.row}});return best}
  function stateAt(row,p){var w=shortWeather(row),road=roadLevel(row,p),score=Math.max(severityClass(w.main.cls),severityClass(road.cls));return {score:score,weather:w.main.label,weatherCls:w.main.cls,road:road,phase:row.phaseLabel||"—"}}
  function nextChange(model,p){
    var base=stateAt(model[0],p);
    for(var h=1;h<=24;h++){var r=horizon(model,h),st=stateAt(r,p);if(st.score!==base.score||st.weather!==base.weather||st.road.cls!==base.road.cls||st.phase!==base.phase){return {time:"En "+h+" h · "+hourOnly(r.time),text:base.weather+" → "+st.weather+" · caminos "+st.road.short.toLowerCase()+"."}}}
    return {time:"Sin cambio marcado",text:"El estado general se mantiene similar durante las próximas 24 h."};
  }
  function summarize(model,p){
    p=p||selectedPlace();
    var now=model[0],p1=horizon(model,1),p2=horizon(model,2),p3=horizon(model,3),shortHours=[{h:1,row:p1},{h:2,row:p2},{h:3,row:p3}],rows72=model.slice(0,Math.min(72,model.length)),rain=0,snow=0,peak=rows72[0]||now,conf=0;
    rows72.forEach(function(r){rain+=num(r.P,0);snow+=num(r.cmh,0);conf+=num(r.consensus,.5);if(num(r.P,0)+num(r.cmh,0)*2>num(peak.P,0)+num(peak.cmh,0)*2)peak=r});
    return {now:now,plus1:p1,plus2:p2,plus3:p3,shortHours:shortHours,shortRoad:worstRoad(shortHours,p),shortRisk:combinedShortRisk(shortHours,p),rain72:rain,snow72:snow,peak72:peak,confidence:rows72.length?conf/rows72.length:.5,sources:num(now&&now.members,1),next:nextChange(model,p)};
  }
