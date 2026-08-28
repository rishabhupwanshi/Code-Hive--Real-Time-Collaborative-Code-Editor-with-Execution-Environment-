package com.project.codeEditor.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.project.codeEditor.dto.CodingSessionResponse;
import com.project.codeEditor.dto.CreateSessionRequest;
import com.project.codeEditor.dto.JoinSessionRequest;
import com.project.codeEditor.dto.SaveCodeRequest;
import com.project.codeEditor.service.CodingSessionService;
import com.project.codeEditor.service.AbuseDetectionService;

@RestController
@RequestMapping("/api/sessions")
public class CodingSessionController {

    @Autowired
    private CodingSessionService codingSessionService;

    @Autowired
    private AbuseDetectionService abuseDetectionService;

    @PostMapping
    public ResponseEntity<CodingSessionResponse> createSession(@RequestBody CreateSessionRequest request,
            Authentication authentication) {
        validateCreateRequest(request);
        requireRole(authentication, "HOST", "Only hosts can create sessions.");
        String email = emailOf(authentication);
        abuseDetectionService.recordSessionCreation(email != null ? email : request.getHostName());
        CodingSessionResponse response = codingSessionService.createSession(request, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/join")
    public ResponseEntity<CodingSessionResponse> joinSession(@RequestBody JoinSessionRequest request,
            Authentication authentication) {
        validateJoinRequest(request);
        try {
            CodingSessionResponse response = codingSessionService.joinSession(request, emailOf(authentication));
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    // Only returns sessions the caller created or joined — not every session
    // in the system. Requires a valid Bearer token; anonymous callers get an
    // empty list.
    @GetMapping
    public ResponseEntity<List<CodingSessionResponse>> getSessions(Authentication authentication) {
        List<CodingSessionResponse> sessions = codingSessionService.getVisibleSessions(emailOf(authentication));
        return ResponseEntity.ok(sessions);
    }

    // RBAC: HOST-only "My Sessions" — sessions this user created.
    @GetMapping("/mine")
    public ResponseEntity<List<CodingSessionResponse>> getMySessions(Authentication authentication) {
        List<CodingSessionResponse> sessions = codingSessionService.getMySessions(emailOf(authentication));
        return ResponseEntity.ok(sessions);
    }

    // RBAC: USER-only "Joined Sessions" — sessions this user joined but didn't create.
    @GetMapping("/joined")
    public ResponseEntity<List<CodingSessionResponse>> getJoinedSessions(Authentication authentication) {
        List<CodingSessionResponse> sessions = codingSessionService.getJoinedSessions(emailOf(authentication));
        return ResponseEntity.ok(sessions);
    }

    // RBAC: only the HOST who created a session may delete it. SecurityConfig
    // already blocks non-HOST callers at the filter level; the ownership
    // check inside the service is the second, independent layer — a HOST
    // can never delete another host's session either.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id, Authentication authentication) {
        requireRole(authentication, "HOST", "Only hosts can delete sessions.");
        try {
            codingSessionService.deleteSession(id, emailOf(authentication));
            return ResponseEntity.noContent().build();
        } catch (SecurityException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    private String emailOf(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String name = authentication.getName();
        if (name == null || name.isBlank() || "anonymousUser".equals(name)) {
            return null;
        }
        return name;
    }

    // RBAC: defense-in-depth role check — SecurityConfig already enforces
    // this at the HTTP-matcher level, but checking again here means the
    // rule survives even if a matcher is ever loosened or reordered by
    // mistake. Anonymous/unauthenticated callers are always rejected.
    private void requireRole(Authentication authentication, String requiredRole, String message) {
        boolean hasRole = authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                        .anyMatch(a -> ("ROLE_" + requiredRole).equals(a.getAuthority()));
        if (!hasRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
    }

    @GetMapping("/{token}")
    public ResponseEntity<CodingSessionResponse> getSessionByToken(@PathVariable String token) {
        try {
            CodingSessionResponse response = codingSessionService.getSessionByToken(token);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    @PutMapping("/{token}/code")
    public ResponseEntity<CodingSessionResponse> saveCode(@PathVariable String token,
            @RequestBody SaveCodeRequest request) {
        try {
            CodingSessionResponse response = codingSessionService.saveCode(token, request.getCode());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    @PostMapping("/{token}/leave")
    public ResponseEntity<Void> leaveSession(@PathVariable String token, Authentication authentication) {
        try {
            codingSessionService.leaveSession(token, emailOf(authentication));
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    // ── FR-07 / AC-06: Code snapshot history ────────────────────────────

    @GetMapping("/{token}/snapshots")
    public ResponseEntity<List<com.project.codeEditor.dto.CodeSnapshotResponse>> listSnapshots(@PathVariable String token) {
        return ResponseEntity.ok(codingSessionService.listSnapshots(token));
    }

    @PostMapping("/{token}/snapshots")
    public ResponseEntity<com.project.codeEditor.dto.CodeSnapshotResponse> createSnapshot(
            @PathVariable String token, @RequestBody SaveCodeRequest request, Authentication authentication) {
        var response = codingSessionService.createSnapshot(token, request.getCode(), "MANUAL", emailOf(authentication));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{token}/snapshots/{snapshotId}/restore")
    public ResponseEntity<CodingSessionResponse> restoreSnapshot(@PathVariable String token,
            @PathVariable Long snapshotId, Authentication authentication) {
        try {
            CodingSessionResponse response = codingSessionService.restoreSnapshot(token, snapshotId, emailOf(authentication));
            return ResponseEntity.ok(response);
        } catch (SecurityException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ex.getMessage());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage());
        }
    }

    private void validateCreateRequest(CreateSessionRequest request) {
        if (request == null || request.getHostName() == null || request.getHostName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Host name is required.");
        }
        if (request.getProgrammingLanguage() == null || request.getProgrammingLanguage().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Programming language is required.");
        }
    }

    private void validateJoinRequest(JoinSessionRequest request) {
        if (request == null || request.getSessionToken() == null || request.getSessionToken().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session token is required.");
        }
        if (request.getParticipantName() == null || request.getParticipantName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Participant name is required.");
        }
    }
}
