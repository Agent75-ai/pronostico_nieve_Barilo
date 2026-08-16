(function(){
  "use strict";

  var baseFetchJSON=window.fetchJSON;
  if(typeof baseFetchJSON!=="function")return;

  function isDryInstantCode(code){
    code=Number(code);
    return code===0||code===1||code===2||code===3||code===45||code===48;
  }

  window.fetchJSON=function(url,timeout){
    return baseFetchJSON(url,timeout).then(function(data){
      try{
        var c=data&&data.current;
        if(c&&String(url).indexOf("current=")>=0&&isDryInstantCode(c.weather_code)){
          /*
           * Para “Ahora”, el weather_code y la nubosidad describen el estado
           * instantáneo. Una pequeña cantidad acumulada en el intervalo
           * inmediatamente anterior no debe convertir un cielo ya despejado
           * en llovizna/nieve presente.
           */
          c.precipitation=0;
          c.rain=0;
          c.showers=0;
          c.snowfall=0;
        }
      }catch(e){}
      return data;
    });
  };
})();
