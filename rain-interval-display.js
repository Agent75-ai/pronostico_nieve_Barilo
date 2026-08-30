(function(){
  "use strict";

  function n(x,d){return finite(x)?Number(x):d;}

  function intervalLabel(iso){
    var end=parseModelDate(iso);
    if(!end)return "—";
    var start=new Date(end.getTime()-3600000);
    return pad2(start.getHours())+"–"+pad2(end.getHours())+" h";
  }

  function probabilityLabel(row){
    var p=n(row&&row.precipProbability,null);
    return finite(p)?"☔ Prob. "+Math.round(clamp(p,0,100))+"%":null;
  }

  function patchProbability(prefix,row){
    var box=$(prefix+"Chips"),label=probabilityLabel(row);
    if(!box)return;
    var old=box.querySelector(".rain-prob-chip");
    if(!label){if(old)old.remove();return;}
    if(!old){old=document.createElement("span");old.className="chip rain-prob-chip";box.appendChild(old);}
    old.textContent=label;
  }

  function patchShortClocks(summary){
    if(!summary)return;
    [["plus1",summary.plus1],["plus2",summary.plus2],["plus3",summary.plus3]].forEach(function(x){
      if(x[1])text(x[0]+"Clock",intervalLabel(x[1].time));
      patchProbability(x[0],x[1]);
    });
  }

  var baseRenderHours=window.renderHours;
  window.renderHours=function(model){
    if(typeof baseRenderHours==="function")baseRenderHours(model);
    var offsets=[1,2,3,4,6,8,10,12];
    var cards=document.querySelectorAll("#hourStrip .hour-card");
    Array.prototype.forEach.call(cards,function(card,i){
      if(i>=offsets.length)return;
      var r=horizon(model,offsets[i]),t=card.querySelector(".time");
      if(t&&r)t.textContent="+"+offsets[i]+" h · "+intervalLabel(r.time);
      var p=probabilityLabel(r);
      if(p){
        var meta=card.querySelector(".rain-prob-inline");
        if(!meta){meta=document.createElement("div");meta.className="micro rain-prob-inline";card.appendChild(meta);}
        meta.textContent=p;
      }
    });
  };

  var baseRenderMain=window.renderMain;
  window.renderMain=function(model,summary){
    if(typeof baseRenderMain==="function")baseRenderMain(model,summary);
    patchShortClocks(summary);
    var road=$("roadText");
    if(road&&summary&&summary.shortHours){
      road.dataset.rainIntervals="1";
    }
  };

  var select=$("sourceMode");
  if(select){
    Array.prototype.forEach.call(select.options,function(o){
      if(o.value==="ensemble")o.textContent="Multimodelo · ECMWF + GFS + GEM";
      if(o.value==="best_match")o.textContent="Best Match · referencia";
    });
  }

  var p12=Array.prototype.slice.call(document.querySelectorAll(".panel h2")).filter(function(h){return h.textContent.trim()==="Próximas 12 horas";})[0];
  if(p12){
    var note=p12.closest(".panel").querySelector(".note");
    if(note)note.textContent="La lluvia corresponde al acumulado del intervalo indicado; temperatura y cielo representan el final del intervalo.";
  }

  try{if(latestModel&&latestModel.length&&latestSummary)window.renderMain(latestModel,latestSummary);}catch(e){}
})();
