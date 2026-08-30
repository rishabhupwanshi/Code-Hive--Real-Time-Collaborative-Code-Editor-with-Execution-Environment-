package com.project.codeEditor.dto;

public class AdminLiveSessionResponse {

    private String sessionToken;
    private String sessionName;
    private String language; 
    private String hostName;
    private int participantCount;
    private java.util.List<String> participants;

    public AdminLiveSessionResponse() {
    }

    

    public AdminLiveSessionResponse(String sessionToken, String sessionName, String language, String hostName,
            int participantCount, java.util.List<String> participants) {
        this.sessionToken = sessionToken;
        this.sessionName = sessionName;
        this.language = language;
        this.hostName = hostName;
        this.participantCount = participantCount;
        this.participants = participants;
    }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getHostName() { return hostName; }
    public void setHostName(String hostName) { this.hostName = hostName; }
    public int getParticipantCount() { return participantCount; }
    public void setParticipantCount(int participantCount) { this.participantCount = participantCount; }
    public java.util.List<String> getParticipants() { return participants; }
    public void setParticipants(java.util.List<String> participants) { this.participants = participants; }
}
//this is admin live session response