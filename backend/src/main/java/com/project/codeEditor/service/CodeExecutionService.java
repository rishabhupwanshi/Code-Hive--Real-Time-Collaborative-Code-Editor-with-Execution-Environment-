package com.project.codeEditor.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.project.codeEditor.dto.ExecuteRequest;
import com.project.codeEditor.dto.ExecuteResponse;

/**
 * Runs untrusted user code inside a throwaway, network-isolated Docker
 * container and captures stdout/stderr. Each run gets its own temp
 * directory (mounted into the container) and its own container name, is
 * capped on CPU/memory, and is killed if it runs past the configured
 * timeout.
 *
 * Requires the Docker CLI to be installed and reachable by the backend
 * process (i.e. the server this Spring Boot app runs on needs Docker, and
 * the appropriate language images pulled or pullable: eclipse-temurin,
 * python, node).
 */
@Service
public class CodeExecutionService {

    @Value("${execution.timeout.seconds:10}")
    private int timeoutSeconds;

    @Value("${execution.docker.enabled:true}")
    private boolean dockerEnabled;

    @org.springframework.beans.factory.annotation.Autowired
    private ExecutionStatsService executionStatsService;

    @org.springframework.beans.factory.annotation.Autowired
    private AdminSettingsService adminSettingsService;

    @org.springframework.beans.factory.annotation.Autowired
    private com.project.codeEditor.websocket.RoomRegistry roomRegistry;

    private record LangSpec(String image, String fileName, String[] buildAndRunCommand, String[] checkCommand) {
    }

    private LangSpec specFor(String language) {
        String normalized = language == null ? "" : language.trim().toLowerCase();
        switch (normalized) {
            case "java":
                return new LangSpec(
                        "eclipse-temurin:21-jdk",
                        "Main.java",
                        new String[] { "sh", "-c", "javac Main.java && java Main" },
                        new String[] { "javac", "-Xlint:none", "-d", "/tmp/out", "Main.java" });
            case "python":
                return new LangSpec(
                        "python:3.12-slim",
                        "Main.py",
                        new String[] { "python3", "Main.py" },
                        new String[] { "python3", "-m", "py_compile", "Main.py" });
            case "javascript":
            case "node":
                return new LangSpec(
                        "node:20-slim",
                        "Main.js",
                        new String[] { "node", "Main.js" },
                        new String[] { "node", "--check", "Main.js" });
            default:
                throw new IllegalArgumentException("Unsupported language for execution: " + language);
        }
    }

    public ExecuteResponse execute(ExecuteRequest request) {
        if (!dockerEnabled) {
            return new ExecuteResponse(false, "", "Code execution is disabled on this server.", 0, false);
        }
        if (request == null || request.getCode() == null) {
            return new ExecuteResponse(false, "", "No code provided.", 0, false);
        }
        if (!adminSettingsService.isLanguageEnabled(request.getLanguage())) {
            return new ExecuteResponse(false, "", "This language is currently disabled by an administrator.", 0, false);
        }
        if (isObserver(request)) {
            return new ExecuteResponse(false, "", "Observers are view-only and cannot execute code.", 0, false);
        }

        LangSpec spec = specFor(request.getLanguage());
        String containerName = "codehive-run-" + UUID.randomUUID();
        Path workDir = null;

        long start = System.currentTimeMillis();
        try {
            workDir = Files.createTempDirectory("codehive-exec-");
            Path codeFile = workDir.resolve(spec.fileName());
            Files.writeString(codeFile, request.getCode(), StandardCharsets.UTF_8);

            List<String> command = new java.util.ArrayList<>(List.of(
                    "docker", "run", "--rm",
                    "--name", containerName,
                    "--network", "none",
                    "--memory", adminSettingsService.getMemoryLimit(),
                    "--cpus", String.valueOf(adminSettingsService.getCpuLimit()),
                    "-v", workDir.toAbsolutePath() + ":/code",
                    "-w", "/code",
                    spec.image()));
            command.addAll(List.of(spec.buildAndRunCommand()));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            if (request.getStdin() != null && !request.getStdin().isEmpty()) {
                process.getOutputStream().write(request.getStdin().getBytes(StandardCharsets.UTF_8));
            }
            process.getOutputStream().close();

            // Read stdout/stderr on background threads: a hung program would
            // otherwise block a synchronous readAllBytes() forever, before we
            // even reach waitFor's timeout below.
            java.util.concurrent.Future<String> stdoutFuture = STREAM_READER.submit(() -> readStream(process.getInputStream()));
            java.util.concurrent.Future<String> stderrFuture = STREAM_READER.submit(() -> readStream(process.getErrorStream()));

            boolean finished = process.waitFor(adminSettingsService.getTimeoutSeconds(), TimeUnit.SECONDS);
            long duration = System.currentTimeMillis() - start;

            if (!finished) {
                process.destroyForcibly();
                killContainer(containerName);
                stdoutFuture.cancel(true);
                stderrFuture.cancel(true);
                executionStatsService.record(request.getLanguage(), false, true, duration);
                return new ExecuteResponse(false, safeGet(stdoutFuture), "Execution timed out after " + adminSettingsService.getTimeoutSeconds() + "s.",
                        duration, true);
            }

            String stdout = safeGet(stdoutFuture);
            String stderr = safeGet(stderrFuture);
            int exitCode = process.exitValue();
            boolean success = exitCode == 0;
            executionStatsService.record(request.getLanguage(), success, false, duration);
            // FEATURE 2 — Output Panel "Memory Usage" stat. Best-effort only:
            // the container is already gone by the time --rm exits, so we
            // can't always read its peak RSS; null just means "unknown" and
            // the frontend hides that stat rather than showing a fake 0.
            Long memoryKb = readPeakMemoryKb(containerName);
            return new ExecuteResponse(success, stdout, stderr, duration, false, exitCode, memoryKb);

        } catch (IOException | InterruptedException ex) {
            killContainer(containerName);
            return new ExecuteResponse(false, "", "Execution failed: " + ex.getMessage(),
                    System.currentTimeMillis() - start, false);
        } finally {
            cleanup(workDir);
        }
    }

