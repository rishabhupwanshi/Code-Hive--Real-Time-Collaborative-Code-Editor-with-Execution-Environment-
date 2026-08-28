package com.project.codeEditor.dto;

import java.time.Instant;

public class CodeSnapshotResponse {

    private Long id;
    private String code;
    private String trigger;
    private String createdByEmail;
    private Instant createdAt;

    public CodeSnapshotResponse() {
    }

    public CodeSnapshotResponse(Long id, String code, String trigger, String createdByEmail, Instant createdAt) {
        this.id = id;
        this.code = code;
        this.trigger = trigger;
        this.createdByEmail = createdByEmail;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTrigger() { return trigger; }
    public void setTrigger(String trigger) { this.trigger = trigger; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
