package com.project.codeEditor.websocket;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.corundumstudio.socketio.AckRequest;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.project.codeEditor.dto.ChatMessageResponse;
import com.project.codeEditor.service.ChatService;

import jakarta.annotation.PostConstruct;

/**
 * All live-collaboration behaviour for a coding session lives here:
 *  - join_room / leave_room: puts a socket in a session's room, broadcasts
 *    the updated "online participants" list, and (on join) sends the
 *    joining client the room's persisted chat history
 *  - code_change: broadcasts editor content changes to everyone else in the room
 *  - cursor_move: broadcasts a participant's current line/column to the room
 *  - typing: broadcasts a transient "X is typing" indicator
 *  - chat_message: persists the message (so late joiners get it as history)
 *    and broadcasts it to everyone in the room
 *
 * Rooms are keyed by the session token (the same short code used for
 * "Join Session" on the dashboard), so everyone who joined the same coding
 * session ends up in the same Socket.IO room.
 */
@Component
public class CollaborationSocketHandler {

    private final SocketIOServer server;
    private final RoomRegistry roomRegistry;
    private final ChatService chatService;
    private final com.project.codeEditor.service.CodingSessionService codingSessionService;

    @Autowired
    public CollaborationSocketHandler(SocketIOServer server, RoomRegistry roomRegistry, ChatService chatService,
            com.project.codeEditor.service.CodingSessionService codingSessionService) {
        this.server = server;
        this.roomRegistry = roomRegistry;
        this.chatService = chatService;
        this.codingSessionService = codingSessionService;
    }

    @PostConstruct
    public void register() {
        server.addListeners(this);
    }

    @OnConnect
    public void onConnect(SocketIOClient client) {
        // Nothing to do until the client tells us which room to join.
    }

    @OnDisconnect
    public void onDisconnect(SocketIOClient client) {
        String roomToken = roomRegistry.leave(client.getSessionId());
        if (roomToken != null) {
            client.leaveRoom(roomToken);
            server.getRoomOperations(roomToken)
                    .sendEvent("online_participants", roomRegistry.participantNames(roomToken));

            // If the host just left, don't strand anyone still waiting on
            // approval — let the next join claim host, and auto-admit anyone
            // already queued up.
            if (roomRegistry.isHost(roomToken, client.getSessionId())) {
                roomRegistry.clearHost(roomToken);
                for (RoomRegistry.Participant pending : roomRegistry.pendingFor(roomToken)) {
                    admit(roomToken, pending);
                }
                roomRegistry.clearPending(roomToken);
                broadcastHost(roomToken);
            }
        }
    }

    @OnEvent("join_room")
    public void onJoinRoom(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String userName = String.valueOf(data.getOrDefault("userName", "Anonymous"));

        // FEATURE 1: a locked session rejects new joiners outright. The host
        // (reconnecting) and anyone already admitted are unaffected — this
        // only guards the "am I a brand-new participant?" path below.
        boolean alreadyHost = roomRegistry.isHost(roomToken, client.getSessionId());
        if (roomRegistry.isLocked(roomToken) && !alreadyHost) {
            client.sendEvent("join_denied", Map.of("reason", "This session is locked by the host."));
            return;
        }

        roomRegistry.claimHost(roomToken, client.getSessionId());
        roomRegistry.markStarted(roomToken);

        if (roomRegistry.isHost(roomToken, client.getSessionId()) || !roomRegistry.needsApproval(roomToken)) {
            // First person in the room (or the room's existing host reconnecting)
            // gets in immediately — no approval needed for your own session.
            roomRegistry.claimHost(roomToken, client.getSessionId());
            admit(roomToken, new RoomRegistry.Participant(client.getSessionId(), userName));
            return;
        }

        // Anyone else needs the host to approve them first.
        String requestId = roomRegistry.addPending(roomToken, client.getSessionId(), userName);
        UUID hostId = roomRegistry.hostOf(roomToken);
        SocketIOClient hostClient = hostId == null ? null : server.getClient(hostId);
        if (hostClient != null) {
            hostClient.sendEvent("join_request", Map.of("requestId", requestId, "userName", userName));
        }
        client.sendEvent("join_pending", Map.of("requestId", requestId));
    }

