from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"No se encontró marcador para {label}")
    return text.replace(old, new, 1)


def replace_block(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f"No se encontró inicio para {label}")
    b = text.find(end, a)
    if b < 0:
        raise RuntimeError(f"No se encontró fin para {label}")
    current = text[a:b]
    if current == replacement:
        return text
    return text[:a] + replacement + text[b:]


def add_rate_views(path, text_size):
    s = read(path)
    for prefix in ("plus1", "plus2", "plus3"):
        if f'@+id/{prefix}_rate' in s:
            continue
        pattern = re.compile(r'(<TextView\s+android:id="@\+id/' + prefix + r'_feels"[^>]*/>)', re.S)
        m = pattern.search(s)
        if not m:
            raise RuntimeError(f"No se encontró {prefix}_feels en {path}")
        rate = (
            '\n            <TextView android:id="@+id/' + prefix + '_rate" '
            'android:layout_width="match_parent" android:layout_height="14dp" '
            'android:gravity="center" android:includeFontPadding="false" '
            'android:maxLines="1" android:text="🌧 – · ❄ –" '
            'android:textColor="#9CCBE8" android:textSize="' + text_size + 'sp" />'
        )
        s = s[:m.end()] + rate + s[m.end():]
    write(path, s)


# ---------------------------------------------------------------------------
# WEB: mostrar lluvia y nieve separadas por intervalo y usar guion cuando no
# hay precipitación medible.
# ---------------------------------------------------------------------------
web_path = "precipitation-communication.js"
s = read(web_path)

amount_start = '  function amount(row,cat){'
amount_end = '  function behavior(row,model,cat){'
amount_block = '''  function amount(row,cat){
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

'''
s = replace_block(s, amount_start, amount_end, amount_block, "métricas horarias web")

patch_start = '  function patchCard(prefix,row){'
patch_end = '  function setupLanguage(){'
patch_block = '''  function patchCard(prefix,row){
    if(!row)return;
    var cat=phenomenon(row),state=$(prefix+"Temp"),main=$(prefix+"Main"),chips=$(prefix+"Chips");
    text(prefix+"Icon",icon(cat));text(prefix+"Clock",hourOnly(row.time));
    if(state){state.className="horizon-temp "+cat.cls;state.textContent=cat.headline;}
    if(main)main.textContent="🌡️ "+fmt(row.T,1)+" °C  ·  Sensación "+fmt(row.feels,1)+" °C";
    if(chips)chips.innerHTML='<span class="chip">'+esc(agreement(row))+'</span><span class="chip">'+esc(rainRateText(row))+'</span><span class="chip">'+esc(snowRateText(row))+'</span>';
  }

'''
s = replace_block(s, patch_start, patch_end, patch_block, "tarjetas +1/+2/+3")

hours_start = '  window.renderHours=function(model){'
hours_end = '  window.renderDays=function(model){'
hours_block = '''  window.renderHours=function(model){
    if(typeof baseRenderHours==="function")baseRenderHours(model);
    var offsets=[1,2,3,4,6,8,10,12],out="";
    offsets.forEach(function(h){var r=horizon(model,h),cat=phenomenon(r);out+='<div class="hour-card"><div class="time">+'+h+' h · '+hourOnly(r.time)+'</div><div class="ico">'+icon(cat)+'</div><div class="micro '+cat.cls+'" style="font-weight:700">'+esc(cat.short)+'</div><div class="temp">'+fmt(r.T,0)+'°</div><div class="micro precip-rate">'+esc(precipPair(r))+'</div></div>';});
    html("hourStrip",out);
  };

'''
s = replace_block(s, hours_start, hours_end, hours_block, "franja 12 horas")

old_day_meta = "out+='<div class=\"day-card\"><div class=\"day-name\">'+label+'</div><div class=\"day-date\">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class=\"day-icon\">'+icon(cat)+'</div><div class=\"day-temp\">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class=\"day-snow '+cat.cls+'\">'+esc(cat.short)+'</div><div class=\"day-meta\">🌧️ '+fmt(b.rain,1)+' mm · ❄️ '+fmt(b.snow,1)+' cm</div></div>';"
new_day_meta = "out+='<div class=\"day-card\"><div class=\"day-name\">'+label+'</div><div class=\"day-date\">'+pad2(b.d.getDate())+'/'+pad2(b.d.getMonth()+1)+'</div><div class=\"day-icon\">'+icon(cat)+'</div><div class=\"day-temp\">'+fmt(b.min,0)+'° / '+fmt(b.max,0)+'°</div><div class=\"day-snow '+cat.cls+'\">'+esc(cat.short)+'</div><div class=\"day-meta\">🌧️ '+dailyRain(b.rain)+' · ❄️ '+dailySnow(b.snow)+'</div></div>';"
s = replace_once(s, old_day_meta, new_day_meta, "acumulados diarios web")

