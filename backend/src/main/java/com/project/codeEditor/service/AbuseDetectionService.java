package com.project.codeEditor.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

/**
 * Feature 8: lightweight abuse detection. Tracks how many sessions each
 * user has created recently and flags anyone over the threshold within the
 * last hour, so an admin can see it on the Security tab — this only flags,
 * it never auto-blocks, since a false positive silently locking someone out
 * would be worse than a noisy dashboard.
 */
@Service
public class AbuseDetectionService {

    private static final int FLAG_THRESHOLD_PER_HOUR = 10;

    private final Map<String, Deque<Instant>> creationsByUser = new ConcurrentHashMap<>();

    public void recordSessionCreation(String userEmail) {
        String key = userEmail == null ? "anonymous" : userEmail;
        Deque<Instant> timestamps = creationsByUser.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            timestamps.addLast(Instant.now());
            trim(timestamps);
        }
    }

    private void trim(Deque<Instant> timestamps) {
        Instant cutoff = Instant.now().minus(1, ChronoUnit.HOURS);
        while (!timestamps.isEmpty() && timestamps.peekFirst().isBefore(cutoff)) {
            timestamps.pollFirst();
        }
    }

    public record Flag(String userEmail, int sessionsInLastHour) {
    }

    public List<Flag> flaggedUsers() {
        return creationsByUser.entrySet().stream()
                .peek(e -> trim(e.getValue()))
                .filter(e -> e.getValue().size() >= FLAG_THRESHOLD_PER_HOUR)
                .map(e -> new Flag(e.getKey(), e.getValue().size()))
                .toList();
    }

    public int thresholdPerHour() {
        return FLAG_THRESHOLD_PER_HOUR;
    }
}