    /**
     * Compiles/parses (but never runs) the given code inside the same kind of
     * throwaway Docker container used for execution, and turns the
     * compiler/interpreter's error output into line/column diagnostics the
     * editor can underline. Much cheaper than a full run since nothing is
     * ever executed — used for the live red-squiggly-line checking as the
     * user types (debounced on the frontend).
     */
    public com.project.codeEditor.dto.CheckResponse check(ExecuteRequest request) {
        java.util.List<com.project.codeEditor.dto.DiagnosticDto> diagnostics = new java.util.ArrayList<>();
        if (!dockerEnabled || request == null || request.getCode() == null) {
            return new com.project.codeEditor.dto.CheckResponse(diagnostics);
        }
        if (!adminSettingsService.isLanguageEnabled(request.getLanguage())) {
            return new com.project.codeEditor.dto.CheckResponse(diagnostics);
        }

        LangSpec spec;
        try {
            spec = specFor(request.getLanguage());
        } catch (IllegalArgumentException ex) {
            return new com.project.codeEditor.dto.CheckResponse(diagnostics); // unsupported language: no red lines, not an error
        }

        String containerName = "codehive-check-" + UUID.randomUUID();
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("codehive-check-");
            Files.writeString(workDir.resolve(spec.fileName()), request.getCode(), StandardCharsets.UTF_8);
            Files.createDirectories(workDir.resolve("out"));

            List<String> command = new java.util.ArrayList<>(List.of(
                    "docker", "run", "--rm",
                    "--name", containerName,
                    "--network", "none",
                    "--memory", adminSettingsService.getMemoryLimit(),
                    "--cpus", String.valueOf(adminSettingsService.getCpuLimit()),
                    "-v", workDir.toAbsolutePath() + ":/code",
                    "-w", "/code",
                    spec.image()));
            command.addAll(List.of(spec.checkCommand()));

            ProcessBuilder pb = new ProcessBuilder(command);
            Process process = pb.start();
            process.getOutputStream().close();

            java.util.concurrent.Future<String> stderrFuture = STREAM_READER.submit(() -> readStream(process.getErrorStream()));
            boolean finished = process.waitFor(adminSettingsService.getTimeoutSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                killContainer(containerName);
                return new com.project.codeEditor.dto.CheckResponse(diagnostics);
            }
            String stderr = safeGet(stderrFuture);
            diagnostics.addAll(parseDiagnostics(request.getLanguage(), stderr));
        } catch (IOException | InterruptedException ex) {
            killContainer(containerName);
        } finally {
            cleanup(workDir);
        }
        return new com.project.codeEditor.dto.CheckResponse(diagnostics);
    }

    private boolean isObserver(ExecuteRequest request) {
        if (request.getSessionToken() == null || request.getParticipantSocketId() == null) {
            return false; // no session context (e.g. standalone scratch runs) — nothing to enforce
        }
        try {
            java.util.UUID socketId = java.util.UUID.fromString(request.getParticipantSocketId());
            return "OBSERVER".equals(roomRegistry.roleOf(request.getSessionToken(), socketId));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static final java.util.regex.Pattern JAVAC_ERROR =
            java.util.regex.Pattern.compile("Main\\.java:(\\d+): error: (.+)");
    private static final java.util.regex.Pattern PY_LINE =
            java.util.regex.Pattern.compile("line (\\d+)");
    private static final java.util.regex.Pattern PY_MESSAGE =
            java.util.regex.Pattern.compile("(?:SyntaxError|IndentationError|TabError): (.+)");
    private static final java.util.regex.Pattern NODE_LOCATION =
            java.util.regex.Pattern.compile("Main\\.js:(\\d+)");
    private static final java.util.regex.Pattern NODE_MESSAGE =
            java.util.regex.Pattern.compile("SyntaxError: (.+)");

    private java.util.List<com.project.codeEditor.dto.DiagnosticDto> parseDiagnostics(String language, String stderr) {
        java.util.List<com.project.codeEditor.dto.DiagnosticDto> results = new java.util.ArrayList<>();
        if (stderr == null || stderr.isBlank()) {
            return results;
        }
        String normalized = language == null ? "" : language.trim().toLowerCase();

        switch (normalized) {
            case "java" -> {
                var matcher = JAVAC_ERROR.matcher(stderr);
                while (matcher.find()) {
                    int line = Integer.parseInt(matcher.group(1));
                    results.add(new com.project.codeEditor.dto.DiagnosticDto(line, 1, matcher.group(2).trim(), "error"));
                }
            }
            case "python" -> {
                var lineMatcher = PY_LINE.matcher(stderr);
                var msgMatcher = PY_MESSAGE.matcher(stderr);
                int line = lineMatcher.find() ? Integer.parseInt(lineMatcher.group(1)) : 1;
                String message = msgMatcher.find() ? msgMatcher.group(1).trim() : stderr.trim();
                results.add(new com.project.codeEditor.dto.DiagnosticDto(line, 1, message, "error"));
            }
            case "javascript", "node" -> {
                var locMatcher = NODE_LOCATION.matcher(stderr);
                var msgMatcher = NODE_MESSAGE.matcher(stderr);
                int line = locMatcher.find() ? Integer.parseInt(locMatcher.group(1)) : 1;
                String message = msgMatcher.find() ? msgMatcher.group(1).trim() : stderr.trim();
                results.add(new com.project.codeEditor.dto.DiagnosticDto(line, 1, message, "error"));
            }
            default -> {
            }
        }
        return results;
    }

    private static final java.util.concurrent.ExecutorService STREAM_READER =
            java.util.concurrent.Executors.newCachedThreadPool();

    private String safeGet(java.util.concurrent.Future<String> future) {
        try {
            return future.get(2, TimeUnit.SECONDS);
        } catch (Exception ex) {
            return "";
        }
    }

    private String readStream(java.io.InputStream in) throws IOException {
        return new String(in.readAllBytes(), StandardCharsets.UTF_8);
    }

    // FEATURE 2 — best-effort peak memory read via `docker stats`. Containers
    // run with --rm, so this only succeeds if the read wins a race against
    // Docker tearing the container down; a null result is expected and
    // handled gracefully by the frontend, not an error.
    private Long readPeakMemoryKb(String containerName) {
        try {
            ProcessBuilder statsPb = new ProcessBuilder("docker", "stats", "--no-stream", "--format",
                    "{{.MemUsage}}", containerName);
            Process statsProcess = statsPb.start();
            boolean done = statsProcess.waitFor(2, TimeUnit.SECONDS);
            if (!done) {
                statsProcess.destroyForcibly();
                return null;
            }
            String out = readStream(statsProcess.getInputStream()).trim();
            // Format looks like "12.34MiB / 512MiB" — we only need the used side.
            String used = out.split("/")[0].trim();
            return parseMemToKb(used);
        } catch (Exception ex) {
            return null;
        }
    }

    private Long parseMemToKb(String value) {
        try {
            if (value.endsWith("GiB")) {
                return (long) (Double.parseDouble(value.replace("GiB", "").trim()) * 1024 * 1024);
            } else if (value.endsWith("MiB")) {
                return (long) (Double.parseDouble(value.replace("MiB", "").trim()) * 1024);
            } else if (value.endsWith("KiB")) {
                return (long) Double.parseDouble(value.replace("KiB", "").trim());
            } else if (value.endsWith("B")) {
                return (long) (Double.parseDouble(value.replace("B", "").trim()) / 1024);
            }
        } catch (NumberFormatException ignored) {
            // fall through to null
        }
        return null;
    }

    private void killContainer(String containerName) {
        try {
            new ProcessBuilder("docker", "kill", containerName).start().waitFor(5, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // Best-effort cleanup; --rm will also reap it once it stops.
        }
    }

    private void cleanup(Path workDir) {
        if (workDir == null) {
            return;
        }
        try {
            Files.walk(workDir)
                    .sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
    }
}
