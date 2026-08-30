from pathlib import Path
import re


def replace_block(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    start = s.index(start_marker)
    end = s.index(end_marker, start)
    p.write_text(s[:start] + replacement + s[end:], encoding="utf-8")


WEB_CURRENT = r'''  function currentCategory(c,p){
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
'''

WEB_SNOW_KEY = r'''  function sourceSnowThermal(r){
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
'''

WEB_AGGREGATE = r'''  window.aggregate=function(packs){
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
'''

WEB_SNOW_CATEGORY = r'''  function snowCategory(row){
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
'''

FORECAST_CURRENT = r'''    private static String currentCategory(JSONObject c, BariSnowWidgetProvider.Place p) {
        double t = c.optDouble("temperature_2m", Double.NaN);
        double rh = c.optDouble("relative_humidity_2m", Double.NaN);
        int code = c.optInt("weather_code", -1);
        double snow = Math.max(0, c.optDouble("snowfall", 0));
        double rain = Math.max(0, c.optDouble("rain", 0));
        double showers = Math.max(0, c.optDouble("showers", 0));
        double precip = Math.max(0, c.optDouble("precipitation", 0));
        double tw = finite(t) && finite(rh) ? wetBulb(t + p.coldBias, rh) : 99;
        double liquid = rain + showers;
        boolean snowCodeNow = snowShowerCode(code) || code == 71 || code == 73 || code == 75 || code == 77;
        boolean snowEvidence = (snow >= .01 && tw <= .70)
                || (snow >= .03 && tw <= 1.30)
                || (snow >= .10 && tw <= 1.80)
                || (snowCodeNow && tw <= .25 && precip >= .05);
        boolean snowShowerEvidence = snowEvidence || (snow >= .15 && tw <= 2.10);
        if (snowShowerCode(code) && snowShowerEvidence) return "CHAPARRÓN DE NIEVE";
        if ((code == 71 || code == 73 || code == 75) && snowEvidence) return "NIEVA";
        if (code == 77 && snowEvidence) return "NIEVE GRANULADA";
        if (code == 51 || code == 53 || code == 55 || code == 56 || code == 57
                || code == 61 || code == 63 || code == 65 || code == 66 || code == 67
                || code == 80 || code == 81 || code == 82 || code == 95 || code == 96 || code == 99) return "SIN NIEVE";
        if (!snowCodeNow && snowEvidence) {
            if (snow >= .06 && liquid < .03 && tw <= 1.0) return "NIEVA";
            if (snow >= .02 && tw <= 1.25) return liquid >= .03 ? "LLUVIA Y NIEVE" : "NIEVE HÚMEDA";
        }
        return "SIN NIEVE";
    }
'''

FORECAST_AGGREGATE = r'''    private static List<Row> aggregate(List<Pack> packs) {
        Map<String, List<Row>> byTime = new TreeMap<>();
        for (Pack pack : packs) for (Row row : pack.rows) byTime.computeIfAbsent(row.time, k -> new ArrayList<>()).add(row);
        List<Row> out = new ArrayList<>();
        for (Map.Entry<String, List<Row>> entry : byTime.entrySet()) {
            List<Row> a = entry.getValue();
            double totalW = 0;
            double snowSupport = 0;
            for (Row r : a) {
                totalW += r.sourceWeight;
                if (sourceSnowEvidence(r)) snowSupport += r.sourceWeight;
            }
            Row row = new Row();
            row.time = entry.getKey();
            row.T = wmean(a, "T");
            row.RH = wmean(a, "RH");
            row.P = wmean(a, "P");
            row.Psignal = wmean(a, "Psignal");
            row.showers = wmean(a, "showers");
            row.snowfall = wmean(a, "snowfall");
            row.wind = wmean(a, "wind");
            row.gust = wmean(a, "gust");
            row.cape = wmean(a, "cape");
            row.freezingLevel = wmean(a, "freezingLevel");
            row.TwEff = wmean(a, "TwEff");
            row.snowLine = wmean(a, "snowLine");
            row.prob = wmean(a, "prob");
            row.cmh = wmean(a, "cmh");
            row.snowShowerScore = wmean(a, "snowShowerScore");
            row.localSnowShower = wmean(a, "localSnowShower");
            row.feels = wmean(a, "feels");
            row.ptypeIdx = wmean(a, "ptypeIdx");
            row.snowSupport = totalW > 0 ? snowSupport / totalW : 0;
            row.members = a.size();
            out.add(row);
        }
        return filterNow(out);
    }
'''

FORECAST_SNOW_CATEGORY = r'''    private static boolean sourceSnowEvidence(Row r) {
        if (r == null) return false;
        double t = r.T;
        double tw = r.TwEff;
        double sf = Math.max(0, r.snowfall);
        double ps = Math.max(0, r.Psignal);
        if (t > 5.5 || tw > 2.2) return false;
        if (t > 4.5) return tw <= 1.0 && sf >= .05 && ps >= .20;
        if (t > 3.0) return tw <= 1.5 && sf >= .02 && (ps >= .08 || r.snowShowerScore >= .55);
        return tw <= 1.9 && (sf >= .01 || r.ptypeIdx >= 2 || ps >= .12);
    }

    private static String categoricalSnow(Row row) {
        if (row == null) return "SIN DATO";
        double p = row.prob;
        double c = row.cmh;
        double idx = row.ptypeIdx;
        double sf = Math.max(0, row.snowfall);
        double sh = row.snowShowerScore;
        double tw = row.TwEff;
        double t = row.T;
        double ps = Math.max(0, row.Psignal);
        double support = clamp(row.snowSupport, 0, 1);
        boolean consensusOK = row.members >= 2 ? support >= .60 : support >= .99 && sf >= .08;
        boolean showerThermal = (t <= 3.0 && tw <= 1.8)
                || (t > 3.0 && t <= 4.5 && tw <= 1.5 && sf >= .02 && ps >= .08)
                || (t > 4.5 && t <= 5.5 && tw <= 1.0 && sf >= .05 && ps >= .20);
        if (t > 5.5 || tw > 2.3) return "SIN NIEVE";
        if ((idx >= 5 || c >= .8) && t <= 2.8 && tw <= 1.1 && consensusOK) return "NEVADA ACUMULABLE";
        if ((sh >= .45 || row.localSnowShower >= .35) && showerThermal && consensusOK && (sf >= .01 || ps >= .12)) return "CHAPARRÓN DE NIEVE";
        if (t <= 4.2 && tw <= 1.5 && support >= .50 && (idx >= 4 || sf >= .12 || (p >= .60 && sf >= .02))) return "NIEVA";
        if (t <= 4.8 && tw <= 1.8 && support >= .34 && (idx >= 3 || sf >= .02 || (p >= .42 && sf >= .01))) return "NIEVE HÚMEDA";
        if (t <= 5.2 && tw <= 2.1 && support >= .34 && (idx >= 2 || sf >= .01)) return "LLUVIA Y NIEVE";
        if (t <= 5.5 && tw <= 2.2 && support >= .34 && (p >= .23 || idx >= 1 || sf >= .01)) return "COPOS AISLADOS";
        return "SIN NIEVE";
    }
'''

FORECAST_ROW = r'''    private static final class Row {
        String time;
        double T;
        double RH;
        double P;
        double Psignal;
        double showers;
        double snowfall;
        double wind;
        double gust;
        double cape;
        double freezingLevel;
        double TwEff;
        double snowLine;
        double prob;
        double cmh;
        double ptypeIdx;
        double snowShowerScore;
        double localSnowShower;
        double snowSupport;
        int members;
        double feels;
        double sourceWeight;
    }
'''

RAIN_CURRENT = r'''    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        if (c == null) return null;
        int code = c.optInt("weather_code", -1);
        double t = c.optDouble("temperature_2m", Double.NaN);
        double rh = c.optDouble("relative_humidity_2m", Double.NaN);
        double snow = Math.max(0, c.optDouble("snowfall", 0));
        double rain = Math.max(0, c.optDouble("rain", 0));
        double showers = Math.max(0, c.optDouble("showers", 0));
        double precip = Math.max(0, c.optDouble("precipitation", 0));
        double liquid = rain + showers;
        double tw = 99;
        if (!Double.isNaN(t) && !Double.isInfinite(t) && !Double.isNaN(rh) && !Double.isInfinite(rh)) {
            double h = Math.max(1, Math.min(100, rh));
            double tt = t + place.coldBias;
            tw = tt * Math.atan(.151977 * Math.sqrt(h + 8.313659)) + Math.atan(tt + h) - Math.atan(h - 1.676331)
                    + .00391838 * Math.pow(h, 1.5) * Math.atan(.023101 * h) - 4.686035;
        }
        boolean snowCodeNow = snowCode(code);
        boolean snowEvidence = (snow >= .01 && tw <= .70) || (snow >= .03 && tw <= 1.30) || (snow >= .10 && tw <= 1.80)
                || (snowCodeNow && tw <= .25 && precip >= .05);
        if (snowCodeNow && (snowEvidence || (snow >= .15 && tw <= 2.10))) return null;
        if (code == 95 || code == 96 || code == 99) return "TORMENTA";
        if (code == 66 || code == 67) return "LLUVIA CONGELANTE";
        if (code == 56 || code == 57) return "LLOVIZNA CONGELANTE";
        if (code == 82) return "CHAPARRÓN FUERTE";
        if (code == 80 || code == 81) return "CHAPARRÓN DE LLUVIA";
        if (code == 51 || code == 53 || code == 55) return "LLOVIZNA";
        if (code == 65) return "LLUVIA FUERTE";
        if (code == 63) return "LLUVIA MODERADA";
        if (code == 61) return "LLUVIA DÉBIL";
        if (showers >= .15) return "CHAPARRÓN DE LLUVIA";
        if (liquid >= 5) return "LLUVIA FUERTE";
        if (liquid >= 2) return "LLUVIA MODERADA";
        if (liquid >= .4) return "LLUVIA DÉBIL";
        if (liquid >= .05 || precip >= .05) return "LLOVIZNA";
        return currentSky(c, code);
    }
'''

RAIN_PARSE = r'''    private static List<Row> parse(JSONObject data, Source source, BariSnowWidgetProvider.Place place) {
        JSONObject h = data.optJSONObject("hourly");
        if (h == null) return Collections.emptyList();
        JSONArray times = h.optJSONArray("time");
        if (times == null) return Collections.emptyList();
        List<Row> out = new ArrayList<>();
        for (int i = 0; i < times.length(); i++) {
            Row r = new Row();
            r.time = times.optString(i, "");
            double pBase = Math.max(0, arr(h, "precipitation", i, 0));
            r.rain = Math.max(0, arr(h, "rain", i, 0));
            r.showers = Math.max(0, arr(h, "showers", i, 0));
            r.snow = Math.max(0, arr(h, "snowfall", i, 0));
            r.code = (int) Math.round(arr(h, "weather_code", i, -1));
            r.cloud = clamp(arr(h, "cloud_cover", i, Double.NaN), 0, 100);
            r.isDay = arr(h, "is_day", i, fallbackDaylight(r.time)) >= .5 ? 1 : 0;
            r.cape = Math.max(0, arr(h, "cape", i, 0));
            r.precipProbability = arr(h, "precipitation_probability", i, Double.NaN);
            r.temp = arr(h, "temperature_2m", i, 99) + place.coldBias;
            r.rh = arr(h, "relative_humidity_2m", i, 80);
            double hh = Math.max(1, Math.min(100, r.rh));
            r.tw = r.temp * Math.atan(.151977 * Math.sqrt(hh + 8.313659)) + Math.atan(r.temp + hh)
                    - Math.atan(hh - 1.676331) + .00391838 * Math.pow(hh, 1.5) * Math.atan(.023101 * hh) - 4.686035;
            double wind = Math.max(0, arr(h, "wind_speed_10m", i, 0));
            double dir = arr(h, "wind_direction_10m", i, 270);
            double windward = Math.max(0, Math.cos(Math.toRadians(dir - 280)));
            double moist = clamp(r.rh / 90, .3, 1.3);
            double windTerm = clamp(wind / 45, 0, 1.5);
            double oroIndex = windward * moist * windTerm;
            double mult = clamp(1 + place.oro * oroIndex, .85, 1.55);
            r.precip = pBase * mult;
            if (r.temp > 5.5 || r.tw > 2.2) r.snowPlausible = false;
            else if (r.temp > 4.5) r.snowPlausible = r.tw <= 1.0 && r.snow >= .05 && r.precip >= .20;
            else if (r.temp > 3.0) r.snowPlausible = r.tw <= 1.5 && r.snow >= .02 && r.precip >= .08;
            else r.snowPlausible = r.tw <= 1.9 && (r.snow >= .01 || snowCode(r.code));
            r.weight = source.weight;
            r.liquid = Math.max(r.rain + r.showers, r.snowPlausible ? 0 : r.precip);
            r.key = sourceKey(r);
            out.add(r);
        }
        return out;
    }
'''

RAIN_SOURCE_KEY = r'''    private static String sourceKey(Row r) {
        int code = r.code;
        if (r.snowPlausible && (snowCode(code) || r.snow >= .01)) return "snow";
        if (code == 95 || code == 96 || code == 99) return "thunder";
        if (code == 66 || code == 67) return "freezing_rain";
        if (code == 56 || code == 57) return "freezing_drizzle";
        if (code == 82) return "rain_shower_heavy";
        if (code == 80 || code == 81) return "rain_shower";
        if (code == 51 || code == 53 || code == 55) return "drizzle";
        if (code == 65) return "rain_heavy";
        if (code == 63) return "rain_moderate";
        if (code == 61) return "rain_light";
        if (r.showers >= .6 && r.showers >= .35 * Math.max(r.precip, .01)) return "rain_shower_heavy";
        if (r.showers >= .18 && r.showers >= .25 * Math.max(r.precip, .01)) return "rain_shower";
        if (r.liquid >= 5) return "rain_heavy";
        if (r.liquid >= 2) return "rain_moderate";
        if (r.liquid >= .4) return "rain_light";
        if (r.liquid >= .08 || r.precip >= .12) return "drizzle";
        if (code == 45 || code == 48) return "fog";
        if (code == 0) return "clear";
        if (code == 1) return "mostly_clear";
        if (code == 2) return "partly_cloudy";
        if (code == 3) return "overcast";
        return "unknown_sky";
    }
'''

RAIN_ROW = r'''    private static final class Row {
        String time;
        String key;
        int code;
        double precip;
        double rain;
        double showers;
        double snow;
        double temp;
        double rh;
        double tw;
        boolean snowPlausible;
        double cloud;
        double isDay;
        double cape;
        double liquid;
        double precipProbability;
        double weight;
        double freezingRainSupport;
        double freezingDrizzleSupport;
        double showerSupport;
        double violentShowerSupport;
        double thunderSupport;
    }
'''

replace_block("precipitation-communication.js", "  function snowCategory(row){", "\n  function rainCategory(row){", WEB_SNOW_CATEGORY)
replace_block("precipitation-communication.js", "  function currentCategory(c,p){", "\n  function currentUrl(p){", WEB_CURRENT)
replace_block("precipitation-model.js", "  function snowKey(r){", "\n  function liquidFor(r){", WEB_SNOW_KEY)

p = Path("precipitation-model.js")
s = p.read_text(encoding="utf-8")
s = s.replace("var snowProb=clamp(n(r&&r.prob,0),0,1);", "var snowProb=snowKey(r)?clamp(n(r&&r.prob,0),0,1):0;")
p.write_text(s, encoding="utf-8")
replace_block("precipitation-model.js", "  window.aggregate=function(packs){", "\n\n  if(typeof baseSummarize", WEB_AGGREGATE)

forecast_path = "android-app/app/src/main/java/com/barisnow/app/BariSnowForecastEngine.java"
replace_block(forecast_path, "    private static List<Row> aggregate(List<Pack> packs) {", "\n    private static List<Row> filterNow", FORECAST_AGGREGATE)
replace_block(forecast_path, "    private static String currentCategory(JSONObject c, BariSnowWidgetProvider.Place p) {", "\n    private static String categoricalSnow", FORECAST_CURRENT)
replace_block(forecast_path, "    private static String categoricalSnow(Row row) {", "\n    private static int categoryRank", FORECAST_SNOW_CATEGORY)
replace_block(forecast_path, "    private static final class Row {", "\n    private static final class DayBucket", FORECAST_ROW)

rain_path = "android-app/app/src/main/java/com/barisnow/app/BariSnowRainEngine.java"
replace_block(rain_path, "    private static List<Row> parse(JSONObject data, Source source, BariSnowWidgetProvider.Place place) {", "\n    private static String sourceKey", RAIN_PARSE)
replace_block(rain_path, "    private static String sourceKey(Row r) {", "\n    private static List<Row> aggregate", RAIN_SOURCE_KEY)
replace_block(rain_path, "    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {", "\n    private static String currentSky", RAIN_CURRENT)
replace_block(rain_path, "    private static final class Row {", "\n    private static final class RainData", RAIN_ROW)

p = Path("android-app/app/build.gradle")
s = p.read_text(encoding="utf-8")
s = re.sub(r"versionCode\s+\d+", "versionCode 20", s, count=1)
s = re.sub(r"versionName '[^']+'", "versionName '1.4.8'", s, count=1)
s = re.sub(r"// BariSnow 1\.4\.\d+[^\n]*", "// BariSnow 1.4.8 calibra nieve futura marginal con temperatura, bulbo húmedo y consenso multimodelo.", s, count=1)
p.write_text(s, encoding="utf-8")

p = Path("sw.js")
s = re.sub(r"barisnow-pwa-v\d+", "barisnow-pwa-v10", p.read_text(encoding="utf-8"), count=1)
p.write_text(s, encoding="utf-8")