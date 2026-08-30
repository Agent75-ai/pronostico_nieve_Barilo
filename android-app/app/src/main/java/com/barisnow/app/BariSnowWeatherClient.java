package com.barisnow.app;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cliente HTTP compartido por los motores de nieve y lluvia del widget.
 * Las respuestas se reutilizan durante una ventana corta para que ambos
 * clasificadores trabajen sobre el mismo snapshot meteorológico.
 */
final class BariSnowWeatherClient {
    private static final long TTL_MS = 120_000L;
    private static final Map<String, Entry> CACHE = new ConcurrentHashMap<>();

    private BariSnowWeatherClient() {}

    static JSONObject fetchJson(String endpoint, int timeoutMs) throws Exception {
        long now = System.currentTimeMillis();
        Entry cached = CACHE.get(endpoint);
        if (cached != null && now - cached.savedAt <= TTL_MS) {
            return new JSONObject(cached.body);
        }

        HttpURLConnection c = (HttpURLConnection) new URL(endpoint).openConnection();
        c.setConnectTimeout(timeoutMs);
        c.setReadTimeout(timeoutMs);
        c.setRequestMethod("GET");
        c.setRequestProperty("Accept", "application/json");
        c.setRequestProperty("User-Agent", "BariSnowAndroidWidget/1.4.5");
        int status = c.getResponseCode();
        if (status < 200 || status >= 300) {
            c.disconnect();
            throw new IllegalStateException("HTTP " + status);
        }

        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        } finally {
            c.disconnect();
        }

        String raw = body.toString();
        CACHE.put(endpoint, new Entry(raw, now));
        return new JSONObject(raw);
    }

    private static final class Entry {
        final String body;
        final long savedAt;

        Entry(String body, long savedAt) {
            this.body = body;
            this.savedAt = savedAt;
        }
    }
}
