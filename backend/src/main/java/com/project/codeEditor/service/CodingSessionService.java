package com.project.codeEditor.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.project.codeEditor.dto.CodeSnapshotResponse;
import com.project.codeEditor.dto.CodingSessionResponse;
import com.project.codeEditor.dto.CreateSessionRequest;
import com.project.codeEditor.dto.JoinSessionRequest;
import com.project.codeEditor.entity.CodeSnapshot;
import com.project.codeEditor.entity.CodingSession;
import com.project.codeEditor.repository.CodeSnapshotRepository;
import com.project.codeEditor.repository.CodingSessionRepository;

@Service
public class CodingSessionService {

    @Autowired
    private CodingSessionRepository sessionRepository;

    @Autowired
    private CodeSnapshotRepository snapshotRepository;

    private static final long AUTO_SNAPSHOT_INTERVAL_MINUTES = 5;

    public CodingSessionResponse createSession(CreateSessionRequest request, String creatorEmail) {
        CodingSession session = new CodingSession();
        session.setSessionName(request.getHostName());
        session.setProgrammingLanguage(request.getProgrammingLanguage());
        session.setSessionLink(generateUniqueToken());
        Boolean publicRoom = request.getPublicRoom();
        session.setPublicRoom(publicRoom == null ? Boolean.TRUE : publicRoom);
        session.setStatus("ACTIVE");
        session.setCreatedByEmail(creatorEmail);
        if (creatorEmail != null && !creatorEmail.isBlank()) {
            session.setParticipantEmails(wrap(creatorEmail));
        }

        CodingSession saved = sessionRepository.save(session);
        return toResponse(saved);
    }

