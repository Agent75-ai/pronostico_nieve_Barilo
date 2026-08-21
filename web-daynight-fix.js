(function(){
  "use strict";

  var baseRenderMain=window.renderMain;
  if(typeof baseRenderMain!=="function")return;

  var seq=0;
  var cacheKey="";
  var cacheAt=0;
  var dayMap={};
  var CACHE_MS=10*60*1000;
  var applying=false;
  var observerTimer=null;
  var DRY={
    "SOLEADO":1,
    "DESPEJADO":1,
    "MAYORMENTE DESPEJADO":1,
    "PARCIALMENTE NUBLADO":1,
    "NUBLADO":1,
    "NIEBLA":1,
    "SIN PRECIPITACIÓN":1,
    "SIN NIEVE":1
  };

  function pkey(p){return [p&&p.lat,p&&p.lon,p&&p.elev].join("|");}
  function n(x,d){return finite(x)?Number(x):d;}
  function hourlyUrl(p){
    var vars="is_day,cloud_cover,weather_code";
    return "https://api.open-meteo.com/v1/forecast?latitude="+p.lat+"&longitude="+p.lon+"&elevation="+p.elev+"&hourly="+encodeURIComponent(vars)+"&timezone="+encodeURIComponent("America/Argentina/Buenos_Aires")+"&forecast_days=6";
  }

  // Fallback solar local: evita mostrar luna de día incluso antes de que llegue
  // la consulta horaria de is_day. Usa la hora del modelo (Bariloche, UTC-3),
  // latitud/longitud seleccionadas y la ecuación solar de NOAA.
  function fallbackIsDay(time){
    var m=String(time||"").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})(?::(\d{2}))?/);
    if(!m)return true;
    var y=+m[1],mo=+m[2],d=+m[3],hh=+m[4],mm=+(m[5]||0);
    var p=selectedPlace(),lat=n(p&&p.lat,-41.1),lon=n(p&&p.lon,-71.45),tz=-3;
    var start=Date.UTC(y,0,0),today=Date.UTC(y,mo-1,d),N=Math.floor((today-start)/86400000);
    var hour=hh+mm/60;
    var gamma=2*Math.PI/365*(N-1+(hour-12)/24);
    var eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
    var decl=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
    var offset=eq+4*lon-60*tz;
    var solarMinutes=(hh*60+mm+offset)%1440;if(solarMinutes<0)solarMinutes+=1440;
    var ha=(solarMinutes/4-180)*Math.PI/180;
    var latRad=lat*Math.PI/180;
    var cosZen=Math.sin(latRad)*Math.sin(decl)+Math.cos(latRad)*Math.cos(decl)*Math.cos(ha);
    return cosZen>Math.cos(90.833*Math.PI/180);
  }

  function infoFor(time){
    return dayMap[String(time)]||{isDay:fallbackIsDay(time),cloud:null,code:null};
  }
  function normalizedLabel(label,isDay){
    label=String(label||"").trim().toUpperCase();
    if(label==="SOLEADO"||label==="DESPEJADO")return isDay?"SOLEADO":"DESPEJADO";
    return label;
  }
  function iconFor(label,isDay){
    label=String(label||"").trim().toUpperCase();
    if(label==="SOLEADO"||label==="DESPEJADO")return isDay?"☀️":"🌙";
    if(label==="MAYORMENTE DESPEJADO")return isDay?"🌤️":"🌙";
    if(label==="PARCIALMENTE NUBLADO")return isDay?"⛅":"☁️";
    if(label==="NUBLADO")return "☁️";
    if(label==="NIEBLA")return "🌫️";
    return null;
  }
  function isDry(label){return !!DRY[String(label||"").trim().toUpperCase()];}
  function patchState(stateEl,iconEl,row){
    if(!stateEl||!row)return;
    var raw=String(stateEl.textContent||"").trim().toUpperCase();
    if(!isDry(raw))return;
    var info=infoFor(row.time),label=normalizedLabel(raw,info.isDay),ico=iconFor(label,info.isDay);
    stateEl.textContent=label;
    if(iconEl&&ico)iconEl.textContent=ico;
  }
  function patchShort(model,s){
    [["plus1",s&&s.plus1],["plus2",s&&s.plus2],["plus3",s&&s.plus3]].forEach(function(x){
      patchState($(x[0]+"Temp"),$(x[0]+"Icon"),x[1]);
    });
  }
  function patchHours(model){
    var offsets=[1,2,3,4,6,8,10,12],cards=Array.prototype.slice.call(document.querySelectorAll("#hourStrip .hour-card"));
    cards.forEach(function(card,i){
      if(i>=offsets.length)return;
      var row=horizon(model,offsets[i]);
      patchState(card.querySelector(".micro"),card.querySelector(".ico"),row);
    });
  }
  function rowsByDay(model){
    var map={};
    (model||[]).forEach(function(r){
      var k=dayKey(r.time);if(!k)return;
      (map[k]||(map[k]=[])).push(r);
    });
    return map;
  }
  function dominantDaySky(rows){
    var counts={},samples={};
    var pool=(rows||[]).filter(function(r){return infoFor(r.time).isDay;});
    if(!pool.length)pool=rows||[];
    pool.forEach(function(r){
      var t=String(r.skyType||"");
      if(!t)return;
      counts[t]=(counts[t]||0)+1;samples[t]=r;
    });
    var key=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];})[0];
    return key?samples[key]:null;
  }
  function labelFromSkyType(row){
    var type=String(row&&row.skyType||"");
    var day=infoFor(row&&row.time).isDay;
    if(type==="clear")return day?"SOLEADO":"DESPEJADO";
    if(type==="mostly_clear")return "MAYORMENTE DESPEJADO";
    if(type==="partly_cloudy")return "PARCIALMENTE NUBLADO";
    if(type==="overcast")return "NUBLADO";
    if(type==="fog")return "NIEBLA";
    return null;
  }
  function patchDays(model){
    var grouped=rowsByDay(model),keys=Object.keys(grouped),cards=Array.prototype.slice.call(document.querySelectorAll("#dailyGrid .day-card"));
    cards.forEach(function(card,i){
      var state=card.querySelector(".day-snow"),ico=card.querySelector(".day-icon");
      if(!state||!isDry(state.textContent))return;
      var rows=grouped[keys[i]]||[],sample=dominantDaySky(rows),label=labelFromSkyType(sample);
      if(!label){
        var old=String(state.textContent||"").trim().toUpperCase();
        label=old==="DESPEJADO"?"SOLEADO":old;
      }
      state.textContent=label;
      var day=sample?infoFor(sample.time).isDay:true,icon=iconFor(label,day);
      if(ico&&icon)ico.textContent=icon;
    });
  }
  function patchQuick(s){
    var box=$("quickText");if(!box||!s)return;
    [[1,s.plus1],[2,s.plus2],[3,s.plus3]].forEach(function(x){
      var row=x[1];if(!row)return;
      var info=infoFor(row.time),re=new RegExp("(\\+"+x[0]+" h[^<]*: )(SOLEADO|DESPEJADO|MAYORMENTE DESPEJADO|PARCIALMENTE NUBLADO|NUBLADO)","i");
      box.innerHTML=box.innerHTML.replace(re,function(_,a,b){return a+normalizedLabel(b,info.isDay);});
    });
  }
  function patchPlaces(){
    Array.prototype.slice.call(document.querySelectorAll("#placesGrid .place-card[data-key]")).forEach(function(card){
      var key=card.getAttribute("data-key"),res=window.placeResults&&window.placeResults[key],main=card.querySelector(".place-main");
      if(!res||!res.summary||!main)return;
      var best=null;
      (res.summary.shortHours||[]).forEach(function(x){
        var text=String(main.textContent||"").toUpperCase();
        if(text.indexOf("DESPEJADO")>=0||text.indexOf("SOLEADO")>=0){best=x.row;}
      });
      if(best){var day=infoFor(best.time).isDay;main.textContent=main.textContent.replace(/SOLEADO|DESPEJADO/i,day?"SOLEADO":"DESPEJADO");}
    });
  }
  function apply(model,s){
    if(!model||!model.length||applying)return;
    applying=true;
    try{patchShort(model,s);patchHours(model);patchDays(model);patchQuick(s);patchPlaces();}
    finally{applying=false;}
  }
  function loadDayMap(model,s){
    var p=selectedPlace(),key=pkey(p),now=Date.now();
    // Corrección inmediata, sin esperar la red. Después se refina con is_day real.
    apply(model,s);
    if(key===cacheKey&&now-cacheAt<CACHE_MS&&Object.keys(dayMap).length)return;
    var my=++seq;
    fetchJSON(hourlyUrl(p),9000).then(function(d){
      if(my!==seq)return;
      var h=d&&d.hourly||{},times=h.time||[],isDay=h.is_day||[],cloud=h.cloud_cover||[],code=h.weather_code||[],m={};
      times.forEach(function(t,i){m[String(t)]={isDay:n(isDay[i],fallbackIsDay(t)?1:0)>=.5,cloud:n(cloud[i],null),code:n(code[i],null)};});
      dayMap=m;cacheKey=key;cacheAt=Date.now();apply(model,s);
    }).catch(function(){apply(model,s);});
  }

  window.renderMain=function(model,s){
    baseRenderMain(model,s);
    loadDayMap(model,s);
  };

  // Otros renderizadores/capas visuales pueden reescribir el DOM unos ms después.
  // Este observer vuelve a imponer la relación hora -> día/noche sin llamadas extra.
  var root=document.querySelector("main");
  if(root){
    new MutationObserver(function(){
      if(applying)return;
      clearTimeout(observerTimer);
      observerTimer=setTimeout(function(){
        try{if(window.latestModel&&latestModel.length&&window.latestSummary)apply(latestModel,latestSummary);}catch(e){}
      },25);
    }).observe(root,{childList:true,subtree:true,characterData:true});
  }

  try{
    if(window.latestModel&&latestModel.length&&window.latestSummary)loadDayMap(latestModel,latestSummary);
  }catch(e){}
})();
