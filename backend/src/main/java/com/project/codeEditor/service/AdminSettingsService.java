package com.project.codeEditor.service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Runtime-configurable execution sandbox limits (feature 5: Resource &
 * Sandbox Limits Control). Starts from application.properties defaults but
 * can be changed live by an admin via /api/admin/settings without a restart
 * or code change. Deliberately in-memory — resets to the properties
 * defaults on restart, which is an acceptable trade-off for a dev/small
 * deployment; swap for a DB-backed settings row if this needs to survive
 * restarts later.
 */
@Service
public class AdminSettingsService {

    @Value("${execution.timeout.seconds:10}")
    private int defaultTimeoutSeconds;

    private volatile int timeoutSeconds;
    private volatile String memoryLimit = "128m";
    private volatile double cpuLimit = 0.5;
    private volatile int idleCloseMinutes = 30;
    private final Set<String> enabledLanguages = ConcurrentHashMap.newKeySet();

    public AdminSettingsService() {
        enabledLanguages.add("java");
        enabledLanguages.add("python");
        enabledLanguages.add("javascript");
    }

    @jakarta.annotation.PostConstruct
    void init() {
        timeoutSeconds = defaultTimeoutSeconds;
    }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int v) { this.timeoutSeconds = Math.max(1, Math.min(v, 60)); }

    public String getMemoryLimit() { return memoryLimit; }
    public void setMemoryLimit(String v) { this.memoryLimit = (v == null || v.isBlank()) ? "128m" : v; }

    public double getCpuLimit() { return cpuLimit; }
    public void setCpuLimit(double v) { this.cpuLimit = Math.max(0.1, Math.min(v, 4.0)); }

    public int getIdleCloseMinutes() { return idleCloseMinutes; }
    public void setIdleCloseMinutes(int v) { this.idleCloseMinutes = Math.max(1, v); }

    public Set<String> getEnabledLanguages() { return Set.copyOf(enabledLanguages); }

    public boolean isLanguageEnabled(String language) {
        return language != null && enabledLanguages.contains(language.trim().toLowerCase());
    }

    public void setLanguageEnabled(String language, boolean enabled) {
        if (language == null) return;
        String key = language.trim().toLowerCase();
        if (enabled) {
            enabledLanguages.add(key);
        } else {
            enabledLanguages.remove(key);
        }
    }
}
