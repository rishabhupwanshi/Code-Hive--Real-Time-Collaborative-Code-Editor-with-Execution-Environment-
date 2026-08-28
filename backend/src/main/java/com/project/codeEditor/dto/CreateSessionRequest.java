package com.project.codeEditor.dto;

public class CreateSessionRequest {

    private String hostName;
    private String programmingLanguage;
    private Boolean publicRoom;

    public CreateSessionRequest() {
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public String getProgrammingLanguage() {
        return programmingLanguage;
    }

    public void setProgrammingLanguage(String programmingLanguage) {
        this.programmingLanguage = programmingLanguage;
    }

    public Boolean getPublicRoom() {
        return publicRoom;
    }

    public void setPublicRoom(Boolean publicRoom) {
        this.publicRoom = publicRoom;
    }
}
