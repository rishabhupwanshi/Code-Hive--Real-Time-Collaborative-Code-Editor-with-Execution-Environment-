package com.project.codeEditor.dto;

public class ExecuteRequest {

    private String language;
    private String code;
    private String stdin;
    private String sessionToken; // optional — when present, a successful run also takes an EXECUTION snapshot
    private String participantSocketId; // optional — the caller's live socket id, for role enforcement

    public String getParticipantSocketId() {
        return participantSocketId;
    }

    public void setParticipantSocketId(String participantSocketId) {
        this.participantSocketId = participantSocketId;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getStdin() {
        return stdin;
    }

    public void setStdin(String stdin) {
        this.stdin = stdin;
    }
}
