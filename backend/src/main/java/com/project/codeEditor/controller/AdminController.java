package com.project.codeEditor.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.web.bind.annotation.RequestParam;

import com.project.codeEditor.dto.AdminLiveSessionResponse;
import com.project.codeEditor.dto.AdminUserResponse;
import com.project.codeEditor.dto.RoleUpdateRequest;
import com.project.codeEditor.entity.CodingSession;
import com.project.codeEditor.entity.User;
import com.project.codeEditor.repository.CodingSessionRepository;
import com.project.codeEditor.repository.UserRepository;
import com.project.codeEditor.service.AbuseDetectionService;
import com.project.codeEditor.service.AdminAuditLog;
import com.project.codeEditor.service.AdminSettingsService;
import com.project.codeEditor.service.ExecutionStatsService;
import com.project.codeEditor.service.SystemHealthService;
import com.project.codeEditor.websocket.CollaborationSocketHandler;
import com.project.codeEditor.websocket.RoomRegistry;

/**
 * Everything under here is locked to ROLE_ADMIN in SecurityConfig — only the
 * seeded admin account (or anyone that admin later promotes) can reach it.
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CodingSessionRepository codingSessionRepository;

    @Autowired
    private RoomRegistry roomRegistry;

    @Autowired
    private CollaborationSocketHandler collaborationSocketHandler;

    @Autowired
    private ExecutionStatsService executionStatsService;

    @Autowired
    private AdminSettingsService adminSettingsService;

    @Autowired
    private AdminAuditLog adminAuditLog;

    @Autowired
    private SystemHealthService systemHealthService;

    @Autowired
    private AbuseDetectionService abuseDetectionService;

    // ── 1. User management ─────────────────────────────────────────────

    @GetMapping("/users")
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> new AdminUserResponse(
                        u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isEnabled(),
                        u.getCreatedAt(), u.getLastActiveAt()))
                .collect(Collectors.toList());
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<AdminUserResponse> blockUser(@PathVariable Long id, Authentication auth) {
        return setEnabled(id, false, auth);
    }

    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<AdminUserResponse> unblockUser(@PathVariable Long id, Authentication auth) {
        return setEnabled(id, true, auth);
    }

    private ResponseEntity<AdminUserResponse> setEnabled(Long id, boolean enabled, Authentication auth) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (!enabled && sameAsCaller(user, auth)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't block your own admin account.");
        }
        user.setEnabled(enabled);
        userRepository.save(user);
        adminAuditLog.log(callerEmail(auth), enabled ? "UNBLOCK_USER" : "BLOCK_USER", user.getEmail());
        return ResponseEntity.ok(new AdminUserResponse(
                user.getId(), user.getName(), user.getEmail(), user.getRole(), user.isEnabled(),
                user.getCreatedAt(), user.getLastActiveAt()));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> setRole(@PathVariable Long id, @RequestBody RoleUpdateRequest request,
            Authentication auth) {
        if (request == null || (!"ADMIN".equals(request.getRole()) && !"USER".equals(request.getRole()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be USER or ADMIN.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if ("USER".equals(request.getRole()) && sameAsCaller(user, auth)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't demote your own admin account.");
        }
        user.setRole(request.getRole());
        userRepository.save(user);
        adminAuditLog.log(callerEmail(auth), "SET_ROLE", user.getEmail() + " -> " + request.getRole());
        return ResponseEntity.ok(new AdminUserResponse(
                user.getId(), user.getName(), user.getEmail(), user.getRole(), user.isEnabled(),
                user.getCreatedAt(), user.getLastActiveAt()));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication auth) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (sameAsCaller(user, auth)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can't delete your own admin account.");
        }
        userRepository.delete(user);
        adminAuditLog.log(callerEmail(auth), "DELETE_USER", user.getEmail());
        return ResponseEntity.noContent().build();
    }

    private String callerEmail(Authentication auth) {
        return auth == null ? "unknown" : auth.getName();
    }

    private boolean sameAsCaller(User user, Authentication auth) {
        return auth != null && auth.getName() != null && auth.getName().equalsIgnoreCase(user.getEmail());
    }

    // ── 2. Live session monitoring ─────────────────────────────────────

    @GetMapping("/sessions/live")
    public List<AdminLiveSessionResponse> liveSessions() {
        return roomRegistry.activeRoomTokens().stream().map(token -> {
            CodingSession persisted = codingSessionRepository.findBySessionLink(token).orElse(null);
            return new AdminLiveSessionResponse(
                    token,
                    persisted != null ? persisted.getSessionName() : token,
                    persisted != null ? persisted.getProgrammingLanguage() : "-",
                    roomRegistry.hostName(token),
                    roomRegistry.participantCount(token),
                    roomRegistry.participantNames(token));
        }).collect(Collectors.toList());
    }

    @PostMapping("/sessions/{token}/close")
    public ResponseEntity<Void> forceCloseSession(@PathVariable String token, Authentication auth) {
        collaborationSocketHandler.forceCloseRoom(token);
        adminAuditLog.log(callerEmail(auth), "FORCE_CLOSE_SESSION", token);
        return ResponseEntity.noContent().build();
    }

    // ── 3. Session history & analytics ─────────────────────────────────

    @GetMapping("/sessions/history")
    public List<CodingSession> sessionHistory() {
        return codingSessionRepository.findAll();
    }

    // ── 4. Code execution monitoring ───────────────────────────────────

    @GetMapping("/executions/stats")
    public ExecutionStatsService.Snapshot executionStats() {
        return executionStatsService.snapshot();
    }

    // ── 5. Resource & sandbox limits control ────────────────────────────

    public record SettingsView(int timeoutSeconds, String memoryLimit, double cpuLimit,
            int idleCloseMinutes, java.util.Set<String> enabledLanguages) {
    }

    public record SettingsUpdateRequest(Integer timeoutSeconds, String memoryLimit, Double cpuLimit,
            Integer idleCloseMinutes) {
    }

    @GetMapping("/settings")
    public SettingsView getSettings() {
        return new SettingsView(
                adminSettingsService.getTimeoutSeconds(),
                adminSettingsService.getMemoryLimit(),
                adminSettingsService.getCpuLimit(),
                adminSettingsService.getIdleCloseMinutes(),
                adminSettingsService.getEnabledLanguages());
    }

    @PutMapping("/settings")
    public ResponseEntity<SettingsView> updateSettings(@RequestBody SettingsUpdateRequest request, Authentication auth) {
        if (request.timeoutSeconds() != null) adminSettingsService.setTimeoutSeconds(request.timeoutSeconds());
        if (request.memoryLimit() != null) adminSettingsService.setMemoryLimit(request.memoryLimit());
        if (request.cpuLimit() != null) adminSettingsService.setCpuLimit(request.cpuLimit());
        if (request.idleCloseMinutes() != null) adminSettingsService.setIdleCloseMinutes(request.idleCloseMinutes());
        adminAuditLog.log(callerEmail(auth), "UPDATE_SETTINGS", request.toString());
        return ResponseEntity.ok(getSettings());
    }

    @PostMapping("/settings/languages/{language}")
    public ResponseEntity<SettingsView> setLanguageEnabled(@PathVariable String language,
            @RequestParam boolean enabled, Authentication auth) {
        adminSettingsService.setLanguageEnabled(language, enabled);
        adminAuditLog.log(callerEmail(auth), enabled ? "ENABLE_LANGUAGE" : "DISABLE_LANGUAGE", language);
        return ResponseEntity.ok(getSettings());
    }

    // ── 6. System health ────────────────────────────────────────────────

    @GetMapping("/system/health")
    public SystemHealthService.Health systemHealth() {
        return systemHealthService.snapshot();
    }

    // ── 7. Reports & logs ────────────────────────────────────────────────

    @GetMapping("/logs")
    public List<AdminAuditLog.Entry> logs() {
        return adminAuditLog.recent();
    }

    @GetMapping("/logs/export")
    public ResponseEntity<String> exportLogsCsv() {
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=\"codehive-admin-logs.csv\"")
                .body(adminAuditLog.toCsv());
    }

    @GetMapping("/users/export")
    public ResponseEntity<String> exportUsersCsv() {
        StringBuilder sb = new StringBuilder("id,name,email,role,enabled,createdAt,lastActiveAt\n");
        for (User u : userRepository.findAll()) {
            sb.append(u.getId()).append(',')
              .append('"').append(u.getName() == null ? "" : u.getName().replace("\"", "\"\"")).append('"').append(',')
              .append(u.getEmail()).append(',')
              .append(u.getRole()).append(',')
              .append(u.isEnabled()).append(',')
              .append(u.getCreatedAt()).append(',')
              .append(u.getLastActiveAt() == null ? "" : u.getLastActiveAt()).append('\n');
        }
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=\"codehive-users.csv\"")
                .body(sb.toString());
    }

    // ── 8. Security / abuse control ─────────────────────────────────────

    @GetMapping("/security/flags")
    public List<AbuseDetectionService.Flag> securityFlags() {
        return abuseDetectionService.flaggedUsers();
    }

    @GetMapping("/security/banned-users")
    public List<AdminUserResponse> bannedUsers() {
        return userRepository.findAll().stream()
                .filter(u -> !u.isEnabled())
                .map(u -> new AdminUserResponse(
                        u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isEnabled(),
                        u.getCreatedAt(), u.getLastActiveAt()))
                .collect(Collectors.toList());
    }
}
