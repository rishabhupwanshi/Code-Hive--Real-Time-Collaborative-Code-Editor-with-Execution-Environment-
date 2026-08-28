package com.project.codeEditor.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "coding_sessions")
public class CodingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_name", nullable = false)
    private String sessionName;

    @Column(name = "programming_language", nullable = false)
    private String programmingLanguage;

    @Column(name = "session_link", nullable = false)
    private String sessionLink;

    @Column(name = "public_room", nullable = false, columnDefinition = "boolean default true")
    private Boolean publicRoom = true;

    @Column(nullable = false)
    private String status = "ACTIVE";

    // Email of the authenticated user who created the session (null for anonymous hosts).
    @Column(name = "created_by_email")
    private String createdByEmail;

    // Comma-separated list of participant emails who have joined/edited in this
    // session. Only participants (host + joiners) can see the session in listings.
    @Column(name = "participant_emails", length = 2000)
    private String participantEmails = "";

    @Column(name = "code", columnDefinition = "TEXT")
    private String code;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    // Real, persisted count of how many times code has been run in this
    // session — incremented by CodeExecutionService on each successful
    // execute request. Used to power "Code Executions" on the user
    // dashboard (replaces the earlier placeholder/no-data state).
    @Column(name = "execution_count", nullable = false, columnDefinition = "integer default 0")
    private Integer executionCount = 0;

    public CodingSession() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionName() {
        return sessionName;
    }

    public void setSessionName(String sessionName) {
        this.sessionName = sessionName;
    }

    public String getProgrammingLanguage() {
        return programmingLanguage;
    }

    public void setProgrammingLanguage(String programmingLanguage) {
        this.programmingLanguage = programmingLanguage;
    }

    public String getSessionLink() {
        return sessionLink;
    }

    public void setSessionLink(String sessionLink) {
        this.sessionLink = sessionLink;
    }

    public Boolean getPublicRoom() {
        return publicRoom;
    }

    public void setPublicRoom(Boolean publicRoom) {
        this.publicRoom = publicRoom;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedByEmail() {
        return createdByEmail;
    }

    public void setCreatedByEmail(String createdByEmail) {
        this.createdByEmail = createdByEmail;
    }

    public String getParticipantEmails() {
        return participantEmails;
    }

    public void setParticipantEmails(String participantEmails) {
        this.participantEmails = participantEmails;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Integer getExecutionCount() {
        return executionCount;
    }

    public void setExecutionCount(Integer executionCount) {
        this.executionCount = executionCount;
    }
}
