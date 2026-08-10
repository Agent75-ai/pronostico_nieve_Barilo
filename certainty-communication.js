(function(){
  "use strict";

  var currentRequestSeq=0;
  var LOCAL_OBSERVATIONS={
    bustillo_95:{
      observedAt:"2026-08-10T13:34:00-03:00",
      expiresAt:"2026-08-10T14:04:00-03:00",
      label:"NIEVA",
      detail:"Nieve en caída con viento observada localmente en Bustillo km 9,5."
    }
  };

  function n(x,d){return finite(x)?Number(x):d;}
  function severityClass(cls){return ({green:0,blue:1,yellow:2,orange:3,red:4})[cls]||0;}
  function snowCode(code){return code===71||code===73||code===75||code===77||code===85||code===86;}
  function snowShowerCode2(code){return code===85||code===86;}
  function observationFor(key){
    var o=LOCAL_OBSERVATIONS[key];
    if(!o)return null;
    var now=Date.now(),start=new Date(o.observedAt).getTime(),end=new Date(o.expiresAt).getTime();
    return isFinite(start)&&isFinite(end)&&now>=start-5*60000&&now<=end?o:null;
  }
  function clockIso(iso){
    var d=new Date(iso);
    return isNaN(d)?"—":pad2(d.getHours())+":"+pad2(d.getMinutes());
  }
  function modelAgreement(row){
    if(!row)return {label:"—",value:null};
    var members=n(row.members,1);
    if(members<=1)return {label:"1 fuente",value:null};
    var v=Math.round(clamp(n(row.consensus,.5),0,1)*100);
    return {label:"Acuerdo "+v+"%",value:v};
  }
  function accumHour(row){
    var c=n(row&&row.cmh,0);
    if(c<.03)return {label:"0 cm",detail:"Sin acumulación medible en esta hora."};
    if(c<.12)return {label:"Traza",detail:"Acumulación de traza."};
    if(c<.35)return {label:fmt(c,2)+" cm/h",detail:"Acumulación menor."};
    if(c<.8)return {label:fmt(c,1)+" cm/h",detail:"Acumulación moderada."};
    return {label:fmt(c,1)+" cm/h",detail:"Acumulación rápida."};
  }
  function accum3Label(cm){
    if(cm<.08)return {label:"0 cm",detail:"Sin acumulación medible en las próximas 3 horas."};
    if(cm<.35)return {label:"Traza",detail:"Acumulación de traza en las próximas 3 horas."};
    return {label:fmt(cm,1)+" cm",detail:"Acumulación estimada para las próximas 3 horas."};
  }
  function categoricalSnow(row){
    if(!row)return {headline:"SIN DATO",short:"Sin dato",cls:"blue",rank:-1};
    var p=n(row.prob,0),c=n(row.cmh,0),idx=n(row.ptypeIdx,0),sf=n(row.snowfall,0),sh=n(row.snowShowerScore,0),tw=n(row.TwEff,9);
    if(idx>=5||c>=.8)return {headline:"NEVADA ACUMULABLE",short:"Nevada acumulable",cls:"red",rank:5};
    if(snowShowerCode2(n(row.weatherCode,-1))||sh>=.45||n(row.localSnowShower,0)>=.35){
      if(idx>=2||p>=.30||sf>=.01)return {headline:"CHAPARRÓN DE NIEVE",short:"Chaparrón de nieve",cls:sh>=.62?"orange":"yellow",rank:4};
    }
    if(idx>=4||sf>=.16||(p>=.58&&tw<=.8))return {headline:"NIEVA",short:"Nieve",cls:"orange",rank:4};
    if(idx>=3||(p>=.42&&tw<=1.3))return {headline:"NIEVE HÚMEDA",short:"Nieve húmeda",cls:"yellow",rank:3};
    if(idx>=2)return {headline:"LLUVIA Y NIEVE",short:"Lluvia y nieve",cls:"yellow",rank:2};
    if(p>=.23||idx>=1||sf>=.01)return {headline:"COPOS AISLADOS",short:"Copos aislados",cls:"blue",rank:1};
    return {headline:"SIN NIEVE",short:"Sin nieve",cls:"green",rank:0};
  }
  function behavior(row,model){
    var c=categoricalSnow(row);
    if(c.rank<=0)return "Sin nieve";
    if(c.headline==="CHAPARRÓN DE NIEVE")return "Intermitente";
    var i=-1;
    for(var k=0;k<(model||[]).length;k++)if(model[k].time===row.time){i=k;break;}
    var prev=i>0?categoricalSnow(model[i-1]).rank>0:false;
    var next=i>=0&&i<(model||[]).length-1?categoricalSnow(model[i+1]).rank>0:false;
    if(prev&&next)return "Persistente";
    if(prev||next)return "Por intervalos";
    return "Aislado";
  }
  function visibilityState(row){
    var cat=categoricalSnow(row),gust=n(row&&row.gust,row&&row.wind||0),sh=n(row&&row.snowShowerScore,0),c=n(row&&row.cmh,0);
    if(cat.rank<=0)return {label:"BAJO",cls:"green",detail:"Sin nieve suficiente para degradar la visibilidad."};
    if((sh>=.72&&gust>=38)||(c>=.8&&gust>=35))return {label:"ALTO",cls:"red",detail:"Nieve y ráfagas: deterioro rápido de visibilidad."};
    if((sh>=.55&&gust>=28)||(c>=.35&&gust>=30)||cat.rank>=4&&gust>=30)return {label:"MEDIO-ALTO",cls:"orange",detail:"Nieve con viento: visibilidad reducida."};
    if((sh>=.42&&gust>=20)||cat.rank>=2)return {label:"MEDIO",cls:"yellow",detail:"Reducción transitoria de visibilidad."};
    return {label:"BAJO",cls:"blue",detail:"Impacto visual bajo."};
  }
  function roadState(row,p){
    var T=n(row&&row.T,99),f=n(row&&row.feels,99),c=n(row&&row.cmh,0),P=n(row&&row.P,0),idx=n(row&&row.ptypeIdx,0),sh=n(row&&row.snowShowerScore,0);
    if((c>=1&&T<=1.2)||(idx>=4&&T<=.5))return {label:"ALTO",cls:"red",detail:"Nieve acumulable o hielo: adherencia comprometida."};
    if(c>=.25||(idx>=2&&T<=2)||(f<=0&&P>=.5)||(sh>=.62&&T<=1.2))return {label:"MEDIO-ALTO",cls:"orange",detail:"Nieve húmeda, hielo localizado o calzada con baja adherencia."};
    if(P>=.5||idx>=1||(sh>=.42&&T<=2.2))return {label:"MEDIO",cls:"yellow",detail:"Calzada mojada o nieve localizada."};
    return {label:"BAJO",cls:"green",detail:"Sin señal meteorológica relevante para la adherencia."};
  }
  function worstBy(hours,fn,p){
    var best=null;
    (hours||[]).forEach(function(x){
      var v=fn(x.row,p),score=severityClass(v.cls);
      if(!best||score>best.score)best={h:x.h,row:x.row,v:v,score:score};
    });
    return best;
  }
  function nextSnowChange(model){
    if(!model||!model.length)return {time:"—",text:"Sin datos."};
    var base=categoricalSnow(model[0]);
    for(var h=1;h<=24;h++){
      var r=horizon(model,h),c=categoricalSnow(r);
      if(c.headline!==base.headline)return {time:"En "+h+" h · "+hourOnly(r.time),text:base.short+" → "+c.short+"."};
    }
    return {time:"Sin cambio marcado",text:"La categoría nival se mantiene durante las próximas 24 h."};
  }
  function currentCategory(c,p){
    var T=n(c&&c.temperature_2m,null);
    var RH=n(c&&c.relative_humidity_2m,null);
    var code=n(c&&c.weather_code,-1);
    var snow15=Math.max(0,n(c&&c.snowfall,0));
    var rain15=Math.max(0,n(c&&c.rain,0));
    var showers15=Math.max(0,n(c&&c.showers,0));
    var precip15=Math.max(0,n(c&&c.precipitation,0));
    var gust=n(c&&c.wind_gusts_10m,n(c&&c.wind_speed_10m,0));
    var tw=finite(T)&&finite(RH)?wetBulb(T+p.coldBias,RH):99;
    if(snowShowerCode2(code))return {headline:"CHAPARRÓN DE NIEVE",short:"Chaparrón de nieve",cls:"orange",detail:"Código actual de chaparrón de nieve.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
    if(code===71||code===73||code===75||snow15>=.01)return {headline:"NIEVA",short:"Nieve",cls:snow15>=.10?"orange":"yellow",detail:"Nieve indicada en la condición actual.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
    if(code===77)return {headline:"NIEVE GRANULADA",short:"Nieve granulada",cls:"yellow",detail:"Granos de nieve en la condición actual.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
    if(precip15>0&&tw<=.55)return {headline:"NIEVA",short:"Nieve",cls:"yellow",detail:"Precipitación actual con temperatura húmeda compatible con nieve.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
    if((rain15>0||showers15>0||precip15>0)&&tw<=1.5)return {headline:"LLUVIA Y NIEVE",short:"Lluvia y nieve",cls:"yellow",detail:"Precipitación actual en zona de transición de fase.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
    return {headline:"SIN NIEVE",short:"Sin nieve",cls:"green",detail:"La condición actual de 15 minutos no marca nieve.",T:T,RH:RH,gust:gust,snow15:snow15,precip15:precip15,time:c.time};
  }
  function currentUrl(p){
    var vars="temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
    return "https://api.open-meteo.com/v1/forecast?latitude="+p.lat+"&longitude="+p.lon+"&elevation="+p.elev+"&current="+encodeURIComponent(vars)+"&timezone="+encodeURIComponent("America/Argentina/Buenos_Aires")+"&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm";
  }
  function renderObservedNow(o,p){
    text("nowIcon","❄️");
    var nt=$("nowTemp");if(nt){nt.className="big snow-headline orange";nt.textContent=o.label;}
    text("nowPhase","OBSERVADO LOCALMENTE · "+clockIso(o.observedAt));
    html("nowMeta",
      '<span class="chip orange">● DATO OBSERVADO</span>'+ 
      '<span class="chip">📍 '+esc(p.name)+'</span>'+ 
      '<span class="chip">🕒 '+clockIso(o.observedAt)+'</span>'+ 
      '<span class="chip">Modelo en segundo plano</span>');
  }
  function renderCurrentModelNow(cat,p){
    text("nowIcon",cat.headline==="SIN NIEVE"?"⛅":cat.headline.indexOf("LLUVIA")>=0?"🌨️":"❄️");
    var nt=$("nowTemp");if(nt){nt.className="big snow-headline "+cat.cls;nt.textContent=cat.headline;}
    text("nowPhase","ESTADO ACTUAL · resolución 15 min");
    var snowRate=n(cat.snow15,0)*4,precipRate=n(cat.precip15,0)*4;
    html("nowMeta",
      '<span class="chip '+cat.cls+'">● '+esc(cat.short)+'</span>'+ 
      '<span class="chip">🌡️ '+fmt(cat.T,1)+' °C</span>'+ 
      '<span class="chip">❄️ '+fmt(snowRate,2)+' cm/h eq.</span>'+ 
      '<span class="chip">🌧️ '+fmt(precipRate,1)+' mm/h eq.</span>'+ 
      '<span class="chip">💨 '+fmt(cat.gust,0)+' km/h</span>'+ 
      '<span class="chip">Modelo actual 15 min</span>');
  }
  function refreshCurrentNow(){
    var seq=++currentRequestSeq,p=selectedPlace(),key=selectedKey(),obs=observationFor(key);
    if(obs){renderObservedNow(obs,p);return;}
    fetchJSON(currentUrl(p),9000).then(function(d){
      if(seq!==currentRequestSeq||selectedKey()!==key)return;
      if(!d||!d.current)return;
      renderCurrentModelNow(currentCategory(d.current,p),p);
    }).catch(function(){});
  }
  function renderForecastCard(prefix,row,p){
    var cat=categoricalSnow(row),agree=modelAgreement(row),vis=visibilityState(row),road=roadState(row,p),acc=accumHour(row);
    text(prefix+"Clock",hourOnly(row.time));
    text(prefix+"Icon",cat.headline==="SIN NIEVE"?"⛅":cat.headline.indexOf("LLUVIA")>=0?"🌨️":"❄️");
    var t=$(prefix+"Temp");if(t){t.className="horizon-temp "+cat.cls;t.textContent=cat.headline;}
    var m=$(prefix+"Main");if(m){m.className="horizon-main";m.textContent=behavior(row,latestModel)+" · "+agree.label+" · "+fmt(row.T,1)+" °C";}
    html(prefix+"Chips",
      '<span class="chip '+cat.cls+'">❄️ '+esc(acc.label)+'</span>'+ 
      '<span class="chip">💨 '+fmt(row.gust,0)+' km/h</span>'+ 
      '<span class="chip '+vis.cls+'">👁️ '+vis.label+'</span>'+ 
      '<span class="chip '+road.cls+'">🚗 '+road.label+'</span>');
  }

  function setupCertaintyLanguage(){
    var nowEye=document.querySelector(".glance-card.main .eyebrow");if(nowEye)nowEye.textContent="Ahora · estado actual";
    var subtitle=document.querySelector(".subtitle");if(subtitle)subtitle.textContent="BariSnow clasifica el estado de la nieve con categorías concretas. La incertidumbre queda separada como acuerdo entre modelos.";
    var kicker=document.getElementById("snowKicker");if(kicker)kicker.textContent="❄️ Categoría concreta primero · acuerdo del modelo por separado";
    var p12=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return h.textContent.trim()==="Próximas 12 horas";})[0];
    if(p12){var note=p12.closest(".panel").querySelector(".note");if(note)note.textContent="Categoría nival por hora. El acuerdo entre modelos se informa aparte.";}
    var legend=document.getElementById("snowLanguage");
    if(legend){
      var sm=legend.querySelector("summary");if(sm)sm.textContent="Qué significa cada categoría";
      var body=legend.querySelector(".details-body");
      if(body)body.innerHTML='<div class="snow-legend-grid">'+
        '<div class="snow-term"><strong>SIN NIEVE</strong><small>La clasificación del período no contiene señal nival.</small></div>'+ 
        '<div class="snow-term"><strong>COPOS AISLADOS</strong><small>Nieve débil y discontinua, sin acumulación medible o con traza.</small></div>'+ 
        '<div class="snow-term"><strong>CHAPARRÓN DE NIEVE</strong><small>Episodio intermitente de nieve, con cambios rápidos de intensidad.</small></div>'+ 
        '<div class="snow-term"><strong>NEVADA ACUMULABLE</strong><small>Nieve con tasa suficiente para dejar espesor medible.</small></div>'+ 
        '</div><div class="snow-source-note">El titular es una categoría. Debajo se muestra el acuerdo entre modelos. “Observado” solo se usa cuando existe una observación local o instrumental; “estado actual 15 min” es una condición modelada de alta frecuencia.</div>';
    }
  }

  window.renderShortCard=function(prefix,row,p,h){renderForecastCard(prefix,row,p);};

  window.renderMain=function(model,s){
    var p=selectedPlace(),road=worstBy(s.shortHours,roadState,p),change=nextSnowChange(model);
    renderForecastCard("plus1",s.plus1,p);renderForecastCard("plus2",s.plus2,p);renderForecastCard("plus3",s.plus3,p);
    var cm3=n(s.plus1.cmh,0)+n(s.plus2.cmh,0)+n(s.plus3.cmh,0),a3=accum3Label(cm3),vis=worstBy(s.shortHours,visibilityState,p);
    text("accum3Main",a3.label);text("accum3Text",a3.detail);
    var vm=$("visibilityMain");if(vm){vm.className="big compact "+vis.v.cls;vm.textContent=vis.v.label;}
    text("visibilityText","Peor nivel a +"+vis.h+" h ("+hourOnly(vis.row.time)+"). "+vis.v.detail);
    var rm=$("roadMain");if(rm){rm.className="big compact "+road.v.cls;rm.textContent=road.v.label;}
    text("roadText","Peor nivel a +"+road.h+" h ("+hourOnly(road.row.time)+"). "+road.v.detail);
    text("changeMain",change.time);text("changeText",change.text);
    text("snow72",fmt(s.snow72,1)+" cm");
    text("snow72Text",s.snow72<.1?"Sin acumulación medible.":s.snow72<1?"Acumulación menor.":s.snow72<4?"Acumulación moderada.":"Acumulación importante.");
    var snowRows=(model||[]).slice(0,72).filter(function(r){return categoricalSnow(r).rank>0;});
    if(snowRows.length){
      text("rain72",hourOnly(snowRows[0].time)+" → "+hourOnly(snowRows[snowRows.length-1].time));
      text("rain72Text",snowRows.length+" h clasificadas con nieve.");
    }else{
      text("rain72","SIN NIEVE");text("rain72Text","No aparece una ventana nival en 72 h.");
    }
    var peak=(model||[]).slice(0,72).sort(function(a,b){return (categoricalSnow(b).rank+n(b.cmh,0))-(categoricalSnow(a).rank+n(a.cmh,0));})[0]||s.now;
    var pc=categoricalSnow(peak),pa=modelAgreement(peak);
    text("peak72",localTime(peak.time));text("peak72Text",pc.headline+" · "+pa.label+" · "+accumHour(peak).label+".");
    if(s.sources<=1){text("confidenceLabel","Fuentes");text("confidence","1 fuente");text("confidenceText","Sin comparación multimodelo.");}
    else{text("confidenceLabel","Acuerdo multimodelo");text("confidence",Math.round(s.confidence*100)+"%");text("confidenceText","Porcentaje de acuerdo del conjunto, separado de la categoría.");}
    text("updatedAt",p.name+" · "+Math.round(p.elev)+" m · actualizado "+pad2(new Date().getHours())+":"+pad2(new Date().getMinutes()));
    window.renderHours(model);window.renderDays(model);renderRows(model);drawChart(model.slice(0,Math.min(72,model.length)));window.renderQuick(s);
    refreshCurrentNow();
  };

  window.renderHours=function(model){
    var offsets=[1,2,3,4,6,8,10,12],out="";
    offsets.forEach(function(h){
      var r=horizon(model,h),cat=categoricalSnow(r),a=modelAgreement(r),road=roadState(r,selectedPlace());
      out+='<div class="hour-card"><div class="time">+'+h+' h · '+hourOnly(r.time)+'</div><div class="ico">'+(cat.rank>0?'❄️':'⛅')+'</div><div class="micro '+cat.cls+'" style="font-size:12px;font-weight:700">'+esc(cat.short)+'</div><div class="temp">'+fmt(r.T,0)+'°</div><div class="micro">'+esc(a.label)+'</div><div class="micro">❄️ '+esc(accumHour(r).label)+'</div><div class="micro '+road.cls+'">🚗 '+road.label+'</div></div>';
    });
    html("hourStrip",out);
  };

  window.renderDays=function(model){
    var map={},order=[];
    (model||[]).forEach(function(r){
      var k=dayKey(r.time),d=parseModelDate(r.time);if(!k||!d)return;
      if(!map[k]){map[k]={d:d,min:null,max:null,snow:0,peak:r,rank:-1};order.push(k);}
      var b=map[k];b.min=finite(b.min)?Math.min(b.min,r.T):r.T;b.max=finite(b.max)?Math.max(b.max,r.T):r.T;b.snow+=n(r.cmh,0);
      var rank=categoricalSnow(r).rank+n(r.cmh,0);if(rank>b.rank){b.rank=rank;b.peak=r;}
    });
    var out="";
    order.slice(0,9).forEach(function(k,i){
      var b=map[k],label=i===0?"Hoy":i===1?"Mañana":dayName(b.d),cat=categoricalSnow(b.peak),a=modelAgreement(b.peak);
      out+='<div class="day-card"><div class="day-name">'+label+'</div><div class="day-date">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class="day-icon">'+(cat.rank>0?'❄️':'⛅')+'</div><div class="day-temp">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class="day-snow '+cat.cls+'">'+esc(cat.short)+'</div><div class="day-meta">❄️ '+fmt(b.snow,1)+' cm<br>'+esc(a.label)+'</div></div>';
    });
    html("dailyGrid",out||'<div class="day-card">Sin datos.</div>');
  };

  window.renderQuick=function(s){
    var p=selectedPlace(),model=latestModel,road=worstBy(s.shortHours,roadState,p),vis=worstBy(s.shortHours,visibilityState,p),cm3=n(s.plus1.cmh,0)+n(s.plus2.cmh,0)+n(s.plus3.cmh,0),a3=accum3Label(cm3),change=nextSnowChange(model);
    function line(h,row){var c=categoricalSnow(row),a=modelAgreement(row),rd=roadState(row,p);return '<p><b>+'+h+' h · '+hourOnly(row.time)+': '+esc(c.headline)+'</b>. '+esc(behavior(row,model))+'. '+esc(a.label)+'. Acumulación '+esc(accumHour(row).label.toLowerCase())+'. Caminos '+rd.label.toLowerCase()+'.</p>';}
    var obs=observationFor(selectedKey()),nowText=obs?'<p><b>AHORA: '+esc(obs.label)+' · OBSERVADO LOCALMENTE '+clockIso(obs.observedAt)+'.</b> '+esc(obs.detail)+'</p>':'<p><b>AHORA:</b> el estado actual se calcula con la condición de 15 minutos y se muestra en la tarjeta principal.</p>';
    html("quickText",nowText+line(1,s.plus1)+line(2,s.plus2)+line(3,s.plus3)+'<p><b>Acumulación 3 h:</b> '+esc(a3.label)+'.</p><p><b>Visibilidad:</b> '+vis.v.label+'. '+esc(vis.v.detail)+'</p><p><b>Caminos:</b> '+road.v.label+'. '+esc(road.v.detail)+'</p><p><b>Próximo cambio:</b> '+esc(change.time)+'. '+esc(change.text)+'</p>');
  };

  window.renderPlaces=function(){
    var out="";
    PLACE_KEYS.forEach(function(k){
      var p=PLACES[k],res=placeResults[k];
      if(!res){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Cargando…</div></div>';return;}
      if(res.error){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Dato no disponible.</div></div>';return;}
      var s=res.summary,best=null;
      s.shortHours.forEach(function(x){var c=categoricalSnow(x.row),a=modelAgreement(x.row);if(!best||c.rank>best.c.rank||(c.rank===best.c.rank&&(a.value||0)>(best.a.value||0)))best={h:x.h,row:x.row,c:c,a:a};});
      var hours=s.shortHours.map(function(x){var c=categoricalSnow(x.row),a=modelAgreement(x.row),rd=roadState(x.row,p);return '<div class="place-hour '+c.cls+'"><span>+'+x.h+' h · '+hourOnly(x.row.time)+'</span><strong>'+esc(c.short)+'</strong><small>'+esc(a.label)+' · 🚗 '+rd.label+'</small></div>';}).join('');
      out+='<div class="place-card '+best.c.cls+'" data-key="'+k+'"><div class="place-name">'+esc(p.name)+'</div><div class="place-main">1–3 h: '+esc(best.c.headline)+'</div><div class="place-hours">'+hours+'</div></div>';
    });
    html("placesGrid",out);
    Array.prototype.slice.call(document.querySelectorAll('.place-card[data-key]')).forEach(function(el){el.onclick=function(){$("locationPreset").value=this.getAttribute("data-key");syncAdjustments();run();window.scrollTo({top:0,behavior:"smooth"});};});
  };

  setupCertaintyLanguage();
  try{
    if(latestModel&&latestModel.length&&latestSummary)window.renderMain(latestModel,latestSummary);
    else refreshCurrentNow();
  }catch(e){}
})();