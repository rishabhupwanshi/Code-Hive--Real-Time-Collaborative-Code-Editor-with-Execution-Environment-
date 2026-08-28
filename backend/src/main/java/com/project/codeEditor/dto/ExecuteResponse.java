package com.project.codeEditor.dto;

public class ExecuteResponse {

    private boolean success;
    private String stdout;
    private String stderr;
    private long durationMs;
    private boolean timedOut;

    // FEATURE 2 — Professional Output Panel: exit code / memory usage so the
    // Output/Problems tabs can show real process stats, not just text.
    private Integer exitCode;
    private Long memoryUsageKb;

    public ExecuteResponse() {
    }

    public ExecuteResponse(boolean success, String stdout, String stderr, long durationMs, boolean timedOut) {
        this.success = success;
        this.stdout = stdout;
        this.stderr = stderr;
        this.durationMs = durationMs;
        this.timedOut = timedOut;
    }

    public ExecuteResponse(boolean success, String stdout, String stderr, long durationMs, boolean timedOut,
            Integer exitCode, Long memoryUsageKb) {
        this(success, stdout, stderr, durationMs, timedOut);
        this.exitCode = exitCode;
        this.memoryUsageKb = memoryUsageKb;
    }

    public Integer getExitCode() {
        return exitCode;
    }

    public void setExitCode(Integer exitCode) {
        this.exitCode = exitCode;
    }

    public Long getMemoryUsageKb() {
        return memoryUsageKb;
    }

    public void setMemoryUsageKb(Long memoryUsageKb) {
        this.memoryUsageKb = memoryUsageKb;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getStdout() {
        return stdout;
    }

    public void setStdout(String stdout) {
        this.stdout = stdout;
    }

    public String getStderr() {
        return stderr;
    }

    public void setStderr(String stderr) {
        this.stderr = stderr;
    }

    public long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(long durationMs) {
        this.durationMs = durationMs;
    }

    public boolean isTimedOut() {
        return timedOut;
    }

    public void setTimedOut(boolean timedOut) {
        this.timedOut = timedOut;
    }
}
