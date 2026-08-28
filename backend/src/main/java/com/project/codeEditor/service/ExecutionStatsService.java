package com.project.codeEditor.service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Service;

/**
 * In-memory counters for the admin "Code Execution Monitoring" panel.
 * Deliberately not persisted — this resets on restart, which is fine for a
 * live "what's happening right now / today" view. Session history (the
 * durable record) lives in CodingSessionRepository instead.
 */
@Service
public class ExecutionStatsService {

    public record LogEntry(Instant at, String language, boolean success, boolean timedOut, long durationMs) {
    }

    public record Snapshot(long totalRuns, long successCount, long failureCount, long timeoutCount,
            Map<String, Long> runsByLanguage, List<LogEntry> recent) {
    }

    private final AtomicLong total = new AtomicLong();
    private final AtomicLong success = new AtomicLong();
    private final AtomicLong failure = new AtomicLong();
    private final AtomicLong timeout = new AtomicLong();
    private final Map<String, AtomicLong> byLanguage = new ConcurrentHashMap<>();
    private final Deque<LogEntry> recent = new ArrayDeque<>();
    private static final int MAX_RECENT = 50;

    public synchronized void record(String language, boolean successFlag, boolean timedOut, long durationMs) {
        total.incrementAndGet();
        if (timedOut) {
            timeout.incrementAndGet();
        } else if (successFlag) {
            success.incrementAndGet();
        } else {
            failure.incrementAndGet();
        }
        byLanguage.computeIfAbsent(language == null ? "unknown" : language, k -> new AtomicLong()).incrementAndGet();

        recent.addFirst(new LogEntry(Instant.now(), language, successFlag, timedOut, durationMs));
        while (recent.size() > MAX_RECENT) {
            recent.removeLast();
        }
    }

    public synchronized Snapshot snapshot() {
        Map<String, Long> byLangCopy = new ConcurrentHashMap<>();
        byLanguage.forEach((k, v) -> byLangCopy.put(k, v.get()));
        return new Snapshot(total.get(), success.get(), failure.get(), timeout.get(), byLangCopy, List.copyOf(recent));
    }
}
