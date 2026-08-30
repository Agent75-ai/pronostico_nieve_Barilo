from pathlib import Path


def replace_block(path: str, start_marker: str, end_marker: str, replacement: str) -> None:
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    start = s.index(start_marker)
    end = s.index(end_marker, start)
    p.write_text(s[:start] + replacement + s[end:], encoding="utf-8")


WEB_METHOD = r'''  function currentCategory(c,p){
    var T=n(c&&c.temperature_2m,null),RH=n(c&&c.relative_humidity_2m,null),code=n(c&&c.weather_code,-1),snow=Math.max(0,n(c&&c.snowfall,0)),rain=Math.max(0,n(c&&c.rain,0)),showers=Math.max(0,n(c&&c.showers,0)),precip=Math.max(0,n(c&&c.precipitation,0));
    var tw=finite(T)&&finite(RH)?wetBulb(T+p.coldBias,RH):99,liquid=rain+showers;
    var snowCodeNow=snowShowerCode(code)||currentSnowCode(code)||code===77;
    var snowEvidence=(snow>=.01&&tw<=.70)||(snow>=.03&&tw<=1.30)||(snow>=.10&&tw<=1.80)||(snowCodeNow&&tw<=.25&&precip>=.05);
    var snowShowerEvidence=snowEvidence||(snow>=.15&&tw<=2.10);

    /* En “Ahora” un código WMO nival requiere coherencia con snowfall y
       temperatura húmeda. Esto filtra fase sólida marginal que llega como
       llovizna o lluvia a nivel de superficie. */
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

FORECAST_METHOD = r'''    private static String currentCategory(JSONObject c, BariSnowWidgetProvider.Place p) {
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
                || code == 80 || code == 81 || code == 82 || code == 95 || code == 96 || code == 99) {
            return "SIN NIEVE";
        }

        if (!snowCodeNow && snowEvidence) {
            if (snow >= .06 && liquid < .03 && tw <= 1.0) return "NIEVA";
            if (snow >= .02 && tw <= 1.25) return liquid >= .03 ? "LLUVIA Y NIEVE" : "NIEVE HÚMEDA";
        }
        return "SIN NIEVE";
    }
'''

RAIN_METHOD = r'''    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {
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
            tw = tt * Math.atan(.151977 * Math.sqrt(h + 8.313659))
                    + Math.atan(tt + h)
                    - Math.atan(h - 1.676331)
                    + .00391838 * Math.pow(h, 1.5) * Math.atan(.023101 * h)
                    - 4.686035;
        }

        boolean snowCodeNow = snowCode(code);
        boolean snowEvidence = (snow >= .01 && tw <= .70)
                || (snow >= .03 && tw <= 1.30)
                || (snow >= .10 && tw <= 1.80)
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

replace_block(
    "precipitation-communication.js",
    "  function currentCategory(c,p){",
    "\n  function currentUrl(p){",
    WEB_METHOD,
)
replace_block(
    "android-app/app/src/main/java/com/barisnow/app/BariSnowForecastEngine.java",
    "    private static String currentCategory(JSONObject c, BariSnowWidgetProvider.Place p) {",
    "\n    private static String categoricalSnow",
    FORECAST_METHOD,
)

rain_path = Path("android-app/app/src/main/java/com/barisnow/app/BariSnowRainEngine.java")
rain_text = rain_path.read_text(encoding="utf-8")
rain_text = rain_text.replace("out.now = currentCategory(currentRaw);", "out.now = currentCategory(currentRaw, place);")
rain_path.write_text(rain_text, encoding="utf-8")
start_marker = (
    "    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {"
    if "    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {" in rain_text
    else "    private static String currentCategory(JSONObject raw) {"
)
replace_block(
    str(rain_path),
    start_marker,
    "\n    private static String currentSky",
    RAIN_METHOD,
)

# Build metadata and PWA cache are idempotent.
p = Path("android-app/app/build.gradle")
s = p.read_text(encoding="utf-8")
s = s.replace("versionCode 18", "versionCode 19").replace("versionName '1.4.6'", "versionName '1.4.7'")
s = s.replace(
    "BariSnow 1.4.6 endurece la evidencia contemporánea requerida para declarar nieve en “Ahora”.",
    "BariSnow 1.4.7 valida la fase actual con código, snowfall, precipitación líquida y temperatura húmeda.",
)
p.write_text(s, encoding="utf-8")

p = Path("sw.js")
s = p.read_text(encoding="utf-8").replace("barisnow-pwa-v8", "barisnow-pwa-v9")
p.write_text(s, encoding="utf-8")
