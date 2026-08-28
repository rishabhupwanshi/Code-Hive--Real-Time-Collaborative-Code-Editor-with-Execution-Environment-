package com.project.codeEditor.websocket;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * Tracks which participants (socket connections) are currently in which
 * session room, so we can broadcast an up-to-date "online participants"
 * list and clean up presence on disconnect.
 */
@Component
public class RoomRegistry {

    public static class Participant {
        public final UUID socketId;
        public final String userName;
        // "HOST" | "COLLABORATOR" | "OBSERVER" — FR-11 role-based permissions.
        public volatile String role = "COLLABORATOR";

        public Participant(UUID socketId, String userName) {
            this.socketId = socketId;
            this.userName = userName;
        }
    }

    // roomToken -> (socketId -> participant)
    private final Map<String, Map<UUID, Participant>> rooms = new ConcurrentHashMap<>();
    // socketId -> roomToken, so we can find a disconnecting socket's room quickly
    private final Map<UUID, String> socketToRoom = new ConcurrentHashMap<>();
    // roomToken -> socketId of whoever is currently treated as the session host
    // (the first person to join an empty room). New joiners after this need
    // the host's approval before they're actually added to `rooms`.
    private final Map<String, UUID> roomHost = new ConcurrentHashMap<>();
    // roomToken -> requestId -> pending requester, waiting on host approval.
    private final Map<String, Map<String, Participant>> pendingRequests = new ConcurrentHashMap<>();
    // roomToken -> locked (host-only "Lock Session": blocks new joiners)
    private final Map<String, Boolean> lockedRooms = new ConcurrentHashMap<>();
    // roomToken -> chat muted (host-only "Mute Chat": blocks non-host chat_message)
    private final Map<String, Boolean> mutedChatRooms = new ConcurrentHashMap<>();
    // roomToken -> Instant the session was started (for FEATURE-1 session analytics)
    private final Map<String, java.time.Instant> sessionStartedAt = new ConcurrentHashMap<>();
    // roomToken -> running total of chat messages seen (for analytics; not persisted)
    private final Map<String, java.util.concurrent.atomic.AtomicInteger> chatMessageCounts = new ConcurrentHashMap<>();
    // roomToken -> set of socketIds the host has individually muted (FEATURE 2: Mute User)
    private final Map<String, java.util.Set<UUID>> mutedUsers = new ConcurrentHashMap<>();

    /** True if this room has no host yet, or currently has no participants at all. */
    public boolean needsApproval(String roomToken) {
        UUID host = roomHost.get(roomToken);
        if (host == null) {
            return false; // nobody has claimed the room yet — the next joiner becomes host
        }
        Map<UUID, Participant> participants = rooms.get(roomToken);
        // The host disconnected and nobody else is left — don't strand new joiners
        // waiting on a host who's no longer there.
        return participants != null && participants.containsKey(host);
    }

    public boolean isHost(String roomToken, UUID socketId) {
        return socketId.equals(roomHost.get(roomToken));
    }

    public void claimHost(String roomToken, UUID socketId) {
        roomHost.putIfAbsent(roomToken, socketId);
    }

    public UUID hostOf(String roomToken) {
        return roomHost.get(roomToken);
    }

    /** Display name of whoever currently holds host for this room, or null if none/not yet joined. */
    public String hostName(String roomToken) {
        UUID hostId = roomHost.get(roomToken);
        if (hostId == null) {
            return null;
        }
        Map<UUID, Participant> participants = rooms.get(roomToken);
        Participant host = participants == null ? null : participants.get(hostId);
        return host == null ? null : host.userName;
    }

    public String addPending(String roomToken, UUID socketId, String userName) {
        String requestId = UUID.randomUUID().toString();
        pendingRequests.computeIfAbsent(roomToken, k -> new ConcurrentHashMap<>())
                .put(requestId, new Participant(socketId, userName));
        return requestId;
    }

    public Participant resolvePending(String roomToken, String requestId) {
        Map<String, Participant> forRoom = pendingRequests.get(roomToken);
        return forRoom == null ? null : forRoom.remove(requestId);
    }

    /** All still-pending requesters for a room (used to auto-clear if the host leaves). */
    public Collection<Participant> pendingFor(String roomToken) {
        Map<String, Participant> forRoom = pendingRequests.get(roomToken);
        return forRoom == null ? List.of() : List.copyOf(forRoom.values());
    }

    public void clearPending(String roomToken) {
        pendingRequests.remove(roomToken);
    }

    public void clearHost(String roomToken) {
        roomHost.remove(roomToken);
    }

    public void join(String roomToken, UUID socketId, String userName) {
        rooms.computeIfAbsent(roomToken, k -> new ConcurrentHashMap<>())
                .put(socketId, new Participant(socketId, userName));
        socketToRoom.put(socketId, roomToken);
    }

    /** Removes a socket from whichever room it was in. Returns that room token, or null. */
    public String leave(UUID socketId) {
        String roomToken = socketToRoom.remove(socketId);
        if (roomToken != null) {
            Map<UUID, Participant> participants = rooms.get(roomToken);
            if (participants != null) {
                participants.remove(socketId);
                if (participants.isEmpty()) {
                    rooms.remove(roomToken);
                }
            }
        }
        return roomToken;
    }

