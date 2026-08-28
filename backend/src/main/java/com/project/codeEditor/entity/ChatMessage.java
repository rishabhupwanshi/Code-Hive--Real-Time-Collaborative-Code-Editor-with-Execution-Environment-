package com.project.codeEditor.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A single chat message sent inside a coding session's live collaboration
 * room. Persisted so that anyone who joins the room late (or refreshes)
 * can be sent the prior conversation as history, not just messages sent
 * after they connect.
 */
@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The session token (room) this message belongs to.
    @Column(name = "session_token", nullable = false)
    private String sessionToken;

    @Column(name = "sender_name", nullable = false)
    private String senderName;

    @Column(nullable = false, length = 4000)
    private String message;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    public ChatMessage() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getSenderName() {
        return senderName;
    }

    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }
}
