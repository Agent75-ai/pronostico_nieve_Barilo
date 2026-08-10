  function renderShortCard(prefix,row,p,h){
    var weather=shortWeather(row),road=roadLevel(row,p);
    text(prefix+"Clock",hourOnly(row.time));
    text(prefix+"Icon",iconFor(row));
    text(prefix+"Temp",fmt(row.T,1)+" °C");
    var label=weather.rain.cls==="green"&&weather.snow.cls==="green"?"Tiempo tranquilo":weather.main.label;
    var main=$(prefix+"Main");if(main)main.className="horizon-main "+weather.main.cls;text(prefix+"Main",label+" · sens. "+fmt(row.feels,1)+" °C");
    html(prefix+"Chips",'<span class="chip '+weather.rain.cls+'">🌧️ '+fmt(row.P,1)+' mm/h</span><span class="chip '+weather.snow.cls+'">❄️ '+fmt(row.cmh,2)+' cm/h · '+Math.round(num(row.prob,0)*100)+'%</span><span class="chip '+road.cls+'">🚗 '+esc(road.short)+'</span>');
  }

  function renderMain(model,s){
    var p=selectedPlace(),now=s.now,road=s.shortRoad,change=s.next;
    text("nowIcon",iconFor(now));text("nowTemp",fmt(now.T,1)+" °C");text("nowPhase",now.phaseLabel||"—");
    var nowRoad=roadLevel(now,p);html("nowMeta",'<span class="chip">Sens. '+fmt(now.feels,1)+'°</span><span class="chip">🌧️ '+fmt(now.P,1)+' mm/h</span><span class="chip">❄️ '+fmt(now.cmh,2)+' cm/h · '+Math.round(num(now.prob,0)*100)+'%</span><span class="chip '+nowRoad.cls+'">🚗 '+esc(nowRoad.short)+'</span>');
    renderShortCard("plus1",s.plus1,p,1);renderShortCard("plus2",s.plus2,p,2);renderShortCard("plus3",s.plus3,p,3);
    $("roadMain").className="big compact "+road.level.cls;text("roadMain",road.level.short+" · "+road.level.label);text("roadText","Peor señal a +"+road.h+" h ("+hourOnly(road.row.time)+"). "+road.level.text);
    text("changeMain",change.time);text("changeText",change.text);
    text("rain72",fmt(s.rain72,1)+" mm");text("rain72Text",s.rain72<1?"Muy poca precipitación":s.rain72<10?"Episodio débil":s.rain72<25?"Episodio moderado":"Episodio importante");
    text("snow72",fmt(s.snow72,1)+" cm");text("snow72Text",s.snow72<.2?"Sin acumulación relevante":s.snow72<2?"Acumulación menor posible":s.snow72<6?"Acumulación posible":"Acumulación importante posible");
    text("peak72",localTime(s.peak72.time));text("peak72Text",(s.peak72.phaseLabel||"—")+" · "+fmt(s.peak72.P,1)+" mm/h · "+fmt(s.peak72.cmh,2)+" cm/h");
    if(s.sources<=1){text("confidenceLabel","Referencia de fuente");text("confidence","1 fuente");text("confidenceText","Sin comparación entre modelos en este modo.")}else{text("confidenceLabel","Confianza multimodelo");text("confidence",Math.round(s.confidence*100)+"%");text("confidenceText",s.confidence>=.75?"Buen acuerdo entre modelos":s.confidence>=.55?"Acuerdo moderado":"Dispersión alta entre modelos")};
    text("updatedAt",p.name+" · "+Math.round(p.elev)+" m · actualizado "+pad2(new Date().getHours())+":"+pad2(new Date().getMinutes()));
    renderHours(model);renderDays(model);renderRows(model);drawChart(model.slice(0,Math.min(72,model.length)));renderQuick(s);
  }

  function renderHours(model){var offsets=[1,2,3,4,6,8,10,12],out="";offsets.forEach(function(h){var r=horizon(model,h),rain=rainLevel(r),snow=snowLevel(r),main=clsPriority(rain,snow),road=roadLevel(r,selectedPlace());out+='<div class="hour-card"><div class="time">+'+h+' h · '+hourOnly(r.time)+'</div><div class="ico">'+iconFor(r)+'</div><div class="temp">'+fmt(r.T,0)+'°</div><div class="micro '+main.cls+'">'+esc(main.label)+'</div><div class="micro">🌧️ '+fmt(r.P,1)+' · ❄️ '+Math.round(num(r.prob,0)*100)+'%</div><div class="micro '+road.cls+'">🚗 '+esc(road.short)+'</div></div>'});html("hourStrip",out)}

  function dayKey(t){var d=parseModelDate(t);return d?d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()):""}
  function dayName(d){return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()]}
  function renderDays(model){
    var map={},order=[];model.forEach(function(r){var k=dayKey(r.time),d=parseModelDate(r.time);if(!k||!d)return;if(!map[k]){map[k]={d:d,min:null,max:null,rain:0,snow:0,maxProb:0,peak:r};order.push(k)}var b=map[k];b.min=finite(b.min)?Math.min(b.min,r.T):r.T;b.max=finite(b.max)?Math.max(b.max,r.T):r.T;b.rain+=num(r.P,0);b.snow+=num(r.cmh,0);b.maxProb=Math.max(b.maxProb,num(r.prob,0));if(num(r.P,0)+num(r.cmh,0)*2>num(b.peak.P,0)+num(b.peak.cmh,0)*2)b.peak=r});
    var out="";order.slice(0,9).forEach(function(k,i){var b=map[k],label=i===0?"Hoy":i===1?"Mañana":dayName(b.d),scope=i===0?" · desde ahora":"";out+='<div class="day-card"><div class="day-name">'+label+'</div><div class="day-date">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class="day-icon">'+iconFor(b.peak)+'</div><div class="day-temp">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class="day-meta">🌧️ '+fmt(b.rain,1)+' mm'+scope+'<br>❄️ '+fmt(b.snow,1)+' cm · '+Math.round(b.maxProb*100)+'%</div></div>'});html("dailyGrid",out||'<div class="day-card">Sin datos.</div>')
  }

  function renderRows(model){var out="";model.slice(0,72).forEach(function(r){out+='<tr><td>'+localTime(r.time)+'</td><td>'+fmt(r.T,1)+'°</td><td>'+fmt(r.feels,1)+'°</td><td>'+fmt(r.P,1)+' mm/h</td><td>'+Math.round(num(r.prob,0)*100)+'%</td><td>'+fmt(r.cmh,2)+' cm/h</td><td>'+esc(r.phaseLabel)+'</td><td>'+Math.round(num(r.consensus,0)*100)+'%</td></tr>'});html("rows",out)}

  function renderQuick(s){
    var p=selectedPlace(),now=s.now,road=s.shortRoad;
    function line(h,row){var w=shortWeather(row),rd=roadLevel(row,p);return '<p><span class="'+w.main.cls+'">+'+h+' h · '+hourOnly(row.time)+'</span>: '+esc(w.rain.label.toLowerCase())+' y '+esc(w.snow.label.toLowerCase())+'. '+fmt(row.T,1)+' °C, sensación '+fmt(row.feels,1)+' °C, prob. de nieve '+Math.round(num(row.prob,0)*100)+'%, caminos '+esc(rd.short.toLowerCase())+'.</p>'}
    html("quickText",'<p>En '+esc(p.name)+', ahora hay '+esc(rainLevel(now).label.toLowerCase())+' y '+esc(snowLevel(now).label.toLowerCase())+'. La temperatura es de '+fmt(now.T,1)+' °C y la sensación de '+fmt(now.feels,1)+' °C.</p>'+line(1,s.plus1)+line(2,s.plus2)+line(3,s.plus3)+'<p>Para circular durante las próximas 3 horas, el peor escenario aparece a +'+road.h+' h: <span class="'+road.level.cls+'">'+esc(road.level.label)+'</span>. '+esc(road.level.text)+'</p><p>En las próximas 72 horas se estiman '+fmt(s.rain72,1)+' mm de lluvia y '+fmt(s.snow72,1)+' cm de nieve posible. El momento más activo aparece alrededor de '+localTime(s.peak72.time)+'.</p><p>Próximo cambio: '+esc(s.next.time)+'. '+esc(s.next.text)+'</p>')
  }

  function run(){
    var id=++runId,p=selectedPlace(),sources=sourceSelection();setStatus("","Actualizando "+p.name+"…");text("technicalStatus","Descargando "+sources.length+" fuente(s)…");
    Promise.allSettled(sources.map(function(s){return fetchSource(s,p)})).then(function(results){if(id!==runId)return;var ok=[],fail=[];results.forEach(function(r){if(r.status==="fulfilled")ok.push(r.value);else fail.push(r.reason)});if(!ok.length){setStatus("error","No respondió ninguna fuente de pronóstico. Reintentá en unos minutos.");text("technicalStatus","Error: "+fail.map(function(e){return e.message}).join(" | "));return}var model=aggregate(ok),summary=summarize(model,p);latestModel=model;latestSummary=summary;renderMain(model,summary);setStatus("ok",ok.length+" modelo(s) disponibles"+(fail.length?" · "+fail.length+" con falla":"")+" · BariSnow activo");text("technicalStatus","Fuentes: "+ok.map(function(x){return x.source.label}).join(", ")+" · "+model.length+" horas modeladas");runPlaces(false)})
  }

  function summarizeSingle(pack){var model=aggregate([pack]);return {model:model,summary:summarize(model,pack.place||selectedPlace())}}
  function placeCardClass(s,p){return combinedShortRisk(s.shortHours,p).cls}
  function renderPlaces(){
    var out="";PLACE_KEYS.forEach(function(k){var p=PLACES[k],res=placeResults[k];if(!res){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Cargando…</div></div>';return}if(res.error){out+='<div class="place-card"><div class="place-name">'+esc(p.name)+'</div><div class="place-meta">Dato temporalmente no disponible.</div></div>';return}var s=res.summary,risk=combinedShortRisk(s.shortHours,p),cls=placeCardClass(s,p);var hours=s.shortHours.map(function(x){var w=shortWeather(x.row),road=roadLevel(x.row,p),hcls=severityClass(w.main.cls)>=severityClass(road.cls)?w.main.cls:road.cls;return '<div class="place-hour '+hcls+'"><span>+'+x.h+' h · '+hourOnly(x.row.time)+'</span><strong>'+fmt(x.row.T,0)+'° · ❄️ '+Math.round(num(x.row.prob,0)*100)+'%</strong><small>🌧 '+fmt(x.row.P,1)+' · 🚗 '+esc(road.short)+'</small></div>'}).join('');out+='<div class="place-card '+cls+'" data-key="'+k+'"><div class="place-name">'+esc(p.name)+'</div><div class="place-main">Peor 1–3 h: '+esc(risk.label)+'</div><div class="place-hours">'+hours+'</div></div>'});html("placesGrid",out);document.querySelectorAll('.place-card[data-key]').forEach(function(el){el.onclick=function(){$("locationPreset").value=this.getAttribute("data-key");syncAdjustments();run();window.scrollTo({top:0,behavior:"smooth"})}})
  }

  function runPlaces(force){
    var id=++placeRunId;if(force)placeResults={};renderPlaces();var source=SOURCES[0];PLACE_KEYS.forEach(function(k){if(placeResults[k]&&!force)return;fetchSource(source,PLACES[k]).then(function(pack){if(id!==placeRunId)return;placeResults[k]=summarizeSingle(pack);renderPlaces()}).catch(function(){if(id!==placeRunId)return;placeResults[k]={error:true};renderPlaces()})})
  }

  function parseMetar(raw,label){
    raw=String(raw||"").split(/\n/)[0].trim();if(!raw)return null;
    var temp=raw.match(/\s(M?\d{2})\/(M?\d{2}|\/\/)\b/),wind=raw.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT\b/),tm=raw.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
    function tc(x){if(!x||x==="//")return null;return x.charAt(0)==="M"?-Number(x.slice(1)):Number(x)}
    var T=temp?tc(temp[1]):null,Td=temp?tc(temp[2]):null,RH=null;if(finite(T)&&finite(Td)){var es=6.112*Math.exp((17.67*T)/(T+243.5)),e=6.112*Math.exp((17.67*Td)/(Td+243.5));RH=clamp(100*e/es,0,100)}
    var phen=/\bSN\b|SHSN|BLSN|RASN|SNRA/.test(raw)?"Nieve / mezcla":/\bRA\b|SHRA|TSRA/.test(raw)?"Lluvia":/\bDZ\b/.test(raw)?"Llovizna":/\bFG\b|BR/.test(raw)?"Niebla / neblina":"Sin fenómeno";
    var time="";if(tm){var n=new Date(),d=new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),+tm[1],+tm[2],+tm[3]));if(d-n>15*86400000)d.setUTCMonth(d.getUTCMonth()-1);time=d.toISOString()}
    return {raw:raw,tempC:T,rh:RH,windKmh:wind?Number(wind[2])*1.852:null,phenomena:phen,time:time,source:label}
  }
  function obsAge(o){if(!o||!o.time)return "—";var d=new Date(o.time);if(isNaN(d))return "—";var m=Math.max(0,Math.round((Date.now()-d.getTime())/60000));return m<90?m+" min":Math.round(m/60)+" h"}
  function renderObs(o){latestObs=o;if(!o){text("obsStatus","Observación temporalmente no disponible. El pronóstico por modelos sigue funcionando.");return}text("obsStatus","Referencia del aeropuerto; puede diferir de los barrios.");text("obsTemp",fmt(o.tempC,1)+" °C");text("obsRH",fmt(o.rh,0)+"%");text("obsWind",fmt(o.windKmh,0)+" km/h");text("obsPhenomena",o.phenomena);text("obsAge",obsAge(o));text("obsRaw","METAR: "+o.raw+" · Fuente: "+o.source)}
  function fetchObs(){
    text("obsStatus","Buscando METAR…");var sources=[{label:"VATSIM",url:"https://metar.vatsim.net/SAZS"},{label:"AviationWeather",url:"https://aviationweather.gov/api/data/metar?ids=SAZS&format=raw&hours=3"}],i=0;
    function next(){if(i>=sources.length){renderObs(null);return}var s=sources[i++];fetchText(s.url,9000).then(function(t){var o=parseMetar(t,s.label);if(!o)throw new Error("sin METAR");renderObs(o)}).catch(next)}next()
  }

  function drawChart(model){
    var c=$("chart");if(!c||!model.length)return;var rect=c.getBoundingClientRect(),dpr=Math.max(1,devicePixelRatio||1),W=Math.max(320,rect.width),H=Math.max(260,rect.height);c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);var ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);ctx.fillStyle="#07131f";ctx.fillRect(0,0,W,H);
    var l=44,r=18,t=24,b=40,pw=W-l-r,ph=H-t-b,maxP=.5,maxS=.1;model.forEach(function(x){maxP=Math.max(maxP,num(x.P,0));maxS=Math.max(maxS,num(x.cmh,0))});
    ctx.strokeStyle="rgba(255,255,255,.08)";ctx.lineWidth=1;for(var g=0;g<=4;g++){var y=t+ph*g/4;ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(W-r,y);ctx.stroke()}
    function x(i){return l+pw*i/Math.max(1,model.length-1)} function yp(v){return t+ph*(1-clamp(v/maxP,0,1))} function ys(v){return t+ph*(1-clamp(v/maxS,0,1))}
    var bw=Math.max(2,pw/model.length*.7);model.forEach(function(row,i){var y=yp(row.P);ctx.fillStyle="rgba(120,223,255,.55)";ctx.fillRect(x(i)-bw/2,y,bw,t+ph-y)});
    ctx.beginPath();model.forEach(function(row,i){var xx=x(i),yy=ys(row.cmh);if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)});ctx.strokeStyle="#72e8a8";ctx.lineWidth=2.5;ctx.stroke();
    ctx.beginPath();model.forEach(function(row,i){var xx=x(i),yy=t+ph*(1-clamp(row.prob,0,1));if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)});ctx.strokeStyle="#ffd267";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#a9bcc9";ctx.font="11px system-ui";ctx.fillText("barras lluvia · verde nieve · amarillo probabilidad",l,14);for(var i=0;i<model.length;i+=Math.max(8,Math.floor(model.length/6))){ctx.fillText(hourOnly(model[i].time),x(i)-10,H-14)}
  }

  function openQuick(){var m=$("quickModal");m.classList.add("show");m.setAttribute("aria-hidden","false")}
  function closeQuick(){var m=$("quickModal");m.classList.remove("show");m.setAttribute("aria-hidden","true")}

  function init(){
    $("refreshBtn").onclick=run;$("quickBtn").onclick=openQuick;$("quickClose").onclick=closeQuick;$("quickModal").onclick=function(e){if(e.target===$("quickModal"))closeQuick()};document.addEventListener("keydown",function(e){if(e.key==="Escape")closeQuick()});
    $("locationPreset").onchange=function(){syncAdjustments();run()};$("sourceMode").onchange=run;$("oro").onchange=run;$("coldBias").onchange=run;$("refreshPlaces").onclick=function(){runPlaces(true)};$("retryObs").onclick=fetchObs;
    window.addEventListener("resize",function(){clearTimeout(window.__bariResize);window.__bariResize=setTimeout(function(){if(latestModel.length)drawChart(latestModel.slice(0,72))},120)});
    syncAdjustments();renderPlaces();fetchObs();run();
  }
  init();