    @OnEvent("approve_join")
    public void onApproveJoin(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String requestId = String.valueOf(data.get("requestId"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) {
            return; // only the host can approve
        }
        RoomRegistry.Participant requester = roomRegistry.resolvePending(roomToken, requestId);
        if (requester != null) {
            admit(roomToken, requester);
        }
    }

    @OnEvent("deny_join")
    public void onDenyJoin(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String requestId = String.valueOf(data.get("requestId"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) {
            return;
        }
        RoomRegistry.Participant requester = roomRegistry.resolvePending(roomToken, requestId);
        if (requester != null) {
            SocketIOClient requesterClient = server.getClient(requester.socketId);
            if (requesterClient != null) {
                requesterClient.sendEvent("join_denied");
            }
        }
    }

    /** Actually puts a (now-approved) participant into the room and tells everyone. */
    private void admit(String roomToken, RoomRegistry.Participant participant) {
        SocketIOClient participantClient = server.getClient(participant.socketId);
        if (participantClient == null) {
            return; // they disconnected while waiting for approval
        }
        participantClient.joinRoom(roomToken);
        roomRegistry.join(roomToken, participant.socketId, participant.userName);
        roomRegistry.setRole(roomToken, participant.socketId,
                roomRegistry.isHost(roomToken, participant.socketId) ? "HOST" : "COLLABORATOR");

        server.getRoomOperations(roomToken)
                .sendEvent("online_participants", roomRegistry.participantNames(roomToken));
        server.getRoomOperations(roomToken)
                .sendEvent("system_message", participant.userName + " joined the session");

        List<ChatMessageResponse> history = chatService.getHistory(roomToken);
        participantClient.sendEvent("chat_history", history);
        participantClient.sendEvent("join_approved");

        broadcastHost(roomToken);
        broadcastRoles(roomToken);
        broadcastMutedUsers(roomToken);
    }

    /** FR-11: tells everyone in the room who has which role, for the participant panel and role-assignment UI. */
    private void broadcastRoles(String roomToken) {
        List<Map<String, String>> roles = roomRegistry.participantsWithRoles(roomToken).stream()
                .map(p -> Map.of("userName", p.userName(), "socketId", p.socketId().toString(), "role", p.role()))
                .collect(java.util.stream.Collectors.toList());
        server.getRoomOperations(roomToken).sendEvent("participant_roles", roles);
    }

    /**
     * FR-11: only the Host may change another participant's role. Only
     * COLLABORATOR/OBSERVER are assignable this way — host status itself
     * transfers via the separate ownership-transfer flow (FR-10), not here.
     */
    @OnEvent("set_participant_role")
    public void onSetParticipantRole(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String targetSocketId = String.valueOf(data.get("targetSocketId"));
        String role = String.valueOf(data.get("role"));

        if (!roomRegistry.isHost(roomToken, client.getSessionId())) {
            return; // only the host can reassign roles
        }
        if (!"COLLABORATOR".equals(role) && !"OBSERVER".equals(role)) {
            return;
        }
        try {
            UUID targetId = UUID.fromString(targetSocketId);
            if (roomRegistry.setRole(roomToken, targetId, role)) {
                broadcastRoles(roomToken);
            }
        } catch (IllegalArgumentException ignored) {
            // malformed socket id — ignore rather than crash the handler
        }
    }

    /** Tells everyone in the room who currently created/owns this session. */
    private void broadcastHost(String roomToken) {
        String hostName = roomRegistry.hostName(roomToken);
        if (hostName != null) {
            server.getRoomOperations(roomToken).sendEvent("session_host", hostName);
        }
    }

    /**
     * Admin-initiated shutdown of a live session: tells everyone in the room,
     * disconnects their sockets, and wipes the room's presence so a stale
     * host/participant list can't linger.
     */
    public void forceCloseRoom(String roomToken) {
        server.getRoomOperations(roomToken).sendEvent("session_force_closed");
        for (UUID socketId : roomRegistry.socketIdsIn(roomToken)) {
            SocketIOClient client = server.getClient(socketId);
            if (client != null) {
                client.disconnect();
            }
        }
        roomRegistry.removeRoom(roomToken);
    }

    @OnEvent("leave_room")
    public void onLeaveRoom(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = roomRegistry.leave(client.getSessionId());
        if (roomToken != null) {
            client.leaveRoom(roomToken);
            server.getRoomOperations(roomToken)
                    .sendEvent("online_participants", roomRegistry.participantNames(roomToken));
        }
    }

    @OnEvent("change_language")
    public void onChangeLanguage(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String language = String.valueOf(data.get("language"));

        if (!roomRegistry.isHost(roomToken, client.getSessionId())) {
            return; // FR-11: only the Host may change the session's language
        }
        try {
            codingSessionService.updateLanguage(roomToken, language);
        } catch (IllegalArgumentException ignored) {
            return;
        }
        server.getRoomOperations(roomToken).sendEvent("language_changed", language);
    }

    @OnEvent("code_change")
    public void onCodeChange(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if ("OBSERVER".equals(roomRegistry.roleOf(roomToken, client.getSessionId()))) {
            return; // FR-11: Observers are read-only — never propagate their edits
        }
        // Broadcast to everyone else in the room (not back to the sender).
        server.getRoomOperations(roomToken).sendEvent("code_change", client, data);
    }

    // FEATURE 1 — Advanced File Explorer: the REST API (FileNodeController)
    // is the source of truth for every create/rename/delete/move/duplicate;
    // the client just re-emits this event after a successful REST call so
    // every other participant's Explorer refetches the tree and stays in
    // sync, the same way code_change keeps the buffer in sync.
    @OnEvent("file_tree_change")
    public void onFileTreeChange(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if ("OBSERVER".equals(roomRegistry.roleOf(roomToken, client.getSessionId()))) {
            return;
        }
        server.getRoomOperations(roomToken).sendEvent("file_tree_change", client, data);
    }

    @OnEvent("cursor_move")
    public void onCursorMove(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        server.getRoomOperations(roomToken).sendEvent("cursor_move", client, data);
    }

    @OnEvent("typing")
    public void onTyping(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        server.getRoomOperations(roomToken).sendEvent("typing", client, data);
    }

    @OnEvent("chat_message")
    public void onChatMessage(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        String senderName = String.valueOf(data.getOrDefault("senderName", "Anonymous"));
        String message = String.valueOf(data.getOrDefault("message", ""));

        // FEATURE 1: "Mute Chat" silences everyone except the host.
        // FEATURE 2: "Mute User" silences just that one participant.
        boolean iAmHost = roomRegistry.isHost(roomToken, client.getSessionId());
        if (!iAmHost && roomRegistry.isChatMuted(roomToken)) {
            client.sendEvent("chat_muted_notice", "The host has muted chat for this session.");
            return;
        }
        if (!iAmHost && roomRegistry.isUserMuted(roomToken, client.getSessionId())) {
            client.sendEvent("chat_muted_notice", "The host has muted you.");
            return;
        }

        // Persist first so anyone joining right after this still gets it in history.
        chatService.saveMessage(roomToken, senderName, message);
        roomRegistry.incrementChatCount(roomToken);

        server.getRoomOperations(roomToken).sendEvent("chat_message", data);
    }

    /** Host mutes/unmutes a single participant's chat (distinct from room-wide Mute Chat). */
    @OnEvent("mute_user")
    public void onMuteUser(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        setUserMuted(client, data, true);
    }

    @OnEvent("unmute_user")
    public void onUnmuteUser(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        setUserMuted(client, data, false);
    }

    private void setUserMuted(SocketIOClient client, Map<String, Object> data, boolean muted) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;

        String targetSocketId = String.valueOf(data.get("targetSocketId"));
        UUID targetId;
        try {
            targetId = UUID.fromString(targetSocketId);
        } catch (IllegalArgumentException ex) {
            return;
        }
        roomRegistry.setUserMuted(roomToken, targetId, muted);
        broadcastMutedUsers(roomToken);

        SocketIOClient targetClient = server.getClient(targetId);
        if (targetClient != null) {
            targetClient.sendEvent(muted ? "you_were_muted" : "you_were_unmuted");
        }
    }

    /** Tells everyone in the room which socketIds are currently individually muted. */
    private void broadcastMutedUsers(String roomToken) {
        List<String> muted = roomRegistry.mutedUsersIn(roomToken).stream()
                .map(UUID::toString).collect(java.util.stream.Collectors.toList());
        server.getRoomOperations(roomToken).sendEvent("muted_users", muted);
    }

    // ── FEATURE 1: Host Controls ────────────────────────────────────────
    // All of the following are host-only: every handler re-checks
    // roomRegistry.isHost(...) itself rather than trusting the client, so a
    // non-host emitting these events directly (e.g. via devtools) is a no-op.

    @OnEvent("lock_session")
    public void onLockSession(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        roomRegistry.setLocked(roomToken, true);
        server.getRoomOperations(roomToken).sendEvent("session_locked", true);
    }

    @OnEvent("unlock_session")
    public void onUnlockSession(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        roomRegistry.setLocked(roomToken, false);
        server.getRoomOperations(roomToken).sendEvent("session_locked", false);
    }

    @OnEvent("mute_chat")
    public void onMuteChat(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        roomRegistry.setChatMuted(roomToken, true);
        server.getRoomOperations(roomToken).sendEvent("chat_muted", true);
    }

    @OnEvent("unmute_chat")
    public void onUnmuteChat(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        roomRegistry.setChatMuted(roomToken, false);
        server.getRoomOperations(roomToken).sendEvent("chat_muted", false);
    }

    /** Host kicks a participant by their current socket id (from participant_roles / online list). */
    @OnEvent("kick_participant")
    public void onKickParticipant(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;

        String targetSocketId = String.valueOf(data.get("targetSocketId"));
        UUID targetId;
        try {
            targetId = UUID.fromString(targetSocketId);
        } catch (IllegalArgumentException ex) {
            return;
        }
        if (targetId.equals(client.getSessionId())) {
            return; // a host can't kick themselves — use End Session instead
        }

        RoomRegistry.Participant target = roomRegistry.participant(roomToken, targetId);
        SocketIOClient targetClient = server.getClient(targetId);
        roomRegistry.removeParticipant(roomToken, targetId);

        if (targetClient != null) {
            targetClient.sendEvent("kicked_from_session", "The host removed you from this session.");
            targetClient.leaveRoom(roomToken);
        }
        server.getRoomOperations(roomToken).sendEvent("online_participants", roomRegistry.participantNames(roomToken));
        if (target != null) {
            server.getRoomOperations(roomToken).sendEvent("system_message", target.userName + " was removed by the host");
        }
        broadcastRoles(roomToken);
    }

    /** Host hands host status to another participant currently in the room. */
    @OnEvent("transfer_host")
    public void onTransferHost(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;

        String targetSocketId = String.valueOf(data.get("targetSocketId"));
        UUID targetId;
        try {
            targetId = UUID.fromString(targetSocketId);
        } catch (IllegalArgumentException ex) {
            return;
        }
        RoomRegistry.Participant target = roomRegistry.participant(roomToken, targetId);
        if (target == null) return; // can only transfer to someone actually in the room

        roomRegistry.setHost(roomToken, targetId);
        roomRegistry.setRole(roomToken, targetId, "HOST");
        roomRegistry.setRole(roomToken, client.getSessionId(), "COLLABORATOR");

        broadcastHost(roomToken);
        broadcastRoles(roomToken);
        server.getRoomOperations(roomToken).sendEvent("system_message", target.userName + " is now the host");
    }

    /** Host-only: pushes back the current session's live stats for the analytics panel. */
    @OnEvent("request_session_stats")
    public void onRequestSessionStats(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;

        java.time.Instant startedAt = roomRegistry.startedAt(roomToken);
        long durationSeconds = startedAt == null ? 0 : java.time.Duration.between(startedAt, java.time.Instant.now()).getSeconds();

        Map<String, Object> stats = Map.of(
                "participantCount", roomRegistry.participantCount(roomToken),
                "chatMessageCount", roomRegistry.chatCount(roomToken),
                "durationSeconds", durationSeconds,
                "locked", roomRegistry.isLocked(roomToken),
                "chatMuted", roomRegistry.isChatMuted(roomToken));
        client.sendEvent("session_stats", stats);
    }

    /** Host explicitly starts the session (marks the start time used by analytics). */
    @OnEvent("start_session")
    public void onStartSession(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        roomRegistry.markStarted(roomToken);
        server.getRoomOperations(roomToken).sendEvent("session_started", true);
    }

    /** Host ends the session for everyone — same mechanism as admin force-close. */
    @OnEvent("end_session")
    public void onEndSession(SocketIOClient client, Map<String, Object> data, AckRequest ackRequest) {
        String roomToken = String.valueOf(data.get("sessionToken"));
        if (!roomRegistry.isHost(roomToken, client.getSessionId())) return;
        forceCloseRoom(roomToken);
    }
}