old_72 = '    var rain72=Math.max(0,n(s.rain72,0));text("rain72",fmt(rain72,1)+" mm");text("rain72Text",rain72<.1?"Sin lluvia medible.":rain72<5?"Acumulación líquida menor.":rain72<20?"Acumulación líquida moderada.":"Acumulación líquida importante.");'
new_72 = '    var rain72=Math.max(0,n(s.rain72,0));text("rain72",rain72<.05?"—":fmt(rain72,1)+" mm");text("rain72Text",rain72<.05?"Sin lluvia medible.":rain72<5?"Acumulación líquida menor.":rain72<20?"Acumulación líquida moderada.":"Acumulación líquida importante.");'
s = replace_once(s, old_72, new_72, "lluvia 72 h con guion")

old_peak = '    var pc=phenomenon(peak),snow72=Math.max(0,n(s.snow72,0));text("peak72",localTime(peak.time));'
new_peak = '    var pc=phenomenon(peak),snow72=Math.max(0,n(s.snow72,0));text("snow72",snow72<.03?"—":fmt(snow72,1)+" cm");if(snow72<.03)text("snow72Text","Sin nieve medible.");text("peak72",localTime(peak.time));'
s = replace_once(s, old_peak, new_peak, "nieve 72 h con guion")
write(web_path, s)

# Nota de intervalos: mm del intervalo horario = tasa media mm/h del intervalo.
rain_display_path = "rain-interval-display.js"
s = read(rain_display_path)
s = s.replace(
    'if(note)note.textContent="La lluvia corresponde al acumulado del intervalo indicado; temperatura y cielo representan el final del intervalo.";',
    'if(note)note.textContent="La lluvia se muestra como tasa media del intervalo horario (mm/h); la nieve como cm/h. Cuando no hay precipitación medible se indica –.";'
)
write(rain_display_path, s)

# Forzar actualización de PWA/WebView.
sw_path = "sw.js"
s = read(sw_path)
s = re.sub(r"barisnow-pwa-v\d+", "barisnow-pwa-v11", s, count=1)
write(sw_path, s)

# ---------------------------------------------------------------------------
# ANDROID: tasa horaria por +1/+2/+3, caché de tasas y guiones en seco.
# ---------------------------------------------------------------------------
add_rate_views('android-app/app/src/main/res/layout/widget_barisnow.xml', '8')
add_rate_views('android-app/app/src/main/res/layout/widget_barisnow_compact.xml', '7')

provider_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider_path)

old_calls = '''        applyHour(views, R.id.now_icon, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, data.now);
        applyHour(views, R.id.plus1_icon, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, data.plus1);
        applyHour(views, R.id.plus2_icon, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, data.plus2);
        applyHour(views, R.id.plus3_icon, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, data.plus3);
'''
new_calls = old_calls + '''        applyRate(views, R.id.plus1_rate, data.plus1);
        applyRate(views, R.id.plus2_rate, data.plus2);
        applyRate(views, R.id.plus3_rate, data.plus3);
'''
s = replace_once(s, old_calls, new_calls, "tasas widget principal")

