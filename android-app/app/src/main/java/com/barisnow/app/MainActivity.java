package com.barisnow.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://agent75-ai.github.io/pronostico_nieve_Barilo/?app=android";
    private static final String INTERNAL_HOST = "agent75-ai.github.io";
    private static final String PREF_APP_ZONE_KEY = "app_zone_key";
    private static final String PREF_APP_ZONE_NAME = "app_zone_name";
    private static final String DEFAULT_ZONE = "lago_moreno";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(4, 14, 25));
        getWindow().setNavigationBarColor(Color.rgb(4, 14, 25));
        getWindow().getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(4, 14, 25));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " BariSnowAndroid/1.4.4");

        webView.addJavascriptInterface(new ZoneBridge(), "BariSnowNative");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if (host != null && host.equalsIgnoreCase(INTERNAL_HOST)) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Uri uri = Uri.parse(url);
                if (uri.getHost() != null && uri.getHost().equalsIgnoreCase(INTERNAL_HOST)) {
                    view.postDelayed(() -> bindIndependentZones(view), 500);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showOfflinePage();
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(HOME_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void bindIndependentZones(WebView view) {
        String js = "(function(){" +
                "var s=document.getElementById('locationPreset');" +
                "if(!s||!window.BariSnowNative)return;" +
                "function valid(k){for(var i=0;i<s.options.length;i++){if(s.options[i].value===k)return true;}return false;}" +
                "function saveApp(){var o=s.options[s.selectedIndex];BariSnowNative.setAppZone(s.value,o?o.text:s.value);}" +
                "var saved=BariSnowNative.getAppZone();" +
                "if(saved&&valid(saved)&&s.value!==saved){s.value=saved;if(window.syncAdjustments)syncAdjustments();if(window.run)run();}" +
                "else if(!saved){saveApp();}" +
                "if(!s.dataset.nativeAppZoneBound){" +
                "s.addEventListener('change',saveApp);" +
                "document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('.place-card[data-key]'))setTimeout(saveApp,0);});" +
                "if(window.run&&!window.run.__barisnowAppZoneWrapped){var oldRun=window.run;var wrapped=function(){saveApp();return oldRun.apply(this,arguments);};wrapped.__barisnowAppZoneWrapped=true;window.run=wrapped;}" +
                "s.dataset.nativeAppZoneBound='1';" +
                "}" +
                "var panel=document.getElementById('androidWidgetZonePanel');" +
                "if(!panel){" +
                "panel=document.createElement('section');panel.id='androidWidgetZonePanel';" +
                "panel.style.cssText='margin:10px 0 16px;padding:14px 16px;border:1px solid #173754;border-radius:16px;background:#091a2b;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';" +
                "var info=document.createElement('div');info.innerHTML='<div style=\"font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#75a2bf\">Widget de inicio</div><div id=\"androidWidgetZoneName\" style=\"font-weight:700;color:#eaf7ff;margin-top:3px\"></div><div style=\"font-size:12px;color:#7896aa;margin-top:3px\">Independiente de la ubicación de la app</div>';" +
                "var b=document.createElement('button');b.type='button';b.textContent='Cambiar widget';b.style.cssText='border:1px solid #2b5d82;background:#102b41;color:#eaf7ff;border-radius:12px;padding:10px 13px;font-weight:700';b.onclick=function(){BariSnowNative.openWidgetSettings();};" +
                "panel.appendChild(info);panel.appendChild(b);" +
                "var anchor=document.querySelector('.toolbar');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(panel,anchor.nextSibling);else document.body.insertBefore(panel,document.body.firstChild);" +
                "}" +
                "var name=document.getElementById('androidWidgetZoneName');if(name)name.textContent=BariSnowNative.getWidgetZoneName();" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    private void refreshWidgetZoneLabel() {
        if (webView == null) return;
        webView.evaluateJavascript("(function(){var e=document.getElementById('androidWidgetZoneName');if(e&&window.BariSnowNative)e.textContent=BariSnowNative.getWidgetZoneName();})();", null);
    }

    private final class ZoneBridge {
        @JavascriptInterface
        public String getAppZone() {
            return getSharedPreferences(BariSnowWidgetProvider.PREFS, MODE_PRIVATE)
                    .getString(PREF_APP_ZONE_KEY, "");
        }

        @JavascriptInterface
        public void setAppZone(String key, String name) {
            if (key == null || key.trim().isEmpty()) return;
            getSharedPreferences(BariSnowWidgetProvider.PREFS, MODE_PRIVATE)
                    .edit()
                    .putString(PREF_APP_ZONE_KEY, key)
                    .putString(PREF_APP_ZONE_NAME, name == null ? key : name)
                    .apply();
        }

        @JavascriptInterface
        public String getWidgetZoneName() {
            SharedPreferences prefs = getSharedPreferences(BariSnowWidgetProvider.PREFS, MODE_PRIVATE);
            String name = prefs.getString(BariSnowWidgetProvider.PREF_ZONE_NAME, "");
            if (name != null && !name.trim().isEmpty()) return name;
            String key = prefs.getString(BariSnowWidgetProvider.PREF_ZONE_KEY, DEFAULT_ZONE);
            return readableZoneName(key);
        }

        @JavascriptInterface
        public void openWidgetSettings() {
            runOnUiThread(() -> startActivity(new Intent(MainActivity.this, WidgetSettingsActivity.class)));
        }
    }

    private String readableZoneName(String key) {
        if ("bustillo_95".equals(key)) return "Bustillo km 9,5 / Centro Atómico";
        if ("melipal".equals(key)) return "Barrio Melipal";
        if ("centro".equals(key)) return "Barrio Centro";
        if ("las_victorias".equals(key)) return "Las Victorias";
        if ("dina_huapi".equals(key)) return "Dina Huapi";
        if ("cerro_catedral".equals(key)) return "Cerro Catedral";
        if ("llao_llao".equals(key)) return "Llao Llao";
        if ("el_alto".equals(key)) return "El Alto / Frutillar / 2 de Abril";
        return "Barrio Lago Moreno";
    }

    private void showOfflinePage() {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>" +
                "<style>body{margin:0;background:#040e19;color:#eaf7ff;font-family:system-ui;display:grid;place-items:center;min-height:100vh;padding:28px;text-align:center}" +
                ".card{max-width:420px;background:#091a2b;border:1px solid #173754;border-radius:24px;padding:28px}" +
                "h1{font-size:28px;margin:0 0 10px}p{color:#aac4d7;line-height:1.5}button{background:#157fe8;color:white;border:0;border-radius:14px;padding:12px 18px;font-weight:700}</style></head>" +
                "<body><div class='card'><div style='font-size:56px'>❄️</div><h1>BariSnow sin conexión</h1>" +
                "<p>Necesitás internet para actualizar el nowcast y el pronóstico.</p>" +
                "<button onclick=\"location.href='" + HOME_URL + "'\">Reintentar</button></div></body></html>";
        webView.loadDataWithBaseURL(HOME_URL, html, "text/html", "UTF-8", null);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.postDelayed(this::refreshWidgetZoneLabel, 250);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("BariSnowNative");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