    public CodingSessionResponse joinSession(JoinSessionRequest request, String joinerEmail) {
        CodingSession session = sessionRepository.findBySessionLink(request.getSessionToken())
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + request.getSessionToken()));

        // Only participants who actually join (and therefore can edit code) get
        // visibility into the session from here on.
        if (joinerEmail != null && !joinerEmail.isBlank() && !hasParticipant(session, joinerEmail)) {
            String updated = (session.getParticipantEmails() == null || session.getParticipantEmails().isBlank())
                    ? wrap(joinerEmail)
                    : session.getParticipantEmails() + joinerEmail + ",";
            session.setParticipantEmails(updated);
            session = sessionRepository.save(session);
        }
        return toResponse(session);
    }

    public CodingSessionResponse getSessionByToken(String token) {
        CodingSession session = sessionRepository.findBySessionLink(token)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + token));
        return toResponse(session);
    }

    /**
     * Returns only the sessions the given user created or has joined (i.e. can
     * edit code in). Anonymous callers, or users who haven't created/joined
     * anything, see an empty list rather than every session in the system.
     */
    public List<CodingSessionResponse> getVisibleSessions(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return sessionRepository.findVisibleToUser(email)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** RBAC: HOST "My Sessions" — only sessions this user created. */
    public List<CodingSessionResponse> getMySessions(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return sessionRepository.findByCreatedByEmailOrderByCreatedAtDesc(email)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /** RBAC: USER "Joined Sessions" — sessions this user joined but didn't create. */
    public List<CodingSessionResponse> getJoinedSessions(String email) {
        if (email == null || email.isBlank()) {
            return List.of();
        }
        return sessionRepository.findJoinedByUser(email)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    /**
     * RBAC: only the HOST who created a session may delete it. Anonymous
     * hosts (createdByEmail is null) can't be deleted through this endpoint
     * at all, since there's no owner identity to verify against.
     */
    public void deleteSession(Long id, String requesterEmail) {
        CodingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for id: " + id));

        String owner = session.getCreatedByEmail();
        boolean requesterIsOwner = owner != null && !owner.isBlank()
                && requesterEmail != null && owner.equalsIgnoreCase(requesterEmail);
        if (!requesterIsOwner) {
            throw new SecurityException("Only the host who created this session can delete it.");
        }
        sessionRepository.delete(session);
    }

    public CodingSessionResponse saveCode(String token, String code) {
        CodingSession session = sessionRepository.findBySessionLink(token)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + token));
        session.setCode(code);
        CodingSession saved = sessionRepository.save(session);
        maybeAutoSnapshot(token, code);
        return toResponse(saved);
    }

    // FR-07: take a snapshot every 5 minutes at most, regardless of how many
    // times the code is saved in between (every keystroke debounce would
    // otherwise call saveCode far more often than that).
    private void maybeAutoSnapshot(String token, String code) {
        var last = snapshotRepository.findFirstBySessionTokenOrderByCreatedAtDesc(token);
        boolean due = last.isEmpty()
                || last.get().getCreatedAt().isBefore(Instant.now().minus(AUTO_SNAPSHOT_INTERVAL_MINUTES, ChronoUnit.MINUTES));
        if (due) {
            createSnapshot(token, code, "AUTO", null);
        }
    }

    /** Explicit snapshot — used for manual "snapshot now" and post-execution snapshots. */
    public CodeSnapshotResponse createSnapshot(String token, String code, String trigger, String actorEmail) {
        CodeSnapshot snapshot = new CodeSnapshot();
        snapshot.setSessionToken(token);
        snapshot.setCode(code);
        snapshot.setTrigger(trigger);
        snapshot.setCreatedByEmail(actorEmail);
        CodeSnapshot saved = snapshotRepository.save(snapshot);
        return toSnapshotResponse(saved);
    }

    public List<CodeSnapshotResponse> listSnapshots(String token) {
        return snapshotRepository.findBySessionTokenOrderByCreatedAtDesc(token)
                .stream().map(this::toSnapshotResponse).collect(Collectors.toList());
    }

    /**
     * Called once per successful "Run" click (see ExecutionController). This
     * is the real, durable counter behind the dashboard's "Code Executions"
     * stat — unlike ExecutionStatsService, which is in-memory/global and
     * resets on restart, this persists per-session in the database.
     */
    public void incrementExecutionCount(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        sessionRepository.findBySessionLink(token).ifPresent(session -> {
            int current = session.getExecutionCount() == null ? 0 : session.getExecutionCount();
            session.setExecutionCount(current + 1);
            sessionRepository.save(session);
        });
    }

    /**
     * FR-11: only the Host may restore a snapshot, to prevent a Collaborator
     * from accidentally overwriting everyone's work. "Host" here means the
     * account that created the session; for anonymous-hosted sessions
     * (createdByEmail is null) anyone may restore, since there's no owner to
     * distinguish — the socket layer's live host check covers that case.
     */
    public CodingSessionResponse restoreSnapshot(String token, Long snapshotId, String requesterEmail) {
        CodingSession session = sessionRepository.findBySessionLink(token)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + token));

        String owner = session.getCreatedByEmail();
        boolean requesterIsOwner = owner == null || owner.isBlank() || owner.equalsIgnoreCase(requesterEmail);
        if (!requesterIsOwner) {
            throw new SecurityException("Only the session host can restore a snapshot.");
        }

        CodeSnapshot snapshot = snapshotRepository.findById(snapshotId)
                .filter(s -> s.getSessionToken().equals(token))
                .orElseThrow(() -> new IllegalArgumentException("Snapshot not found for this session."));

        session.setCode(snapshot.getCode());
        CodingSession saved = sessionRepository.save(session);
        return toResponse(saved);
    }

    private CodeSnapshotResponse toSnapshotResponse(CodeSnapshot s) {
        return new CodeSnapshotResponse(s.getId(), s.getCode(), s.getTrigger(), s.getCreatedByEmail(), s.getCreatedAt());
    }

    /** FR-11: only called after the socket layer has verified the caller is the room's Host. */
    public void updateLanguage(String token, String language) {
        CodingSession session = sessionRepository.findBySessionLink(token)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + token));
        session.setProgrammingLanguage(language);
        sessionRepository.save(session);
    }

    /** RBAC: USER "Leave Session" — removes the caller from a session's participant list. */
    public void leaveSession(String token, String requesterEmail) {
        if (requesterEmail == null || requesterEmail.isBlank()) {
            return; // nothing to remove for an anonymous caller
        }
        CodingSession session = sessionRepository.findBySessionLink(token)
                .orElseThrow(() -> new IllegalArgumentException("Session not found for token: " + token));
        String participants = session.getParticipantEmails();
        if (participants != null && participants.contains("," + requesterEmail + ",")) {
            session.setParticipantEmails(participants.replace("," + requesterEmail + ",", ","));
            sessionRepository.save(session);
        }
    }

    private boolean hasParticipant(CodingSession session, String email) {
        String participants = session.getParticipantEmails();
        return participants != null && participants.contains("," + email + ",");
    }

    private String wrap(String email) {
        return "," + email + ",";
    }

    private CodingSessionResponse toResponse(CodingSession session) {
        CodingSessionResponse response = new CodingSessionResponse();
        response.setId(session.getId());
        response.setHostName(session.getSessionName());
        response.setProgrammingLanguage(session.getProgrammingLanguage());
        response.setSessionToken(session.getSessionLink());
        response.setPublicRoom(session.getPublicRoom());
        response.setStatus(session.getStatus());
        response.setCreatedAt(session.getCreatedAt());
        response.setCode(session.getCode());
        response.setExecutionCount(session.getExecutionCount() == null ? 0 : session.getExecutionCount());
        return response;
    }

    private String generateUniqueToken() {
        String token;
        do {
            token = UUID.randomUUID().toString().replaceAll("[-]", "").substring(0, 8).toUpperCase();
        } while (sessionRepository.existsBySessionLink(token));
        return token;
    }
}
