(function(){
  "use strict";

  function addSnowStyles(){
    var style=document.createElement("style");
    style.id="barisnow-snow-communication-style";
    style.textContent=`
      .hero{background:linear-gradient(120deg,#081b2b,#123a55 58%,#164761)}
      .brandline{font-weight:700}
      .snow-kicker{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:6px 9px;border-radius:999px;border:1px solid rgba(120,223,255,.18);background:rgba(4,17,28,.32);color:#cdefff;font-size:11px;width:max-content}
      .glance-card.main{background:linear-gradient(160deg,rgba(190,235,255,.16),rgba(255,255,255,.025))}
      .snow-headline{font-size:clamp(22px,2.7vw,34px)!important;line-height:1.02!important;letter-spacing:-.045em!important}
      .horizon-temp{font-size:18px!important;line-height:1.08;max-width:150px}
      .horizon-main{font-size:12px!important;color:var(--mut);font-weight:500!important}
      .decision-grid{grid-template-columns:repeat(4,1fr)}
      .decision-card{min-height:120px}
      .snow-legend-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
      .snow-term{padding:12px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.03)}
      .snow-term strong{display:block;font-size:13px;margin-bottom:5px}
      .snow-term small{display:block;color:var(--mut);font-size:11px;line-height:1.4}
      .snow-source-note{margin-top:10px;padding:10px 12px;border-radius:14px;border:1px solid rgba(120,223,255,.13);background:rgba(120,223,255,.045);font-size:11px;line-height:1.45;color:var(--mut)}
      .snow-detail{display:block;margin-top:4px;color:var(--mut);font-size:10.5px;line-height:1.35}
      .day-snow{font-size:11px;line-height:1.35;margin-top:7px}
      .day-rain{font-size:9.5px;color:var(--mut);margin-top:4px}
      .place-hour strong{font-size:10.8px}
      .place-hour small{font-size:8.8px}
      @media(max-width:900px){.decision-grid{grid-template-columns:1fr 1fr}.snow-legend-grid{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.decision-grid{grid-template-columns:1fr}.snow-legend-grid{grid-template-columns:1fr}.horizon-temp{max-width:170px}}
    `;
    document.head.appendChild(style);
  }

  function findPanel(title){
    var heads=Array.prototype.slice.call(document.querySelectorAll(".panel h2"));
    for(var i=0;i<heads.length;i++)if(heads[i].textContent.trim()===title)return heads[i].closest(".panel");
    return null;
  }

  function setupSnowCommunication(){
    var brand=document.querySelector(".brandline");
    if(brand)brand.innerHTML='<span class="live-dot"></span> Nieve local · nowcast multimodelo';
    var subtitle=document.querySelector(".subtitle");
    if(subtitle)subtitle.textContent="BariSnow comunica el fenómeno de la nieve en Bariloche: tipo, intermitencia, acumulación, viento, visibilidad potencial y evolución en las próximas horas.";
    var hero=document.querySelector(".hero");
    if(hero&&!document.getElementById("snowKicker")){
      var k=document.createElement("div");k.id="snowKicker";k.className="snow-kicker";k.textContent="❄️ Fenómeno primero · acumulación e impacto por separado";hero.appendChild(k);
    }
    var quick=document.getElementById("quickBtn");if(quick)quick.textContent="❄️ Resumen de nieve";
    var nowEyebrow=document.querySelector(".glance-card.main .eyebrow");if(nowEyebrow)nowEyebrow.textContent="Ahora · señal nival estimada";

    var decisions=document.querySelector(".decision-grid");
    if(decisions){
      decisions.innerHTML=''
        +'<article class="decision-card"><div class="eyebrow">Acumulación · próximas 3 h</div><div id="accum3Main" class="big compact">—</div><div id="accum3Text" class="sub">Separada del hecho de que esté nevando.</div></article>'
        +'<article class="decision-card"><div class="eyebrow">Visibilidad y ráfagas</div><div id="visibilityMain" class="big compact">—</div><div id="visibilityText" class="sub">Riesgo potencial durante nieve en caída.</div></article>'
        +'<article class="decision-card"><div class="eyebrow">Caminos · próximas 3 h</div><div id="roadMain" class="big compact">—</div><div id="roadText" class="sub">Calculando el peor escenario.</div></article>'
        +'<article class="decision-card"><div class="eyebrow">Próximo cambio nival</div><div id="changeMain" class="big compact">—</div><div id="changeText" class="sub">Buscando cambio de tipo o intensidad.</div></article>';
    }

    var p12=findPanel("Próximas 12 horas");
    if(p12){var n12=p12.querySelector(".note");if(n12)n12.textContent="Evolución de la señal de nieve: fenómeno, probabilidad, acumulación, temperatura y ráfagas.";}
    var p72=findPanel("Próximas 72 horas");
    if(p72){
      var n72=p72.querySelector(".note");if(n72)n72.textContent="Resumen nival desde ahora: acumulación, ventana principal, pico del fenómeno y acuerdo entre modelos.";
      var bar=p72.querySelector(".event-bar");
      if(bar)bar.innerHTML=''
        +'<div class="metric"><span>Acumulación de nieve</span><strong id="snow72">—</strong><small id="snow72Text">—</small></div>'
        +'<div class="metric"><span>Ventana nival principal</span><strong id="rain72">—</strong><small id="rain72Text">—</small></div>'
        +'<div class="metric"><span>Pico nival</span><strong id="peak72">—</strong><small id="peak72Text">—</small></div>'
        +'<div class="metric"><span id="confidenceLabel">Acuerdo multimodelo</span><strong id="confidence">—</strong><small id="confidenceText">—</small></div>';
    }
    var pd=findPanel("Hoy + 8 días");if(pd){var nd=pd.querySelector(".note");if(nd)nd.textContent="Cada día prioriza la señal de nieve y su acumulación; la lluvia aparece solo como contexto de fase.";}
    var pb=findPanel("Barrios de Bariloche");if(pb){var nb=pb.querySelector(".note");if(nb)nb.textContent="Comparación nival +1 / +2 / +3 h. Cada tarjeta prioriza tipo de nieve, probabilidad y efecto vial.";}
    var obs=document.getElementById("obsPanel");if(obs){var sm=obs.querySelector("summary");if(sm)sm.textContent="Observación real: fenómeno en el aeropuerto SAZS/BRC";}

    if(obs&&!document.getElementById("snowLanguage")){
      var legend=document.createElement("details");legend.className="panel";legend.id="snowLanguage";
      legend.innerHTML='<summary>Cómo leer el lenguaje de nieve de BariSnow</summary><div class="details-body"><div class="snow-legend-grid">'
        +'<div class="snow-term"><strong>Copos aislados</strong><small>Nieve ligera y breve, habitualmente con acumulación nula o de traza.</small></div>'
        +'<div class="snow-term"><strong>Chaparrón de nieve</strong><small>Empieza y termina con rapidez y puede cambiar de intensidad en pocos minutos. Puede acumular o pasar sin dejar espesor.</small></div>'
        +'<div class="snow-term"><strong>Nieve húmeda / mezcla</strong><small>Los copos llegan parcialmente fundidos o conviven con lluvia; la adherencia depende mucho de la superficie y la temperatura.</small></div>'
        +'<div class="snow-term"><strong>Nevada acumulable</strong><small>La señal favorece nieve capaz de dejar espesor medible durante la hora o el episodio.</small></div>'
        +'</div><div class="snow-source-note">“Riesgo de visibilidad” expresa una estimación a partir de nieve, intensidad y ráfagas. BariSnow reserva términos como ventisca para una observación que confirme nieve levantada por el viento.</div></div>';
      obs.parentNode.insertBefore(legend,obs);
    }
  }

  function rowIndex(model,row){if(!model||!row)return -1;for(var i=0;i<model.length;i++)if(model[i].time===row.time)return i;return -1;}
  function n(x,d){return finite(x)?Number(x):d;}
  function signal(row){if(!row)return 0;return Math.max(n(row.prob,0),n(row.snowShowerScore,0)*.92,Math.min(1,n(row.snowfall,0)*2.8),Math.min(1,n(row.cmh,0)*1.2),n(row.ptypeIdx,0)>=2?.48:n(row.ptypeIdx,0)>=1?.28:0);}
  function activeSnow(row){return signal(row)>=.28||n(row.snowfall,0)>=.02||n(row.localSnowShower,0)>=.35;}
  function accumHour(row){var c=n(row&&row.cmh,0);if(c<.03)return {label:"Sin acumulación",detail:"Puede nevar en el aire sin dejar espesor medible."};if(c<.12)return {label:"Traza",detail:"Blanqueo puntual posible en superficies favorables."};if(c<.35)return {label:"Acumulación menor",detail:fmt(c,2)+" cm/h estimados."};if(c<.8)return {label:"Acumula",detail:fmt(c,1)+" cm/h estimados."};return {label:"Acumulación rápida",detail:fmt(c,1)+" cm/h estimados."};}
  function accum3Label(cm){if(cm<.08)return {label:"Sin acumulación relevante",detail:"La nieve puede ser visible y aun así no dejar espesor."};if(cm<.35)return {label:"Traza / blanqueo",detail:"Acumulación muy localizada posible."};if(cm<1)return {label:fmt(cm,1)+" cm",detail:"Acumulación menor durante las próximas 3 horas."};if(cm<3)return {label:fmt(cm,1)+" cm",detail:"Acumulación moderada posible durante las próximas 3 horas."};return {label:fmt(cm,1)+" cm",detail:"Acumulación importante posible durante las próximas 3 horas."};}
  function behavior(row,model){if(!activeSnow(row))return "Sin episodio nival";if(n(row.snowShowerScore,0)>=.42||n(row.localSnowShower,0)>=.35)return "Intermitente · chaparrones";var i=rowIndex(model,row),prev=i>0&&activeSnow(model[i-1]),next=i>=0&&i<model.length-1&&activeSnow(model[i+1]);if(prev&&next)return "Más persistente";if(prev||next)return "Por intervalos";return "Aislado";}
  function visibility(row){if(!activeSnow(row))return {label:"Bajo",cls:"green",detail:"Sin señal nival suficiente para afectar la visibilidad."};var gust=n(row.gust,row.wind||0),sh=n(row.snowShowerScore,0),c=n(row.cmh,0),p=n(row.prob,0);if((sh>=.72&&gust>=38)||(c>=.8&&gust>=35))return {label:"Alto",cls:"red",detail:"Nieve intensa o chaparrones con ráfagas pueden reducir la visibilidad rápidamente."};if((sh>=.55&&gust>=28)||(p>=.6&&gust>=32)||(c>=.35&&gust>=30))return {label:"Moderado–alto",cls:"orange",detail:"Hay combinación de nieve y viento suficiente para reducción marcada de visibilidad."};if((sh>=.42&&gust>=20)||p>=.4||c>=.1)return {label:"Moderado",cls:"yellow",detail:"Puede haber reducción localizada o transitoria de visibilidad."};return {label:"Bajo",cls:"blue",detail:"La señal nival es débil o con poco viento."};}
  function snowProfile(row,model){var p=n(row&&row.prob,0),c=n(row&&row.cmh,0),idx=n(row&&row.ptypeIdx,0),sf=n(row&&row.snowfall,0),sh=n(row&&row.snowShowerScore,0),tw=n(row&&row.TwEff,9);var headline="Señal nival baja",short="Señal baja",cls="green",rank=0;if(p<.18&&sf<.01&&sh<.30&&idx<1){headline="Sin señal nival relevante";short="Sin señal";cls="green";rank=0;}else if(sh>=.72&&p>=.52){headline="Chaparrón de nieve probable";short="Chaparrón probable";cls="orange";rank=3;}else if(sh>=.45&&p>=.34){headline="Chaparrón de nieve posible";short="Chaparrón posible";cls="yellow";rank=2;}else if(idx>=5||c>=.8){headline="Nevada acumulable";short="Acumulable";cls="red";rank=4;}else if(idx>=4||sf>=.16||(p>=.62&&tw<=.7)){headline="Nieve probable";short="Nieve probable";cls="orange";rank=3;}else if(idx>=3||(p>=.45&&tw<=1.3)){headline="Nieve húmeda probable";short="Nieve húmeda";cls="yellow";rank=2;}else if(idx>=2){headline="Mezcla de lluvia y nieve";short="Mezcla";cls="yellow";rank=2;}else if(p>=.25||idx>=1){headline="Copos aislados posibles";short="Copos posibles";cls="blue";rank=1;}var a=accumHour(row),v=visibility(row);return {headline:headline,short:short,cls:cls,rank:rank,prob:p,accum:a,behavior:behavior(row,model),visibility:v};}
  function mixedContext(row){var rain=n(row&&row.rainNative,0),p=n(row&&row.P,0);if(rain>=.2&&activeSnow(row))return "Lluvia mezclada "+fmt(rain,1)+" mm/h";if(p>=.3&&!activeSnow(row))return "Lluvia "+fmt(p,1)+" mm/h";return "";}
  function worstVisibility(hours){var order={green:0,blue:1,yellow:2,orange:3,red:4},best=null;hours.forEach(function(x){var v=visibility(x.row),score=order[v.cls]||0;if(!best||score>best.score)best={h:x.h,row:x.row,v:v,score:score};});return best;}
  function nextSnowChange(model){if(!model||!model.length)return {time:"—",text:"Sin datos."};var base=snowProfile(model[0],model);for(var h=1;h<=24;h++){var r=horizon(model,h),p=snowProfile(r,model);if(p.rank!==base.rank||p.behavior!==base.behavior){return {time:"En "+h+" h · "+hourOnly(r.time),text:base.short+" → "+p.short+" · "+p.behavior.toLowerCase()+"."};}}return {time:"Sin cambio marcado",text:"La señal nival mantiene un carácter similar durante las próximas 24 h."};}
  function snowWindow(model,limit){var rows=(model||[]).slice(0,Math.min(limit||72,(model||[]).length)),blocks=[],cur=null;function close(){if(cur){blocks.push(cur);cur=null;}}rows.forEach(function(r){if(activeSnow(r)){if(!cur)cur={start:r,end:r,score:0,rows:[]};cur.end=r;cur.rows.push(r);cur.score+=signal(r)+n(r.cmh,0)*1.5;}else close();});close();if(!blocks.length)return null;blocks.sort(function(a,b){return b.score-a.score;});return blocks[0];}
  function peakSnow(model,limit){var rows=(model||[]).slice(0,Math.min(limit||72,(model||[]).length)),best=rows[0]||null,bscore=-1;rows.forEach(function(r){var s=signal(r)*2+n(r.cmh,0)*1.8+n(r.snowShowerScore,0);if(s>bscore){best=r;bscore=s;}});return best;}

  window.renderShortCard=function(prefix,row,p,h){var sp=snowProfile(row,latestModel),road=roadLevel(row,p),ctx=mixedContext(row);text(prefix+"Clock",hourOnly(row.time));text(prefix+"Icon",iconFor(row));var t=$(prefix+"Temp");if(t){t.className="horizon-temp "+sp.cls;t.textContent=sp.short;}var main=$(prefix+"Main");if(main){main.className="horizon-main";main.textContent=sp.behavior+" · "+Math.round(sp.prob*100)+"% · "+fmt(row.T,1)+" °C";}var chips='<span class="chip '+sp.cls+'">❄️ '+esc(sp.accum.label)+'</span><span class="chip">💨 '+fmt(row.gust,0)+' km/h</span><span class="chip '+sp.visibility.cls+'">👁️ '+esc(sp.visibility.label)+'</span><span class="chip '+road.cls+'">🚗 '+esc(road.short)+'</span>';if(ctx)chips+='<span class="chip">🌧️ '+esc(ctx)+'</span>';html(prefix+"Chips",chips);};

  window.renderMain=function(model,s){var p=selectedPlace(),now=s.now,sp=snowProfile(now,model),road=s.shortRoad,change=nextSnowChange(model),nowRoad=roadLevel(now,p);text("nowIcon",iconFor(now));var nt=$("nowTemp");if(nt){nt.className="big snow-headline "+sp.cls;nt.textContent=sp.headline;}text("nowPhase",sp.behavior+" · "+sp.accum.label);var nowChips='<span class="chip '+sp.cls+'">❄️ Prob. '+Math.round(sp.prob*100)+'%</span><span class="chip">🌡️ '+fmt(now.T,1)+'° · sens. '+fmt(now.feels,1)+'°</span><span class="chip">💨 ráfagas '+fmt(now.gust,0)+' km/h</span><span class="chip '+sp.visibility.cls+'">👁️ visibilidad '+esc(sp.visibility.label.toLowerCase())+'</span><span class="chip '+nowRoad.cls+'">🚗 '+esc(nowRoad.short)+'</span>';html("nowMeta",nowChips);window.renderShortCard("plus1",s.plus1,p,1);window.renderShortCard("plus2",s.plus2,p,2);window.renderShortCard("plus3",s.plus3,p,3);var cm3=n(s.plus1.cmh,0)+n(s.plus2.cmh,0)+n(s.plus3.cmh,0),a3=accum3Label(cm3),vis=worstVisibility(s.shortHours);text("accum3Main",a3.label);text("accum3Text",a3.detail);var vm=$("visibilityMain");if(vm){vm.className="big compact "+vis.v.cls;vm.textContent=vis.v.label;}text("visibilityText","Peor señal a +"+vis.h+" h ("+hourOnly(vis.row.time)+"). "+vis.v.detail);var rm=$("roadMain");if(rm){rm.className="big compact "+road.level.cls;rm.textContent=road.level.short+" · "+road.level.label;}text("roadText","Peor señal a +"+road.h+" h ("+hourOnly(road.row.time)+"). "+road.level.text);text("changeMain",change.time);text("changeText",change.text);text("snow72",fmt(s.snow72,1)+" cm");text("snow72Text",s.snow72<.1?"Puede haber nieve visible sin acumulación medible.":s.snow72<1?"Acumulación menor o localizada.":s.snow72<4?"Acumulación moderada posible.":"Acumulación importante posible.");var win=snowWindow(model,72);if(win){text("rain72",hourOnly(win.start.time)+" → "+hourOnly(win.end.time));text("rain72Text",snowProfile(peakSnow(win.rows,win.rows.length),model).headline+" · "+win.rows.length+" h con señal nival.");}else{text("rain72","Sin ventana clara");text("rain72Text","La señal de nieve permanece baja en el período.");}var peak=peakSnow(model,72),pp=snowProfile(peak,model);text("peak72",localTime(peak.time));text("peak72Text",pp.headline+" · "+Math.round(pp.prob*100)+"% · "+pp.accum.label+".");if(s.sources<=1){text("confidenceLabel","Referencia de fuente");text("confidence","1 fuente");text("confidenceText","Lectura sin comparación entre modelos.");}else{text("confidenceLabel","Acuerdo multimodelo");text("confidence",Math.round(s.confidence*100)+"%");text("confidenceText",s.confidence>=.75?"Buen acuerdo en el conjunto de variables.":s.confidence>=.55?"Acuerdo moderado; atender cambios locales.":"Dispersión alta; la señal local es más incierta.");}text("updatedAt",p.name+" · "+Math.round(p.elev)+" m · actualizado "+pad2(new Date().getHours())+":"+pad2(new Date().getMinutes()));window.renderHours(model);window.renderDays(model);renderRows(model);drawChart(model.slice(0,Math.min(72,model.length)));window.renderQuick(s);};

  window.renderHours=function(model){var offsets=[1,2,3,4,6,8,10,12],out="";offsets.forEach(function(h){var r=horizon(model,h),sp=snowProfile(r,model),road=roadLevel(r,selectedPlace());out+='<div class="hour-card"><div class="time">+'+h+' h · '+hourOnly(r.time)+'</div><div class="ico">'+iconFor(r)+'</div><div class="micro '+sp.cls+'" style="font-size:12px;font-weight:650">'+esc(sp.short)+'</div><div class="temp">'+fmt(r.T,0)+'°</div><div class="micro">❄️ '+Math.round(sp.prob*100)+'% · '+esc(sp.accum.label)+'</div><div class="micro">💨 '+fmt(r.gust,0)+' km/h</div><div class="micro '+road.cls+'">🚗 '+esc(road.short)+'</div></div>';});html("hourStrip",out);};

  window.renderDays=function(model){var map={},order=[];model.forEach(function(r){var k=dayKey(r.time),d=parseModelDate(r.time);if(!k||!d)return;if(!map[k]){map[k]={d:d,min:null,max:null,rain:0,snow:0,maxProb:0,peak:r,score:-1};order.push(k);}var b=map[k];b.min=finite(b.min)?Math.min(b.min,r.T):r.T;b.max=finite(b.max)?Math.max(b.max,r.T):r.T;b.rain+=n(r.P,0);b.snow+=n(r.cmh,0);b.maxProb=Math.max(b.maxProb,n(r.prob,0));var sc=signal(r)*2+n(r.cmh,0)*1.5;if(sc>b.score){b.score=sc;b.peak=r;}});var out="";order.slice(0,9).forEach(function(k,i){var b=map[k],label=i===0?"Hoy":i===1?"Mañana":dayName(b.d),sp=snowProfile(b.peak,model),rain=b.rain>=.5?'<div class="day-rain">Contexto líquido: '+fmt(b.rain,1)+' mm</div>':'';out+='<div class="day-card"><div class="day-name">'+label+'</div><div class="day-date">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class="day-icon">'+iconFor(b.peak)+'</div><div class="day-temp">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class="day-snow '+sp.cls+'">'+esc(sp.short)+'</div><div class="day-meta">❄️ '+fmt(b.snow,1)+' cm · prob. máx. '+Math.round(b.maxProb*100)+'%</div>'+rain+'</div>';});html("dailyGrid",out||'<div class="day-card">Sin datos.</div>');};

  window.renderQuick=function(s){var p=selectedPlace(),model=latestModel,now=s.now,sp=snowProfile(now,model),road=s.shortRoad,cm3=n(s.plus1.cmh,0)+n(s.plus2.cmh,0)+n(s.plus3.cmh,0),a3=accum3Label(cm3),vis=worstVisibility(s.shortHours),change=nextSnowChange(model);function line(h,row){var x=snowProfile(row,model),rd=roadLevel(row,p);return '<p><span class="'+x.cls+'">+'+h+' h · '+hourOnly(row.time)+' · '+esc(x.headline)+'</span>. '+esc(x.behavior)+', probabilidad estimada '+Math.round(x.prob*100)+'%, '+esc(x.accum.label.toLowerCase())+', ráfagas '+fmt(row.gust,0)+' km/h y caminos '+esc(rd.short.toLowerCase())+'.</p>';}html("quickText",'<p>En '+esc(p.name)+', la señal nival actual es <span class="'+sp.cls+'">'+esc(sp.headline.toLowerCase())+'</span>. '+esc(sp.behavior)+'. La acumulación horaria se describe como '+esc(sp.accum.label.toLowerCase())+'. Temperatura '+fmt(now.T,1)+' °C.</p>'+line(1,s.plus1)+line(2,s.plus2)+line(3,s.plus3)+'<p><b>Acumulación próximas 3 h:</b> '+esc(a3.label)+'. '+esc(a3.detail)+'</p><p><b>Visibilidad:</b> peor riesgo potencial '+esc(vis.v.label.toLowerCase())+' a +'+vis.h+' h. '+esc(vis.v.detail)+'</p><p><b>Caminos:</b> el peor escenario aparece a +'+road.h+' h: <span class="'+road.level.cls+'">'+esc(road.level.label)+'</span>. '+esc(road.level.text)+'</p><p><b>Próximo cambio nival:</b> '+esc(change.time)+'. '+esc(change.text)+'</p>');};

  window.renderPlaces=function(){var out="";PLACE_KEYS.forEach(function(k){var p=PLACES[k],res=placeResults[k];if(!res){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Cargando señal nival…</div></div>';return;}if(res.error){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Dato temporalmente no disponible.</div></div>';return;}var s=res.summary,cls=placeCardClass(s,p),best=null;s.shortHours.forEach(function(x){var sp=snowProfile(x.row,res.model);if(!best||sp.rank>best.sp.rank||(sp.rank===best.sp.rank&&sp.prob>best.sp.prob))best={h:x.h,row:x.row,sp:sp};});var hours=s.shortHours.map(function(x){var sp=snowProfile(x.row,res.model),road=roadLevel(x.row,p);return '<div class="place-hour '+sp.cls+'"><span>+'+x.h+' h · '+hourOnly(x.row.time)+'</span><strong>'+esc(sp.short)+' · '+Math.round(sp.prob*100)+'%</strong><small>'+fmt(x.row.T,0)+'° · 🚗 '+esc(road.short)+'</small></div>';}).join('');out+='<div class="place-card '+cls+'" data-key="'+k+'"><div class="place-name">'+esc(p.name)+'</div><div class="place-main">Señal 1–3 h: '+esc(best.sp.headline)+'</div><div class="place-hours">'+hours+'</div></div>';});html("placesGrid",out);Array.prototype.slice.call(document.querySelectorAll('.place-card[data-key]')).forEach(function(el){el.onclick=function(){$("locationPreset").value=this.getAttribute("data-key");syncAdjustments();run();window.scrollTo({top:0,behavior:"smooth"});};});};

  window.renderObs=function(o){latestObs=o;if(!o){text("obsStatus","Observación temporalmente no disponible. BariSnow mantiene la estimación local por modelos.");return;}text("obsStatus","Dato observado en SAZS/BRC: contexto regional. Puede diferir mucho de los barrios del oeste.");text("obsTemp",fmt(o.tempC,1)+" °C");text("obsRH",fmt(o.rh,0)+"%");text("obsWind",fmt(o.windKmh,0)+" km/h");text("obsPhenomena",o.phenomena);text("obsAge",obsAge(o));text("obsRaw","METAR: "+o.raw+" · Fuente: "+o.source);};

  addSnowStyles();
  setupSnowCommunication();
  try{window.renderPlaces();if(latestModel&&latestModel.length&&latestSummary)window.renderMain(latestModel,latestSummary);}catch(e){}
})();
