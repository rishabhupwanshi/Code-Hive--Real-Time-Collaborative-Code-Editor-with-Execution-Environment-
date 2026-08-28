package com.project.codeEditor.dto;

public class JoinSessionRequest {

    private String sessionToken;
    private String participantName;

    public JoinSessionRequest() {
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getParticipantName() {
        return participantName;
    }

    public void setParticipantName(String participantName) {
        this.participantName = participantName;
    }
}