apply_hour_end = '''    protected static void applyHour(RemoteViews views, int iconId, int clockId, int stateId, int tempId, int feelsId, HourData hour) {
        views.setTextViewText(iconId, iconFor(hour.state));
        views.setTextViewText(clockId, hour.clock);
        views.setTextViewText(stateId, hour.state);
        views.setTextViewText(tempId, formatTemp(hour.temp));
        views.setTextViewText(feelsId, formatTemp(hour.feels));
        views.setTextColor(stateId, colorFor(hour.state));
    }

'''
apply_hour_plus = apply_hour_end + '''    protected static void applyRate(RemoteViews views, int rateId, HourData hour) {
        views.setTextViewText(rateId, formatHourlyPrecip(hour));
    }

    protected static String formatHourlyPrecip(HourData hour) {
        if (hour == null) return "🌧 – · ❄ –";
        double rain = hour.rainRateMmH;
        double snow = hour.snowRateCmH;
        String rainText = Double.isNaN(rain) || Double.isInfinite(rain) || rain < .05
                ? "–"
                : (rain < 10 ? String.format(Locale.getDefault(), "%.1f mm/h", rain) : String.format(Locale.getDefault(), "%.0f mm/h", rain));
        String snowText;
        if (Double.isNaN(snow) || Double.isInfinite(snow) || snow < .03) snowText = "–";
        else if (snow < .12) snowText = "Traza";
        else if (snow < 1) snowText = String.format(Locale.getDefault(), "%.1f cm/h", snow);
        else snowText = String.format(Locale.getDefault(), "%.0f cm/h", snow);
        return "🌧 " + rainText + " · ❄ " + snowText;
    }

'''
s = replace_once(s, apply_hour_end, apply_hour_plus, "formato tasa horaria")

apply_day_start = '    protected static void applyDay(RemoteViews views, boolean first, DayData day) {'
apply_day_end = '    private static boolean isRainState(String state) {'
apply_day = '''    protected static void applyDay(RemoteViews views, boolean first, DayData day) {
        int iconId = first ? R.id.day1_icon : R.id.day2_icon;
        int stateId = first ? R.id.day1_state : R.id.day2_state;
        int tempId = first ? R.id.day1_temp : R.id.day2_temp;
        int feelsId = first ? R.id.day1_feels : R.id.day2_feels;
        int metricLabelId = first ? R.id.day1_metric_label : R.id.day2_metric_label;
        int metricId = first ? R.id.day1_snow : R.id.day2_snow;

        views.setTextViewText(iconId, iconFor(day.state));
        views.setTextViewText(stateId, day.state);
        views.setTextViewText(tempId, formatRange(day.minTemp, day.maxTemp));
        views.setTextViewText(feelsId, formatRange(day.minFeels, day.maxFeels));

        boolean rainDominant = isRainState(day.state);
        boolean rainMeasured = !Double.isNaN(day.rainMm) && !Double.isInfinite(day.rainMm) && day.rainMm >= .05;
        boolean snowMeasured = !Double.isNaN(day.snowCm) && !Double.isInfinite(day.snowCm) && day.snowCm >= .03;
        boolean mixed = "LLUVIA Y NIEVE".equals(day.state)
                || (rainDominant && rainMeasured && day.snowCm >= .5);
        if (!rainMeasured && !snowMeasured && !rainDominant) {
            views.setTextViewText(metricLabelId, "Lluvia / nieve");
            views.setTextViewText(metricId, "– / –");
        } else if (mixed) {
            views.setTextViewText(metricLabelId, "Lluvia / nieve");
            views.setTextViewText(metricId, formatRain(day.rainMm) + " / " + formatSnow(day.snowCm));
        } else if (rainDominant) {
            views.setTextViewText(metricLabelId, "Lluvia");
            views.setTextViewText(metricId, formatRain(day.rainMm));
        } else {
            views.setTextViewText(metricLabelId, "Nieve");
            views.setTextViewText(metricId, formatSnow(day.snowCm));
        }
        views.setTextColor(stateId, colorFor(day.state));
    }

'''
s = replace_block(s, apply_day_start, apply_day_end, apply_day, "día seco con guiones")

s = s.replace('if (Double.isNaN(cm) || cm < 0.03) return "0 cm";', 'if (Double.isNaN(cm) || cm < 0.03) return "–";')
s = s.replace('if (mm < .05) return "0 mm";', 'if (mm < .05) return "–";')

s = replace_once(
    s,
    '''    protected static final class HourData {
        String state;
        String clock;
        double temp;
        double feels;
    }''',
    '''    protected static final class HourData {
        String state;
        String clock;
        double temp;
        double feels;
        double rainRateMmH = Double.NaN;
        double snowRateCmH = Double.NaN;
    }''',
    "HourData tasas"
)
write(provider_path, s)

# Compacto: mismo renglón de tasa para +1/+2/+3.
compact_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowCompactWidgetProvider.java'
s = read(compact_path)
s = replace_once(s, old_calls, new_calls, "tasas widget compacto")
write(compact_path, s)

