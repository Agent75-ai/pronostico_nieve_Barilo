(function(){
  "use strict";

  var baseRenderMain=window.renderMain;
  var baseRenderHours=window.renderHours;
  var baseRenderDays=window.renderDays;
  var baseRenderPlaces=window.renderPlaces;
  var comfortSeq=0;
  var comfortCache=null;

  function n(x,d){return finite(x)?Number(x):d;}
  function sevClass(el){
    if(!el)return "blue";
    var names=["green","blue","yellow","orange","red"];
    for(var i=0;i<names.length;i++)if(el.classList.contains(names[i]))return names[i];
    return "blue";
  }
  function agreement(row){
    var members=n(row&&row.members,1);
    if(members<=1)return "1 fuente";
    return "Acuerdo "+Math.round(clamp(n(row&&row.consensus,.5),0,1)*100)+"%";
  }
  function accum(row){
    var c=n(row&&row.cmh,0);
    if(c<.03)return "0 cm";
    if(c<.12)return "Traza";
    if(c<1)return fmt(c,2)+" cm/h";
    return fmt(c,1)+" cm/h";
  }
  function visibilityText(m){
    if(!finite(m))return "—";
    m=Number(m);
    return m>=1000?fmt(m/1000,1)+" km":Math.round(m)+" m";
  }
  function iconForCategory(label){
    label=String(label||"").toUpperCase();
    if(label.indexOf("SIN NIEVE")>=0)return "☁️";
    if(label.indexOf("LLUVIA")>=0||label.indexOf("HÚMEDA")>=0)return "🌨️";
    if(label.indexOf("CHAPARRÓN")>=0)return "🌨️";
    return "❄️";
  }

  function injectStyle(){
    if(document.getElementById("barisnow-approved-visual-style"))return;
    var style=document.createElement("style");
    style.id="barisnow-approved-visual-style";
    style.textContent=`
      :root{--bg:#030a12;--panel:#071522;--panel2:#0a1c2c;--line:rgba(170,216,245,.12);--txt:#eef7fc;--mut:#8ea6b7;--blue:#5db7ff;--green:#5bd6a0;--yellow:#e9c85c;--orange:#f3a24c;--red:#f1707e;--shadow:0 16px 38px rgba(0,0,0,.24)}
      body{background:radial-gradient(circle at 83% -8%,rgba(65,137,195,.14),transparent 31%),radial-gradient(circle at 6% 5%,rgba(53,119,170,.09),transparent 24%),linear-gradient(180deg,#02070d 0%,#04101a 42%,#020a12 100%)!important;color:var(--txt)!important}
      body::before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.34;background-image:radial-gradient(circle at 12% 7%,rgba(255,255,255,.35) 0 1px,transparent 1.5px),radial-gradient(circle at 32% 13%,rgba(255,255,255,.23) 0 1px,transparent 1.5px),radial-gradient(circle at 70% 8%,rgba(255,255,255,.25) 0 1px,transparent 1.5px);background-size:190px 140px,250px 180px,310px 220px}
      .wrap{width:min(1210px,calc(100% - 24px))!important;padding-top:12px!important}
      .hero{min-height:118px!important;padding:20px 24px!important;border-radius:22px!important;background:linear-gradient(125deg,rgba(7,25,41,.96),rgba(9,35,55,.92))!important;border-color:rgba(132,197,237,.14)!important;box-shadow:0 16px 40px rgba(0,0,0,.24)!important}
      .hero::before{opacity:.55!important;background:radial-gradient(circle at 86% 16%,rgba(116,194,241,.11),transparent 16%),linear-gradient(154deg,transparent 55%,rgba(113,182,224,.07) 56% 57%,transparent 58%)!important}
      .hero h1{font-size:clamp(38px,5vw,56px)!important;letter-spacing:-.055em!important;display:flex;align-items:center;gap:12px}
      .hero h1::before{content:"❄";font-size:.82em;color:#b9e3ff;text-shadow:0 0 24px rgba(93,183,255,.28)}
      .brandline{font-size:11px!important;color:#9dc5dd!important;margin-bottom:5px!important}
      .subtitle{font-size:13px!important;color:#9fb6c5!important;margin-top:7px!important;max-width:760px!important}
      .snow-kicker{display:none!important}
      .toolbar{margin:10px 0 4px!important;padding:9px!important;border-radius:16px!important;background:rgba(4,15,24,.88)!important;box-shadow:none!important;border-color:rgba(148,199,230,.1)!important}
      select,input,button{background:#071827!important;border-color:rgba(151,203,234,.12)!important;color:#e9f4fb!important;min-height:40px!important;border-radius:11px!important}
      button.primary{background:linear-gradient(135deg,#2c89d8,#62baf5)!important;color:white!important}
      button.soft{background:#0a2032!important}
      .updated{font-size:10.5px!important}
      .statusline{min-height:27px!important;margin:0 0 5px!important;padding:4px 8px!important;font-size:10.5px!important}
      .glance{grid-template-columns:minmax(310px,1.35fr) minmax(0,2fr)!important;gap:9px!important;margin-bottom:9px!important}
      .glance-card,.horizon-card,.decision-card,.panel{background:linear-gradient(180deg,rgba(10,29,45,.94),rgba(5,19,31,.96))!important;border:1px solid rgba(143,198,231,.12)!important;box-shadow:0 10px 28px rgba(0,0,0,.2)!important}
      .glance-card.main{min-height:214px!important;padding:18px!important;border-color:rgba(93,183,255,.22)!important;background:linear-gradient(145deg,rgba(12,42,66,.98),rgba(5,20,33,.98))!important}
      .glance-card.main .eyebrow{font-size:10px!important;color:#8fcfff!important}
      .weather-line{margin-top:12px!important;gap:14px!important}
      .weather-icon{font-size:46px!important;filter:drop-shadow(0 0 14px rgba(108,195,255,.18))}
      .snow-headline{font-size:clamp(29px,3.3vw,44px)!important;line-height:1!important;letter-spacing:-.04em!important}
      #nowPhase{font-size:11px!important;color:#91a9b9!important;margin-top:5px}
      #nowMeta{margin-top:15px!important}
      .comfort-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
      .comfort-metric{padding:11px 13px;border-radius:15px;background:rgba(255,255,255,.035);border:1px solid rgba(147,205,240,.09)}
      .comfort-metric span{display:flex;align-items:center;gap:6px;font-size:10px;text-transform:uppercase;letter-spacing:.055em;color:#8fa9ba}
      .comfort-metric strong{display:block;margin-top:5px;font-size:28px;line-height:1;font-weight:710;letter-spacing:-.045em;color:#eff9ff}
      .comfort-metric.feels strong{color:#70bdff}
      .comfort-support{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
      .support-item{display:inline-flex;gap:5px;align-items:center;font-size:10.5px;color:#9db4c3;padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.025);border:1px solid rgba(149,201,233,.07)}
      .short-grid{gap:9px!important}
      .horizon-card{min-height:214px!important;padding:14px!important;text-align:center}
      .horizon-head{margin-bottom:8px}.horizon-head .eyebrow{font-size:10px!important}.clock{font-size:10px!important}
      .horizon-weather{justify-content:center!important;flex-direction:column!important;gap:6px!important;margin-top:5px!important}
      .horizon-icon{font-size:32px!important}.horizon-temp{font-size:18px!important;line-height:1.08!important;max-width:none!important;font-weight:720!important;min-height:39px;display:flex;align-items:center;justify-content:center}
      .horizon-main{font-size:12px!important;line-height:1.45!important;color:#c5d8e4!important;font-weight:550!important;margin-top:6px!important}
      .horizon-card .chiprow{justify-content:center!important;margin-top:9px!important}.horizon-card .chip{font-size:9.5px!important;padding:4px 7px!important}
      .decision-grid{grid-template-columns:repeat(4,1fr)!important;gap:9px!important;margin-bottom:10px!important}
      .decision-card{min-height:105px!important;padding:13px!important}
      .decision-card .eyebrow{font-size:9.5px!important}.decision-card .eyebrow::before{display:inline-block;margin-right:6px;font-size:14px;color:#74c2f7}
      .decision-card:nth-child(1) .eyebrow::before{content:"❄"}.decision-card:nth-child(2) .eyebrow::before{content:"◉"}.decision-card:nth-child(3) .eyebrow::before{content:"▰"}.decision-card:nth-child(4) .eyebrow::before{content:"↗"}
      .decision-card .big.compact{font-size:20px!important;margin:9px 0 5px!important}.decision-card .sub{font-size:10.5px!important;line-height:1.35!important}
      .panel{margin-bottom:10px!important;padding:14px!important;border-radius:19px!important}.panel-head{margin-bottom:9px!important}.panel h2{font-size:15px!important}.panel .note{font-size:10.5px!important;margin-top:3px!important}
      .hour-strip{grid-template-columns:repeat(8,minmax(95px,1fr))!important;gap:6px!important}.hour-card{padding:10px 7px!important;border-radius:13px!important;background:rgba(255,255,255,.022)!important;border-color:rgba(145,199,230,.08)!important}.hour-card .time{font-size:10px!important}.hour-card .ico{font-size:22px!important;margin:6px 0 4px!important}.hour-card .temp{font-size:17px!important;margin-top:5px}.hour-card .micro{font-size:9.5px!important;margin-top:3px!important}
      .event-bar{gap:7px!important}.metric{padding:11px!important;border-radius:14px!important;background:rgba(255,255,255,.025)!important;border-color:rgba(145,199,230,.08)!important}.metric span{font-size:9px!important}.metric strong{font-size:17px!important;margin-top:5px!important}.metric small{font-size:9.5px!important}
      .daily-grid{grid-template-columns:repeat(5,1fr)!important;gap:7px!important;overflow:visible!important}.day-card{min-width:0!important;padding:11px!important;border-radius:14px!important;background:rgba(255,255,255,.022)!important;border-color:rgba(145,199,230,.08)!important;text-align:center}.day-name{font-size:10px!important}.day-date{font-size:11px!important;color:#7f99aa!important}.day-icon{font-size:22px!important;margin:7px 0 5px!important}.day-temp{font-size:16px!important}.day-snow{font-size:10px!important;margin-top:5px!important}.day-meta{display:none!important}
      .places-grid{grid-template-columns:repeat(3,1fr)!important;gap:7px!important}.place-card{padding:11px!important;border-radius:14px!important;background:rgba(255,255,255,.022)!important;border-color:rgba(145,199,230,.08)!important}.place-card::before{width:3px!important}.place-card .place-name{font-size:11.5px!important}.place-card .place-main{font-size:12.5px!important;margin:6px 0 0!important}.place-hours{display:none!important}
      details.panel{padding:0!important}details summary{padding:13px 14px!important;font-size:13px!important}.details-body{padding:0 14px 14px!important}.snow-legend-grid{grid-template-columns:repeat(4,1fr)!important}.obs-line{gap:6px!important}.obs-box{padding:9px!important}.obs-box strong{font-size:13px!important}
      canvas{height:280px!important}.tech-grid{gap:6px!important}.tablebox{max-height:340px!important}
      .modal-card{background:#071724!important;border-color:rgba(100,183,235,.18)!important}.quick-text{font-size:13.5px!important;line-height:1.55!important}
      footer{font-size:10px!important;color:#718999!important}
      @media(max-width:900px){.glance{grid-template-columns:1fr!important}.decision-grid{grid-template-columns:1fr 1fr!important}.places-grid{grid-template-columns:1fr 1fr!important}.daily-grid{grid-template-columns:repeat(5,minmax(130px,1fr))!important;overflow-x:auto!important}.snow-legend-grid{grid-template-columns:1fr 1fr!important}}
      @media(max-width:620px){.wrap{width:calc(100% - 12px)!important}.hero{padding:17px!important;min-height:105px!important}.hero h1{font-size:38px!important}.toolbar{position:relative!important;top:auto!important}.glance-card.main{min-height:auto!important}.comfort-metric strong{font-size:25px!important}.short-grid{grid-template-columns:repeat(3,minmax(172px,1fr))!important;overflow-x:auto!important}.horizon-card{min-height:195px!important}.decision-grid{grid-template-columns:1fr 1fr!important}.event-bar{grid-template-columns:1fr 1fr!important}.places-grid{grid-template-columns:1fr!important}.obs-line{grid-template-columns:1fr 1fr!important}.snow-legend-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function setupLabels(){
    var subtitle=document.querySelector(".subtitle");
    if(subtitle)subtitle.textContent="Nieve, temperatura y sensación térmica en Bariloche. Lectura rápida ahora, +1, +2 y +3 horas, con horizonte máximo de 5 días.";
    var dayTitle=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return /Hoy \+/.test(h.textContent);})[0];
    if(dayTitle)dayTitle.textContent="Hoy + 4 días";
    if(dayTitle){var note=dayTitle.closest(".panel").querySelector(".note");if(note)note.textContent="Cinco días, sin extender el pronóstico más allá de lo útil.";}
    var p12=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return h.textContent.trim()==="Próximas 12 horas";})[0];
    if(p12){var note12=p12.closest(".panel").querySelector(".note");if(note12)note12.textContent="Tendencia horaria compacta: estado y temperatura.";}
    var pb=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return h.textContent.trim()==="Barrios de Bariloche";})[0];
    if(pb){var nb=pb.closest(".panel").querySelector(".note");if(nb)nb.textContent="Resumen 1–3 h por zona. Tocá un barrio para ver su detalle.";}
  }

  function simplifyForecastCard(prefix,row){
    var state=$(prefix+"Temp"),main=$(prefix+"Main"),chips=$(prefix+"Chips");
    if(!state||!main||!chips)return;
    var label=state.textContent.trim();
    text(prefix+"Icon",iconForCategory(label));
    main.textContent="🌡️ "+fmt(row.T,1)+" °C  ·  Sensación "+fmt(row.feels,1)+" °C";
    chips.innerHTML='<span class="chip">'+esc(agreement(row))+'</span><span class="chip '+sevClass(state)+'">❄️ '+esc(accum(row))+'</span>';
  }

  function simplifyHourStrip(){
    Array.prototype.slice.call(document.querySelectorAll("#hourStrip .hour-card")).forEach(function(card){
      var time=card.querySelector(".time"),temp=card.querySelector(".temp"),micros=card.querySelectorAll(".micro");
      if(!time||!temp||!micros.length)return;
      var cat=micros[0],catText=cat.textContent.trim(),cls=sevClass(cat);
      card.innerHTML='<div class="time">'+esc(time.textContent)+'</div><div class="ico">'+iconForCategory(catText)+'</div><div class="micro '+cls+'" style="font-weight:700">'+esc(catText)+'</div><div class="temp">'+esc(temp.textContent)+'</div>';
    });
  }

  function trimDays(){
    var grid=$("dailyGrid");if(!grid)return;
    var cards=Array.prototype.slice.call(grid.querySelectorAll(".day-card"));
    cards.slice(5).forEach(function(c){c.remove();});
    setupLabels();
  }

  function currentComfortUrl(p){
    var vars="temperature_2m,apparent_temperature,relative_humidity_2m,visibility,wind_speed_10m,wind_gusts_10m";
    return "https://api.open-meteo.com/v1/forecast?latitude="+p.lat+"&longitude="+p.lon+"&elevation="+p.elev+"&current="+encodeURIComponent(vars)+"&timezone="+encodeURIComponent("America/Argentina/Buenos_Aires")+"&temperature_unit=celsius&wind_speed_unit=kmh";
  }

  function comfortFallback(){
    var r=latestSummary&&latestSummary.now;
    if(!r)return null;
    return {temperature_2m:r.T,apparent_temperature:r.feels,wind_gusts_10m:r.gust,visibility:null};
  }

  function renderComfort(){
    var box=$("nowMeta");if(!box)return;
    var c=comfortCache||comfortFallback();if(!c)return;
    var p=selectedPlace(),road=(latestSummary&&latestSummary.now)?roadLevel(latestSummary.now,p):null;
    var temp=n(c.temperature_2m,null),feel=n(c.apparent_temperature,null),gust=n(c.wind_gusts_10m,null),vis=n(c.visibility,null);
    box.innerHTML='<div class="comfort-grid">'+
      '<div class="comfort-metric"><span>🌡️ Temperatura</span><strong>'+fmt(temp,1)+'°</strong></div>'+ 
      '<div class="comfort-metric feels"><span>❄ Sensación térmica</span><strong>'+fmt(feel,1)+'°</strong></div>'+ 
      '</div><div class="comfort-support">'+
      (finite(gust)?'<span class="support-item">💨 Ráfagas '+fmt(gust,0)+' km/h</span>':'')+
      (finite(vis)?'<span class="support-item">◉ Visibilidad '+visibilityText(vis)+'</span>':'')+
      (road?'<span class="support-item">🚗 '+esc(road.label)+'</span>':'')+
      '</div>';
  }

  function requestComfort(){
    var seq=++comfortSeq,p=selectedPlace(),key=selectedKey();
    fetchJSON(currentComfortUrl(p),9000).then(function(d){
      if(seq!==comfortSeq||selectedKey()!==key||!d||!d.current)return;
      comfortCache=d.current;
      renderComfort();
    }).catch(function(){comfortCache=comfortFallback();renderComfort();});
  }

  if(baseRenderHours){
    window.renderHours=function(model){baseRenderHours(model);simplifyHourStrip();};
  }
  if(baseRenderDays){
    window.renderDays=function(model){baseRenderDays(model);trimDays();};
  }
  if(baseRenderPlaces){
    window.renderPlaces=function(){baseRenderPlaces();};
  }
  if(baseRenderMain){
    window.renderMain=function(model,s){
      baseRenderMain(model,s);
      simplifyForecastCard("plus1",s.plus1);
      simplifyForecastCard("plus2",s.plus2);
      simplifyForecastCard("plus3",s.plus3);
      trimDays();
      simplifyHourStrip();
      comfortCache=comfortFallback();
      renderComfort();
      requestComfort();
    };
  }

  var nowMeta=$("nowMeta");
  if(nowMeta){
    new MutationObserver(function(){
      if(nowMeta.querySelector(".comfort-grid"))return;
      if(comfortCache||comfortFallback())setTimeout(renderComfort,0);
    }).observe(nowMeta,{childList:true,subtree:false});
  }

  injectStyle();
  setupLabels();
  try{requestComfort();}catch(e){}
})();
