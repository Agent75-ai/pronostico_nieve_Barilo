(function(){
  "use strict";

  var baseRenderMain=window.renderMain;
  var baseRenderHours=window.renderHours;
  var currentSeq=0,currentCat=null,applyingCurrent=false;

  function n(x,d){return finite(x)?Number(x):d;}
  function snowShowerCode(code){return code===85||code===86;}
  function currentSnowCode(code){return code===71||code===73||code===75;}
  function freezingDrizzleCode(code){return code===56||code===57;}
  function freezingRainCode(code){return code===66||code===67;}
  function drizzleCode(code){return code===51||code===53||code===55;}
  function thunderCode(code){return code===95||code===96||code===99;}
  function rainShowerCode(code){return code===80||code===81||code===82;}

  function agreement(row){
    if(!row)return "—";
    var members=n(row.members,1);
    if(members<=1)return "1 fuente";
    return "Acuerdo "+Math.round(clamp(n(row.precipConsensus,n(row.consensus,.5)),0,1)*100)+"%";
  }

  function snowCategory(row){
    if(!row)return {headline:"SIN DATO",short:"Sin dato",cls:"blue",rank:-1,family:"none"};
    var p=n(row.prob,0),c=n(row.cmh,0),idx=n(row.ptypeIdx,0),sf=Math.max(0,n(row.snowfall,0)),sh=n(row.snowShowerScore,0),tw=n(row.TwEff,9),T=n(row.T,99),ps=Math.max(0,n(row.Psignal,n(row.P,0))),support=clamp(n(row.snowSupport,0),0,1),members=Math.max(1,n(row.members,1));
    var consensusOK=members>=2?support>=.60:(support>=.99&&sf>=.08);
    var showerThermal=(T<=3.0&&tw<=1.8)||(T>3.0&&T<=4.5&&tw<=1.5&&sf>=.02&&ps>=.08)||(T>4.5&&T<=5.5&&tw<=1.0&&sf>=.05&&ps>=.20);
    if(T>5.5||tw>2.3)return {headline:"SIN NIEVE",short:"Sin nieve",cls:"green",rank:0,family:"none"};
    if((idx>=5||c>=.8)&&T<=2.8&&tw<=1.1&&consensusOK)return {headline:"NEVADA ACUMULABLE",short:"Nevada acumulable",cls:"red",rank:15,family:"snow"};
    if((sh>=.45||n(row.localSnowShower,0)>=.35)&&showerThermal&&consensusOK&&(sf>=.01||ps>=.12))return {headline:"CHAPARRÓN DE NIEVE",short:"Chaparrón de nieve",cls:sh>=.62?"orange":"yellow",rank:14,family:"snow"};
    if(T<=4.2&&tw<=1.5&&support>=.50&&(idx>=4||sf>=.12||(p>=.60&&sf>=.02)))return {headline:"NIEVA",short:"Nieve",cls:"orange",rank:14,family:"snow"};
    if(T<=4.8&&tw<=1.8&&support>=.34&&(idx>=3||sf>=.02||(p>=.42&&sf>=.01)))return {headline:"NIEVE HÚMEDA",short:"Nieve húmeda",cls:"yellow",rank:13,family:"snow"};
    if(T<=5.2&&tw<=2.1&&support>=.34&&(idx>=2||sf>=.01))return {headline:"LLUVIA Y NIEVE",short:"Lluvia y nieve",cls:"yellow",rank:12,family:"mixed"};
    if(T<=5.5&&tw<=2.2&&support>=.34&&(p>=.23||idx>=1||sf>=.01))return {headline:"COPOS AISLADOS",short:"Copos aislados",cls:"blue",rank:11,family:"snow"};
    return {headline:"SIN NIEVE",short:"Sin nieve",cls:"green",rank:0,family:"none"};
  }

  function rainCategory(row){
    if(!row)return {headline:"SIN DATO",short:"Sin dato",cls:"blue",rank:-1,family:"none"};
    var liquid=Math.max(0,n(row.liquidRate,0)),type=String(row.rainType||""),support=n(row.rainSupport,0);
    if(n(row.thunderSupport,0)>=.28||type==="thunder")return {headline:"TORMENTA",short:"Tormenta",cls:"red",rank:10,family:"rain"};
    if(n(row.freezingRainSupport,0)>=.28||type==="freezing_rain")return {headline:"LLUVIA CONGELANTE",short:"Lluvia congelante",cls:"red",rank:9,family:"rain"};
    if(n(row.freezingDrizzleSupport,0)>=.28||type==="freezing_drizzle")return {headline:"LLOVIZNA CONGELANTE",short:"Llovizna congelante",cls:"orange",rank:9,family:"rain"};
    if(n(row.violentRainShowerSupport,0)>=.28||type==="rain_shower_heavy")return {headline:"CHAPARRÓN FUERTE",short:"Chaparrón fuerte",cls:"red",rank:8,family:"rain"};
    if(type==="rain_heavy"||liquid>=5)return {headline:"LLUVIA FUERTE",short:"Lluvia fuerte",cls:"red",rank:8,family:"rain"};
    if(n(row.rainShowerSupport,0)>=.32||type==="rain_shower")return {headline:"CHAPARRÓN DE LLUVIA",short:"Chaparrón de lluvia",cls:"orange",rank:7,family:"rain"};
    if(type==="rain_moderate"||liquid>=2)return {headline:"LLUVIA MODERADA",short:"Lluvia moderada",cls:"orange",rank:6,family:"rain"};
    if(type==="rain_light"||liquid>=.4)return {headline:"LLUVIA DÉBIL",short:"Lluvia débil",cls:"yellow",rank:5,family:"rain"};
    if(type==="drizzle"||liquid>=.08||support>=.28||n(row.Psignal,0)>=.12)return {headline:"LLOVIZNA",short:"Llovizna",cls:"blue",rank:4,family:"rain"};
    return {headline:"SIN PRECIPITACIÓN",short:"Sin precipitación",cls:"green",rank:0,family:"none"};
  }

  function skyCategory(row){
    var type=String(row&&row.skyType||"unknown_sky");
    if(type==="fog")return {headline:"NIEBLA",short:"Niebla",cls:"yellow",rank:3,family:"sky"};
    if(type==="overcast")return {headline:"NUBLADO",short:"Nublado",cls:"blue",rank:1.0,family:"sky"};
    if(type==="partly_cloudy")return {headline:"PARCIALMENTE NUBLADO",short:"Parcialmente nublado",cls:"blue",rank:.8,family:"sky"};
    if(type==="mostly_clear")return {headline:"MAYORMENTE DESPEJADO",short:"Mayormente despejado",cls:"green",rank:.5,family:"sky"};
    if(type==="clear")return {headline:"DESPEJADO",short:"Despejado",cls:"green",rank:.4,family:"sky"};
    return {headline:"SIN PRECIPITACIÓN",short:"Sin precipitación",cls:"green",rank:.2,family:"sky"};
  }

  function phenomenon(row){
    var snow=snowCategory(row),rain=rainCategory(row);
    if(snow.rank>=12)return snow;
    if(snow.rank===11&&rain.rank<7)return snow;
    if(rain.rank>0)return rain;
    if(snow.rank>0)return snow;
    return skyCategory(row);
  }

  function icon(cat){
    if(!cat)return "◌";
    if(cat.headline==="SOLEADO")return "☀️";
    if(cat.headline==="DESPEJADO")return "🌙";
    if(cat.headline==="MAYORMENTE DESPEJADO")return "🌤️";
    if(cat.headline==="PARCIALMENTE NUBLADO")return "⛅";
    if(cat.headline==="NUBLADO")return "☁️";
    if(cat.headline==="NIEBLA")return "🌫️";
    if(cat.headline==="TORMENTA")return "⛈️";
    if(cat.family==="snow")return cat.headline.indexOf("CHAPARRÓN")>=0?"🌨️":"❄️";
    if(cat.family==="mixed")return "🌨️";
    if(cat.headline.indexOf("CHAPARRÓN")>=0||cat.headline.indexOf("LLOVIZNA")>=0)return "🌦️";
    if(cat.family==="rain")return "🌧️";
    return "⛅";
  }

  function amount(row,cat){
    if(cat.family==="snow"||cat.family==="mixed"){
      var c=Math.max(0,n(row&&row.cmh,0));
      if(c<.03)return "❄️ –";
      if(c<.12)return "❄️ Traza";
      return "❄️ "+fmt(c,c<1?2:1)+" cm/h";
    }
    if(cat.family==="rain"){
      var mm=Math.max(0,n(row&&row.liquidRate,0));
      if(mm<.05)return "🌧️ –";
      return "🌧️ "+fmt(mm,mm<1?2:1)+" mm/h";
    }
    return "🌧️ – · ❄️ –";
  }

  function rainRateText(row){
    var mm=Math.max(0,n(row&&row.liquidRate,0));
    return mm<.05?"🌧️ –":"🌧️ "+fmt(mm,mm<1?2:1)+" mm/h";
  }

  function snowRateText(row){
    var cm=Math.max(0,n(row&&row.cmh,0));
    if(cm<.03)return "❄️ –";
    if(cm<.12)return "❄️ Traza";
    return "❄️ "+fmt(cm,cm<1?2:1)+" cm/h";
  }

  function precipPair(row){return rainRateText(row)+" · "+snowRateText(row);}
  function dailyRain(mm){mm=Math.max(0,n(mm,0));return mm<.05?"–":fmt(mm,1)+" mm";}
  function dailySnow(cm){cm=Math.max(0,n(cm,0));return cm<.03?"–":fmt(cm,1)+" cm";}

  function behavior(row,model,cat){
    if(!cat)return "—";
    if(cat.family==="sky"){
      var i=-1;for(var s=0;s<(model||[]).length;s++)if(model[s].time===row.time){i=s;break;}
      var prev=i>0?phenomenon(model[i-1]).headline:null,next=i>=0&&i<(model||[]).length-1?phenomenon(model[i+1]).headline:null;
      return prev===cat.headline&&next===cat.headline?"Cielo estable":"Cielo variable";
    }
    if(cat.headline.indexOf("CHAPARRÓN")>=0||cat.headline==="TORMENTA")return "Intermitente";
    var j=-1;for(var k=0;k<(model||[]).length;k++)if(model[k].time===row.time){j=k;break;}
    var p=j>0?phenomenon(model[j-1]).family===cat.family:false;
    var q=j>=0&&j<(model||[]).length-1?phenomenon(model[j+1]).family===cat.family:false;
    if(p&&q)return "Persistente";
    if(p||q)return "Por intervalos";
    return "Aislado";
  }

  function roadState(row){
    var snow=snowCategory(row),rain=rainCategory(row),T=n(row&&row.T,99),f=n(row&&row.feels,99),c=n(row&&row.cmh,0),liquid=n(row&&row.liquidRate,n(row&&row.P,0)),gust=n(row&&row.gust,row&&row.wind||0);
    if(rain.headline==="LLUVIA CONGELANTE"||rain.headline==="LLOVIZNA CONGELANTE")return {label:"ALTO",cls:"red",detail:"Precipitación congelante: riesgo alto de hielo y pérdida de adherencia."};
    if((c>=1&&T<=1.2)||(snow.rank>=14&&T<=.5))return {label:"ALTO",cls:"red",detail:"Nieve acumulable o hielo: adherencia comprometida."};
    if(rain.headline==="TORMENTA"||rain.headline==="CHAPARRÓN FUERTE"||liquid>=5)return {label:"MEDIO-ALTO",cls:"orange",detail:"Lluvia intensa o tormenta: agua en calzada y visibilidad reducida."};
    if(c>=.25||(snow.rank>=12&&T<=2)||(f<=0&&n(row&&row.P,0)>=.5))return {label:"MEDIO-ALTO",cls:"orange",detail:"Nieve húmeda, hielo localizado o baja adherencia."};
    if(liquid>=.4||rain.rank>=5)return {label:"MEDIO",cls:"yellow",detail:gust>=35?"Calzada mojada con ráfagas y visibilidad variable.":"Calzada mojada; aumentá distancia de frenado."};
    if(snow.rank>0)return {label:"MEDIO",cls:"yellow",detail:"Nieve localizada o mezcla posible."};
    return {label:"BAJO",cls:"green",detail:"Sin señal meteorológica relevante para la adherencia."};
  }

  function nextChange(model){
    if(!model||!model.length)return {time:"—",text:"Sin datos."};
    var base=phenomenon(model[0]);
    for(var h=1;h<=24;h++){
      var r=horizon(model,h),c=phenomenon(r);
      if(c.headline!==base.headline)return {time:"En "+h+" h · "+hourOnly(r.time),text:base.short+" → "+c.short+"."};
    }
    return {time:"Sin cambio marcado",text:"El estado dominante se mantiene durante las próximas 24 h."};
  }

  function currentSky(c,T){
    var code=n(c&&c.weather_code,-1),cloud=n(c&&c.cloud_cover,null),day=n(c&&c.is_day,1)===1;
    if(code===45||code===48)return {headline:"NIEBLA",short:"Niebla",cls:"yellow",family:"sky",rank:3,T:T,time:c.time,cloud:cloud};
    if(code===0)return {headline:day?"SOLEADO":"DESPEJADO",short:day?"Soleado":"Despejado",cls:"green",family:"sky",rank:.4,T:T,time:c.time,cloud:cloud};
    if(code===1)return {headline:"MAYORMENTE DESPEJADO",short:"Mayormente despejado",cls:"green",family:"sky",rank:.5,T:T,time:c.time,cloud:cloud};
    if(code===2)return {headline:"PARCIALMENTE NUBLADO",short:"Parcialmente nublado",cls:"blue",family:"sky",rank:.8,T:T,time:c.time,cloud:cloud};
    if(code===3)return {headline:"NUBLADO",short:"Nublado",cls:"blue",family:"sky",rank:1,T:T,time:c.time,cloud:cloud};
    if(finite(cloud)){
      if(cloud<=15)return {headline:day?"SOLEADO":"DESPEJADO",short:day?"Soleado":"Despejado",cls:"green",family:"sky",rank:.4,T:T,time:c.time,cloud:cloud};
      if(cloud<=40)return {headline:"MAYORMENTE DESPEJADO",short:"Mayormente despejado",cls:"green",family:"sky",rank:.5,T:T,time:c.time,cloud:cloud};
      if(cloud<=75)return {headline:"PARCIALMENTE NUBLADO",short:"Parcialmente nublado",cls:"blue",family:"sky",rank:.8,T:T,time:c.time,cloud:cloud};
      return {headline:"NUBLADO",short:"Nublado",cls:"blue",family:"sky",rank:1,T:T,time:c.time,cloud:cloud};
    }
    return {headline:"SIN PRECIPITACIÓN",short:"Sin precipitación",cls:"green",family:"sky",rank:.2,T:T,time:c.time,cloud:cloud};
  }

  function currentCategory(c,p){
    var T=n(c&&c.temperature_2m,null),RH=n(c&&c.relative_humidity_2m,null),code=n(c&&c.weather_code,-1),snow=Math.max(0,n(c&&c.snowfall,0)),rain=Math.max(0,n(c&&c.rain,0)),showers=Math.max(0,n(c&&c.showers,0)),precip=Math.max(0,n(c&&c.precipitation,0));
    var tw=finite(T)&&finite(RH)?wetBulb(T+p.coldBias,RH):99,liquid=rain+showers;
    var snowCodeNow=snowShowerCode(code)||currentSnowCode(code)||code===77;
    var snowEvidence=(snow>=.01&&tw<=.70)||(snow>=.03&&tw<=1.30)||(snow>=.10&&tw<=1.80)||(snowCodeNow&&tw<=.25&&precip>=.05);
    var snowShowerEvidence=snowEvidence||(snow>=.15&&tw<=2.10);
    if(snowShowerCode(code)&&snowShowerEvidence)return {headline:"CHAPARRÓN DE NIEVE",short:"Chaparrón de nieve",cls:"orange",family:"snow",T:T,time:c.time};
    if(currentSnowCode(code)&&snowEvidence)return {headline:"NIEVA",short:"Nieve",cls:snow>=.10?"orange":"yellow",family:"snow",T:T,time:c.time};
    if(code===77&&snowEvidence)return {headline:"NIEVE GRANULADA",short:"Nieve granulada",cls:"yellow",family:"snow",T:T,time:c.time};
    if(freezingRainCode(code))return {headline:"LLUVIA CONGELANTE",short:"Lluvia congelante",cls:"red",family:"rain",T:T,time:c.time};
    if(freezingDrizzleCode(code))return {headline:"LLOVIZNA CONGELANTE",short:"Llovizna congelante",cls:"orange",family:"rain",T:T,time:c.time};
    if(thunderCode(code))return {headline:"TORMENTA",short:"Tormenta",cls:"red",family:"rain",T:T,time:c.time};
    if(code===82)return {headline:"CHAPARRÓN FUERTE",short:"Chaparrón fuerte",cls:"red",family:"rain",T:T,time:c.time};
    if(rainShowerCode(code))return {headline:"CHAPARRÓN DE LLUVIA",short:"Chaparrón de lluvia",cls:"orange",family:"rain",T:T,time:c.time};
    if(drizzleCode(code))return {headline:"LLOVIZNA",short:"Llovizna",cls:"blue",family:"rain",T:T,time:c.time};
    if(code===65)return {headline:"LLUVIA FUERTE",short:"Lluvia fuerte",cls:"red",family:"rain",T:T,time:c.time};
    if(code===63)return {headline:"LLUVIA MODERADA",short:"Lluvia moderada",cls:"orange",family:"rain",T:T,time:c.time};
    if(code===61)return {headline:"LLUVIA DÉBIL",short:"Lluvia débil",cls:"yellow",family:"rain",T:T,time:c.time};
    if(!snowCodeNow&&snowEvidence){
      if(snow>=.06&&liquid<.03&&tw<=1.0)return {headline:"NIEVA",short:"Nieve",cls:"yellow",family:"snow",T:T,time:c.time};
      if(snow>=.02&&tw<=1.25)return liquid>=.03?{headline:"LLUVIA Y NIEVE",short:"Lluvia y nieve",cls:"yellow",family:"mixed",T:T,time:c.time}:{headline:"NIEVE HÚMEDA",short:"Nieve húmeda",cls:"yellow",family:"snow",T:T,time:c.time};
    }
    if(showers>=.15)return {headline:"CHAPARRÓN DE LLUVIA",short:"Chaparrón de lluvia",cls:"yellow",family:"rain",T:T,time:c.time};
    if(liquid>=5)return {headline:"LLUVIA FUERTE",short:"Lluvia fuerte",cls:"red",family:"rain",T:T,time:c.time};
    if(liquid>=2)return {headline:"LLUVIA MODERADA",short:"Lluvia moderada",cls:"orange",family:"rain",T:T,time:c.time};
    if(liquid>=.4)return {headline:"LLUVIA DÉBIL",short:"Lluvia débil",cls:"yellow",family:"rain",T:T,time:c.time};
    if(liquid>=.05||precip>=.05)return {headline:"LLOVIZNA",short:"Llovizna",cls:"blue",family:"rain",T:T,time:c.time};
    return currentSky(c,T);
  }

  function currentUrl(p){
    var vars="temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,is_day,wind_speed_10m,wind_gusts_10m";
    return "https://api.open-meteo.com/v1/forecast?latitude="+p.lat+"&longitude="+p.lon+"&elevation="+p.elev+"&current="+encodeURIComponent(vars)+"&timezone="+encodeURIComponent("America/Argentina/Buenos_Aires")+"&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
  }

  function applyCurrent(cat){
    if(!cat)return;
    var nt=$("nowTemp");if(!nt)return;
    applyingCurrent=true;
    text("nowIcon",icon(cat));
    nt.className="big snow-headline "+cat.cls;
    nt.textContent=cat.headline;
    text("nowPhase","ESTADO ACTUAL · 15 min"+(finite(cat.cloud)?" · nubosidad "+Math.round(cat.cloud)+"%":""));
    applyingCurrent=false;
  }

  function refreshCurrent(){
    var seq=++currentSeq,p=selectedPlace();
    fetchJSON(currentUrl(p),9000).then(function(d){
      if(seq!==currentSeq||!d||!d.current)return;
      currentCat=currentCategory(d.current,p);applyCurrent(currentCat);
    }).catch(function(){});
  }

  function patchCard(prefix,row){
    if(!row)return;
    var cat=phenomenon(row),state=$(prefix+"Temp"),main=$(prefix+"Main"),chips=$(prefix+"Chips");
    text(prefix+"Icon",icon(cat));text(prefix+"Clock",hourOnly(row.time));
    if(state){state.className="horizon-temp "+cat.cls;state.textContent=cat.headline;}
    if(main)main.textContent="🌡️ "+fmt(row.T,1)+" °C  ·  Sensación "+fmt(row.feels,1)+" °C";
    if(chips)chips.innerHTML='<span class="chip">'+esc(agreement(row))+'</span><span class="chip">'+esc(rainRateText(row))+'</span><span class="chip">'+esc(snowRateText(row))+'</span>';
  }

  function setupLanguage(){
    var subtitle=document.querySelector(".subtitle");if(subtitle)subtitle.textContent="Estado del cielo, lluvia, nieve, temperatura y sensación térmica en Bariloche. Lectura concreta ahora, +1, +2 y +3 horas, con horizonte máximo de 5 días.";
    var p12=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return h.textContent.trim()==="Próximas 12 horas";})[0];
    if(p12){var note=p12.closest(".panel").querySelector(".note");if(note)note.textContent="Estado dominante por hora: cielo, lluvia, nieve o mezcla.";}
    var legend=$("snowLanguage");
    if(legend){
      var sm=legend.querySelector("summary");if(sm)sm.textContent="Qué significa cada categoría meteorológica";
      var body=legend.querySelector(".details-body");
      if(body)body.innerHTML='<div class="snow-legend-grid">'+
        '<div class="snow-term"><strong>SOLEADO / DESPEJADO</strong><small>Sin precipitación y cielo prácticamente libre de nubes.</small></div>'+ 
        '<div class="snow-term"><strong>MAYORMENTE DESPEJADO</strong><small>Poca nubosidad; domina el cielo abierto.</small></div>'+ 
        '<div class="snow-term"><strong>PARCIALMENTE NUBLADO / NUBLADO</strong><small>Grados crecientes de cobertura nubosa sin precipitación dominante.</small></div>'+ 
        '<div class="snow-term"><strong>LLOVIZNA / LLUVIA</strong><small>Precipitación líquida clasificada por tipo e intensidad.</small></div>'+ 
        '<div class="snow-term"><strong>CHAPARRÓN / TORMENTA</strong><small>Precipitación intermitente o convectiva que puede cambiar rápido.</small></div>'+ 
        '<div class="snow-term"><strong>LLUVIA CONGELANTE</strong><small>Precipitación líquida con riesgo de formación de hielo.</small></div>'+ 
        '<div class="snow-term"><strong>LLUVIA Y NIEVE</strong><small>Zona de transición entre precipitación líquida y sólida.</small></div>'+ 
        '<div class="snow-term"><strong>NIEVE / NEVADA ACUMULABLE</strong><small>Nieve en caída, con acumulación indicada por separado.</small></div>'+ 
        '</div><div class="snow-source-note">El titular muestra el estado dominante. El acuerdo multimodelo se informa por separado.</div>';
    }
  }

  window.renderHours=function(model){
    if(typeof baseRenderHours==="function")baseRenderHours(model);
    var offsets=[1,2,3,4,6,8,10,12],out="";
    offsets.forEach(function(h){var r=horizon(model,h),cat=phenomenon(r);out+='<div class="hour-card"><div class="time">+'+h+' h · '+hourOnly(r.time)+'</div><div class="ico">'+icon(cat)+'</div><div class="micro '+cat.cls+'" style="font-weight:700">'+esc(cat.short)+'</div><div class="temp">'+fmt(r.T,0)+'°</div><div class="micro precip-rate">'+esc(precipPair(r))+'</div></div>';});
    html("hourStrip",out);
  };

  window.renderDays=function(model){
    var map={},order=[];
    (model||[]).forEach(function(r){
      var k=dayKey(r.time),d=parseModelDate(r.time);if(!k||!d)return;
      if(!map[k]){map[k]={d:d,min:null,max:null,snow:0,rain:0,wetPeak:null,wetScore:-1,skyCount:{},skySample:{}};order.push(k);}
      var b=map[k];b.min=finite(b.min)?Math.min(b.min,r.T):r.T;b.max=finite(b.max)?Math.max(b.max,r.T):r.T;b.snow+=Math.max(0,n(r.cmh,0));b.rain+=Math.max(0,n(r.liquidRate,0));
      var cat=phenomenon(r);
      if(cat.family==="rain"||cat.family==="snow"||cat.family==="mixed"){
        var score=cat.rank+(cat.family==="snow"?n(r.cmh,0):n(r.liquidRate,0)/5);if(score>b.wetScore){b.wetScore=score;b.wetPeak=r;}
      }else{
        b.skyCount[cat.headline]=(b.skyCount[cat.headline]||0)+1;b.skySample[cat.headline]=r;
      }
    });
    var out="";
    order.slice(0,5).forEach(function(k,i){
      var b=map[k],peak=b.wetPeak;
      if(!peak){var key=Object.keys(b.skyCount).sort(function(a,z){return b.skyCount[z]-b.skyCount[a];})[0];peak=b.skySample[key];}
      var label=i===0?"Hoy":i===1?"Mañana":(typeof dayName==="function"?dayName(b.d):pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)),cat=phenomenon(peak);
      out+='<div class="day-card"><div class="day-name">'+label+'</div><div class="day-date">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class="day-icon">'+icon(cat)+'</div><div class="day-temp">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class="day-snow '+cat.cls+'">'+esc(cat.short)+'</div><div class="day-meta">🌧️ '+dailyRain(b.rain)+' · ❄️ '+dailySnow(b.snow)+'</div></div>';
    });
    html("dailyGrid",out||'<div class="day-card">Sin datos.</div>');
    setupLanguage();
  };

  window.renderQuick=function(s){
    var model=latestModel,change=nextChange(model);
    function line(h,row){var c=phenomenon(row),rd=roadState(row);return '<p><b>+'+h+' h · '+hourOnly(row.time)+': '+esc(c.headline)+'</b>. '+esc(behavior(row,model,c))+'. '+esc(agreement(row))+'. '+esc(amount(row,c))+'. Caminos '+rd.label.toLowerCase()+'.</p>';}
    html("quickText",'<p><b>AHORA:</b> la tarjeta principal usa el estado actual de 15 minutos, incluyendo nubosidad cuando no precipita.</p>'+line(1,s.plus1)+line(2,s.plus2)+line(3,s.plus3)+'<p><b>Próximo cambio:</b> '+esc(change.time)+'. '+esc(change.text)+'</p>');
  };

  window.renderPlaces=function(){
    var out="";
    PLACE_KEYS.forEach(function(k){
      var p=PLACES[k],res=placeResults[k];
      if(!res){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Cargando…</div></div>';return;}
      if(res.error){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Dato no disponible.</div></div>';return;}
      var s=res.summary,best=null;
      s.shortHours.forEach(function(x){var c=phenomenon(x.row),a=n(x.row.precipConsensus,n(x.row.consensus,.5));if(!best||c.rank>best.c.rank||(c.rank===best.c.rank&&a>best.a))best={h:x.h,row:x.row,c:c,a:a};});
      out+='<div class="place-card '+best.c.cls+'" data-key="'+k+'"><div class="place-name">'+esc(p.name)+'</div><div class="place-main">1–3 h: '+esc(best.c.headline)+'</div></div>';
    });
    html("placesGrid",out);
    Array.prototype.slice.call(document.querySelectorAll('.place-card[data-key]')).forEach(function(el){el.onclick=function(){$("locationPreset").value=this.getAttribute("data-key");syncAdjustments();run();window.scrollTo({top:0,behavior:"smooth"});};});
  };

  window.renderMain=function(model,s){
    if(typeof baseRenderMain==="function")baseRenderMain(model,s);
    patchCard("plus1",s.plus1);patchCard("plus2",s.plus2);patchCard("plus3",s.plus3);
    var rain72=Math.max(0,n(s.rain72,0));text("rain72",rain72<.05?"—":fmt(rain72,1)+" mm");text("rain72Text",rain72<.05?"Sin lluvia medible.":rain72<5?"Acumulación líquida menor.":rain72<20?"Acumulación líquida moderada.":"Acumulación líquida importante.");
    var rows=(model||[]).slice(0,72),peak=rows[0]||s.now,best=-1;
    rows.forEach(function(r){var c=phenomenon(r),score=(c.family==="sky"?0:c.rank)+(c.family==="snow"?n(r.cmh,0):c.family==="rain"?n(r.liquidRate,0)/5:0);if(score>best){best=score;peak=r;}});
    var pc=phenomenon(peak),snow72=Math.max(0,n(s.snow72,0));text("snow72",snow72<.03?"—":fmt(snow72,1)+" cm");if(snow72<.03)text("snow72Text","Sin nieve medible.");text("peak72",localTime(peak.time));
    if(rain72<.1&&snow72<.03)text("peak72Text","Sin precipitación relevante · "+phenomenon(s.now).short+".");
    else text("peak72Text",pc.headline+" · "+agreement(peak)+" · "+amount(peak,pc).replace(/^🌧️ |^❄️ /,"")+".");
    text("confidenceLabel","Acuerdo multimodelo");text("confidence",Math.round(n(s.confidence,.5)*100)+"%");text("confidenceText","Acuerdo sobre el estado dominante entre las fuentes disponibles.");
    var roadBest=null;s.shortHours.forEach(function(x){var v=roadState(x.row),score=({green:0,blue:1,yellow:2,orange:3,red:4})[v.cls]||0;if(!roadBest||score>roadBest.score)roadBest={h:x.h,row:x.row,v:v,score:score};});
    if(roadBest){var rm=$("roadMain");if(rm){rm.className="big compact "+roadBest.v.cls;rm.textContent=roadBest.v.label;}text("roadText","Peor nivel a +"+roadBest.h+" h ("+hourOnly(roadBest.row.time)+"). "+roadBest.v.detail);}
    var change=nextChange(model);text("changeMain",change.time);text("changeText",change.text);
    window.renderHours(model);window.renderDays(model);window.renderQuick(s);window.renderPlaces();
    refreshCurrent();
  };

  var nowTemp=$("nowTemp");
  if(nowTemp){new MutationObserver(function(){if(applyingCurrent||!currentCat)return;if(nowTemp.textContent!==currentCat.headline)setTimeout(function(){applyCurrent(currentCat);},0);}).observe(nowTemp,{childList:true,subtree:true});}

  setupLanguage();
  try{if(latestModel&&latestModel.length&&latestSummary)window.renderMain(latestModel,latestSummary);else refreshCurrent();}catch(e){}
})();