# ForecastEngine: nieve horaria y caché de ambas tasas.
forecast_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowForecastEngine.java'
s = read(forecast_path)
s = replace_once(
    s,
    '        putFinite(o, "feels", h.feels);\n        return o;',
    '        putFinite(o, "feels", h.feels);\n        putFinite(o, "rainRateMmH", h.rainRateMmH);\n        putFinite(o, "snowRateCmH", h.snowRateCmH);\n        return o;',
    'cache tasas write'
)
s = replace_once(
    s,
    '        h.feels = o.optDouble("feels", Double.NaN);\n        return h;',
    '        h.feels = o.optDouble("feels", Double.NaN);\n        h.rainRateMmH = o.has("rainRateMmH") && !o.isNull("rainRateMmH") ? o.optDouble("rainRateMmH", Double.NaN) : Double.NaN;\n        h.snowRateCmH = o.has("snowRateCmH") && !o.isNull("snowRateCmH") ? o.optDouble("snowRateCmH", Double.NaN) : Double.NaN;\n        return h;',
    'cache tasas read'
)
s = replace_once(
    s,
    '        h.feels = row.feels;\n        h.state = categoricalSnow(row);',
    '        h.feels = row.feels;\n        h.snowRateCmH = Math.max(0, row.cmh);\n        h.state = categoricalSnow(row);',
    'nieve horaria HourData'
)
write(forecast_path, s)

# RainEngine: conservar tasa líquida multimodelo de cada horizonte.
rain_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowRainEngine.java'
s = read(rain_path)
s = replace_once(
    s,
    '''        merge(data.plus1, rain.plus1);
        merge(data.plus2, rain.plus2);
        merge(data.plus3, rain.plus3);
''',
    '''        merge(data.plus1, rain.plus1);
        merge(data.plus2, rain.plus2);
        merge(data.plus3, rain.plus3);
        if (data.plus1 != null) data.plus1.rainRateMmH = rain.plus1Rate;
        if (data.plus2 != null) data.plus2.rainRateMmH = rain.plus2Rate;
        if (data.plus3 != null) data.plus3.rainRateMmH = rain.plus3Rate;
''',
    'enrich tasas horarias'
)

old_fetch = '''        RainData out = new RainData();
        out.plus1 = category(horizon(model, 1));
        out.plus2 = category(horizon(model, 2));
        out.plus3 = category(horizon(model, 3));
        out.tomorrow = dayCategory(model, 1);
'''
new_fetch = '''        RainData out = new RainData();
        Row h1 = horizon(model, 1);
        Row h2 = horizon(model, 2);
        Row h3 = horizon(model, 3);
        out.plus1 = category(h1);
        out.plus2 = category(h2);
        out.plus3 = category(h3);
        out.plus1Rate = Math.max(0, h1.liquid);
        out.plus2Rate = Math.max(0, h2.liquid);
        out.plus3Rate = Math.max(0, h3.liquid);
        out.tomorrow = dayCategory(model, 1);
'''
s = replace_once(s, old_fetch, new_fetch, 'RainData tasas fetch')

s = replace_once(
    s,
    '        String dayAfter;\n        double tomorrowMm = Double.NaN;',
    '        String dayAfter;\n        double plus1Rate = Double.NaN;\n        double plus2Rate = Double.NaN;\n        double plus3Rate = Double.NaN;\n        double tomorrowMm = Double.NaN;',
    'RainData campos tasas'
)
write(rain_path, s)

# Versión 1.4.11. Solo avanza desde 1.4.10; versiones futuras quedan intactas.
gradle_path = 'android-app/app/build.gradle'
s = read(gradle_path)
if "versionName '1.4.10'" in s:
    s = re.sub(r'versionCode\s+22\b', 'versionCode 23', s, count=1)
    s = s.replace("versionName '1.4.10'", "versionName '1.4.11'", 1)
    s = s.replace(
        '// BariSnow 1.4.10 muestra mm de lluvia o cm de nieve según el fenómeno diario dominante.',
        '// BariSnow 1.4.11 agrega tasa horaria de lluvia/nieve y usa guiones cuando no hay precipitación medible.',
        1
    )
write(gradle_path, s)

client_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client_path)
s = s.replace('BariSnowAndroidWidget/1.4.10', 'BariSnowAndroidWidget/1.4.11')
write(client_path, s)

print('Tasa horaria de precipitación y guiones en seco aplicados.')
