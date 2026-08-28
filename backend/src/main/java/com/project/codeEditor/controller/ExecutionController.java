package com.project.codeEditor.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.project.codeEditor.dto.ExecuteRequest;
import com.project.codeEditor.dto.ExecuteResponse;
import com.project.codeEditor.service.CodeExecutionService;

/**
 * Runs the code from the "Run" button in the editor inside a throwaway
 * Docker container (see CodeExecutionService) and returns stdout/stderr,
 * which the frontend renders in the terminal/output panel.
 */
@RestController
@RequestMapping("/api/execute")
public class ExecutionController {

    @Autowired
    private CodeExecutionService codeExecutionService;

    @Autowired
    private com.project.codeEditor.service.CodingSessionService codingSessionService;

    @Autowired
    private com.project.codeEditor.service.AiExplainService aiExplainService;

    @PostMapping
    public ResponseEntity<ExecuteResponse> execute(@RequestBody ExecuteRequest request) {
        if (request == null || request.getCode() == null || request.getCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Code is required.");
        }
        if (request.getLanguage() == null || request.getLanguage().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Language is required.");
        }
        ExecuteResponse response = codeExecutionService.execute(request);

        // Real, persisted "Code Executions" counter for this session (used by
        // the user dashboard's stat card) — separate from the snapshot below.
        if (request.getSessionToken() != null && !request.getSessionToken().isBlank()) {
            try {
                codingSessionService.incrementExecutionCount(request.getSessionToken());
            } catch (Exception ignored) {
                // Never fail the run itself because the counter couldn't update.
            }
        }

        // FR-07: "auto-snapshot interval: every 5 minutes or on each code execution."
        if (request.getSessionToken() != null && !request.getSessionToken().isBlank()) {
            try {
                codingSessionService.createSnapshot(request.getSessionToken(), request.getCode(), "EXECUTION", null);
            } catch (Exception ignored) {
                // Snapshotting is best-effort — never fail the run itself because of it.
            }
        }
        return ResponseEntity.ok(response);
    }

    /**
     * Compile/parse-only check, used to underline errors in the editor as the
     * user types. Never runs the code. Empty code is valid here (no red
     * lines for an empty file) rather than a 400.
     */
    @PostMapping("/check")
    public ResponseEntity<com.project.codeEditor.dto.CheckResponse> check(@RequestBody ExecuteRequest request) {
        if (request == null || request.getCode() == null || request.getCode().isBlank()
                || request.getLanguage() == null || request.getLanguage().isBlank()) {
            return ResponseEntity.ok(new com.project.codeEditor.dto.CheckResponse(java.util.List.of()));
        }
        return ResponseEntity.ok(codeExecutionService.check(request));
    }

    /**
     * "Explain with AI" — takes the current code + a compiler/runtime error
     * (or a Problems-panel diagnostic message) and returns a short plain
     * English explanation and likely fix, powered by Groq's free API.
     * Never throws: if the AI isn't configured or reachable, it returns
     * available=false with a helpful message instead of a 5xx.
     */
    @PostMapping("/explain")
    public ResponseEntity<com.project.codeEditor.dto.ExplainResponse> explain(
            @RequestBody com.project.codeEditor.dto.ExplainRequest request) {
        return ResponseEntity.ok(aiExplainService.explain(request));
    }
}
