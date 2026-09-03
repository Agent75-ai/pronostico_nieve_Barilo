package com.barisnow.app;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cliente HTTP compartido por los motores de nieve y lluvia del widget.
 * Mantiene un snapshot fresco durante dos minutos y conserva una copia de
 * respaldo durante varias horas para tolerar cortes breves de conectividad.
 */
final class BariSnowWeatherClient {
    private static final long FRESH_TTL_MS = 120_000L;
    private static final long STALE_TTL_MS = 6L * 60L * 60L * 1000L;
    private static final Map<String, Entry> CACHE = new ConcurrentHashMap<>();

    private BariSnowWeatherClient() {}

    static JSONObject fetchJson(String endpoint, int timeoutMs) throws Exception {
        long now = System.currentTimeMillis();
        Entry cached = CACHE.get(endpoint);
        if (cached != null && now - cached.savedAt <= FRESH_TTL_MS) {
            return new JSONObject(cached.body);
        }

        Exception last = null;
        String fallback = genericFallback(endpoint);
        String[] attempts = fallback.equals(endpoint)
                ? new String[]{endpoint, endpoint}
                : new String[]{endpoint, fallback};

        for (int i = 0; i < attempts.length; i++) {
            try {
                String raw = request(attempts[i], timeoutMs);
                CACHE.put(endpoint, new Entry(raw, System.currentTimeMillis()));
                if (!attempts[i].equals(endpoint)) {
                    CACHE.put(attempts[i], new Entry(raw, System.currentTimeMillis()));
                }
                return new JSONObject(raw);
            } catch (Exception e) {
                last = e;
                if (i + 1 < attempts.length) {
                    try {
                        Thread.sleep(80L);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw interrupted;
                    }
                }
            }
        }

        if (cached != null && now - cached.savedAt <= STALE_TTL_MS) {
            return new JSONObject(cached.body);
        }
        throw last != null ? last : new IllegalStateException("Sin respuesta meteorológica");
    }

    private static String request(String endpoint, int requestedTimeoutMs) throws Exception {
        int timeout = Math.max(2500, Math.min(requestedTimeoutMs, 3400));
        HttpURLConnection c = (HttpURLConnection) new URL(endpoint).openConnection();
        c.setConnectTimeout(timeout);
        c.setReadTimeout(timeout);
        c.setRequestMethod("GET");
        c.setInstanceFollowRedirects(true);
        c.setUseCaches(true);
        c.setRequestProperty("Accept", "application/json");
        c.setRequestProperty("Accept-Encoding", "identity");
        c.setRequestProperty("Connection", "close");
        c.setRequestProperty("User-Agent", "BariSnowAndroidWidget/1.4.23");

        int status = c.getResponseCode();
        if (status < 200 || status >= 300) {
            c.disconnect();
            throw new IllegalStateException("HTTP " + status);
        }

        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        } finally {
            c.disconnect();
        }

        String raw = body.toString();
        if (raw.isEmpty()) throw new IllegalStateException("Respuesta vacía");
        return raw;
    }

    /**
     * Si un endpoint de modelo específico falla, reutiliza la misma consulta
     * contra Best Match de Open-Meteo. Así el widget sigue entregando datos
     * aunque un backend particular esté lento o temporalmente inaccesible.
     */
    private static String genericFallback(String endpoint) {
        if (endpoint == null) return "";
        return endpoint
                .replace("/v1/ecmwf?", "/v1/forecast?")
                .replace("/v1/gfs?", "/v1/forecast?")
                .replace("/v1/gem?", "/v1/forecast?");
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
