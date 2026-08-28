package com.project.codeEditor.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * FR-07 / AC-06: periodic + on-demand snapshots of a session's code buffer,
 * so participants can browse a timeline and restore an earlier state.
 */
@Entity
@Table(name = "code_snapshots")
public class CodeSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_token", nullable = false)
    private String sessionToken;

    @Column(name = "code", columnDefinition = "TEXT")
    private String code;

    // AUTO (5-minute interval), MANUAL (user clicked "snapshot now"), EXECUTION (taken on each run)
    @Column(nullable = false)
    private String trigger;

    @Column(name = "created_by_email")
    private String createdByEmail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTrigger() { return trigger; }
    public void setTrigger(String trigger) { this.trigger = trigger; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