    public String roomOf(UUID socketId) {
        return socketToRoom.get(socketId);
    }

    public List<String> participantNames(String roomToken) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        if (participants == null) {
            return List.of();
        }
        Collection<Participant> values = participants.values();
        return values.stream().map(p -> p.userName).collect(Collectors.toList());
    }

    /** FR-11: current role of a participant, or null if they're not in the room. */
    public String roleOf(String roomToken, UUID socketId) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        Participant p = participants == null ? null : participants.get(socketId);
        return p == null ? null : p.role;
    }

    /** FR-11: change a participant's role (host action). Returns false if they're not in the room. */
    public boolean setRole(String roomToken, UUID socketId, String role) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        Participant p = participants == null ? null : participants.get(socketId);
        if (p == null) return false;
        p.role = role;
        return true;
    }

    public record ParticipantInfo(String userName, UUID socketId, String role) {
    }

    /** Full presence list with roles, for the participant panel + role-assignment UI. */
    public List<ParticipantInfo> participantsWithRoles(String roomToken) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        if (participants == null) return List.of();
        return participants.values().stream()
                .map(p -> new ParticipantInfo(p.userName, p.socketId, p.role))
                .collect(Collectors.toList());
    }

    /** All room tokens that currently have at least one connected participant. */
    public java.util.Set<String> activeRoomTokens() {
        return new java.util.HashSet<>(rooms.keySet());
    }

    public int participantCount(String roomToken) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        return participants == null ? 0 : participants.size();
    }

    /** All socket IDs currently in a room — used by admin force-close to disconnect everyone. */
    public java.util.List<UUID> socketIdsIn(String roomToken) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        return participants == null ? List.of() : List.copyOf(participants.keySet());
    }

    /** Wipes a room's presence entirely (admin force-close). */
    public void removeRoom(String roomToken) {
        Map<UUID, Participant> participants = rooms.remove(roomToken);
        if (participants != null) {
            participants.keySet().forEach(socketToRoom::remove);
        }
        roomHost.remove(roomToken);
        pendingRequests.remove(roomToken);
        lockedRooms.remove(roomToken);
        mutedChatRooms.remove(roomToken);
        sessionStartedAt.remove(roomToken);
        chatMessageCounts.remove(roomToken);
        mutedUsers.remove(roomToken);
    }

    // ── FEATURE 1: Host Controls ────────────────────────────────────────

    /** Host-only: prevents anyone new from joining (existing participants are unaffected). */
    public void setLocked(String roomToken, boolean locked) {
        lockedRooms.put(roomToken, locked);
    }

    public boolean isLocked(String roomToken) {
        return Boolean.TRUE.equals(lockedRooms.get(roomToken));
    }

    /** Host-only: silences chat_message from everyone except the host. */
    public void setChatMuted(String roomToken, boolean muted) {
        mutedChatRooms.put(roomToken, muted);
    }

    public boolean isChatMuted(String roomToken) {
        return Boolean.TRUE.equals(mutedChatRooms.get(roomToken));
    }

    /** Removes a participant from a room without waiting for their socket to disconnect (used by kick). */
    public void removeParticipant(String roomToken, UUID socketId) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        if (participants != null) {
            participants.remove(socketId);
            if (participants.isEmpty()) {
                rooms.remove(roomToken);
            }
        }
        socketToRoom.remove(socketId);
    }

    /** Host transfer: makes newHostSocketId the host of record for this room. */
    public void setHost(String roomToken, UUID newHostSocketId) {
        roomHost.put(roomToken, newHostSocketId);
    }

    public void markStarted(String roomToken) {
        sessionStartedAt.putIfAbsent(roomToken, java.time.Instant.now());
    }

    public java.time.Instant startedAt(String roomToken) {
        return sessionStartedAt.get(roomToken);
    }

    public void incrementChatCount(String roomToken) {
        chatMessageCounts.computeIfAbsent(roomToken, k -> new java.util.concurrent.atomic.AtomicInteger()).incrementAndGet();
    }

    public int chatCount(String roomToken) {
        java.util.concurrent.atomic.AtomicInteger c = chatMessageCounts.get(roomToken);
        return c == null ? 0 : c.get();
    }

    public Participant participant(String roomToken, UUID socketId) {
        Map<UUID, Participant> participants = rooms.get(roomToken);
        return participants == null ? null : participants.get(socketId);
    }

    // ── FEATURE 2: per-user mute ─────────────────────────────────────────

    public void setUserMuted(String roomToken, UUID socketId, boolean muted) {
        java.util.Set<UUID> set = mutedUsers.computeIfAbsent(roomToken, k -> java.util.concurrent.ConcurrentHashMap.newKeySet());
        if (muted) set.add(socketId); else set.remove(socketId);
    }

    public boolean isUserMuted(String roomToken, UUID socketId) {
        java.util.Set<UUID> set = mutedUsers.get(roomToken);
        return set != null && set.contains(socketId);
    }

    public java.util.Set<UUID> mutedUsersIn(String roomToken) {
        return mutedUsers.getOrDefault(roomToken, java.util.Set.of());
    }
}
