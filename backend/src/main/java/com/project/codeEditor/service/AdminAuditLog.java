package com.project.codeEditor.service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import org.springframework.stereotype.Service;

/**
 * Structured, in-memory audit trail of admin-relevant events: logins,
 * blocks/unblocks, role changes, session force-closes, deletes. Feature 7
 * (Reports & Logs) reads from this. In-memory + capped, so it's a rolling
 * window rather than a permanent record — swap for a DB table if you need
 * to keep this beyond a restart.
 */
@Service
public class AdminAuditLog {

    public record Entry(Instant at, String actor, String action, String detail) {
    }

    private static final int MAX_ENTRIES = 500;
    private final Deque<Entry> entries = new ArrayDeque<>();

    public synchronized void log(String actor, String action, String detail) {
        entries.addFirst(new Entry(Instant.now(), actor == null ? "system" : actor, action, detail));
        while (entries.size() > MAX_ENTRIES) {
            entries.removeLast();
        }
    }

    public synchronized List<Entry> recent() {
        return List.copyOf(entries);
    }

    public String toCsv() {
        StringBuilder sb = new StringBuilder("time,actor,action,detail\n");
        for (Entry e : recent()) {
            sb.append(e.at()).append(',')
              .append(csvEscape(e.actor())).append(',')
              .append(csvEscape(e.action())).append(',')
              .append(csvEscape(e.detail())).append('\n');
        }
        return sb.toString();
    }

    private String csvEscape(String s) {
        if (s == null) return "";
        String escaped = s.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
